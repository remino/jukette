import * as Tone from 'tone'

import { loadMidiSequence, resolveMidiOscillatorType } from './midi'
import { JukettePlayableTrack } from './playable-track'
import type {
	PlayableTrackCallbacks,
	PlayableTrackLoadOptions,
	PlayableTrackPlayOptions,
} from './playable-track'
import type { JuketteMidiOscillator, JuketteTrack, MidiSequence } from './types'

let warmMidiPromise: Promise<void> | null = null

const scheduleLeadTime = 0.03
const minimumMidiVelocity = 0.05
const midiSynthLevel = -18

export const midiPlaybackRuntime = {
	resetWarmup(): void {
		warmMidiPromise = null
	},
	start(): Promise<void> {
		return Tone.start()
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

	load(_options: PlayableTrackLoadOptions): void {
		this.callbacks.onStatus('Ready')
		window.setTimeout(() => {
			if (!this.timer) this.callbacks.onStatus()
		}, 700)
	}

	async play(options: PlayableTrackPlayOptions): Promise<boolean> {
		if (!this.sequence) {
			this.callbacks.onStatus('Loading MIDI')
			this.sequence = await loadMidiSequence(this.track.src)
			if (options.isStale()) return false
			this.durationValue = this.sequence.duration
			this.callbacks.onDuration(this.durationValue)
			if (this.sequence.metadata?.title) {
				this.callbacks.onMetadata({
					title: this.sequence.metadata.title,
				})
			}
			this.callbacks.onProgress(this.pausedAt, this.durationValue)
		}

		if (options.restart) {
			this.pausedAt = 0
			this.callbacks.onProgress(0, this.durationValue)
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
		const startTime = Tone.now() + scheduleLeadTime
		this.startedAt = performance.now()

		for (const note of this.sequence.notes) {
			if (note.start + note.duration <= startOffset) continue

			const relativeStart = Math.max(0, note.start - startOffset)
			const clippedOffset = Math.max(0, startOffset - note.start)
			const clippedDuration = Math.max(
				0.03,
				note.duration - clippedOffset,
			)

			this.synth.triggerAttackRelease(
				note.frequency,
				clippedDuration,
				startTime + relativeStart,
				Math.max(minimumMidiVelocity, note.velocity),
			)
		}

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
		this.pausedAt = 0
		this.stopPlayback()
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
}
