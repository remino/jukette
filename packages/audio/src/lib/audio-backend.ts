import { AudioPlayableTrack } from './audio-track'
import { parseAudioFileMetadata } from './metadata'
import type {
	JuketteBackend,
	JuketteBackendPreloadResult,
	JuketteTrack,
} from '@remino/jukette-core'
import { registerJuketteBackend } from '@remino/jukette-core'

export const juketteAudioBackend: JuketteBackend = {
	createPlayableTrack(track, callbacks, options) {
		return new AudioPlayableTrack(track, options.audioElement, callbacks)
	},
	inferTrackType(track) {
		return /\.(?:mid|midi)(?:[?#].*)?$/i.test(track.src) ? null : 'audio'
	},
	preloadTrack: async (
		track: JuketteTrack,
		options,
	): Promise<JuketteBackendPreloadResult | void> => {
		const result: JuketteBackendPreloadResult = {}

		if (options.preloadDuration && typeof Audio !== 'undefined') {
			const duration = await new Promise<number | undefined>(
				(resolve) => {
					const audio = new Audio()
					const cleanup = () => {
						audio.removeEventListener(
							'loadedmetadata',
							onLoadedMetadata,
						)
						audio.removeEventListener('error', onError)
						audio.removeAttribute('src')
						audio.load()
					}
					const onError = () => {
						cleanup()
						resolve(undefined)
					}
					const onLoadedMetadata = () => {
						const nextDuration = Number.isFinite(audio.duration)
							? audio.duration
							: undefined
						cleanup()
						resolve(nextDuration)
					}

					audio.preload = 'metadata'
					audio.addEventListener('loadedmetadata', onLoadedMetadata)
					audio.addEventListener('error', onError, { once: true })
					audio.src = track.src
					audio.load()
				},
			)

			if (duration) result.duration = duration
		}

		if (options.preloadMetadata && typeof fetch !== 'undefined') {
			const response = await fetch(track.src, {
				headers: { Range: 'bytes=0-65535' },
			})
			if (response.ok) {
				result.metadata = parseAudioFileMetadata(
					await response.arrayBuffer(),
				)
			}
		}

		return result.duration || result.metadata ? result : undefined
	},
	type: 'audio',
}

export const register = (): JuketteBackend =>
	registerJuketteBackend(juketteAudioBackend)

export const registerJuketteAudioBackend = (): JuketteBackend =>
	registerJuketteBackend(juketteAudioBackend)
