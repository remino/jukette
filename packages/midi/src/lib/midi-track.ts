import * as Tone from 'tone'

import { loadMidiSequence, resolveMidiOscillatorType } from './midi'
import { JukettePlayableTrack } from '@remino/jukette-core'
import type {
	PlayableTrackCallbacks,
	PlayableTrackLoadOptions,
	PlayableTrackPlayOptions,
	JuketteMidiOscillator,
	JuketteTrack,
	MidiSequence,
} from '@remino/jukette-core'

let warmMidiPromise: Promise<void> | null = null

const scheduleLeadTime = 0.03
const minimumMidiVelocity = 0.05
const midiSynthLevel = -18
const minimumMidiNoteDuration = 0.03

const getTrackStartAt = (track: JuketteTrack): number =>
	Number.isFinite(track.startAt) ? Math.max(0, track.startAt) : 0

type ScheduledMidiNote = {
	duration: number
	frequency: number
	time: number
	velocity: number
}

type ToneTransport = ReturnType<typeof Tone.getTransport>

export const midiPlaybackRuntime = {
	createPart(
		callback: (time: number, note: ScheduledMidiNote) => void,
		notes: ScheduledMidiNote[],
	): Tone.Part<ScheduledMidiNote> {
		return new Tone.Part(callback, notes)
	},
	get now(): number {
		return Tone.now()
	},
	resetWarmup(): void {
		warmMidiPromise = null
	},
	start(): Promise<void> {
		return Tone.start()
	},
	get transport(): ToneTransport {
		return Tone.getTransport()
	},
}

export const warmMidiAudioContext = async (): Promise<void> => {
	if (warmMidiPromise) return warmMidiPromise

	warmMidiPromise = midiPlaybackRuntime.start().catch((error) => {
		warmMidiPromise = null
		throw error
	})

	return warmMidiPromise
}

export class MidiPlayableTrack extends JukettePlayableTrack {
	private part: Tone.Part<ScheduledMidiNote> | null = null
	private pausedAt = 0
	private sequence: MidiSequence | null = null
	private startedAt = 0
	private synth: Tone.PolySynth<Tone.Synth> | null = null
	private synthOscillator: OscillatorType | null = null
	private timer = 0

	constructor(
		track: JuketteTrack,
		callbacks: PlayableTrackCallbacks,
		private readonly getOscillator: () => JuketteMidiOscillator,
	) {
		super(track, callbacks)
	}

	get currentTime(): number {
		return this.timer
			? (performance.now() - this.startedAt) / 1000 + this.pausedAt
			: this.pausedAt
	}

	private get resetOffset(): number {
		const startAt = getTrackStartAt(this.track)
		return Math.min(startAt, this.durationValue || startAt)
	}

	async load(_options: PlayableTrackLoadOptions): Promise<void> {
		if (this.sequence) {
			this.pausedAt = this.resetOffset
			this.callbacks.onProgress(this.pausedAt, this.durationValue)
			this.callbacks.onReady()
			this.callbacks.onStatus()
			return
		}

		this.callbacks.onStatus('Loading MIDI')

		try {
			const sequence = await loadMidiSequence(this.track.src)
			this.sequence = sequence
			this.durationValue = sequence.duration
			this.pausedAt = this.resetOffset
			this.callbacks.onDuration(this.durationValue)
			if (sequence.metadata?.title) {
				this.callbacks.onMetadata({
					title: sequence.metadata.title,
				})
			}
			this.callbacks.onProgress(this.pausedAt, this.durationValue)
			this.callbacks.onReady()
			this.callbacks.onStatus()
		} catch {
			this.callbacks.onStatus('MIDI failed to load')
		}
	}

	async play(options: PlayableTrackPlayOptions): Promise<boolean> {
		if (!this.sequence) {
			return false
		}

		if (options.restart) {
			this.pausedAt = this.resetOffset
			this.callbacks.onProgress(this.pausedAt, this.durationValue)
		} else if (
			this.durationValue > 0 &&
			this.pausedAt >= this.durationValue
		) {
			this.pausedAt = this.resetOffset
			this.callbacks.onProgress(this.pausedAt, this.durationValue)
		}

		this.stopPlayback()
		await warmMidiAudioContext()
		if (options.isStale()) return false

		const oscillatorType = resolveMidiOscillatorType(
			this.getOscillator(),
			this.sequence?.metadata?.program,
		)
		this.ensureSynth(oscillatorType)
		if (!this.synth || !this.sequence) return false

		const startOffset = this.pausedAt
		const startTime = midiPlaybackRuntime.now + scheduleLeadTime
		this.startedAt = performance.now()
		this.disposePart()
		this.part = this.createPart(this.sequence.notes)
		this.playResumedNotes(startOffset, startTime)
		this.part?.start(0, startOffset)
		const transport = midiPlaybackRuntime.transport
		transport.stop()
		transport.seconds = 0
		transport.start(startTime, 0)

		this.timer = window.setTimeout(
			() => this.finishPlayback(),
			Math.max(0, this.durationValue - startOffset) * 1000,
		)
		return true
	}

	pause(): void {
		this.pausedAt = this.currentTime
		this.stopPlayback()
	}

	seek(seconds: number): void {
		this.pausedAt = Math.max(0, seconds)
		this.callbacks.onProgress(this.pausedAt, this.durationValue)
	}

	stop(): void {
		this.pausedAt = this.resetOffset
		this.stopPlayback()
		this.disposePart()
		this.disposeSynth()
	}

	private ensureSynth(oscillatorType: OscillatorType): void {
		if (this.synth && this.synthOscillator === oscillatorType) return

		this.disposeSynth()
		this.synth = new Tone.PolySynth(Tone.Synth, {
			envelope: {
				attack: 0.005,
				decay: 0.08,
				release: 0.12,
				sustain: 0.45,
			},
			oscillator: { type: oscillatorType },
		}).toDestination()
		this.synth.volume.value = midiSynthLevel
		this.synthOscillator = oscillatorType
	}

	private stopPlayback(): void {
		if (this.timer) {
			window.clearTimeout(this.timer)
			this.timer = 0
		}

		this.part?.stop(0)
		this.part?.cancel(0)
		const transport = midiPlaybackRuntime.transport
		if (transport.state !== 'stopped') {
			transport.pause()
		}
		this.synth?.releaseAll()
	}

	private finishPlayback(): void {
		this.pausedAt = this.durationValue
		this.stopPlayback()
		this.callbacks.onProgress(this.durationValue, this.durationValue)
		this.callbacks.onFinish()
	}

	private disposeSynth(): void {
		this.synth?.releaseAll()
		this.synth?.dispose()
		this.synth = null
		this.synthOscillator = null
	}

	private createPart(
		notes: MidiSequence['notes'],
	): Tone.Part<ScheduledMidiNote> {
		return midiPlaybackRuntime.createPart(
			(time, note) => {
				this.synth?.triggerAttackRelease(
					note.frequency,
					note.duration,
					time,
					Math.max(minimumMidiVelocity, note.velocity),
				)
			},
			notes.map((note) => ({
				duration: note.duration,
				frequency: note.frequency,
				time: note.start,
				velocity: note.velocity,
			})),
		)
	}

	private playResumedNotes(startOffset: number, startTime: number): void {
		if (!this.synth || !this.sequence || startOffset <= 0) return

		for (const note of this.sequence.notes) {
			if (
				note.start >= startOffset ||
				note.start + note.duration <= startOffset
			) {
				continue
			}

			const clippedDuration = Math.max(
				minimumMidiNoteDuration,
				note.start + note.duration - startOffset,
			)
			this.synth.triggerAttackRelease(
				note.frequency,
				clippedDuration,
				startTime,
				Math.max(minimumMidiVelocity, note.velocity),
			)
		}
	}

	private disposePart(): void {
		this.part?.stop(0)
		this.part?.cancel(0)
		this.part?.dispose()
		this.part = null
	}
}
