import {
	ATTR_ARTIST,
	ATTR_MIDI_OSCILLATOR,
	ATTR_PLAYLIST,
	ATTR_PLAYLIST_OPEN,
	ATTR_PREFER_MEDIA_METADATA,
	ATTR_PRELOAD,
	ATTR_PRELOAD_METADATA,
	ATTR_PRELOAD_SOUNDCLOUD,
	ATTR_SRC,
	ATTR_TITLE,
	ATTR_TRACK_INDEX,
	ATTR_TYPE,
} from './attributes'
import { HTMLElementBase } from './dom'
import { createJuketteEventDetail } from './events'
import { normalizeMidiOscillator } from './midi'
import { AudioPlayableTrack } from './audio-track'
import { MidiPlayableTrack } from './midi-track'
import { createJukettePlayerDom, type JukettePlayerDom } from './player-dom'
import { JuketteMetadataController } from './player-metadata'
import { renderPlaylist as renderPlaylistItems } from './player-playlist-renderer'
import { JuketteProgressController } from './player-progress'
import { JuketteSoundCloudPreloadController } from './player-soundcloud-preloads'
import { formatTime } from './player-time'
import { JukettePlayableTrack } from './playable-track'
import { SoundCloudPlayableTrack } from './soundcloud-track'
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
	JuketteSoundCloudPreload,
	JuketteTrack,
} from './types'

const normalizeSoundCloudPreload = (
	value: string | null,
): JuketteSoundCloudPreload => {
	if (
		value === 'none' ||
		value === 'current' ||
		value === 'next' ||
		value === 'all'
	) {
		return value
	}

	return 'current'
}

export class JukettePlayerElement extends HTMLElementBase {
	static observedAttributes = [
		ATTR_SRC,
		ATTR_PLAYLIST,
		ATTR_PLAYLIST_OPEN,
		ATTR_PRELOAD_METADATA,
		ATTR_PRELOAD_SOUNDCLOUD,
		ATTR_PREFER_MEDIA_METADATA,
		ATTR_MIDI_OSCILLATOR,
		ATTR_TRACK_INDEX,
	]

	private readonly dom: JukettePlayerDom
	private readonly metadataController: JuketteMetadataController
	private readonly progressController: JuketteProgressController
	private readonly soundCloudPreloadController: JuketteSoundCloudPreloadController
	private tracks: JuketteTrack[] = []
	private index = 0
	private desiredPlaying = false
	private playing = false
	private trackLoadId = 0
	private duration = 0
	private activePlayableTrack: JukettePlayableTrack | null = null
	private restartOnNextPlay = false
	private readonly trackObserver: MutationObserver | null = null
	private playlistOverride: JuketteTrack[] | null = null
	private loadedTrackKey = ''

	constructor() {
		super()

		if (typeof MutationObserver !== 'undefined') {
			this.trackObserver = new MutationObserver(() =>
				this.syncChildTracks(),
			)
		}

		this.dom = createJukettePlayerDom(this)
		this.metadataController = new JuketteMetadataController({
			getPreloadMetadata: () => this.preloadMetadata,
			getTrackKey: (track) => this.getTrackKey(track),
			getTracks: () => this.tracks,
			isCurrentTrack: (track) => this.isCurrentTrack(track),
			onCurrentTrackDisplayChange: () => this.renderCurrentTrack(),
			onPlaylistDisplayChange: () => this.renderPlaylist(),
			trackPrefersMediaMetadata: (track) =>
				this.trackPrefersMediaMetadata(track),
		})
		this.progressController = new JuketteProgressController({
			dom: this.dom,
			getCurrentTime: () => this.getCurrentTime(),
			getDuration: () => this.duration,
			getPlaying: () => this.playing,
			isSoundCloudTrack: () =>
				inferTrackType(this.currentTrack ?? { src: '' }) ===
				'soundcloud',
			requestSoundCloudPosition: () => this.requestSoundCloudPosition(),
		})
		this.soundCloudPreloadController =
			new JuketteSoundCloudPreloadController({
				audio: this.dom.audio,
				baseIframe: this.dom.iframe,
				createCallbacks: (track) => this.createPlayableCallbacks(track),
				getCurrentIndex: () => this.index,
				getCurrentTrack: () => this.currentTrack,
				getMetadataPreloadId: () =>
					this.metadataController.metadataPreloadId,
				getPreload: () => this.preloadSoundCloud,
				getTrackKey: (track) => this.getTrackKey(track),
				getTracks: () => this.tracks,
				getVolume: () => Number(this.dom.volumeInput.value),
				playerElement: this.dom.playerElement,
			})

		this.dom.playButton.addEventListener('click', () => this.toggle())
		this.dom.previousButton.addEventListener('click', () => this.previous())
		this.dom.nextButton.addEventListener('click', () => this.next())
		this.dom.playlistButton.addEventListener('click', () =>
			this.togglePlaylist(),
		)
		this.dom.volumeInput.addEventListener('input', () => this.syncVolume())
		this.dom.seekInput.addEventListener('input', () => this.seekFromInput())
		this.dom.audio.addEventListener('loadedmetadata', () =>
			this.syncAudio(),
		)
		this.dom.audio.addEventListener('timeupdate', () => this.syncAudio())
		this.dom.audio.addEventListener('ended', () => this.finishTrack())
	}

	connectedCallback(): void {
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
		this.syncTracks()
		this.syncPlaylistButton()
		this.loadTrack()
	}

	disconnectedCallback(): void {
		this.trackObserver?.disconnect()
		this.stopProgressLoop()
		this.activePlayableTrack?.stop()
		this.soundCloudPreloadController.dispose()
	}

	attributeChangedCallback(
		name: string,
		oldValue: string | null,
		newValue: string | null,
	): void {
		if (oldValue === newValue) return
		if (
			name === ATTR_PRELOAD_METADATA ||
			name === ATTR_PREFER_MEDIA_METADATA ||
			name === ATTR_PRELOAD_SOUNDCLOUD
		) {
			this.renderCurrentTrack()
			this.renderPlaylist()
			this.preloadPlaylistMetadata()
			this.syncSoundCloudPreloads()
			return
		}
		if (name === ATTR_PLAYLIST_OPEN) {
			const open = newValue !== null
			this.syncPlaylistButton()
			this.emitJuketteEvent('jukette:playlisttoggle', { open })
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

	get playlistOpen(): boolean {
		return this.hasAttribute(ATTR_PLAYLIST_OPEN)
	}

	set playlistOpen(open: boolean) {
		this.toggleAttribute(ATTR_PLAYLIST_OPEN, open)
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

	get preloadSoundCloud(): JuketteSoundCloudPreload {
		return normalizeSoundCloudPreload(
			this.getAttribute(ATTR_PRELOAD_SOUNDCLOUD),
		)
	}

	set preloadSoundCloud(preload: JuketteSoundCloudPreload) {
		this.setAttribute(ATTR_PRELOAD_SOUNDCLOUD, preload)
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
		this.renderPlaylist()
		this.preloadPlaylistMetadata()
		this.syncSoundCloudPreloads()
		this.loadTrack()
	}

	async play(): Promise<void> {
		const track = this.currentTrack
		if (!track) return

		this.desiredPlaying = true
		const trackLoadId = this.trackLoadId
		const type = inferTrackType(track)
		const played = await this.activePlayableTrack?.play({
			isStale: () => trackLoadId !== this.trackLoadId,
			restart: this.restartOnNextPlay,
			volume: Number(this.dom.volumeInput.value),
		})
		this.restartOnNextPlay = false
		if (trackLoadId !== this.trackLoadId) return
		if (played) {
			this.playing = true
		}

		this.syncPlayingState()
		if (type !== 'soundcloud') this.emitJuketteEvent('jukette:play')
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

	next(): void {
		if (this.tracks.length === 0) return
		const fromIndex = this.index
		const shouldPlay = this.desiredPlaying || this.playing
		this.index = (this.index + 1) % this.tracks.length
		this.restartOnNextPlay = true
		this.loadTrack()
		this.emitJuketteEvent('jukette:next', {
			direction: 'next',
			fromIndex,
			toIndex: this.index,
		})
		if (shouldPlay) void this.play()
	}

	previous(): void {
		if (this.tracks.length === 0) return

		if (this.getCurrentTime() > 3) {
			this.restartOnNextPlay = true
			this.seek(0)
			this.emitJuketteEvent('jukette:restart')
			if (this.desiredPlaying || this.playing) void this.play()
			return
		}

		const fromIndex = this.index
		const shouldPlay = this.desiredPlaying || this.playing
		this.index = (this.index - 1 + this.tracks.length) % this.tracks.length
		this.restartOnNextPlay = true
		this.loadTrack()
		this.emitJuketteEvent('jukette:previous', {
			direction: 'previous',
			fromIndex,
			toIndex: this.index,
		})
		if (shouldPlay) void this.play()
	}

	seek(seconds: number): void {
		const track = this.currentTrack
		if (!track) return

		this.setStatus('Seeking')
		this.activePlayableTrack?.seek(seconds)
		if (this.playing && inferTrackType(track) === 'midi') void this.play()

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
			playlistOpen: this.playlistOpen,
			track: this.currentTrack,
			tracks: this.tracks,
			volume: Number(this.dom.volumeInput.value),
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

		this.renderPlaylist()
		this.preloadPlaylistMetadata()
		this.syncSoundCloudPreloads()
	}

	private syncChildTracks(): void {
		if (this.playlistOverride) return

		const currentTrack = this.currentTrack
		this.syncTracks()

		if (this.currentTrack?.src === currentTrack?.src) {
			this.renderPlaylist()
			return
		}

		this.loadTrack()
		if (this.playing) void this.play()
	}

	private getChildTracks(): JuketteTrack[] {
		return Array.from(this.children)
			.map((element) => trackFromElement(element))
			.filter((track): track is JuketteTrack => track !== null)
	}

	private createPlayableTrack(track: JuketteTrack): JukettePlayableTrack {
		const callbacks = this.createPlayableCallbacks(track)

		const type = inferTrackType(track)
		if (type === 'audio') {
			return new AudioPlayableTrack(track, this.dom.audio, callbacks)
		}
		if (type === 'midi') {
			return new MidiPlayableTrack(
				track,
				callbacks,
				() => this.midiOscillator,
			)
		}
		return this.getSoundCloudPlayableTrack(track)
	}

	private getSoundCloudPlayableTrack(
		track: JuketteTrack,
	): SoundCloudPlayableTrack {
		return this.soundCloudPreloadController.getPlayableTrack(track)
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
				if (!this.trackPrefersMediaMetadata(track)) return
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
			onStatus: (message = '') => {
				if (isCurrentTrack()) this.setStatus(message)
			},
		}
	}

	private syncSoundCloudPreloads(): void {
		this.soundCloudPreloadController.sync()
	}

	private loadTrack(): void {
		this.trackLoadId += 1
		const previousTrackKey = this.loadedTrackKey
		this.activePlayableTrack?.stop()
		this.activePlayableTrack = null
		this.playing = false
		this.duration = 0
		this.syncProgress(0, 0)

		const track = this.currentTrack
		if (!track) {
			this.loadedTrackKey = ''
			this.dom.titleElement.textContent = 'No track'
			this.dom.metaElement.textContent = ''
			this.dom.statusElement.textContent = ''
			this.dom.playButton.disabled = true
			if (previousTrackKey) this.emitJuketteEvent('jukette:trackchange')
			return
		}

		const type = inferTrackType(track)
		const trackKey = this.getTrackKey(track)
		this.loadedTrackKey = trackKey
		this.duration = this.getTrackDuration(track) ?? 0
		this.dataset.kind = type
		this.dom.playButton.disabled = false
		this.renderCurrentTrack()
		this.setStatus()
		this.syncProgress(0, this.duration)
		this.activePlayableTrack = this.createPlayableTrack(track)
		if (this.activePlayableTrack instanceof SoundCloudPlayableTrack) {
			this.syncSoundCloudPreloads()
		} else {
			this.soundCloudPreloadController.deactivateAll()
		}

		void this.activePlayableTrack.load({
			metadataPreloadId: this.metadataController.metadataPreloadId,
			restart: this.restartOnNextPlay,
			volume: Number(this.dom.volumeInput.value),
		})

		this.renderPlaylist()
		this.syncPlayingState()
		if (trackKey !== previousTrackKey) {
			this.emitJuketteEvent('jukette:trackchange')
		}
	}

	private renderPlaylist(): void {
		renderPlaylistItems({
			currentIndex: this.index,
			element: this.dom.playlistElement,
			formatTime,
			getDisplay: (track) => this.getTrackDisplay(track),
			getDuration: (track) => this.getTrackDuration(track),
			onSelect: (index) => this.selectPlaylistTrack(index),
			tracks: this.tracks,
		})
	}

	private selectPlaylistTrack(index: number): void {
		this.desiredPlaying = true
		this.restartOnNextPlay = true
		if (index === this.index) {
			this.seek(0)
			void this.play()
			return
		}

		this.index = index
		this.loadTrack()
		void this.play()
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
		this.dom.metaElement.textContent =
			display.artist || inferTrackType(track)
	}

	private preloadPlaylistMetadata(): void {
		this.metadataController.preloadPlaylistMetadata()
	}

	private togglePlaylist(): void {
		this.playlistOpen = !this.playlistOpen
	}

	private syncPlaylistButton(): void {
		this.dom.playlistButton.setAttribute(
			'aria-pressed',
			String(this.playlistOpen),
		)
	}

	private syncVolume(): void {
		this.activePlayableTrack?.setVolume(Number(this.dom.volumeInput.value))
		this.emitJuketteEvent('jukette:volumechange')
	}

	private seekFromInput(): void {
		if (!this.duration) return
		this.seek((Number(this.dom.seekInput.value) / 1000) * this.duration)
	}

	private syncAudio(): void {
		if (this.activePlayableTrack instanceof AudioPlayableTrack) {
			this.activePlayableTrack.syncFromMedia()
		}
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

	private finishTrack(): void {
		this.emitJuketteEvent('jukette:ended')
		this.next()
	}

	private stopProgressLoop(): void {
		this.progressController.stop()
	}

	private requestSoundCloudPosition(): void {
		const trackLoadId = this.trackLoadId
		this.activePlayableTrack?.requestPosition(
			() => trackLoadId !== this.trackLoadId,
		)
	}
}
