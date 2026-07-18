import type { AudioFileMetadata, JuketteTrack } from './types'

export interface PlayableTrackCallbacks {
	onDuration(duration: number): void
	onFinish(): void
	onMetadata(metadata: AudioFileMetadata, metadataPreloadId?: number): void
	onPause(): void
	onPlay(): void
	onProgress(currentTime: number, duration: number): void
	onReady(): void
	onStatus(message?: string): void
}

export interface PlayableTrackLoadOptions {
	metadataPreloadId: number
	restart: boolean
	silent?: boolean
}

export interface PlayableTrackPlayOptions {
	isStale(): boolean
	restart: boolean
}

export abstract class JukettePlayableTrack {
	protected durationValue = 0

	constructor(
		readonly track: JuketteTrack,
		protected readonly callbacks: PlayableTrackCallbacks,
	) {}

	get currentTime(): number {
		return 0
	}

	get duration(): number {
		return this.durationValue
	}

	load(_options: PlayableTrackLoadOptions): void | Promise<void> {}

	abstract play(options: PlayableTrackPlayOptions): Promise<boolean>

	abstract pause(options?: { silent?: boolean }): void

	seek(_seconds: number): void {}

	stop(): void {
		this.pause({ silent: true })
	}

	requestPosition(_isStale: () => boolean): void {}
}
