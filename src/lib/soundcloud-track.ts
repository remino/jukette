import { JukettePlayableTrack } from './playable-track'
import type {
	PlayableTrackCallbacks,
	PlayableTrackLoadOptions,
	PlayableTrackPlayOptions,
} from './playable-track'
import { SoundCloudAdapter } from './soundcloud'
import type { JuketteTrack } from './types'

export class SoundCloudPlayableTrack extends JukettePlayableTrack {
	private readonly adapter: SoundCloudAdapter
	private position = 0
	private positionRequested = false

	constructor(
		track: JuketteTrack,
		readonly iframe: HTMLIFrameElement,
		callbacks: PlayableTrackCallbacks,
	) {
		super(track, callbacks)
		this.adapter = new SoundCloudAdapter(iframe, {
			onDuration: (duration) => {
				this.durationValue = duration
				this.callbacks.onDuration(duration)
				this.callbacks.onProgress(this.position, this.durationValue)
			},
			onFinish: () => this.callbacks.onFinish(),
			onPause: () => this.callbacks.onPause(),
			onPlay: () => this.callbacks.onPlay(),
			onPositionRequestComplete: () => {
				this.positionRequested = false
			},
			onProgress: (position) => {
				this.position = position
				this.positionRequested = false
				this.callbacks.onProgress(this.position, this.durationValue)
			},
			onRelativeProgress: (relativePosition) => {
				if (this.durationValue <= 0) return
				this.position = relativePosition * this.durationValue
				this.callbacks.onProgress(this.position, this.durationValue)
			},
		})
	}

	get currentTime(): number {
		return this.position
	}

	setActive(active: boolean): void {
		this.iframe.toggleAttribute('data-active', active)
	}

	load(options: PlayableTrackLoadOptions): void {
		this.position = 0
		this.callbacks.onProgress(0, this.durationValue)
		if (!options.silent) this.callbacks.onStatus('Preparing SoundCloud')
		this.adapter.prepare(this.track.src)
	}

	async play(options: PlayableTrackPlayOptions): Promise<boolean> {
		this.callbacks.onStatus('Loading SoundCloud')
		if (!this.adapter.isLoaded(this.track.src)) {
			let didLoad: boolean
			try {
				didLoad = this.adapter.isPrepared(this.track.src)
					? await this.adapter.waitUntilReady(
							this.track.src,
							options.isStale,
						)
					: await this.adapter.load(this.track.src, options.isStale)
			} catch {
				didLoad = false
			}

			if (options.isStale()) return false
			if (!didLoad) {
				this.callbacks.onStatus('SoundCloud unavailable')
				return false
			}
		}

		this.adapter.setVolume(options.volume)
		if (options.restart) {
			this.seek(0)
		}
		this.callbacks.onStatus('Starting SoundCloud')
		const played = await this.adapter.play(options.isStale)
		if (options.isStale()) return false
		if (!played) {
			this.callbacks.onStatus('SoundCloud did not start')
			return false
		}
		return true
	}

	pause(options: { silent?: boolean } = {}): void {
		this.adapter.pause(options)
	}

	seek(seconds: number): void {
		this.position = Math.max(0, seconds)
		this.adapter.seek(this.position)
		this.callbacks.onProgress(this.position, this.durationValue)
	}

	setVolume(volume: number): void {
		this.adapter.setVolume(volume)
	}

	requestPosition(isStale: () => boolean): void {
		if (this.positionRequested) return

		this.positionRequested = true
		window.setTimeout(() => {
			if (!isStale()) {
				this.positionRequested = false
			}
		}, 500)
		this.adapter.requestPosition(isStale)
	}
}
