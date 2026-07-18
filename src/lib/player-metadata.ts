import { resolveJuketteBackend } from './backend-registry'
import type { AudioFileMetadata, JuketteTrack } from './types'

export interface JuketteMetadataControllerOptions {
	getPreloadMetadata(): boolean
	getTrackKey(track: JuketteTrack): string
	getTracks(): JuketteTrack[]
	isCurrentTrack(track: JuketteTrack): boolean
	onCurrentTrackDisplayChange(): void
	onPlaylistDisplayChange(): void
	trackPrefersMediaMetadata(track: JuketteTrack): boolean
}

export class JuketteMetadataController {
	private readonly durations = new Map<string, number>()
	private readonly metadata = new Map<string, AudioFileMetadata>()
	private preloadId = 0

	constructor(private readonly options: JuketteMetadataControllerOptions) {}

	get metadataPreloadId(): number {
		return this.preloadId
	}

	getDuration(track: JuketteTrack | null): number | undefined {
		if (!track) return undefined

		return this.durations.get(this.options.getTrackKey(track))
	}

	setDuration(track: JuketteTrack | null, duration: number): void {
		if (!track || !Number.isFinite(duration) || duration <= 0) return

		const key = this.options.getTrackKey(track)
		const currentDuration = this.durations.get(key)
		if (
			currentDuration !== undefined &&
			Math.abs(currentDuration - duration) < 0.5
		) {
			return
		}

		this.durations.set(key, duration)
		this.options.onPlaylistDisplayChange()
	}

	getDisplay(track: JuketteTrack): Required<AudioFileMetadata> {
		const metadata = this.options.trackPrefersMediaMetadata(track)
			? this.metadata.get(this.options.getTrackKey(track))
			: undefined

		return {
			artist: metadata?.artist || track.artist || '',
			title: metadata?.title || track.title || track.src,
		}
	}

	setMetadata(track: JuketteTrack | null, metadata: AudioFileMetadata): void {
		if (!track) return

		const nextMetadata = {
			artist: metadata.artist?.trim() || undefined,
			title: metadata.title?.trim() || undefined,
		}
		if (!nextMetadata.artist && !nextMetadata.title) return

		const key = this.options.getTrackKey(track)
		const currentMetadata = this.metadata.get(key)
		if (
			currentMetadata !== undefined &&
			currentMetadata.artist === nextMetadata.artist &&
			currentMetadata.title === nextMetadata.title
		) {
			return
		}

		this.metadata.set(key, nextMetadata)
		if (this.options.isCurrentTrack(track)) {
			this.options.onCurrentTrackDisplayChange()
		}
		this.options.onPlaylistDisplayChange()
	}

	preloadPlaylistMetadata(): void {
		this.preloadId += 1
		const tracks = this.options.getTracks()
		const hasMetadataPreference = tracks.some((track) =>
			this.options.trackPrefersMediaMetadata(track),
		)
		if (!this.options.getPreloadMetadata() && !hasMetadataPreference) {
			return
		}

		const metadataPreloadId = this.preloadId
		for (const track of tracks) {
			void this.preloadTrackMetadata(track, metadataPreloadId)
		}
	}

	private async preloadTrackMetadata(
		track: JuketteTrack,
		metadataPreloadId: number,
	): Promise<void> {
		const backend = resolveJuketteBackend(track)
		if (!backend?.preloadTrack) return

		try {
			const result = await backend.preloadTrack(track, {
				preloadDuration: this.options.getPreloadMetadata(),
				preloadMetadata: this.options.trackPrefersMediaMetadata(track),
			})
			if (metadataPreloadId !== this.preloadId || !result) return

			if (this.options.getPreloadMetadata() && result.duration) {
				this.setDuration(track, result.duration)
			}
			if (
				this.options.trackPrefersMediaMetadata(track) &&
				result.metadata
			) {
				this.setMetadata(track, result.metadata)
			}
		} catch {
			// Leave duration and authored metadata in place when preload fails.
		}
	}
}
