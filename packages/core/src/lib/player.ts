import {
	ATTR_ARTIST,
	ATTR_MIDI_OSCILLATOR,
	ATTR_PLAYLIST,
	ATTR_PREFER_MEDIA_METADATA,
	ATTR_PRELOAD,
	ATTR_PRELOAD_METADATA,
	ATTR_SRC,
	ATTR_TITLE,
	ATTR_TRACK_INDEX,
	ATTR_TYPE,
} from './attributes'
import {
	resolveJuketteBackend,
	subscribeJuketteBackendRegistrations,
} from './backend-registry'
import { HTMLElementBase } from './dom'
import { createJuketteEventDetail } from './events'
import { normalizeMidiOscillator } from './midi'
import { createJukettePlayerDom, type JukettePlayerDom } from './player-dom'
import { JuketteMetadataController } from './player-metadata'
import { JuketteProgressController } from './player-progress'
import { renderTrackSelect } from './player-track-select'
import { formatTime } from './player-time'
import { JukettePlayableTrack } from './playable-track'
import {
	inferTrackType,
	normalizeTrack,
	parsePlaylist,
	trackFromElement,
} from './tracks'
import type {
	AudioFileMetadata,
	JuketteEventDetail,
	JuketteEventName,
	JuketteMidiOscillator,
	JuketteTrack,
} from './types'

export class JukettePlayerElement extends HTMLElementBase {
	static observedAttributes = [
		ATTR_SRC,
		ATTR_PLAYLIST,
		ATTR_PRELOAD_METADATA,
		ATTR_PREFER_MEDIA_METADATA,
		ATTR_MIDI_OSCILLATOR,
		ATTR_TRACK_INDEX,
	]
	private static readonly reconnectGraceMs = 1000

	private readonly dom: JukettePlayerDom
	private readonly metadataController: JuketteMetadataController
	private readonly progressController: JuketteProgressController
	private readonly trackElements = new WeakMap<JuketteTrack, Element>()
	private tracks: JuketteTrack[] = []
	private index = 0
	private desiredPlaying = false
	private playing = false
	private ready = false
	private trackLoadId = 0
	private duration = 0
	private activePlayableTrack: JukettePlayableTrack | null = null
	private backendRegistrationCleanup: (() => void) | null = null
	private restartOnNextPlay = false
	private readonly trackObserver: MutationObserver | null = null
	private playlistOverride: JuketteTrack[] | null = null
	private loadedTrackKey = ''
	private statusMessage = ''
	private timeMode: 'elapsed' | 'remaining' = 'elapsed'
	private disconnectTeardownId: number | null = null

	constructor() {
		super()

		if (typeof MutationObserver !== 'undefined') {
			this.trackObserver = new MutationObserver(() =>
				this.syncChildTracks(),
			)
		}

		this.dom = createJukettePlayerDom(this)
		this.metadataController = new JuketteMetadataController({
			getHost: () => this,
			getPreloadMetadata: () => this.preloadMetadata,
			getTrackElement: (track) => this.trackElements.get(track) ?? null,
			getTrackKey: (track) => this.getTrackKey(track),
			getTracks: () => this.tracks,
			isCurrentTrack: (track) => this.isCurrentTrack(track),
			onCurrentTrackDisplayChange: () => this.renderCurrentTrack(),
			onPlaylistDisplayChange: () => this.renderTrackSelect(),
			trackPrefersMediaMetadata: (track) =>
				this.trackPrefersMediaMetadata(track),
		})
		this.progressController = new JuketteProgressController({
			dom: this.dom,
			getCurrentTime: () => this.getCurrentTime(),
			getDuration: () => this.duration,
			getPlaying: () => this.playing,
			getTimeMode: () => this.timeMode,
			onStatusChange: (message = '') => this.updateStatus(message),
		})

		this.dom.playButton.addEventListener('click', () => this.toggle())
		this.dom.timeButton.addEventListener('click', () =>
			this.toggleTimeMode(),
		)
		this.dom.trackSelect.addEventListener('change', () =>
			this.selectTrackFromInput(),
		)
		this.dom.trackSelect.addEventListener('keyup', (event) =>
			this.handleTrackSelectKeyup(event),
		)
		this.dom.seekInput.addEventListener('input', () => this.seekFromInput())
		this.dom.audio.addEventListener('loadedmetadata', () =>
			this.syncAudio(),
		)
		this.dom.audio.addEventListener('timeupdate', () => this.syncAudio())
		this.dom.audio.addEventListener('ended', () => this.finishTrack())
	}

	connectedCallback(): void {
		if (this.disconnectTeardownId !== null) {
			window.clearTimeout(this.disconnectTeardownId)
			this.disconnectTeardownId = null
		}

		this.backendRegistrationCleanup = subscribeJuketteBackendRegistrations(
			() => this.handleBackendRegistration(),
		)
		this.trackObserver?.observe(this, {
			attributeFilter: [
				ATTR_ARTIST,
				ATTR_PREFER_MEDIA_METADATA,
				ATTR_PRELOAD,
				ATTR_SRC,
				ATTR_TITLE,
				ATTR_TYPE,
			],
			attributes: true,
			childList: true,
			subtree: true,
		})
		if (this.canResumeConnectedTrack()) {
			this.restoreConnectedTrack()
			return
		}

		this.syncTracks()
		this.loadTrack()
	}

	disconnectedCallback(): void {
		this.backendRegistrationCleanup?.()
		this.backendRegistrationCleanup = null
		this.trackObserver?.disconnect()
		this.stopProgressLoop()
		this.disconnectTeardownId = window.setTimeout(() => {
			if (this.isConnected) return
			this.activePlayableTrack?.stop()
			this.activePlayableTrack = null
			this.disconnectTeardownId = null
		}, JukettePlayerElement.reconnectGraceMs)
	}

	attributeChangedCallback(
		name: string,
		oldValue: string | null,
		newValue: string | null,
	): void {
		if (oldValue === newValue) return
		if (
			name === ATTR_PRELOAD_METADATA ||
			name === ATTR_PREFER_MEDIA_METADATA
		) {
			this.renderCurrentTrack()
			this.renderTrackSelect()
			this.preloadPlaylistMetadata()
			return
		}

		this.syncTracks()
		this.loadTrack()
	}

	get currentTrack(): JuketteTrack | null {
		return this.tracks[this.index] ?? null
	}

	get currentTrackIndex(): number {
		return this.index
	}

	get currentTime(): number {
		return this.getCurrentTime()
	}

	set currentTime(seconds: number) {
		this.seek(seconds)
	}

	get playlist(): JuketteTrack[] {
		return [...this.tracks]
	}

	get totalTracks(): number {
		return this.tracks.length
	}

	get preloadMetadata(): boolean {
		return this.hasAttribute(ATTR_PRELOAD_METADATA)
	}

	set preloadMetadata(preload: boolean) {
		this.toggleAttribute(ATTR_PRELOAD_METADATA, preload)
	}

	get preferMediaMetadata(): boolean {
		return this.hasAttribute(ATTR_PREFER_MEDIA_METADATA)
	}

	set preferMediaMetadata(prefer: boolean) {
		this.toggleAttribute(ATTR_PREFER_MEDIA_METADATA, prefer)
	}

	get midiOscillator(): JuketteMidiOscillator {
		return normalizeMidiOscillator(this.getAttribute(ATTR_MIDI_OSCILLATOR))
	}

	set midiOscillator(oscillator: JuketteMidiOscillator) {
		this.setAttribute(ATTR_MIDI_OSCILLATOR, oscillator)
	}

	set playlist(tracks: JuketteTrack[]) {
		this.playlistOverride = tracks
			.map((track) => normalizeTrack(track))
			.filter((track): track is JuketteTrack => track !== null)
		this.tracks = [...this.playlistOverride]
		this.index = 0
		this.renderTrackSelect()
		this.preloadPlaylistMetadata()
		this.loadTrack()
	}

	async play(): Promise<void> {
		const track = this.currentTrack
		if (!track || !this.ready) return

		this.desiredPlaying = true
		const trackLoadId = this.trackLoadId
		const played = await this.activePlayableTrack?.play({
			isStale: () => trackLoadId !== this.trackLoadId,
			restart: this.restartOnNextPlay,
		})
		this.restartOnNextPlay = false
		if (trackLoadId !== this.trackLoadId) return
		if (played) {
			this.playing = true
		}

		this.syncPlayingState()
		if (played) this.emitJuketteEvent('jukette:play')
	}

	pause(): void {
		const wasPlaying = this.playing || this.desiredPlaying
		this.setStatus()
		this.desiredPlaying = false
		this.activePlayableTrack?.pause()

		this.playing = false
		this.syncPlayingState()
		if (wasPlaying) this.emitJuketteEvent('jukette:pause')
	}

	toggle(): void {
		if (this.playing) {
			this.pause()
			return
		}

		void this.play()
	}

	seek(seconds: number): void {
		const track = this.currentTrack
		if (!track || !this.ready) return

		this.setStatus('Seeking')
		this.activePlayableTrack?.seek(seconds)
		if (this.playing) void this.play()

		this.syncProgress(seconds, this.duration)
		this.emitJuketteEvent('jukette:seek')
		window.setTimeout(() => {
			if (this.playing || !this.desiredPlaying) this.setStatus()
		}, 500)
	}

	private getCurrentTime(): number {
		const track = this.currentTrack
		if (!track) return 0
		return this.activePlayableTrack?.currentTime ?? 0
	}

	private getJuketteEventDetail(
		detail: Partial<JuketteEventDetail> = {},
	): JuketteEventDetail {
		return createJuketteEventDetail({
			currentTime: this.getCurrentTime(),
			duration: this.duration,
			index: this.index,
			playing: this.playing,
			track: this.currentTrack,
			tracks: this.tracks,
			...detail,
		})
	}

	private emitJuketteEvent(
		name: JuketteEventName,
		detail: Partial<JuketteEventDetail> = {},
	): void {
		if (typeof CustomEvent === 'undefined') return

		this.dispatchEvent(
			new CustomEvent(name, {
				bubbles: true,
				composed: true,
				detail: this.getJuketteEventDetail(detail),
			}),
		)
	}

	private syncTracks(): void {
		const childTracks = this.getChildTracks()
		const attributeTracks = parsePlaylist(this.getAttribute(ATTR_PLAYLIST))
		const src = this.getAttribute(ATTR_SRC)
		const singleTrack = normalizeTrack(src ?? undefined)
		this.tracks =
			this.playlistOverride ??
			(childTracks.length > 0
				? childTracks
				: attributeTracks.length > 0
					? attributeTracks
					: singleTrack
						? [singleTrack]
						: [])

		const nextIndex = Number(this.getAttribute(ATTR_TRACK_INDEX))
		this.index =
			Number.isInteger(nextIndex) && nextIndex >= 0
				? Math.min(nextIndex, Math.max(0, this.tracks.length - 1))
				: Math.min(this.index, Math.max(0, this.tracks.length - 1))

		this.renderTrackSelect()
		this.preloadPlaylistMetadata()
	}

	private syncChildTracks(): void {
		if (this.playlistOverride) return

		const currentTrack = this.currentTrack
		this.syncTracks()

		if (this.currentTrack?.src === currentTrack?.src) {
			this.renderTrackSelect()
			return
		}

		this.loadTrack()
	}

	private getChildTracks(): JuketteTrack[] {
		return Array.from(this.children).flatMap((element) => {
			const track = trackFromElement(element)
			if (!track) return []
			this.trackElements.set(track, element)
			return [track]
		})
	}

	private createPlayableTrack(
		track: JuketteTrack,
	): JukettePlayableTrack | null {
		const callbacks = this.createPlayableCallbacks(track)
		const backend = resolveJuketteBackend(track)
		if (!backend) return null

		return backend.createPlayableTrack(track, callbacks, {
			audioElement: this.dom.audio,
			getMidiOscillator: () => this.midiOscillator,
			host: this,
			trackElement: this.trackElements.get(track) ?? null,
		})
	}

	private createPlayableCallbacks(track: JuketteTrack) {
		const isCurrentTrack = () =>
			this.currentTrack !== null &&
			this.getTrackKey(this.currentTrack) === this.getTrackKey(track)

		return {
			onDuration: (duration: number) => {
				this.metadataController.setDuration(track, duration)
				if (!isCurrentTrack()) return

				this.duration = duration
				this.syncProgress(this.getCurrentTime(), this.duration)
			},
			onFinish: () => {
				if (isCurrentTrack()) this.finishTrack()
			},
			onMetadata: (
				metadata: AudioFileMetadata,
				metadataPreloadId?: number,
			) => {
				if (
					metadataPreloadId !== undefined &&
					metadataPreloadId !==
						this.metadataController.metadataPreloadId
				) {
					return
				}
				this.metadataController.setMetadata(track, metadata)
			},
			onPause: () => {
				if (!isCurrentTrack()) return

				const wasPlaying = this.playing || this.desiredPlaying
				this.desiredPlaying = false
				this.playing = false
				this.syncPlayingState()
				if (wasPlaying) this.emitJuketteEvent('jukette:pause')
			},
			onPlay: () => {
				if (!isCurrentTrack()) return

				this.desiredPlaying = true
				this.playing = true
				this.syncPlayingState()
				this.emitJuketteEvent('jukette:play')
			},
			onProgress: (currentTime: number, duration: number) => {
				if (!isCurrentTrack()) return
				this.syncProgress(currentTime, duration)
			},
			onReady: () => {
				if (!isCurrentTrack()) return
				this.setReady(true)
				if (!this.playing) this.setStatus()
			},
			onStatus: (message = '') => {
				if (isCurrentTrack()) this.setStatus(message)
			},
		}
	}

	private loadTrack(): void {
		this.trackLoadId += 1
		const previousTrackKey = this.loadedTrackKey
		this.activePlayableTrack?.stop()
		this.activePlayableTrack = null
		this.desiredPlaying = false
		this.playing = false
		this.setReady(false)
		this.duration = 0
		this.syncProgress(0, 0)

		const track = this.currentTrack
		if (!track) {
			this.loadedTrackKey = ''
			this.statusMessage = ''
			this.dom.titleElement.textContent = 'No track'
			this.dom.metaElement.textContent = ''
			this.setReady(false)
			this.dom.trackSelect.disabled = true
			if (previousTrackKey) this.emitJuketteEvent('jukette:trackchange')
			return
		}

		const type = inferTrackType(track)
		const trackKey = this.getTrackKey(track)
		this.loadedTrackKey = trackKey
		this.duration = this.getTrackDuration(track) ?? 0
		this.dataset.kind = type
		this.setReady(false)
		this.dom.trackSelect.disabled = false
		this.renderCurrentTrack()
		this.setStatus(`Preparing ${type}`)
		this.syncProgress(0, this.duration)
		this.activePlayableTrack = this.createPlayableTrack(track)
		if (!this.activePlayableTrack) {
			this.setStatus(`${type} playback unavailable`)
			this.renderTrackSelect()
			this.syncPlayingState()
			if (trackKey !== previousTrackKey) {
				this.emitJuketteEvent('jukette:trackchange')
			}
			return
		}

		void this.activePlayableTrack.load({
			metadataPreloadId: this.metadataController.metadataPreloadId,
			restart: this.restartOnNextPlay,
		})

		this.renderTrackSelect()
		this.syncPlayingState()
		if (trackKey !== previousTrackKey) {
			this.emitJuketteEvent('jukette:trackchange')
		}
	}

	private renderTrackSelect(): void {
		renderTrackSelect({
			currentIndex: this.index,
			element: this.dom.trackSelect,
			formatTime,
			getDisplay: (track) => this.getTrackDisplay(track),
			getDuration: (track) => this.getTrackDuration(track),
			tracks: this.tracks,
		})
	}

	private selectTrack(index: number): void {
		this.restartOnNextPlay = true
		if (index === this.index) {
			this.loadTrack()
			return
		}

		this.index = index
		this.loadTrack()
	}

	private selectTrackFromInput(): void {
		const nextIndex = Number(this.dom.trackSelect.value)
		if (!Number.isInteger(nextIndex) || nextIndex < 0) return
		this.selectTrack(nextIndex)
	}

	private handleTrackSelectKeyup(event: KeyboardEvent): void {
		if (event.key !== 'Enter' && event.key !== ' ') return
		if (!this.ready || this.dom.trackSelect.disabled) return

		if (event.key === 'Enter') {
			this.toggle()
			return
		}

		if (this.playing) return
		void this.play()
	}

	private canResumeConnectedTrack(): boolean {
		const track = this.currentTrack
		if (!track) return false
		if (!this.activePlayableTrack) return false
		return this.loadedTrackKey === this.getTrackKey(track)
	}

	private restoreConnectedTrack(): void {
		this.dom.trackSelect.disabled = false
		this.renderCurrentTrack()
		this.renderTrackSelect()
		this.syncProgress(this.getCurrentTime(), this.duration)
		this.syncPlayingState()
		if (!this.playing) this.setStatus()
	}

	private getTrackDuration(track: JuketteTrack | null): number | undefined {
		return this.metadataController.getDuration(track)
	}

	private getTrackKey(track: JuketteTrack): string {
		return `${inferTrackType(track)}:${track.src}`
	}

	private isCurrentTrack(track: JuketteTrack): boolean {
		return (
			this.currentTrack !== null &&
			this.getTrackKey(this.currentTrack) === this.getTrackKey(track)
		)
	}

	private trackPrefersMediaMetadata(track: JuketteTrack): boolean {
		return track.preferMediaMetadata ?? this.preferMediaMetadata
	}

	private getTrackDisplay(track: JuketteTrack): Required<AudioFileMetadata> {
		return this.metadataController.getDisplay(track)
	}

	private renderCurrentTrack(): void {
		const track = this.currentTrack
		if (!track) return

		const display = this.getTrackDisplay(track)
		this.dom.titleElement.textContent = display.title
		this.renderMetaLine(display.artist || inferTrackType(track))
	}

	private preloadPlaylistMetadata(): void {
		this.metadataController.preloadPlaylistMetadata()
	}

	private toggleTimeMode(): void {
		if (!this.ready) return
		this.timeMode = this.timeMode === 'elapsed' ? 'remaining' : 'elapsed'
		this.syncProgress(this.getCurrentTime(), this.duration)
	}

	private seekFromInput(): void {
		if (!this.ready || !this.duration) return
		this.seek((Number(this.dom.seekInput.value) / 1000) * this.duration)
	}

	private syncAudio(): void {
		this.activePlayableTrack?.requestPosition(() => false)
		if (!this.playing) this.setStatus()
	}

	private syncProgress(currentTime: number, duration: number): void {
		this.progressController.syncProgress(currentTime, duration)
	}

	private syncPlayingState(): void {
		this.progressController.syncPlayingState()
	}

	private setStatus(message = ''): void {
		this.progressController.setStatus(message)
	}

	private updateStatus(message = ''): void {
		this.statusMessage = message
		const track = this.currentTrack
		const display = track ? this.getTrackDisplay(track) : null
		this.renderMetaLine(
			display?.artist || (track ? inferTrackType(track) : ''),
		)
	}

	private renderMetaLine(fallbackText: string): void {
		this.dom.metaElement.textContent = this.statusMessage || fallbackText
	}

	private finishTrack(): void {
		this.desiredPlaying = false
		this.playing = false
		this.restartOnNextPlay = true
		this.syncPlayingState()
		this.syncProgress(this.duration, this.duration)
		this.emitJuketteEvent('jukette:ended')
	}

	private setReady(ready: boolean): void {
		this.ready = ready
		this.dom.playButton.disabled = !ready
		this.dom.seekInput.disabled = !ready
		this.dom.timeButton.disabled = !ready
	}

	private stopProgressLoop(): void {
		this.progressController.stop()
	}

	private handleBackendRegistration(): void {
		this.preloadPlaylistMetadata()
		this.renderTrackSelect()

		const track = this.currentTrack
		if (!track || this.activePlayableTrack) return
		if (!resolveJuketteBackend(track)) return

		this.loadTrack()
	}
}
