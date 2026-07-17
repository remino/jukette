import { parseAudioFileMetadata } from './metadata'
import { loadMidiSequence } from './midi'
import { inferTrackType } from './tracks'
import type { AudioFileMetadata, JuketteTrack, MidiSequence } from './types'

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
			const type = inferTrackType(track)
			const preferMediaMetadata =
				this.options.trackPrefersMediaMetadata(track)
			if (type === 'audio') {
				if (this.options.getPreloadMetadata()) {
					this.preloadAudioMetadata(track, metadataPreloadId)
				}
				if (preferMediaMetadata) {
					void this.preloadAudioFileMetadata(track, metadataPreloadId)
				}
			} else if (type === 'midi') {
				if (this.options.getPreloadMetadata() || preferMediaMetadata) {
					void this.preloadMidiMetadata(track, metadataPreloadId)
				}
			}
		}
	}

	private preloadAudioMetadata(
		track: JuketteTrack,
		metadataPreloadId: number,
	): void {
		if (this.getDuration(track) !== undefined) return
		if (typeof Audio === 'undefined') return

		const audio = new Audio()
		const cleanup = () => {
			audio.removeEventListener('loadedmetadata', onLoadedMetadata)
			audio.removeEventListener('error', cleanup)
			audio.removeAttribute('src')
			audio.load()
		}
		const onLoadedMetadata = () => {
			if (metadataPreloadId === this.preloadId) {
				this.setDuration(track, audio.duration)
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
		if (!this.options.trackPrefersMediaMetadata(track)) return
		if (this.metadata.has(this.options.getTrackKey(track))) return
		if (typeof fetch === 'undefined') return

		try {
			const response = await fetch(track.src, {
				headers: { Range: 'bytes=0-65535' },
			})
			if (!response.ok) return

			const metadata = parseAudioFileMetadata(
				await response.arrayBuffer(),
			)
			if (metadataPreloadId === this.preloadId) {
				this.setMetadata(track, metadata)
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
			if (metadataPreloadId === this.preloadId) {
				if (this.options.getPreloadMetadata()) {
					this.setDuration(track, sequence.duration)
				}
				if (this.options.trackPrefersMediaMetadata(track)) {
					this.setMidiTrackMetadata(track, sequence)
				}
			}
		} catch {
			// Leave duration unknown when metadata cannot be preloaded.
		}
	}

	private setMidiTrackMetadata(
		track: JuketteTrack,
		sequence: MidiSequence,
	): void {
		if (!sequence.metadata?.title) return

		this.setMetadata(track, { title: sequence.metadata.title })
	}
}
