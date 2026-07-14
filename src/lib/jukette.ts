type JuketteTrackKind = 'audio' | 'soundcloud' | 'midi'
export type JuketteMidiOscillator = OscillatorType | 'auto'

export interface JuketteTrack {
	title?: string
	artist?: string
	src: string
	type?: JuketteTrackKind
}

export interface AudioFileMetadata {
	artist?: string
	title?: string
}

interface MidiNote {
	duration: number
	frequency: number
	start: number
	velocity: number
}

interface MidiSequence {
	duration: number
	metadata?: {
		program?: number
		title?: string
	}
	notes: MidiNote[]
}

interface SoundCloudWidget {
	bind(eventName: string, listener: (event?: unknown) => void): void
	getDuration(callback: (duration: number) => void): void
	getPosition(callback: (position: number) => void): void
	load(
		url: string,
		options?: {
			auto_play?: boolean
			callback?: () => void
		},
	): void
	pause(): void
	play(): void
	seekTo(milliseconds: number): void
	setVolume(volume: number): void
}

interface SoundCloudApi {
	Widget: {
		(iframe: HTMLIFrameElement | string): SoundCloudWidget
		Events: {
			FINISH: string
			PAUSE: string
			PLAY: string
			PLAY_PROGRESS: string
			READY: string
		}
	}
}

const ATTR_SRC = 'src'
const ATTR_PLAYLIST = 'playlist'
const ATTR_PRELOAD_METADATA = 'preload-metadata'
const ATTR_PREFER_MEDIA_METADATA = 'prefer-media-metadata'
const ATTR_MIDI_OSCILLATOR = 'midi-oscillator'
const ATTR_TRACK_INDEX = 'track-index'
const ATTR_TITLE = 'title'
const ATTR_ARTIST = 'artist'
const ATTR_TYPE = 'type'
const SOUNDCLOUD_API_SRC = 'https://w.soundcloud.com/player/api.js'
const HTMLElementBase =
	globalThis.HTMLElement ?? (class {} as typeof HTMLElement)
let soundCloudApiPromise: Promise<SoundCloudApi> | null = null

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null

export const inferTrackType = (track: Pick<JuketteTrack, 'src' | 'type'>) => {
	if (track.type) return track.type

	const source = track.src.toLowerCase()
	if (source.includes('soundcloud.com')) return 'soundcloud'
	if (/\.(?:mid|midi)(?:[?#].*)?$/.test(source)) return 'midi'
	return 'audio'
}

export const normalizeTrack = (value: unknown): JuketteTrack | null => {
	if (typeof value === 'string') {
		const src = value.trim()
		return src ? { src } : null
	}

	if (!isRecord(value) || typeof value.src !== 'string') return null

	const src = value.src.trim()
	if (!src) return null

	const type =
		value.type === 'audio' ||
		value.type === 'soundcloud' ||
		value.type === 'midi'
			? value.type
			: undefined

	const track: JuketteTrack = { src }

	if (typeof value.artist === 'string') track.artist = value.artist
	if (typeof value.title === 'string') track.title = value.title
	if (type) track.type = type

	return track
}

export const parsePlaylist = (value: string | null): JuketteTrack[] => {
	if (!value) return []

	try {
		const parsed = JSON.parse(value) as unknown
		const items = Array.isArray(parsed) ? parsed : [parsed]
		return items
			.map((item) => normalizeTrack(item))
			.filter((item): item is JuketteTrack => item !== null)
	} catch {
		return value
			.split('\n')
			.map((item) => normalizeTrack(item))
			.filter((item): item is JuketteTrack => item !== null)
	}
}

const getSoundCloudApi = async (): Promise<SoundCloudApi> => {
	const existingApi = (
		globalThis as typeof globalThis & { SC?: SoundCloudApi }
	).SC
	if (existingApi?.Widget) return existingApi

	if (soundCloudApiPromise) return soundCloudApiPromise
	if (typeof document === 'undefined') {
		throw new Error('SoundCloud playback requires a browser document.')
	}

	soundCloudApiPromise = new Promise((resolve, reject) => {
		const existingScript = document.querySelector<HTMLScriptElement>(
			`script[src="${SOUNDCLOUD_API_SRC}"]`,
		)
		const script = existingScript ?? document.createElement('script')

		const resolveIfReady = () => {
			const api = (
				globalThis as typeof globalThis & { SC?: SoundCloudApi }
			).SC
			if (api?.Widget) resolve(api)
		}

		script.addEventListener('load', resolveIfReady, { once: true })
		script.addEventListener(
			'error',
			() => reject(new Error('Unable to load SoundCloud Widget API.')),
			{ once: true },
		)

		if (!existingScript) {
			script.async = true
			script.src = SOUNDCLOUD_API_SRC
			document.head.append(script)
		}

		resolveIfReady()
	})

	return soundCloudApiPromise
}

export const trackFromElement = (element: Element): JuketteTrack | null => {
	if (element.localName !== 'jukette-track') return null

	return normalizeTrack({
		artist: element.getAttribute(ATTR_ARTIST) ?? undefined,
		src: element.getAttribute(ATTR_SRC) ?? '',
		title: element.getAttribute(ATTR_TITLE) ?? undefined,
		type: element.getAttribute(ATTR_TYPE) ?? undefined,
	})
}

interface SoundCloudAdapterCallbacks {
	onDuration(duration: number): void
	onFinish(): void
	onPause(): void
	onPlay(): void
	onPositionRequestComplete(): void
	onProgress(position: number): void
	onRelativeProgress(relativePosition: number): void
}

class SoundCloudAdapter {
	private eventsBound = false
	private loadedDuration = 0
	private loadedSrc = ''
	private readyPromise: Promise<void> | null = null
	private resolveReady: (() => void) | null = null
	private widget: SoundCloudWidget | null = null

	constructor(
		private readonly iframe: HTMLIFrameElement,
		private readonly callbacks: SoundCloudAdapterCallbacks,
	) {}

	get hasWidget(): boolean {
		return this.widget !== null
	}

	getPlayerUrl(src: string): string {
		const url = new URL('https://w.soundcloud.com/player/')
		url.searchParams.set('url', src)
		url.searchParams.set('auto_play', 'false')
		url.searchParams.set('visual', 'false')
		return url.toString()
	}

	prepare(src: string): void {
		if (!this.widget && !this.iframe.src) {
			this.iframe.src = this.getPlayerUrl(src)
		}
	}

	async load(src: string, isStale: () => boolean): Promise<boolean> {
		const widget = await this.getWidget(isStale)
		if (!widget || isStale()) return false
		if (this.loadedSrc === src) {
			this.emitDuration(widget, isStale)
			return true
		}

		this.readyPromise = new Promise((resolve) => {
			this.resolveReady = resolve
			widget.load(src, {
				auto_play: false,
				callback: resolve,
			})
			window.setTimeout(resolve, 1800)
		})

		await this.readyPromise
		if (isStale()) return false

		this.loadedSrc = src
		this.emitDuration(widget, isStale)
		return true
	}

	pause(): void {
		this.widget?.pause()
	}

	play(): void {
		this.widget?.play()
	}

	requestPosition(isStale: () => boolean): void {
		this.widget?.getPosition((position) => {
			if (!isStale()) {
				this.callbacks.onProgress(position / 1000)
			}
			this.callbacks.onPositionRequestComplete()
		})
	}

	seek(seconds: number): void {
		this.widget?.seekTo(Math.max(0, seconds) * 1000)
	}

	setVolume(volume: number): void {
		this.widget?.setVolume(Math.max(0, Math.min(100, volume * 100)))
	}

	private async getWidget(
		isStale: () => boolean,
	): Promise<SoundCloudWidget | null> {
		if (this.widget) return this.widget

		const api = await getSoundCloudApi()
		if (isStale()) return null

		const widget = api.Widget(this.iframe)
		this.widget = widget
		this.bindEvents(api, widget, isStale)
		widget.bind(api.Widget.Events.READY, () => {
			if (isStale() || widget !== this.widget) return

			widget.getDuration((duration) => {
				if (isStale() || widget !== this.widget) return
				this.loadedDuration = duration / 1000
				this.callbacks.onDuration(this.loadedDuration)
			})
			this.requestPosition(isStale)
			this.resolveReady?.()
		})

		return widget
	}

	private bindEvents(
		api: SoundCloudApi,
		widget: SoundCloudWidget,
		isStale: () => boolean,
	): void {
		if (this.eventsBound) return
		this.eventsBound = true

		widget.bind(api.Widget.Events.PLAY, () => {
			if (isStale() || widget !== this.widget) return
			this.callbacks.onPlay()
		})
		widget.bind(api.Widget.Events.PLAY_PROGRESS, (event) => {
			if (isStale() || widget !== this.widget) return

			if (event && typeof event === 'object') {
				if (
					'currentPosition' in event &&
					typeof event.currentPosition === 'number'
				) {
					this.callbacks.onProgress(event.currentPosition / 1000)
				}

				if (
					'relativePosition' in event &&
					typeof event.relativePosition === 'number'
				) {
					this.callbacks.onRelativeProgress(event.relativePosition)
				}
			}
		})
		widget.bind(api.Widget.Events.PAUSE, () => {
			if (isStale() || widget !== this.widget) return
			this.callbacks.onPause()
		})
		widget.bind(api.Widget.Events.FINISH, () => {
			if (isStale() || widget !== this.widget) return
			this.callbacks.onFinish()
		})
	}

	private emitDuration(
		widget: SoundCloudWidget,
		isStale: () => boolean,
	): void {
		if (this.loadedDuration > 0) {
			this.callbacks.onDuration(this.loadedDuration)
		}

		widget.getDuration((duration) => {
			if (isStale()) return
			this.loadedDuration = duration / 1000
			this.callbacks.onDuration(this.loadedDuration)
		})
	}
}

export class JukettePlayerElement extends HTMLElementBase {
	static observedAttributes = [
		ATTR_SRC,
		ATTR_PLAYLIST,
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
	private midiTimer = 0
	private midiStartedAt = 0
	private midiPausedAt = 0
	private midiAudio: AudioContext | null = null
	private midiGain: GainNode | null = null
	private midiSequence: MidiSequence | null = null
	private midiSources: OscillatorNode[] = []
	private soundCloudAdapter: SoundCloudAdapter | null = null
	private soundCloudPosition = 0
	private soundCloudPositionRequested = false
	private restartOnNextPlay = false
	private progressFrame = 0
	private metadataPreloadId = 0
	private readonly trackObserver: MutationObserver | null = null
	private playlistOverride: JuketteTrack[] | null = null

	constructor() {
		super()

		if (typeof MutationObserver !== 'undefined') {
			this.trackObserver = new MutationObserver(() =>
				this.syncChildTracks(),
			)
		}

		const shadowRoot = this.attachShadow({ mode: 'open' })
		shadowRoot.innerHTML = `
			<style>
				:host {
					--jukette-control-size: 2em;
					display: block;
					font: inherit;
					color: inherit;
				}

				* {
					box-sizing: border-box;
				}

				.player {
					border: 1px solid currentColor;
					display: grid;
					gap: 0.5lh;
					padding: 0.5rlh 1em;
				}

				.track {
					display: grid;
					min-inline-size: 0;
				}

				.title,
				.meta {
					overflow: hidden;
					text-overflow: ellipsis;
					white-space: nowrap;
				}

				.title {
					font-weight: 700;
				}

				.meta,
				.status,
				.time {
					opacity: 0.75;
				}

				.status {
					min-block-size: 1lh;
					overflow: hidden;
					text-overflow: ellipsis;
					white-space: nowrap;
				}

				.controls {
					align-items: center;
					display: grid;
					gap: 0.5lh 0.5em;
					grid-template-areas: "previous play next volume playlist";
					grid-template-columns: repeat(3, var(--jukette-control-size)) minmax(7rem, 1fr) var(--jukette-control-size);
				}

				.previous {
					grid-area: previous;
				}

				.play {
					grid-area: play;
				}

				.next {
					grid-area: next;
				}

				.volume {
					grid-area: volume;
				}

				.playlist-toggle {
					grid-area: playlist;
				}

				button {
					align-items: center;
					appearance: none;
					background: transparent;
					border: 1px solid currentColor;
					block-size: var(--jukette-control-size);
					color: inherit;
					cursor: pointer;
					display: inline-grid;
					font: inherit;
					inline-size: var(--jukette-control-size);
					justify-content: center;
					padding: 0;
				}

				button:focus-visible {
					outline: 2px solid currentColor;
					outline-offset: 0;
					outline-radius: 0;
				}

				button:active {
					background: rgb(from currentColor calc(255 - r) calc(255 - g) calc(255 - b));
					color: rgb(from currentColor calc(255 - r) calc(255 - g) calc(255 - b));
				}

				button[aria-pressed="true"] {
					background: rgb(from currentColor calc(255 - r) calc(255 - g) calc(255 - b));
					color: rgb(from currentColor calc(255 - r) calc(255 - g) calc(255 - b));
				}

				button:disabled {
					cursor: default;
					opacity: 0.45;
				}

				input[type="range"] {
					accent-color: currentColor;
				}

				.seek {
					display: grid;
				}

				.time {
					display: grid;
					gap: 0.5em;
					grid-template-columns: repeat(3, 1fr);
					font-variant-numeric: tabular-nums;
				}

				.time span:nth-child(2) {
					text-align: center;
				}

				.time span:nth-child(3) {
					text-align: end;
				}

				.playlist {
					border-block-start: 1px solid currentColor;
					counter-reset: jukette-playlist;
					display: none;
					gap: 0.5lh 0;
					list-style: none;
					margin: 0;
					padding: 1lh 0 0.5lh;
				}

				:host([playlist-open]) .playlist {
					display: grid;
				}

				.playlist li {
					align-items: start;
					counter-increment: jukette-playlist;
					display: grid;
				}

				.playlist li button {
					padding-inline: 0.5em;
				}

				.playlist li button::before {
					content: counter(jukette-playlist) ".";
					grid-column: 1;
					grid-row: 1 / span 2;
					font-variant-numeric: tabular-nums;
					text-align: end;
				}

				.playlist li button[aria-current="true"] {
					background: rgb(from currentColor calc(255 - r) calc(255 - g) calc(255 - b));
					color: rgb(from currentColor calc(255 - r) calc(255 - g) calc(255 - b));
				}

				.playlist button {
					align-items: start;
					block-size: auto;
					border: 0;
					display: grid;
					gap: 0 0.5em;
					grid-template-columns: 2ch minmax(0, 1fr) auto;
					inline-size: 100%;
					text-align: start;
				}

				.playlist-title,
				.playlist-artist {
					overflow: hidden;
					text-overflow: ellipsis;
					white-space: nowrap;
				}

				.playlist-title {
					font-weight: 700;
					grid-column: 2;
				}

				.playlist-artist,
				.playlist-duration {
					opacity: 0.75;
				}

				.playlist-duration {
					align-self: center;
					font-variant-numeric: tabular-nums;
					grid-column: 3;
					grid-row: 1 / span 2;
					white-space: nowrap;
				}

				.playlist-artist {
					grid-column: 2;
				}

				.soundcloud {
					border: 0;
					block-size: 166px;
					display: none;
					inline-size: 100%;
				}

				audio {
					display: none;
				}

				@media (max-width: 34em) {
					.controls {
						grid-template-areas:
							"volume volume volume volume volume"
							"previous play next . playlist";
						grid-template-columns: repeat(3, var(--jukette-control-size)) minmax(0, 1fr) var(--jukette-control-size);
						justify-content: start;
					}
				}
			</style>

			<div class="player">
				<div class="track" aria-live="polite">
					<div class="title"></div>
					<div class="meta"></div>
				</div>
				<div class="seek">
					<input class="seek-input" type="range" min="0" max="1000" value="0" aria-label="Seek" />
					<div class="time" aria-live="off">
						<span class="elapsed">0:00</span>
						<span class="remaining">-0:00</span>
						<span class="total">0:00</span>
					</div>
				</div>
				<div class="controls">
					<button class="previous" type="button" aria-label="Previous or restart track">&#x23ee;&#xfe0e;</button>
					<button class="play" type="button" aria-label="Play">▶</button>
					<button class="next" type="button" aria-label="Next track">&#x23ed;&#xfe0e;</button>
					<input class="volume" type="range" min="0" max="1" step="0.01" value="1" aria-label="Volume" />
					<button class="playlist-toggle" type="button" aria-label="Toggle playlist" aria-pressed="false">☰</button>
				</div>
				<div class="status" role="status" aria-live="polite"></div>
				<iframe class="soundcloud" title="SoundCloud player" allow="autoplay"></iframe>
				<audio preload="metadata"></audio>
				<ol class="playlist"></ol>
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
		this.soundCloudAdapter = new SoundCloudAdapter(this.iframe, {
			onDuration: (duration) => {
				this.duration = duration
				this.setTrackDuration(this.currentTrack, duration)
				this.syncProgress(this.soundCloudPosition, this.duration)
			},
			onFinish: () => this.next(),
			onPause: () => {
				this.desiredPlaying = false
				this.playing = false
				this.syncPlayingState()
			},
			onPlay: () => {
				this.desiredPlaying = true
				this.playing = true
				this.syncPlayingState()
			},
			onPositionRequestComplete: () => {
				this.soundCloudPositionRequested = false
			},
			onProgress: (position) => {
				this.soundCloudPosition = position
				this.soundCloudPositionRequested = false
				this.syncProgress(this.soundCloudPosition, this.duration)
			},
			onRelativeProgress: (relativePosition) => {
				if (this.duration <= 0) return
				this.soundCloudPosition = relativePosition * this.duration
				this.syncProgress(this.soundCloudPosition, this.duration)
			},
		})

		this.playButton.addEventListener('click', () => this.toggle())
		this.previousButton.addEventListener('click', () => this.previous())
		this.nextButton.addEventListener('click', () => this.next())
		this.playlistButton.addEventListener('click', () =>
			this.togglePlaylist(),
		)
		this.volumeInput.addEventListener('input', () => this.syncVolume())
		this.seekInput.addEventListener('input', () => this.seekFromInput())
		this.audio.addEventListener('loadedmetadata', () =>
			this.syncFromMedia(),
		)
		this.audio.addEventListener('timeupdate', () => this.syncFromMedia())
		this.audio.addEventListener('ended', () => this.next())
	}

	connectedCallback(): void {
		this.trackObserver?.observe(this, {
			attributeFilter: [ATTR_ARTIST, ATTR_SRC, ATTR_TITLE, ATTR_TYPE],
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
		this.stopMidi()
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

		this.syncTracks()
		this.loadTrack()
	}

	get currentTrack(): JuketteTrack | null {
		return this.tracks[this.index] ?? null
	}

	get playlist(): JuketteTrack[] {
		return [...this.tracks]
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
		if (type === 'audio') {
			this.setStatus('Starting audio')
			await this.audio.play()
			if (trackLoadId !== this.trackLoadId) return
			this.playing = true
		} else if (type === 'midi') {
			await this.playMidi(trackLoadId)
		} else if (type === 'soundcloud') {
			await this.playSoundCloud(trackLoadId)
		} else {
			this.playing = true
		}

		this.syncPlayingState()
	}

	pause(): void {
		this.setStatus()
		this.desiredPlaying = false
		if (inferTrackType(this.currentTrack ?? { src: '' }) === 'audio') {
			this.audio.pause()
		} else if (
			inferTrackType(this.currentTrack ?? { src: '' }) === 'midi'
		) {
			this.pauseMidi()
		} else if (
			inferTrackType(this.currentTrack ?? { src: '' }) === 'soundcloud'
		) {
			this.soundCloudAdapter?.pause()
		}

		this.playing = false
		this.syncPlayingState()
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
		const shouldPlay = this.desiredPlaying || this.playing
		this.index = (this.index + 1) % this.tracks.length
		this.restartOnNextPlay = true
		this.loadTrack()
		if (shouldPlay) void this.play()
	}

	previous(): void {
		if (this.tracks.length === 0) return

		if (this.currentTime > 3) {
			this.restartOnNextPlay = true
			this.seek(0)
			if (this.desiredPlaying || this.playing) void this.play()
			return
		}

		const shouldPlay = this.desiredPlaying || this.playing
		this.index = (this.index - 1 + this.tracks.length) % this.tracks.length
		this.restartOnNextPlay = true
		this.loadTrack()
		if (shouldPlay) void this.play()
	}

	seek(seconds: number): void {
		const track = this.currentTrack
		if (!track) return

		this.setStatus('Seeking')
		if (inferTrackType(track) === 'audio') {
			this.audio.currentTime = seconds
		} else if (inferTrackType(track) === 'midi') {
			this.midiPausedAt = Math.max(0, seconds)
			if (this.playing) this.playMidi()
		} else if (inferTrackType(track) === 'soundcloud') {
			this.soundCloudPosition = Math.max(0, seconds)
			this.soundCloudAdapter?.seek(seconds)
		}

		this.syncProgress(seconds, this.duration)
		window.setTimeout(() => {
			if (this.playing || !this.desiredPlaying) this.setStatus()
		}, 500)
	}

	private get currentTime(): number {
		const track = this.currentTrack
		if (!track) return 0
		if (inferTrackType(track) === 'audio') return this.audio.currentTime
		if (inferTrackType(track) === 'midi') {
			return this.playing
				? (performance.now() - this.midiStartedAt) / 1000 +
						this.midiPausedAt
				: this.midiPausedAt
		}
		if (inferTrackType(track) === 'soundcloud')
			return this.soundCloudPosition
		return 0
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

	private loadTrack(): void {
		this.trackLoadId += 1
		this.stopMidi()
		this.audio.pause()
		this.audio.removeAttribute('src')
		this.soundCloudAdapter?.pause()
		this.soundCloudPosition = 0
		this.soundCloudPositionRequested = false
		this.playing = false
		this.duration = 0
		this.midiSequence = null
		this.midiPausedAt = 0
		this.syncProgress(0, 0)

		const track = this.currentTrack
		if (!track) {
			this.titleElement.textContent = 'No track'
			this.metaElement.textContent = ''
			this.statusElement.textContent = ''
			this.playButton.disabled = true
			return
		}

		const type = inferTrackType(track)
		this.duration = this.getTrackDuration(track) ?? 0
		this.dataset.kind = type
		this.playButton.disabled = false
		this.renderCurrentTrack()
		this.setStatus()
		this.syncProgress(0, this.duration)

		if (type === 'audio') {
			this.setStatus('Loading audio')
			this.audio.src = track.src
			this.audio.volume = Number(this.volumeInput.value)
			this.audio.load()
			this.audio.currentTime = 0
			void this.preloadAudioFileMetadata(track, this.metadataPreloadId)
		} else if (type === 'soundcloud') {
			this.setStatus('Preparing SoundCloud')
			this.loadSoundCloudTrack(track)
		} else {
			this.setStatus('Ready')
			window.setTimeout(() => {
				if (!this.playing) this.setStatus()
			}, 700)
		}

		this.renderPlaylist()
		this.syncPlayingState()
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

				title.className = 'playlist-title'
				title.textContent = display.title
				artist.className = 'playlist-artist'
				artist.textContent = display.artist
				duration.className = 'playlist-duration'
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

	private getTrackDisplay(track: JuketteTrack): Required<AudioFileMetadata> {
		const metadata = this.preferMediaMetadata
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
		if (!this.preloadMetadata && !this.preferMediaMetadata) return

		const metadataPreloadId = this.metadataPreloadId
		for (const track of this.tracks) {
			const type = inferTrackType(track)
			if (type === 'audio') {
				if (this.preloadMetadata) {
					this.preloadAudioMetadata(track, metadataPreloadId)
				}
				if (this.preferMediaMetadata) {
					void this.preloadAudioFileMetadata(track, metadataPreloadId)
				}
			} else if (type === 'midi') {
				if (this.preloadMetadata || this.preferMediaMetadata) {
					void this.preloadMidiMetadata(track, metadataPreloadId)
				}
			} else if (type === 'soundcloud') {
				if (this.preferMediaMetadata) {
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
		if (!this.preferMediaMetadata) return
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
				this.setMidiTrackMetadata(track, sequence)
			}
		} catch {
			// Leave duration unknown when metadata cannot be preloaded.
		}
	}

	private async preloadSoundCloudMetadata(
		track: JuketteTrack,
		metadataPreloadId: number,
	): Promise<void> {
		if (!this.preferMediaMetadata) return
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
		const open = !this.hasAttribute('playlist-open')
		this.toggleAttribute('playlist-open', open)
		this.syncPlaylistButton()
	}

	private syncPlaylistButton(): void {
		this.playlistButton.setAttribute(
			'aria-pressed',
			String(this.hasAttribute('playlist-open')),
		)
	}

	private syncVolume(): void {
		this.audio.volume = Number(this.volumeInput.value)
		if (this.midiGain)
			this.midiGain.gain.value = Number(this.volumeInput.value)
		this.soundCloudAdapter?.setVolume(Number(this.volumeInput.value))
	}

	private seekFromInput(): void {
		if (!this.duration) return
		this.seek((Number(this.seekInput.value) / 1000) * this.duration)
	}

	private syncFromMedia(): void {
		this.duration = Number.isFinite(this.audio.duration)
			? this.audio.duration
			: 0
		this.setTrackDuration(this.currentTrack, this.duration)
		this.syncProgress(this.audio.currentTime, this.duration)
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

	private async playMidi(trackLoadId = this.trackLoadId): Promise<void> {
		const track = this.currentTrack
		if (!track) return

		if (!this.midiSequence) {
			this.setStatus('Loading MIDI')
			this.midiSequence = await loadMidiSequence(track.src)
			if (trackLoadId !== this.trackLoadId) return
			this.duration = this.midiSequence.duration
			this.setTrackDuration(track, this.duration)
			this.setMidiTrackMetadata(track, this.midiSequence)
			this.syncProgress(this.midiPausedAt, this.duration)
		}

		this.stopMidi()
		if (trackLoadId !== this.trackLoadId) return
		this.playing = true
		this.midiStartedAt = performance.now()
		this.ensureMidiAudio()

		if (!this.midiAudio || !this.midiGain || !this.midiSequence) return

		if (this.midiAudio.state === 'suspended') {
			await this.midiAudio.resume()
		}

		const startOffset = this.midiPausedAt
		const startTime = this.midiAudio.currentTime + 0.03
		const oscillatorType = resolveMidiOscillatorType(
			this.midiOscillator,
			this.midiSequence.metadata?.program,
		)
		this.midiSources = this.midiSequence.notes
			.filter((note) => note.start + note.duration > startOffset)
			.map((note) => {
				const oscillator = this.midiAudio!.createOscillator()
				const envelope = this.midiAudio!.createGain()
				const relativeStart = Math.max(0, note.start - startOffset)
				const clippedOffset = Math.max(0, startOffset - note.start)
				const clippedDuration = Math.max(
					0.03,
					note.duration - clippedOffset,
				)
				const noteStart = startTime + relativeStart
				const noteEnd = noteStart + clippedDuration

				oscillator.type = oscillatorType
				oscillator.frequency.value = note.frequency
				envelope.gain.setValueAtTime(0, noteStart)
				envelope.gain.linearRampToValueAtTime(
					note.velocity * 0.18,
					noteStart + 0.01,
				)
				envelope.gain.setValueAtTime(
					note.velocity * 0.16,
					Math.max(noteStart + 0.02, noteEnd - 0.04),
				)
				envelope.gain.linearRampToValueAtTime(0, noteEnd)
				oscillator.connect(envelope)
				envelope.connect(this.midiGain!)
				oscillator.start(noteStart)
				oscillator.stop(noteEnd + 0.02)
				return oscillator
			})

		this.midiTimer = window.setTimeout(
			() => this.next(),
			Math.max(0, this.duration - startOffset) * 1000,
		)
	}

	private async playSoundCloud(
		trackLoadId = this.trackLoadId,
	): Promise<void> {
		const track = this.currentTrack
		if (!track) return

		this.playButton.disabled = true
		this.setStatus('Loading SoundCloud')
		const isStale = () => trackLoadId !== this.trackLoadId
		const loaded = await this.soundCloudAdapter?.load(track.src, isStale)

		if (!loaded || isStale()) {
			this.playButton.disabled = false
			this.setStatus('SoundCloud unavailable')
			return
		}

		this.soundCloudAdapter?.setVolume(Number(this.volumeInput.value))
		this.playButton.disabled = false
		if (this.restartOnNextPlay) {
			this.soundCloudAdapter?.seek(0)
			this.soundCloudPosition = 0
			this.syncProgress(0, this.duration)
		}
		this.restartOnNextPlay = false
		this.soundCloudAdapter?.play()
		this.playing = true
	}

	private loadSoundCloudTrack(track: JuketteTrack): void {
		this.soundCloudPosition = 0
		this.syncProgress(0, this.getTrackDuration(track) ?? 0)
		this.soundCloudAdapter?.prepare(track.src)
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
				this.requestSoundCloudPosition()
			}

			this.syncProgress(this.currentTime, this.duration)
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
		this.syncProgress(this.currentTime, this.duration)
	}

	private requestSoundCloudPosition(): void {
		if (!this.soundCloudAdapter || this.soundCloudPositionRequested) return

		this.soundCloudPositionRequested = true
		const trackLoadId = this.trackLoadId
		window.setTimeout(() => {
			if (trackLoadId === this.trackLoadId) {
				this.soundCloudPositionRequested = false
			}
		}, 500)
		this.soundCloudAdapter.requestPosition(
			() => trackLoadId !== this.trackLoadId,
		)
	}

	private pauseMidi(): void {
		this.midiPausedAt = this.currentTime
		this.stopMidi()
	}

	private stopMidi(): void {
		if (this.midiTimer) {
			window.clearTimeout(this.midiTimer)
			this.midiTimer = 0
		}

		for (const source of this.midiSources) {
			try {
				source.stop()
			} catch {
				// Already stopped.
			}
		}
		this.midiSources = []
	}

	private ensureMidiAudio(): void {
		if (this.midiAudio && this.midiGain) return

		const AudioContextConstructor =
			globalThis.AudioContext ??
			(
				globalThis as typeof globalThis & {
					webkitAudioContext?: typeof AudioContext
				}
			).webkitAudioContext

		if (!AudioContextConstructor) {
			this.setStatus('MIDI playback needs Web Audio')
			return
		}

		this.midiAudio = new AudioContextConstructor()
		this.midiGain = this.midiAudio.createGain()
		this.midiGain.gain.value = Number(this.volumeInput.value)
		this.midiGain.connect(this.midiAudio.destination)
	}
}

const decodeAscii = (bytes: Uint8Array): string => String.fromCharCode(...bytes)

const decodeIso88591 = (bytes: Uint8Array): string =>
	String.fromCharCode(...bytes)

const decodeUtf16Be = (bytes: Uint8Array): string => {
	const codeUnits: number[] = []
	for (let index = 0; index + 1 < bytes.length; index += 2) {
		codeUnits.push((bytes[index] << 8) | bytes[index + 1])
	}
	return String.fromCharCode(...codeUnits)
}

const decodeTextBytes = (bytes: Uint8Array, encoding: string): string => {
	try {
		return new TextDecoder(encoding).decode(bytes)
	} catch {
		return encoding === 'iso-8859-1'
			? decodeIso88591(bytes)
			: decodeAscii(bytes)
	}
}

const cleanMetadataText = (value: string): string => {
	const nullIndex = value.indexOf('\u0000')
	const trimmedValue =
		nullIndex >= 0 ? value.slice(0, nullIndex) : value.trimEnd()

	return trimmedValue.trim()
}

const readSynchsafeInteger = (
	data: Uint8Array,
	offset: number,
	length = 4,
): number => {
	let value = 0
	for (let index = 0; index < length; index++) {
		value = (value << 7) | (data[offset + index] & 0x7f)
	}
	return value
}

const readUint32 = (data: Uint8Array, offset: number): number =>
	((data[offset] << 24) |
		(data[offset + 1] << 16) |
		(data[offset + 2] << 8) |
		data[offset + 3]) >>>
	0

const decodeId3TextFrame = (frameData: Uint8Array): string => {
	if (frameData.length < 2) return ''

	const encoding = frameData[0]
	const content = frameData.slice(1)
	if (encoding === 0) return cleanMetadataText(decodeIso88591(content))
	if (encoding === 3) {
		return cleanMetadataText(decodeTextBytes(content, 'utf-8'))
	}
	if (encoding === 2) return cleanMetadataText(decodeUtf16Be(content))

	return cleanMetadataText(decodeTextBytes(content, 'utf-16'))
}

export const parseAudioFileMetadata = (
	buffer: ArrayBuffer,
): AudioFileMetadata => {
	const data = new Uint8Array(buffer)
	if (data.length < 10 || decodeAscii(data.slice(0, 3)) !== 'ID3') {
		return {}
	}

	const version = data[3]
	const flags = data[5]
	const tagEnd = Math.min(data.length, 10 + readSynchsafeInteger(data, 6))
	let offset = 10

	if (flags & 0x40 && offset + 4 <= tagEnd) {
		const extendedHeaderSize =
			version === 4
				? readSynchsafeInteger(data, offset)
				: readUint32(data, offset) + 4
		offset += extendedHeaderSize
	}

	const metadata: AudioFileMetadata = {}
	while (offset + 10 <= tagEnd) {
		const frameId = decodeAscii(data.slice(offset, offset + 4))
		if (!/^[A-Z0-9]{4}$/.test(frameId)) break

		const frameSize =
			version === 4
				? readSynchsafeInteger(data, offset + 4)
				: readUint32(data, offset + 4)
		const frameStart = offset + 10
		const frameEnd = frameStart + frameSize
		if (frameSize <= 0 || frameEnd > tagEnd) break

		const frameData = data.slice(frameStart, frameEnd)
		if (frameId === 'TIT2') metadata.title = decodeId3TextFrame(frameData)
		if (frameId === 'TPE1') metadata.artist = decodeId3TextFrame(frameData)
		offset = frameEnd
	}

	return metadata
}

export const parseSoundCloudOEmbedMetadata = (
	value: unknown,
): AudioFileMetadata => {
	if (!isRecord(value) || typeof value.title !== 'string') return {}

	const title = value.title.trim()
	if (!title) return {}

	const match = /^(?<title>.+?) by (?<artist>.+)$/.exec(title)
	if (!match?.groups) return { title }

	return {
		artist: match.groups.artist.trim() || undefined,
		title: match.groups.title.trim() || title,
	}
}

class MidiReader {
	private offset = 0

	constructor(private readonly data: Uint8Array) {}

	get done(): boolean {
		return this.offset >= this.data.length
	}

	read(length: number): Uint8Array {
		const value = this.data.slice(this.offset, this.offset + length)
		this.offset += length
		return value
	}

	unread(length = 1): void {
		this.offset = Math.max(0, this.offset - length)
	}

	readText(length: number): string {
		return String.fromCharCode(...this.read(length))
	}

	readU8(): number {
		return this.data[this.offset++] ?? 0
	}

	readU16(): number {
		return (this.readU8() << 8) | this.readU8()
	}

	readU32(): number {
		return (
			(this.readU8() << 24) |
			(this.readU8() << 16) |
			(this.readU8() << 8) |
			this.readU8()
		)
	}

	readVar(): number {
		let value = 0
		let byte: number

		do {
			byte = this.readU8()
			value = (value << 7) | (byte & 0x7f)
		} while (byte & 0x80)

		return value
	}
}

const midiNoteFrequency = (note: number): number =>
	440 * Math.pow(2, (note - 69) / 12)

const decodeMidiText = (bytes: Uint8Array): string =>
	cleanMetadataText(decodeTextBytes(bytes, 'utf-8'))

export const normalizeMidiOscillator = (
	value: string | null,
): JuketteMidiOscillator => {
	if (
		value === 'sine' ||
		value === 'square' ||
		value === 'sawtooth' ||
		value === 'triangle'
	) {
		return value
	}

	return 'auto'
}

export const midiProgramToOscillator = (program?: number): OscillatorType => {
	if (program === undefined) return 'triangle'
	if (program >= 16 && program <= 23) return 'sine'
	if (program >= 32 && program <= 39) return 'square'
	if (program >= 80 && program <= 87) return 'square'
	if (program >= 56 && program <= 87) return 'sawtooth'

	return 'triangle'
}

export const resolveMidiOscillatorType = (
	oscillator: JuketteMidiOscillator,
	program?: number,
): OscillatorType =>
	oscillator === 'auto' ? midiProgramToOscillator(program) : oscillator

export const parseMidi = (buffer: ArrayBuffer): MidiSequence => {
	const reader = new MidiReader(new Uint8Array(buffer))
	if (reader.readText(4) !== 'MThd') throw new Error('Invalid MIDI header.')

	const headerLength = reader.readU32()
	reader.readU16()
	const trackCount = reader.readU16()
	const division = reader.readU16()
	if (headerLength > 6) reader.read(headerLength - 6)
	if (division & 0x8000)
		throw new Error('SMPTE MIDI timing is not supported.')

	const ticksPerBeat = division
	const notes: MidiNote[] = []
	const metadata: AudioFileMetadata = {}
	let program: number | undefined
	let tempo = 500000
	let duration = 0

	for (
		let trackIndex = 0;
		trackIndex < trackCount && !reader.done;
		trackIndex++
	) {
		if (reader.readText(4) !== 'MTrk') break

		const trackReader = new MidiReader(reader.read(reader.readU32()))
		const activeNotes = new Map<
			number,
			{ start: number; velocity: number }
		>()
		let runningStatus = 0
		let seconds = 0

		while (!trackReader.done) {
			const delta = trackReader.readVar()
			seconds += (delta * tempo) / ticksPerBeat / 1000000
			let status = trackReader.readU8()

			if (status < 0x80) {
				trackReader.unread()
				status = runningStatus
			} else {
				runningStatus = status
			}

			if (status === 0xff) {
				const type = trackReader.readU8()
				const length = trackReader.readVar()
				if (type === 0x51 && length === 3) {
					const bytes = trackReader.read(3)
					tempo = (bytes[0] << 16) | (bytes[1] << 8) | bytes[2]
				} else if (type === 0x03) {
					const title = decodeMidiText(trackReader.read(length))
					if (!metadata.title && title) metadata.title = title
				} else {
					trackReader.read(length)
				}
				continue
			}

			if (status === 0xf0 || status === 0xf7) {
				trackReader.read(trackReader.readVar())
				continue
			}

			const command = status & 0xf0
			if (command === 0xc0) {
				const nextProgram = trackReader.readU8()
				if (program === undefined) program = nextProgram
				continue
			}

			if (command === 0xd0) {
				trackReader.readU8()
				continue
			}

			const note = trackReader.readU8()
			const velocity = trackReader.readU8()

			if (command === 0x90 && velocity > 0) {
				activeNotes.set(note, {
					start: seconds,
					velocity: velocity / 127,
				})
			} else if (command === 0x80 || command === 0x90) {
				const active = activeNotes.get(note)
				if (active) {
					notes.push({
						duration: Math.max(0.03, seconds - active.start),
						frequency: midiNoteFrequency(note),
						start: active.start,
						velocity: active.velocity,
					})
					activeNotes.delete(note)
				}
			}

			duration = Math.max(duration, seconds)
		}
	}

	const sequenceMetadata: MidiSequence['metadata'] = {}
	if (metadata.title) sequenceMetadata.title = metadata.title
	if (program !== undefined) sequenceMetadata.program = program

	return {
		duration: Math.max(duration, 1),
		metadata:
			sequenceMetadata.title || sequenceMetadata.program !== undefined
				? sequenceMetadata
				: undefined,
		notes,
	}
}

export const loadMidiSequence = async (src: string): Promise<MidiSequence> => {
	const response = await fetch(src)
	if (!response.ok) throw new Error(`Unable to load MIDI file: ${src}`)
	return parseMidi(await response.arrayBuffer())
}

export const defineJuketteElement = (): void => {
	if (typeof customElements === 'undefined') return

	if (!customElements.get('jukette-track')) {
		customElements.define('jukette-track', JuketteTrackElement)
	}

	if (!customElements.get('jukette-player')) {
		customElements.define('jukette-player', JukettePlayerElement)
	}
}

export class JuketteTrackElement extends HTMLElementBase {}

export const defineJuketteElements = defineJuketteElement

declare global {
	interface HTMLElementTagNameMap {
		'jukette-player': JukettePlayerElement
		'jukette-track': JuketteTrackElement
	}
}
