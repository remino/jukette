import { loadMidiSequence } from './midi'
import { MidiPlayableTrack } from './midi-track'
import type {
	JuketteBackend,
	JuketteBackendPreloadResult,
	JuketteTrack,
} from '@remino/jukette-core'
import { registerJuketteBackend } from '@remino/jukette-core'

export const juketteMidiBackend: JuketteBackend = {
	createPlayableTrack(track, callbacks, options) {
		return new MidiPlayableTrack(
			track,
			callbacks,
			options.getMidiOscillator,
		)
	},
	inferTrackType(track) {
		return /\.(?:mid|midi)(?:[?#].*)?$/i.test(track.src) ? 'midi' : null
	},
	preloadTrack: async (
		track: JuketteTrack,
		options,
	): Promise<JuketteBackendPreloadResult | void> => {
		if (!options.preloadDuration && !options.preloadMetadata) return

		const sequence = await loadMidiSequence(track.src)
		const result: JuketteBackendPreloadResult = {}
		if (options.preloadDuration) result.duration = sequence.duration
		if (options.preloadMetadata && sequence.metadata?.title) {
			result.metadata = { title: sequence.metadata.title }
		}

		return result.duration || result.metadata ? result : undefined
	},
	priority: 100,
	type: 'midi',
}

export const registerJuketteMidiBackend = (): JuketteBackend =>
	registerJuketteBackend(juketteMidiBackend)
