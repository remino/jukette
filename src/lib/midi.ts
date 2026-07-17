import type {
	AudioFileMetadata,
	JuketteMidiOscillator,
	MidiNote,
	MidiSequence,
} from './types'
import { cleanMetadataText, decodeTextBytes } from './text'

class MidiReader {
	private offset = 0

	constructor(private readonly data: Uint8Array) {}

	get done(): boolean {
		return this.offset >= this.data.length
	}

	read(length: number): Uint8Array {
		const value = this.data.slice(this.offset, this.offset + length)
		this.offset += length
		return value
	}

	unread(length = 1): void {
		this.offset = Math.max(0, this.offset - length)
	}

	readText(length: number): string {
		return String.fromCharCode(...this.read(length))
	}

	readU8(): number {
		return this.data[this.offset++] ?? 0
	}

	readU16(): number {
		return (this.readU8() << 8) | this.readU8()
	}

	readU32(): number {
		return (
			(this.readU8() << 24) |
			(this.readU8() << 16) |
			(this.readU8() << 8) |
			this.readU8()
		)
	}

	readVar(): number {
		let value = 0
		let byte: number

		do {
			byte = this.readU8()
			value = (value << 7) | (byte & 0x7f)
		} while (byte & 0x80)

		return value
	}
}

const midiNoteFrequency = (note: number): number =>
	440 * Math.pow(2, (note - 69) / 12)

const decodeMidiText = (bytes: Uint8Array): string =>
	cleanMetadataText(decodeTextBytes(bytes, 'utf-8'))

export const normalizeMidiOscillator = (
	value: string | null,
): JuketteMidiOscillator => {
	if (
		value === 'sine' ||
		value === 'square' ||
		value === 'sawtooth' ||
		value === 'triangle'
	) {
		return value
	}

	return 'auto'
}

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
	const reader = new MidiReader(new Uint8Array(buffer))
	if (reader.readText(4) !== 'MThd') throw new Error('Invalid MIDI header.')

	const headerLength = reader.readU32()
	reader.readU16()
	const trackCount = reader.readU16()
	const division = reader.readU16()
	if (headerLength > 6) reader.read(headerLength - 6)
	if (division & 0x8000)
		throw new Error('SMPTE MIDI timing is not supported.')

	const ticksPerBeat = division
	const notes: MidiNote[] = []
	const metadata: AudioFileMetadata = {}
	let program: number | undefined
	let tempo = 500000
	let duration = 0

	for (
		let trackIndex = 0;
		trackIndex < trackCount && !reader.done;
		trackIndex++
	) {
		if (reader.readText(4) !== 'MTrk') break

		const trackReader = new MidiReader(reader.read(reader.readU32()))
		const activeNotes = new Map<
			number,
			{ start: number; velocity: number }
		>()
		let runningStatus = 0
		let seconds = 0

		while (!trackReader.done) {
			const delta = trackReader.readVar()
			seconds += (delta * tempo) / ticksPerBeat / 1000000
			let status = trackReader.readU8()

			if (status < 0x80) {
				trackReader.unread()
				status = runningStatus
			} else {
				runningStatus = status
			}

			if (status === 0xff) {
				const type = trackReader.readU8()
				const length = trackReader.readVar()
				if (type === 0x51 && length === 3) {
					const bytes = trackReader.read(3)
					tempo = (bytes[0] << 16) | (bytes[1] << 8) | bytes[2]
				} else if (type === 0x03) {
					const title = decodeMidiText(trackReader.read(length))
					if (!metadata.title && title) metadata.title = title
				} else {
					trackReader.read(length)
				}
				continue
			}

			if (status === 0xf0 || status === 0xf7) {
				trackReader.read(trackReader.readVar())
				continue
			}

			const command = status & 0xf0
			if (command === 0xc0) {
				const nextProgram = trackReader.readU8()
				if (program === undefined) program = nextProgram
				continue
			}

			if (command === 0xd0) {
				trackReader.readU8()
				continue
			}

			const note = trackReader.readU8()
			const velocity = trackReader.readU8()

			if (command === 0x90 && velocity > 0) {
				activeNotes.set(note, {
					start: seconds,
					velocity: velocity / 127,
				})
			} else if (command === 0x80 || command === 0x90) {
				const active = activeNotes.get(note)
				if (active) {
					notes.push({
						duration: Math.max(0.03, seconds - active.start),
						frequency: midiNoteFrequency(note),
						start: active.start,
						velocity: active.velocity,
					})
					activeNotes.delete(note)
				}
			}

			duration = Math.max(duration, seconds)
		}
	}

	const sequenceMetadata: MidiSequence['metadata'] = {}
	if (metadata.title) sequenceMetadata.title = metadata.title
	if (program !== undefined) sequenceMetadata.program = program

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
