import { loadMidiSequence, resolveMidiOscillatorType } from './midi'
import { JukettePlayableTrack } from './playable-track'
import type {
	PlayableTrackCallbacks,
	PlayableTrackLoadOptions,
	PlayableTrackPlayOptions,
} from './playable-track'
import type { JuketteMidiOscillator, JuketteTrack, MidiSequence } from './types'

let sharedAudioContext: AudioContext | null = null

const getAudioContextConstructor = () =>
	globalThis.AudioContext ??
	(
		globalThis as typeof globalThis & {
			webkitAudioContext?: typeof AudioContext
		}
	).webkitAudioContext

const getSharedAudioContext = (): AudioContext | null => {
	if (sharedAudioContext) return sharedAudioContext

	const AudioContextConstructor = getAudioContextConstructor()
	if (!AudioContextConstructor) return null

	sharedAudioContext = new AudioContextConstructor()
	return sharedAudioContext
}

export const warmMidiAudioContext = async (): Promise<void> => {
	const audio = getSharedAudioContext()
	if (!audio || audio.state !== 'suspended') return
	await audio.resume()
}

export class MidiPlayableTrack extends JukettePlayableTrack {
	private audio: AudioContext | null = null
	private gain: GainNode | null = null
	private pausedAt = 0
	private sequence: MidiSequence | null = null
	private sources: OscillatorNode[] = []
	private startedAt = 0
	private timer = 0
	private volume = 1

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
		this.volume = options.volume
		this.stopSources()
		if (options.isStale()) return false
		this.startedAt = performance.now()
		this.ensureAudio()

		if (!this.audio || !this.gain || !this.sequence) return false

		if (this.audio.state === 'suspended') {
			await this.audio.resume()
		}

		const startOffset = this.pausedAt
		const startTime = this.audio.currentTime + 0.03
		const oscillatorType = resolveMidiOscillatorType(
			this.getOscillator(),
			this.sequence.metadata?.program,
		)
		this.sources = this.sequence.notes
			.filter((note) => note.start + note.duration > startOffset)
			.map((note) => {
				const oscillator = this.audio!.createOscillator()
				const envelope = this.audio!.createGain()
				const relativeStart = Math.max(0, note.start - startOffset)
				const clippedOffset = Math.max(0, startOffset - note.start)
				const clippedDuration = Math.max(
					0.03,
					note.duration - clippedOffset,
				)
				const noteStart = startTime + relativeStart
				const noteEnd = noteStart + clippedDuration

				oscillator.type = oscillatorType
				oscillator.frequency.value = note.frequency
				envelope.gain.setValueAtTime(0, noteStart)
				envelope.gain.linearRampToValueAtTime(
					note.velocity * 0.18,
					noteStart + 0.01,
				)
				envelope.gain.setValueAtTime(
					note.velocity * 0.16,
					Math.max(noteStart + 0.02, noteEnd - 0.04),
				)
				envelope.gain.linearRampToValueAtTime(0, noteEnd)
				oscillator.connect(envelope)
				envelope.connect(this.gain!)
				oscillator.start(noteStart)
				oscillator.stop(noteEnd + 0.02)
				return oscillator
			})

		this.timer = window.setTimeout(
			() => this.callbacks.onFinish(),
			Math.max(0, this.durationValue - startOffset) * 1000,
		)
		return true
	}

	pause(): void {
		this.pausedAt = this.currentTime
		this.stopSources()
	}

	seek(seconds: number): void {
		this.pausedAt = Math.max(0, seconds)
		this.callbacks.onProgress(this.pausedAt, this.durationValue)
	}

	setVolume(volume: number): void {
		this.volume = volume
		if (this.gain) this.gain.gain.value = volume
	}

	stop(): void {
		this.stopSources()
		this.gain?.disconnect()
		this.gain = null
	}

	private stopSources(): void {
		if (this.timer) {
			window.clearTimeout(this.timer)
			this.timer = 0
		}

		for (const source of this.sources) {
			try {
				source.stop()
			} catch {
				// Already stopped.
			}
		}
		this.sources = []
	}

	private ensureAudio(): void {
		if (this.audio && this.gain) return

		const audio = getSharedAudioContext()
		if (!audio) {
			this.callbacks.onStatus('MIDI playback needs Web Audio')
			return
		}

		this.audio = audio
		this.gain = this.audio.createGain()
		this.gain.gain.value = this.volume
		this.gain.connect(this.audio.destination)
	}
}
