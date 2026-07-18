import * as ToneMidiModule from '@tonejs/midi'

import type {
	AudioFileMetadata,
	JuketteMidiOscillator,
	MidiNote,
	MidiSequence,
} from '@remino/jukette-core'
import { cleanMetadataText } from '@remino/jukette-core'

type ParsedToneMidi = {
	duration: number
	name: string
	tracks: Array<{
		instrument: { number: number }
		name: string
		notes: Array<{
			duration: number
			midi: number
			time: number
			velocity: number
		}>
	}>
}

const ToneMidi =
	(
		ToneMidiModule as {
			Midi?: new (
				buffer?: ArrayBuffer | ArrayLike<number>,
			) => ParsedToneMidi
			default?: {
				Midi?: new (
					buffer?: ArrayBuffer | ArrayLike<number>,
				) => ParsedToneMidi
			}
		}
	).Midi ??
	(
		ToneMidiModule as {
			default?: {
				Midi?: new (
					buffer?: ArrayBuffer | ArrayLike<number>,
				) => ParsedToneMidi
			}
		}
	).default?.Midi

const midiNoteFrequency = (note: number): number =>
	440 * Math.pow(2, (note - 69) / 12)

const cleanMidiText = (value: string | null | undefined): string => {
	if (!value) return ''
	return cleanMetadataText(value)
}

const getMidiTitle = (midi: ParsedToneMidi): string | undefined => {
	const title =
		cleanMidiText(midi.name) ||
		midi.tracks
			.map((track) => cleanMidiText(track.name))
			.find((value) => value.length > 0) ||
		''

	return title || undefined
}

const getMidiProgram = (midi: ParsedToneMidi): number | undefined =>
	midi.tracks
		.filter((track) => track.notes.length > 0)
		.map((track) => track.instrument.number)
		.find((program) => Number.isInteger(program) && program > 0)

export const midiProgramToOscillator = (program?: number): OscillatorType => {
	if (program === undefined) return 'triangle'
	if (program >= 16 && program <= 23) return 'sine'
	if (program >= 32 && program <= 39) return 'square'
	if (program >= 80 && program <= 87) return 'square'
	if (program >= 56 && program <= 87) return 'sawtooth'

	return 'triangle'
}

export const resolveMidiOscillatorType = (
	oscillator: JuketteMidiOscillator,
	program?: number,
): OscillatorType =>
	oscillator === 'auto' ? midiProgramToOscillator(program) : oscillator

export const parseMidi = (buffer: ArrayBuffer): MidiSequence => {
	const midi = new ToneMidi(buffer)
	const notes: MidiNote[] = midi.tracks
		.flatMap((track) =>
			track.notes.map((note) => ({
				duration: Math.max(0.03, note.duration),
				frequency: midiNoteFrequency(note.midi),
				start: note.time,
				velocity: note.velocity,
			})),
		)
		.sort((left, right) => left.start - right.start)

	const metadata: AudioFileMetadata = {}
	const title = getMidiTitle(midi)
	const program = getMidiProgram(midi)

	if (title) metadata.title = title

	const sequenceMetadata: MidiSequence['metadata'] = {}
	if (metadata.title) sequenceMetadata.title = metadata.title
	if (program !== undefined) sequenceMetadata.program = program

	const duration =
		notes.reduce(
			(maximum, note) => Math.max(maximum, note.start + note.duration),
			midi.duration,
		) || 0

	return {
		duration: Math.max(duration, 1),
		metadata:
			sequenceMetadata.title || sequenceMetadata.program !== undefined
				? sequenceMetadata
				: undefined,
		notes,
	}
}

export const loadMidiSequence = async (src: string): Promise<MidiSequence> => {
	const response = await fetch(src)
	if (!response.ok) throw new Error(`Unable to load MIDI file: ${src}`)
	return parseMidi(await response.arrayBuffer())
}
