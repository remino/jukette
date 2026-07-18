import { parseAudioFileMetadata } from './metadata'
import { JukettePlayableTrack } from './playable-track'
import type {
	PlayableTrackCallbacks,
	PlayableTrackLoadOptions,
	PlayableTrackPlayOptions,
} from './playable-track'
import type { JuketteTrack } from './types'

export class AudioPlayableTrack extends JukettePlayableTrack {
	constructor(
		track: JuketteTrack,
		private readonly audio: HTMLAudioElement,
		callbacks: PlayableTrackCallbacks,
	) {
		super(track, callbacks)
	}

	get currentTime(): number {
		return this.audio.currentTime
	}

	get duration(): number {
		return Number.isFinite(this.audio.duration) ? this.audio.duration : 0
	}

	load(options: PlayableTrackLoadOptions): void {
		this.callbacks.onStatus('Loading audio')
		const onCanPlay = () => {
			this.audio.removeEventListener('canplay', onCanPlay)
			this.callbacks.onReady()
			if (!this.audio.paused) this.callbacks.onStatus()
		}
		const onError = () => {
			this.audio.removeEventListener('canplay', onCanPlay)
			this.audio.removeEventListener('error', onError)
			this.callbacks.onStatus('Audio failed to load')
		}

		this.audio.removeEventListener('canplay', onCanPlay)
		this.audio.removeEventListener('error', onError)
		this.audio.addEventListener('canplay', onCanPlay, { once: true })
		this.audio.addEventListener('error', onError, { once: true })
		this.audio.src = this.track.src
		this.audio.load()
		this.audio.currentTime = 0
		void this.preloadFileMetadata(options.metadataPreloadId)
	}

	async play(options: PlayableTrackPlayOptions): Promise<boolean> {
		this.callbacks.onStatus('Starting audio')
		await this.audio.play()
		return !options.isStale()
	}

	pause(): void {
		this.audio.pause()
	}

	seek(seconds: number): void {
		this.audio.currentTime = seconds
	}

	stop(): void {
		this.audio.pause()
	}

	requestPosition(): void {
		this.durationValue = this.duration
		this.callbacks.onDuration(this.durationValue)
		this.callbacks.onProgress(this.audio.currentTime, this.durationValue)
	}

	private async preloadFileMetadata(
		metadataPreloadId: number,
	): Promise<void> {
		if (typeof fetch === 'undefined') return

		try {
			const response = await fetch(this.track.src, {
				headers: { Range: 'bytes=0-65535' },
			})
			if (!response.ok) return

			this.callbacks.onMetadata(
				parseAudioFileMetadata(await response.arrayBuffer()),
				metadataPreloadId,
			)
		} catch {
			// Leave authored title and artist in place when tags cannot be read.
		}
	}
}
