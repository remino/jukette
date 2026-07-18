import {
	JukettePlayableTrack,
	registerJuketteBackend,
	type AudioFileMetadata,
	type JuketteBackend,
	type JuketteBackendPreloadOptions,
	type JuketteBackendPreloadResult,
	type JuketteTrack,
	type PlayableTrackCallbacks,
	type PlayableTrackLoadOptions,
	type PlayableTrackPlayOptions,
} from '@remino/jukette-core'

const soundCloudWidgetApiUrl = 'https://w.soundcloud.com/player/api.js'
const soundCloudOEmbedUrl = 'https://soundcloud.com/oembed'
const soundCloudRootAttribute = 'data-jukette-soundcloud-root'
const soundCloudPlayerType = 'soundcloud'

type SoundCloudEventPayload = {
	currentPosition?: number
	loadProgress?: number
	relativePosition?: number
}

interface SoundCloudWidget {
	bind(
		eventName: string,
		listener: (payload?: SoundCloudEventPayload) => void,
	): void
	getDuration(callback: (duration: number) => void): void
	getPosition(callback: (position: number) => void): void
	pause(): void
	play(): void
	seekTo(milliseconds: number): void
}

interface SoundCloudWidgetFactory {
	(iframe: HTMLIFrameElement | string): SoundCloudWidget
	Events: {
		ERROR: string
		FINISH: string
		PAUSE: string
		PLAY: string
		PLAY_PROGRESS: string
		READY: string
	}
}

interface SoundCloudWindow {
	Widget: SoundCloudWidgetFactory
}

interface SoundCloudOEmbedResponse {
	author_name?: string
	html?: string
	title?: string
}

declare global {
	interface Window {
		SC?: SoundCloudWindow
	}
}

let soundCloudWidgetPromise: Promise<SoundCloudWindow> | null = null

const elementStates = new WeakMap<Element, SoundCloudTrackState>()
const hostStates = new WeakMap<HTMLElement, Map<string, SoundCloudTrackState>>()

const getSoundCloudWindow = (): SoundCloudWindow | null =>
	typeof window !== 'undefined' && window.SC?.Widget ? window.SC : null

const ensureSoundCloudWidgetApi = async (): Promise<SoundCloudWindow> => {
	const available = getSoundCloudWindow()
	if (available) return available
	if (soundCloudWidgetPromise) return soundCloudWidgetPromise
	if (typeof document === 'undefined') {
		throw new Error('SoundCloud widget API requires a document context.')
	}

	soundCloudWidgetPromise = new Promise((resolve, reject) => {
		const existingScript = document.querySelector<HTMLScriptElement>(
			`script[src="${soundCloudWidgetApiUrl}"]`,
		)
		const script = existingScript ?? document.createElement('script')
		const cleanup = () => {
			script.removeEventListener('load', onLoad)
			script.removeEventListener('error', onError)
		}
		const onError = () => {
			cleanup()
			soundCloudWidgetPromise = null
			reject(new Error('Failed to load the SoundCloud widget API.'))
		}
		const onLoad = () => {
			cleanup()
			const nextAvailable = getSoundCloudWindow()
			if (!nextAvailable) {
				soundCloudWidgetPromise = null
				reject(new Error('SoundCloud widget API did not initialize.'))
				return
			}
			resolve(nextAvailable)
		}

		script.addEventListener('load', onLoad, { once: true })
		script.addEventListener('error', onError, { once: true })
		if (!existingScript) {
			script.async = true
			script.src = soundCloudWidgetApiUrl
			document.head.append(script)
		}
	})

	return soundCloudWidgetPromise
}

const getHostStateKey = (track: JuketteTrack) =>
	`${track.type ?? soundCloudPlayerType}:${track.src}`

const parseSoundCloudMetadata = (
	oembed: SoundCloudOEmbedResponse,
): AudioFileMetadata | undefined => {
	const title = oembed.title?.replace(/\s+by\s+[^]+$/, '').trim()
	const artist = oembed.author_name?.trim()
	if (!title && !artist) return
	return { artist, title }
}

const parseSoundCloudIframeSrc = (
	oembed: SoundCloudOEmbedResponse,
): string | null => {
	if (!oembed.html || typeof document === 'undefined') return null

	const template = document.createElement('template')
	template.innerHTML = oembed.html
	const iframe = template.content.querySelector('iframe')
	return iframe?.getAttribute('src') ?? null
}

const createHiddenIframe = (src: string): HTMLIFrameElement => {
	const iframe = document.createElement('iframe')
	iframe.src = src
	iframe.hidden = true
	iframe.tabIndex = -1
	iframe.title = 'SoundCloud player'
	iframe.setAttribute('aria-hidden', 'true')
	iframe.setAttribute('allow', 'autoplay; encrypted-media')
	iframe.setAttribute('data-jukette-soundcloud-iframe', '')
	iframe.style.blockSize = '0'
	iframe.style.border = '0'
	iframe.style.inlineSize = '0'
	iframe.style.opacity = '0'
	iframe.style.pointerEvents = 'none'
	iframe.style.position = 'absolute'
	return iframe
}

const getSoundCloudRoot = (host: HTMLElement): HTMLElement => {
	const rootNode = host.shadowRoot ?? host
	const existing = rootNode.querySelector<HTMLElement>(
		`[${soundCloudRootAttribute}]`,
	)
	if (existing) return existing

	const root = document.createElement('div')
	root.hidden = true
	root.setAttribute(soundCloudRootAttribute, '')
	root.style.display = 'none'
	rootNode.append(root)
	return root
}

class SoundCloudTrackState {
	private activeTrack: SoundCloudPlayableTrack | null = null
	private durationSeconds = 0
	private iframeElement: HTMLIFrameElement | null = null
	private metadata: AudioFileMetadata | undefined
	private oEmbedPromise: Promise<SoundCloudOEmbedResponse> | null = null
	private playing = false
	private positionSeconds = 0
	private ready = false
	private widget: SoundCloudWidget | null = null
	private widgetReadyPromise: Promise<void> | null = null
	private widgetReadyReject: ((reason?: unknown) => void) | null = null
	private widgetReadyResolve: (() => void) | null = null

	constructor(
		private readonly track: JuketteTrack,
		private readonly host: HTMLElement,
		private readonly trackElement: Element | null,
	) {}

	get currentTime(): number {
		return this.positionSeconds
	}

	get duration(): number {
		return this.durationSeconds
	}

	attach(track: SoundCloudPlayableTrack): void {
		this.activeTrack = track
	}

	detach(track: SoundCloudPlayableTrack): void {
		if (this.activeTrack === track) {
			this.activeTrack = null
			this.playing = false
		}
	}

	async preload(
		options: JuketteBackendPreloadOptions,
	): Promise<JuketteBackendPreloadResult | void> {
		if (
			!options.prepare &&
			!options.preloadDuration &&
			!options.preloadMetadata
		) {
			return
		}

		if (options.preloadMetadata || options.prepare) {
			await this.ensureOEmbed()
		}
		if (options.prepare || options.preloadDuration) {
			await this.ensurePrepared()
		}

		return {
			duration: this.durationSeconds || undefined,
			metadata: this.metadata,
		}
	}

	async load(_options: PlayableTrackLoadOptions): Promise<void> {
		this.playing = false
		this.activeTrack?.trackCallbacks.onStatus('Loading SoundCloud')
		await this.ensureOEmbed()
		await this.ensurePrepared()
		this.widget?.pause()
		this.seekTo(0)
		this.activeTrack?.trackCallbacks.onMetadata(this.metadata ?? {})
		if (this.durationSeconds > 0) {
			this.activeTrack?.trackCallbacks.onDuration(this.durationSeconds)
		}
		this.activeTrack?.trackCallbacks.onProgress(
			this.positionSeconds,
			this.durationSeconds,
		)
		this.activeTrack?.trackCallbacks.onReady()
		this.activeTrack?.trackCallbacks.onStatus()
	}

	async play(options: PlayableTrackPlayOptions): Promise<boolean> {
		await this.ensurePrepared()
		if (options.isStale()) return false
		if (!this.widget) return false

		if (
			options.restart ||
			(this.durationSeconds > 0 &&
				this.positionSeconds >= this.durationSeconds)
		) {
			this.seekTo(0)
		}

		this.activeTrack?.trackCallbacks.onStatus('Starting SoundCloud')
		this.widget.play()
		return false
	}

	pause(): void {
		this.playing = false
		this.widget?.pause()
	}

	seekTo(seconds: number): void {
		const safeSeconds = Math.max(0, seconds)
		this.positionSeconds = safeSeconds
		this.widget?.seekTo(Math.round(safeSeconds * 1000))
	}

	async requestPosition(): Promise<void> {
		if (!this.widget) return

		const [position, duration] = await Promise.all([
			new Promise<number>((resolve) =>
				this.widget?.getPosition((value) => resolve(value / 1000)),
			),
			new Promise<number>((resolve) =>
				this.widget?.getDuration((value) => resolve(value / 1000)),
			),
		])
		if (duration > 0) this.durationSeconds = duration
		if (position >= 0) this.positionSeconds = position
		this.activeTrack?.trackCallbacks.onProgress(
			this.positionSeconds,
			this.durationSeconds,
		)
	}

	private async ensureOEmbed(): Promise<SoundCloudOEmbedResponse> {
		if (this.oEmbedPromise) return this.oEmbedPromise
		if (typeof fetch === 'undefined') {
			throw new Error('SoundCloud oEmbed requires fetch support.')
		}

		const params = new URLSearchParams({
			auto_play: 'false',
			buying: 'false',
			download: 'false',
			format: 'json',
			maxheight: '166',
			sharing: 'false',
			show_artwork: 'false',
			show_comments: 'false',
			show_playcount: 'false',
			show_user: 'true',
			url: this.track.src,
		})

		this.oEmbedPromise = fetch(
			`${soundCloudOEmbedUrl}?${params.toString()}`,
		)
			.then(async (response) => {
				if (!response.ok) {
					throw new Error('SoundCloud oEmbed request failed.')
				}

				return (await response.json()) as SoundCloudOEmbedResponse
			})
			.then((oembed) => {
				this.metadata = parseSoundCloudMetadata(oembed)
				return oembed
			})

		return this.oEmbedPromise
	}

	private async ensurePrepared(): Promise<void> {
		if (this.ready) return
		const api = await ensureSoundCloudWidgetApi()
		const oembed = await this.ensureOEmbed()
		const iframeSrc = parseSoundCloudIframeSrc(oembed)
		if (!iframeSrc) {
			throw new Error('SoundCloud oEmbed did not include an iframe.')
		}

		if (!this.iframeElement) {
			this.iframeElement = createHiddenIframe(iframeSrc)
			getSoundCloudRoot(this.host).append(this.iframeElement)
		}

		if (!this.widget) {
			this.widget = api.Widget(this.iframeElement)
			this.widgetReadyPromise = new Promise<void>((resolve, reject) => {
				this.widgetReadyResolve = resolve
				this.widgetReadyReject = reject
			})
			this.bindWidgetEvents(api.Widget.Events)
		}

		await this.widgetReadyPromise
		await this.readDuration()
	}

	private bindWidgetEvents(events: SoundCloudWidgetFactory['Events']): void {
		if (!this.widget) return

		this.widget.bind(events.READY, () => {
			this.ready = true
			this.widgetReadyResolve?.()
		})
		this.widget.bind(events.PLAY_PROGRESS, (payload) => {
			if (!this.playing) return
			const position = (payload?.currentPosition ?? 0) / 1000
			if (Number.isFinite(position)) this.positionSeconds = position
			this.activeTrack?.trackCallbacks.onProgress(
				this.positionSeconds,
				this.durationSeconds,
			)
		})
		this.widget.bind(events.PLAY, () => {
			this.playing = true
			this.activeTrack?.handlePlayEvent()
		})
		this.widget.bind(events.PAUSE, () => {
			this.playing = false
			this.activeTrack?.handlePauseEvent()
		})
		this.widget.bind(events.FINISH, () => {
			this.playing = false
			this.positionSeconds = this.durationSeconds
			this.activeTrack?.trackCallbacks.onFinish()
		})
		this.widget.bind(events.ERROR, () => {
			this.widgetReadyReject?.(
				new Error('SoundCloud widget reported an error.'),
			)
			this.activeTrack?.trackCallbacks.onStatus(
				'SoundCloud playback failed',
			)
		})
	}

	private async readDuration(): Promise<void> {
		if (!this.widget) return

		const duration = await new Promise<number>((resolve) =>
			this.widget?.getDuration((value) => resolve(value / 1000)),
		)
		if (duration > 0) {
			this.durationSeconds = duration
			this.activeTrack?.trackCallbacks.onDuration(this.durationSeconds)
		}
	}
}

class SoundCloudPlayableTrack extends JukettePlayableTrack {
	private ignoreNextPauseEvent = false

	constructor(
		track: JuketteTrack,
		callbacks: PlayableTrackCallbacks,
		private readonly state: SoundCloudTrackState,
	) {
		super(track, callbacks)
		this.state.attach(this)
	}

	get trackCallbacks(): PlayableTrackCallbacks {
		return this.callbacks
	}

	get currentTime(): number {
		return this.state.currentTime
	}

	get duration(): number {
		return this.state.duration
	}

	load(options: PlayableTrackLoadOptions): Promise<void> {
		return this.state.load(options)
	}

	play(options: PlayableTrackPlayOptions): Promise<boolean> {
		return this.state.play(options)
	}

	pause(_options: { silent?: boolean } = {}): void {
		this.ignoreNextPauseEvent = true
		this.state.pause()
	}

	seek(seconds: number): void {
		this.state.seekTo(seconds)
		this.callbacks.onProgress(seconds, this.duration)
	}

	stop(): void {
		this.pause({ silent: true })
		this.state.detach(this)
	}

	requestPosition(): void {
		void this.state.requestPosition()
	}

	handlePauseEvent(): void {
		if (this.ignoreNextPauseEvent) {
			this.ignoreNextPauseEvent = false
			return
		}

		this.callbacks.onPause()
	}

	handlePlayEvent(): void {
		this.callbacks.onStatus()
		this.callbacks.onPlay()
	}
}

const createSoundCloudTrackState = (
	track: JuketteTrack,
	host: HTMLElement,
	trackElement: Element | null,
): SoundCloudTrackState => {
	if (trackElement) {
		const current = elementStates.get(trackElement)
		if (current) return current

		const next = new SoundCloudTrackState(track, host, trackElement)
		elementStates.set(trackElement, next)
		return next
	}

	let states = hostStates.get(host)
	if (!states) {
		states = new Map<string, SoundCloudTrackState>()
		hostStates.set(host, states)
	}

	const key = getHostStateKey(track)
	const current = states.get(key)
	if (current) return current

	const next = new SoundCloudTrackState(track, host, null)
	states.set(key, next)
	return next
}

export const soundCloudBackend: JuketteBackend = {
	createPlayableTrack(track, callbacks, options) {
		return new SoundCloudPlayableTrack(
			track,
			callbacks,
			createSoundCloudTrackState(
				track,
				options.host,
				options.trackElement,
			),
		)
	},
	preloadTrack: async (
		track: JuketteTrack,
		options,
	): Promise<JuketteBackendPreloadResult | void> =>
		createSoundCloudTrackState(
			track,
			options.host,
			options.trackElement,
		).preload(options),
	type: soundCloudPlayerType,
}

export const register = (): JuketteBackend =>
	registerJuketteBackend(soundCloudBackend)

export const registerJuketteSoundCloudBackend = (): JuketteBackend =>
	registerJuketteBackend(soundCloudBackend)
