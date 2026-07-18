export {
	juketteMidiBackend,
	register,
	registerJuketteMidiBackend,
} from './midi-backend'
export {
	loadMidiSequence,
	midiProgramToOscillator,
	parseMidi,
	resolveMidiOscillatorType,
} from './midi'
export { normalizeMidiOscillator } from '@remino/jukette-core'
export type { MidiNote, MidiSequence } from '@remino/jukette-core'
