const SOUNDCLOUD_API_SRC = 'https://w.soundcloud.com/player/api.js'
const SOUNDCLOUD_LOAD_TIMEOUT = 10000
const SOUNDCLOUD_PLAY_TIMEOUT = 5000
const SOUNDCLOUD_READY_TIMEOUT = 10000

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

export interface SoundCloudAdapterCallbacks {
	onDuration(duration: number): void
	onFinish(): void
	onPause(): void
	onPlay(): void
	onPositionRequestComplete(): void
	onProgress(position: number): void
	onRelativeProgress(relativePosition: number): void
}

let soundCloudApiPromise: Promise<SoundCloudApi> | null = null

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

export class SoundCloudAdapter {
	private currentIsStale: () => boolean = () => false
	private eventsBound = false
	private loadId = 0
	private loadingPromise: Promise<boolean> | null = null
	private loadingSrc = ''
	private loadedDuration = 0
	private loadedSrc = ''
	private preparedSrc = ''
	private readyPromise: Promise<boolean> | null = null
	private resolveReady: ((ready: boolean) => void) | null = null
	private resolvePlay: ((played: boolean) => void) | null = null
	private silentPause = false
	private widget: SoundCloudWidget | null = null

	constructor(
		private readonly iframe: HTMLIFrameElement,
		private readonly callbacks: SoundCloudAdapterCallbacks,
	) {}

	get hasWidget(): boolean {
		return this.widget !== null
	}

	isLoaded(src: string): boolean {
		return this.loadedSrc === src
	}

	isPrepared(src: string): boolean {
		return this.preparedSrc === src && this.widget !== null
	}

	getPlayerUrl(src: string): string {
		const url = new URL('https://w.soundcloud.com/player/')
		url.searchParams.set('url', src)
		url.searchParams.set('auto_play', 'false')
		url.searchParams.set('visual', 'false')
		return url.toString()
	}

	prepare(src: string): void {
		if (this.widget) return

		const playerUrl = this.getPlayerUrl(src)
		this.preparedSrc = src
		if (this.iframe.src !== playerUrl) {
			this.iframe.src = playerUrl
		}
		void this.getWidget(() => false)
	}

	async load(src: string, isStale: () => boolean): Promise<boolean> {
		this.currentIsStale = isStale
		const widget = await this.getWidget(isStale)
		if (!widget || isStale()) return false
		if (this.loadedSrc === src) {
			this.emitDuration(widget, isStale)
			return true
		}
		if (this.loadingSrc === src && this.loadingPromise) {
			return this.loadingPromise
		}
		const loadId = (this.loadId += 1)
		this.loadedDuration = 0
		this.preparedSrc = src
		this.loadingSrc = src
		this.loadingPromise = new Promise<boolean>((resolve) => {
			let settled = false
			const timeout = window.setTimeout(
				() => settle(false),
				SOUNDCLOUD_LOAD_TIMEOUT,
			)
			const settle = (ready: boolean) => {
				if (settled) return

				settled = true
				window.clearTimeout(timeout)
				resolve(ready)
			}

			widget.load(src, {
				auto_play: false,
				callback: () => settle(true),
			})
		})
		const loaded = await this.loadingPromise

		if (this.loadingSrc === src) {
			this.loadingPromise = null
			this.loadingSrc = ''
		}

		if (!loaded || isStale() || loadId !== this.loadId) return false

		this.loadedSrc = src
		this.emitDuration(widget, isStale)
		return true
	}

	async waitUntilReady(
		src: string,
		isStale: () => boolean,
	): Promise<boolean> {
		this.currentIsStale = isStale
		const widget = await this.getWidget(isStale)
		if (!widget || isStale()) return false
		if (this.loadedSrc === src) return true

		const ready = await this.readyPromise
		return Boolean(ready && !isStale() && this.loadedSrc === src)
	}

	pause(options: { silent?: boolean } = {}): void {
		if (options.silent) this.silentPause = true
		this.resolvePlay?.(false)
		this.resolvePlay = null
		this.widget?.pause()
	}

	async play(isStale: () => boolean): Promise<boolean> {
		this.currentIsStale = isStale
		if (!this.widget || isStale()) return false

		this.silentPause = false
		return new Promise<boolean>((resolve) => {
			let settled = false
			const timeout = window.setTimeout(
				() => settle(false),
				SOUNDCLOUD_PLAY_TIMEOUT,
			)
			const settle = (played: boolean) => {
				if (settled) return

				settled = true
				window.clearTimeout(timeout)
				this.resolvePlay = null
				resolve(played)
			}

			this.resolvePlay = settle
			this.widget?.play()
		})
	}

	requestPosition(isStale: () => boolean): void {
		this.currentIsStale = isStale
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
		this.bindEvents(api, widget)
		this.readyPromise = new Promise<boolean>((resolve) => {
			let settled = false
			const timeout = window.setTimeout(
				() => settle(false),
				SOUNDCLOUD_READY_TIMEOUT,
			)
			const settle = (ready: boolean) => {
				if (settled) return

				settled = true
				window.clearTimeout(timeout)
				this.resolveReady = null
				resolve(ready)
			}

			this.resolveReady = settle
		})
		widget.bind(api.Widget.Events.READY, () => {
			if (this.isStale() || widget !== this.widget) return

			this.loadedSrc = this.preparedSrc
			widget.getDuration((duration) => {
				if (this.isStale() || widget !== this.widget) return
				this.loadedDuration = duration / 1000
				this.callbacks.onDuration(this.loadedDuration)
			})
			this.requestPosition(this.currentIsStale)
			this.resolveReady?.(true)
		})

		return widget
	}

	private bindEvents(api: SoundCloudApi, widget: SoundCloudWidget): void {
		if (this.eventsBound) return
		this.eventsBound = true

		widget.bind(api.Widget.Events.PLAY, () => {
			if (this.isStale() || widget !== this.widget) return
			this.silentPause = false
			this.resolvePlay?.(true)
			this.callbacks.onPlay()
		})
		widget.bind(api.Widget.Events.PLAY_PROGRESS, (event) => {
			if (this.isStale() || widget !== this.widget) return

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
			if (this.isStale() || widget !== this.widget) return
			if (this.silentPause) {
				this.silentPause = false
				return
			}
			this.callbacks.onPause()
		})
		widget.bind(api.Widget.Events.FINISH, () => {
			if (this.isStale() || widget !== this.widget) return
			this.callbacks.onFinish()
		})
	}

	private isStale(): boolean {
		return this.currentIsStale()
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
