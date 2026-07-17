import {
	ATTR_ARTIST,
	ATTR_MIDI_OSCILLATOR,
	ATTR_PLAYLIST,
	ATTR_PLAYLIST_OPEN,
	ATTR_PREFER_MEDIA_METADATA,
	ATTR_PRELOAD_METADATA,
	ATTR_SRC,
	ATTR_TITLE,
	ATTR_TRACK_INDEX,
	ATTR_TYPE,
} from './attributes'
import { HTMLElementBase } from './dom'
import { createJuketteEventDetail } from './events'
import { playerStyles } from './jukette-player.css.generated'
import {
	parseAudioFileMetadata,
	parseSoundCloudOEmbedMetadata,
} from './metadata'
import { loadMidiSequence, normalizeMidiOscillator } from './midi'
import { AudioPlayableTrack } from './audio-track'
import { MidiPlayableTrack } from './midi-track'
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
	JuketteTrack,
	MidiSequence,
} from './types'

export class JukettePlayerElement extends HTMLElementBase {
	static observedAttributes = [
		ATTR_SRC,
		ATTR_PLAYLIST,
		ATTR_PLAYLIST_OPEN,
		ATTR_PRELOAD_METADATA,
		ATTR_PREFER_MEDIA_METADATA,
		ATTR_MIDI_OSCILLATOR,
		ATTR_TRACK_INDEX,
	]

	private readonly audio: HTMLAudioElement
	private readonly iframe: HTMLIFrameElement
	private readonly playButton: HTMLButtonElement
	private readonly previousButton: HTMLButtonElement
	private readonly nextButton: HTMLButtonElement
	private readonly volumeInput: HTMLInputElement
	private readonly seekInput: HTMLInputElement
	private readonly playlistButton: HTMLButtonElement
	private readonly playlistElement: HTMLOListElement
	private readonly titleElement: HTMLElement
	private readonly metaElement: HTMLElement
	private readonly statusElement: HTMLElement
	private readonly elapsedTimeElement: HTMLElement
	private readonly remainingTimeElement: HTMLElement
	private readonly totalTimeElement: HTMLElement
	private tracks: JuketteTrack[] = []
	private trackDurations = new Map<string, number>()
	private trackMetadata = new Map<string, AudioFileMetadata>()
	private index = 0
	private desiredPlaying = false
	private playing = false
	private trackLoadId = 0
	private duration = 0
	private activePlayableTrack: JukettePlayableTrack | null = null
	private restartOnNextPlay = false
	private progressFrame = 0
	private metadataPreloadId = 0
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

		const shadowRoot = this.attachShadow({ mode: 'open' })
		shadowRoot.innerHTML = `
			<style>${playerStyles}</style>

			<div class="player" part="player">
				<div class="track" part="track" aria-live="polite">
					<div class="title" part="title"></div>
					<div class="meta" part="artist"></div>
				</div>
				<div class="progress" part="progress">
					<div class="status" part="status" role="status" aria-live="polite"></div>
					<div class="seek" part="seek">
						<input class="seek-input" part="seek-input" type="range" min="0" max="1000" value="0" aria-label="Seek" />
						<div class="time" part="time" aria-live="off">
							<span class="elapsed" part="elapsed">0:00</span>
							<span class="remaining" part="remaining">-0:00</span>
							<span class="total" part="total">0:00</span>
						</div>
					</div>
				</div>
				<div class="controls" part="controls">
					<button class="previous" part="button previous-button" type="button" aria-label="Previous or restart track">&#x23ee;&#xfe0e;</button>
					<button class="play" part="button play-button" type="button" aria-label="Play">▶</button>
					<button class="next" part="button next-button" type="button" aria-label="Next track">&#x23ed;&#xfe0e;</button>
					<input class="volume" part="volume" type="range" min="0" max="1" step="0.01" value="1" aria-label="Volume" />
					<button class="playlist-toggle" part="button playlist-button" type="button" aria-label="Toggle playlist" aria-pressed="false">☰</button>
				</div>
				<iframe class="soundcloud" part="soundcloud" title="SoundCloud player" allow="autoplay"></iframe>
				<audio preload="metadata"></audio>
				<ol class="playlist" part="playlist"></ol>
			</div>
		`

		this.audio = this.query<HTMLAudioElement>(shadowRoot, 'audio')
		this.iframe = this.query<HTMLIFrameElement>(shadowRoot, '.soundcloud')
		this.playButton = this.query<HTMLButtonElement>(shadowRoot, '.play')
		this.previousButton = this.query<HTMLButtonElement>(
			shadowRoot,
			'.previous',
		)
		this.nextButton = this.query<HTMLButtonElement>(shadowRoot, '.next')
		this.volumeInput = this.query<HTMLInputElement>(shadowRoot, '.volume')
		this.seekInput = this.query<HTMLInputElement>(shadowRoot, '.seek-input')
		this.playlistButton = this.query<HTMLButtonElement>(
			shadowRoot,
			'.playlist-toggle',
		)
		this.playlistElement = this.query<HTMLOListElement>(
			shadowRoot,
			'.playlist',
		)
		this.titleElement = this.query<HTMLElement>(shadowRoot, '.title')
		this.metaElement = this.query<HTMLElement>(shadowRoot, '.meta')
		this.statusElement = this.query<HTMLElement>(shadowRoot, '.status')
		this.elapsedTimeElement = this.query<HTMLElement>(
			shadowRoot,
			'.elapsed',
		)
		this.remainingTimeElement = this.query<HTMLElement>(
			shadowRoot,
			'.remaining',
		)
		this.totalTimeElement = this.query<HTMLElement>(shadowRoot, '.total')

		this.playButton.addEventListener('click', () => this.toggle())
		this.previousButton.addEventListener('click', () => this.previous())
		this.nextButton.addEventListener('click', () => this.next())
		this.playlistButton.addEventListener('click', () =>
			this.togglePlaylist(),
		)
		this.volumeInput.addEventListener('input', () => this.syncVolume())
		this.seekInput.addEventListener('input', () => this.seekFromInput())
		this.audio.addEventListener('loadedmetadata', () => this.syncAudio())
		this.audio.addEventListener('timeupdate', () => this.syncAudio())
		this.audio.addEventListener('ended', () => this.finishTrack())
	}

	connectedCallback(): void {
		this.trackObserver?.observe(this, {
			attributeFilter: [
				ATTR_ARTIST,
				ATTR_PREFER_MEDIA_METADATA,
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
			this.renderPlaylist()
			this.preloadPlaylistMetadata()
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
			volume: Number(this.volumeInput.value),
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
			volume: Number(this.volumeInput.value),
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

	private query<T extends Element>(root: ParentNode, selector: string): T {
		const element = root.querySelector<T>(selector)
		if (!element) throw new Error(`Missing Jukette element: ${selector}`)
		return element
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
		const callbacks = {
			onDuration: (duration: number) => {
				this.duration = duration
				this.setTrackDuration(track, duration)
				this.syncProgress(this.getCurrentTime(), this.duration)
			},
			onFinish: () => this.finishTrack(),
			onMetadata: (
				metadata: AudioFileMetadata,
				metadataPreloadId?: number,
			) => {
				if (
					metadataPreloadId !== undefined &&
					metadataPreloadId !== this.metadataPreloadId
				) {
					return
				}
				if (!this.trackPrefersMediaMetadata(track)) return
				this.setTrackMetadata(track, metadata)
			},
			onPause: () => {
				const wasPlaying = this.playing || this.desiredPlaying
				this.desiredPlaying = false
				this.playing = false
				this.syncPlayingState()
				if (wasPlaying) this.emitJuketteEvent('jukette:pause')
			},
			onPlay: () => {
				this.desiredPlaying = true
				this.playing = true
				this.syncPlayingState()
				this.emitJuketteEvent('jukette:play')
			},
			onProgress: (currentTime: number, duration: number) => {
				this.syncProgress(currentTime, duration)
			},
			onStatus: (message = '') => this.setStatus(message),
		}

		const type = inferTrackType(track)
		if (type === 'audio') {
			return new AudioPlayableTrack(track, this.audio, callbacks)
		}
		if (type === 'midi') {
			return new MidiPlayableTrack(
				track,
				callbacks,
				() => this.midiOscillator,
			)
		}
		return new SoundCloudPlayableTrack(track, this.iframe, callbacks)
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
			this.titleElement.textContent = 'No track'
			this.metaElement.textContent = ''
			this.statusElement.textContent = ''
			this.playButton.disabled = true
			if (previousTrackKey) this.emitJuketteEvent('jukette:trackchange')
			return
		}

		const type = inferTrackType(track)
		const trackKey = this.getTrackKey(track)
		this.loadedTrackKey = trackKey
		this.duration = this.getTrackDuration(track) ?? 0
		this.dataset.kind = type
		this.playButton.disabled = false
		this.renderCurrentTrack()
		this.setStatus()
		this.syncProgress(0, this.duration)
		this.activePlayableTrack = this.createPlayableTrack(track)

		void this.activePlayableTrack.load({
			metadataPreloadId: this.metadataPreloadId,
			restart: this.restartOnNextPlay,
			volume: Number(this.volumeInput.value),
		})

		this.renderPlaylist()
		this.syncPlayingState()
		if (trackKey !== previousTrackKey) {
			this.emitJuketteEvent('jukette:trackchange')
		}
	}

	private renderPlaylist(): void {
		this.playlistElement.replaceChildren(
			...this.tracks.map((track, index) => {
				const display = this.getTrackDisplay(track)
				const item = document.createElement('li')
				const button = document.createElement('button')
				const title = document.createElement('span')
				const artist = document.createElement('span')
				const duration = document.createElement('span')
				const durationValue = this.getTrackDuration(track)
				const durationText =
					durationValue === undefined
						? '--:--'
						: this.formatTime(durationValue)

				button.type = 'button'
				button.part.add('playlist-track')
				button.setAttribute(
					'aria-label',
					[
						display.title,
						display.artist,
						durationValue === undefined
							? 'unknown duration'
							: durationText,
					]
						.filter(Boolean)
						.join(', '),
				)

				item.part.add('playlist-item')
				title.className = 'playlist-title'
				title.part.add('playlist-title')
				title.textContent = display.title
				artist.className = 'playlist-artist'
				artist.part.add('playlist-artist')
				artist.textContent = display.artist
				duration.className = 'playlist-duration'
				duration.part.add('playlist-duration')
				duration.textContent = durationText

				button.append(title, artist, duration)
				if (index === this.index) {
					button.setAttribute('aria-current', 'true')
				}
				button.addEventListener('click', () => {
					this.desiredPlaying = true
					this.restartOnNextPlay = true
					this.index = index
					this.loadTrack()
					void this.play()
				})
				item.append(button)
				return item
			}),
		)
	}

	private getTrackDuration(track: JuketteTrack | null): number | undefined {
		if (!track) return undefined

		return this.trackDurations.get(this.getTrackKey(track))
	}

	private setTrackDuration(
		track: JuketteTrack | null,
		duration: number,
	): void {
		if (!track || !Number.isFinite(duration) || duration <= 0) return

		const key = this.getTrackKey(track)
		const currentDuration = this.trackDurations.get(key)
		if (
			currentDuration !== undefined &&
			Math.abs(currentDuration - duration) < 0.5
		) {
			return
		}

		this.trackDurations.set(key, duration)
		this.renderPlaylist()
	}

	private getTrackKey(track: JuketteTrack): string {
		return `${inferTrackType(track)}:${track.src}`
	}

	private trackPrefersMediaMetadata(track: JuketteTrack): boolean {
		return track.preferMediaMetadata ?? this.preferMediaMetadata
	}

	private getTrackDisplay(track: JuketteTrack): Required<AudioFileMetadata> {
		const metadata = this.trackPrefersMediaMetadata(track)
			? this.trackMetadata.get(this.getTrackKey(track))
			: undefined

		return {
			artist: metadata?.artist || track.artist || '',
			title: metadata?.title || track.title || track.src,
		}
	}

	private renderCurrentTrack(): void {
		const track = this.currentTrack
		if (!track) return

		const display = this.getTrackDisplay(track)
		this.titleElement.textContent = display.title
		this.metaElement.textContent = display.artist || inferTrackType(track)
	}

	private setTrackMetadata(
		track: JuketteTrack | null,
		metadata: AudioFileMetadata,
	): void {
		if (!track) return

		const nextMetadata = {
			artist: metadata.artist?.trim() || undefined,
			title: metadata.title?.trim() || undefined,
		}
		if (!nextMetadata.artist && !nextMetadata.title) return

		const key = this.getTrackKey(track)
		const currentMetadata = this.trackMetadata.get(key)
		if (
			currentMetadata !== undefined &&
			currentMetadata.artist === nextMetadata.artist &&
			currentMetadata.title === nextMetadata.title
		) {
			return
		}

		this.trackMetadata.set(key, nextMetadata)
		if (this.currentTrack && this.getTrackKey(this.currentTrack) === key) {
			this.renderCurrentTrack()
		}
		this.renderPlaylist()
	}

	private preloadPlaylistMetadata(): void {
		this.metadataPreloadId += 1
		const hasMetadataPreference = this.tracks.some((track) =>
			this.trackPrefersMediaMetadata(track),
		)
		if (!this.preloadMetadata && !hasMetadataPreference) return

		const metadataPreloadId = this.metadataPreloadId
		for (const track of this.tracks) {
			const type = inferTrackType(track)
			const preferMediaMetadata = this.trackPrefersMediaMetadata(track)
			if (type === 'audio') {
				if (this.preloadMetadata) {
					this.preloadAudioMetadata(track, metadataPreloadId)
				}
				if (preferMediaMetadata) {
					void this.preloadAudioFileMetadata(track, metadataPreloadId)
				}
			} else if (type === 'midi') {
				if (this.preloadMetadata || preferMediaMetadata) {
					void this.preloadMidiMetadata(track, metadataPreloadId)
				}
			} else if (type === 'soundcloud') {
				if (preferMediaMetadata) {
					void this.preloadSoundCloudMetadata(
						track,
						metadataPreloadId,
					)
				}
			}
		}
	}

	private preloadAudioMetadata(
		track: JuketteTrack,
		metadataPreloadId: number,
	): void {
		if (this.getTrackDuration(track) !== undefined) return
		if (typeof Audio === 'undefined') return

		const audio = new Audio()
		const cleanup = () => {
			audio.removeEventListener('loadedmetadata', onLoadedMetadata)
			audio.removeEventListener('error', cleanup)
			audio.removeAttribute('src')
			audio.load()
		}
		const onLoadedMetadata = () => {
			if (metadataPreloadId === this.metadataPreloadId) {
				this.setTrackDuration(track, audio.duration)
			}
			cleanup()
		}

		audio.preload = 'metadata'
		audio.addEventListener('loadedmetadata', onLoadedMetadata)
		audio.addEventListener('error', cleanup, { once: true })
		audio.src = track.src
		audio.load()
	}

	private async preloadAudioFileMetadata(
		track: JuketteTrack,
		metadataPreloadId: number,
	): Promise<void> {
		if (!this.trackPrefersMediaMetadata(track)) return
		if (this.trackMetadata.has(this.getTrackKey(track))) return
		if (typeof fetch === 'undefined') return

		try {
			const response = await fetch(track.src, {
				headers: { Range: 'bytes=0-65535' },
			})
			if (!response.ok) return

			const metadata = parseAudioFileMetadata(
				await response.arrayBuffer(),
			)
			if (metadataPreloadId === this.metadataPreloadId) {
				this.setTrackMetadata(track, metadata)
			}
		} catch {
			// Leave authored title and artist in place when tags cannot be read.
		}
	}

	private async preloadMidiMetadata(
		track: JuketteTrack,
		metadataPreloadId: number,
	): Promise<void> {
		try {
			const sequence = await loadMidiSequence(track.src)
			if (metadataPreloadId === this.metadataPreloadId) {
				if (this.preloadMetadata) {
					this.setTrackDuration(track, sequence.duration)
				}
				if (this.trackPrefersMediaMetadata(track)) {
					this.setMidiTrackMetadata(track, sequence)
				}
			}
		} catch {
			// Leave duration unknown when metadata cannot be preloaded.
		}
	}

	private async preloadSoundCloudMetadata(
		track: JuketteTrack,
		metadataPreloadId: number,
	): Promise<void> {
		if (!this.trackPrefersMediaMetadata(track)) return
		if (this.trackMetadata.has(this.getTrackKey(track))) return
		if (typeof fetch === 'undefined') return

		try {
			const url = new URL('https://soundcloud.com/oembed')
			url.searchParams.set('format', 'json')
			url.searchParams.set('url', track.src)

			const response = await fetch(url)
			if (!response.ok) return

			const metadata = parseSoundCloudOEmbedMetadata(
				await response.json(),
			)
			if (metadataPreloadId === this.metadataPreloadId) {
				this.setTrackMetadata(track, metadata)
			}
		} catch {
			// Leave authored title and artist in place when oEmbed is unavailable.
		}
	}

	private setMidiTrackMetadata(
		track: JuketteTrack,
		sequence: MidiSequence,
	): void {
		if (!sequence.metadata?.title) return

		this.setTrackMetadata(track, { title: sequence.metadata.title })
	}

	private togglePlaylist(): void {
		this.playlistOpen = !this.playlistOpen
	}

	private syncPlaylistButton(): void {
		this.playlistButton.setAttribute(
			'aria-pressed',
			String(this.playlistOpen),
		)
	}

	private syncVolume(): void {
		this.activePlayableTrack?.setVolume(Number(this.volumeInput.value))
		this.emitJuketteEvent('jukette:volumechange')
	}

	private seekFromInput(): void {
		if (!this.duration) return
		this.seek((Number(this.seekInput.value) / 1000) * this.duration)
	}

	private syncAudio(): void {
		if (this.activePlayableTrack instanceof AudioPlayableTrack) {
			this.activePlayableTrack.syncFromMedia()
		}
		if (!this.playing) this.setStatus()
	}

	private syncProgress(currentTime: number, duration: number): void {
		const safeDuration = Number.isFinite(duration)
			? Math.max(0, duration)
			: 0
		const safeCurrentTime = Number.isFinite(currentTime)
			? Math.min(
					Math.max(0, currentTime),
					safeDuration || Number.MAX_SAFE_INTEGER,
				)
			: 0
		const ratio =
			safeDuration > 0
				? Math.min(1, Math.max(0, safeCurrentTime / safeDuration))
				: 0
		this.seekInput.value = String(Math.round(ratio * 1000))
		this.elapsedTimeElement.textContent = this.formatTime(safeCurrentTime)
		this.remainingTimeElement.textContent = `-${this.formatTime(
			Math.max(0, safeDuration - safeCurrentTime),
		)}`
		this.totalTimeElement.textContent = this.formatTime(safeDuration)
	}

	private formatTime(seconds: number): string {
		const safeSeconds = Number.isFinite(seconds) ? Math.max(0, seconds) : 0
		const roundedSeconds = Math.floor(safeSeconds)
		const minutes = Math.floor(roundedSeconds / 60)
		const remainder = roundedSeconds % 60

		return `${minutes}:${String(remainder).padStart(2, '0')}`
	}

	private syncPlayingState(): void {
		this.playButton.textContent = this.playing ? 'Ⅱ' : '▶'
		this.playButton.setAttribute(
			'aria-label',
			this.playing ? 'Pause' : 'Play',
		)
		if (this.playing) {
			this.setStatus()
			this.startProgressLoop()
		} else {
			this.stopProgressLoop()
		}
	}

	private setStatus(message = ''): void {
		this.statusElement.textContent = message
	}

	private finishTrack(): void {
		this.emitJuketteEvent('jukette:ended')
		this.next()
	}

	private startProgressLoop(): void {
		if (
			this.progressFrame ||
			typeof requestAnimationFrame === 'undefined'
		) {
			return
		}

		const tick = () => {
			if (!this.playing) {
				this.progressFrame = 0
				return
			}

			if (
				inferTrackType(this.currentTrack ?? { src: '' }) ===
				'soundcloud'
			) {
				const trackLoadId = this.trackLoadId
				this.activePlayableTrack?.requestPosition(
					() => trackLoadId !== this.trackLoadId,
				)
			}

			this.syncProgress(this.getCurrentTime(), this.duration)
			this.progressFrame = requestAnimationFrame(tick)
		}

		this.progressFrame = requestAnimationFrame(tick)
	}

	private stopProgressLoop(): void {
		if (
			!this.progressFrame ||
			typeof cancelAnimationFrame === 'undefined'
		) {
			this.progressFrame = 0
			return
		}

		cancelAnimationFrame(this.progressFrame)
		this.progressFrame = 0
		this.syncProgress(this.getCurrentTime(), this.duration)
	}
}
