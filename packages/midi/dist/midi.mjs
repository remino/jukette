/*! @remino/jukette-midi v0.4.4 | (c) 2026 Rémino Rem <https://remino.net/> | ISC Licence */
import * as ToneMidiModule from "@tonejs/midi";
import { JukettePlayableTrack, cleanMetadataText, normalizeMidiOscillator, registerJuketteBackend } from "@remino/jukette-core";
import * as Tone from "tone";
//#region src/lib/midi.ts
var ToneMidi = ToneMidiModule.Midi ?? ToneMidiModule.default?.Midi;
var midiNoteFrequency = (note) => 440 * Math.pow(2, (note - 69) / 12);
var cleanMidiText = (value) => {
	if (!value) return "";
	return cleanMetadataText(value);
};
var getMidiTitle = (midi) => {
	return cleanMidiText(midi.name) || midi.tracks.map((track) => cleanMidiText(track.name)).find((value) => value.length > 0) || void 0;
};
var getMidiProgram = (midi) => midi.tracks.filter((track) => track.notes.length > 0).map((track) => track.instrument.number).find((program) => Number.isInteger(program) && program > 0);
var midiProgramToOscillator = (program) => {
	if (program === void 0) return "triangle";
	if (program >= 16 && program <= 23) return "sine";
	if (program >= 32 && program <= 39) return "square";
	if (program >= 80 && program <= 87) return "square";
	if (program >= 56 && program <= 87) return "sawtooth";
	return "triangle";
};
var resolveMidiOscillatorType = (oscillator, program) => oscillator === "auto" ? midiProgramToOscillator(program) : oscillator;
var parseMidi = (buffer) => {
	const midi = new ToneMidi(buffer);
	const notes = midi.tracks.flatMap((track) => track.notes.map((note) => ({
		duration: Math.max(.03, note.duration),
		frequency: midiNoteFrequency(note.midi),
		start: note.time,
		velocity: note.velocity
	}))).sort((left, right) => left.start - right.start);
	const metadata = {};
	const title = getMidiTitle(midi);
	const program = getMidiProgram(midi);
	if (title) metadata.title = title;
	const sequenceMetadata = {};
	if (metadata.title) sequenceMetadata.title = metadata.title;
	if (program !== void 0) sequenceMetadata.program = program;
	const duration = notes.reduce((maximum, note) => Math.max(maximum, note.start + note.duration), midi.duration) || 0;
	return {
		duration: Math.max(duration, 1),
		metadata: sequenceMetadata.title || sequenceMetadata.program !== void 0 ? sequenceMetadata : void 0,
		notes
	};
};
var loadMidiSequence = async (src) => {
	const response = await fetch(src);
	if (!response.ok) throw new Error(`Unable to load MIDI file: ${src}`);
	return parseMidi(await response.arrayBuffer());
};
//#endregion
//#region src/lib/midi-track.ts
var warmMidiPromise = null;
var scheduleLeadTime = .03;
var minimumMidiVelocity = .05;
var midiSynthLevel = -18;
var minimumMidiNoteDuration = .03;
var getTrackStartAt = (track) => Number.isFinite(track.startAt) ? Math.max(0, track.startAt) : 0;
var midiPlaybackRuntime = {
	createPart(callback, notes) {
		return new Tone.Part(callback, notes);
	},
	get now() {
		return Tone.now();
	},
	resetWarmup() {
		warmMidiPromise = null;
	},
	start() {
		return Tone.start();
	},
	get transport() {
		return Tone.getTransport();
	}
};
var warmMidiAudioContext = async () => {
	if (warmMidiPromise) return warmMidiPromise;
	warmMidiPromise = midiPlaybackRuntime.start().catch((error) => {
		warmMidiPromise = null;
		throw error;
	});
	return warmMidiPromise;
};
var MidiPlayableTrack = class extends JukettePlayableTrack {
	getOscillator;
	part = null;
	pausedAt = 0;
	sequence = null;
	startedAt = 0;
	synth = null;
	synthOscillator = null;
	timer = 0;
	constructor(track, callbacks, getOscillator) {
		super(track, callbacks);
		this.getOscillator = getOscillator;
	}
	get currentTime() {
		return this.timer ? (performance.now() - this.startedAt) / 1e3 + this.pausedAt : this.pausedAt;
	}
	get resetOffset() {
		const startAt = getTrackStartAt(this.track);
		return Math.min(startAt, this.durationValue || startAt);
	}
	async load(_options) {
		if (this.sequence) {
			this.pausedAt = this.resetOffset;
			this.callbacks.onProgress(this.pausedAt, this.durationValue);
			this.callbacks.onReady();
			this.callbacks.onStatus();
			return;
		}
		this.callbacks.onStatus("Loading MIDI");
		try {
			const sequence = await loadMidiSequence(this.track.src);
			this.sequence = sequence;
			this.durationValue = sequence.duration;
			this.pausedAt = this.resetOffset;
			this.callbacks.onDuration(this.durationValue);
			if (sequence.metadata?.title) this.callbacks.onMetadata({ title: sequence.metadata.title });
			this.callbacks.onProgress(this.pausedAt, this.durationValue);
			this.callbacks.onReady();
			this.callbacks.onStatus();
		} catch {
			this.callbacks.onStatus("MIDI failed to load");
		}
	}
	async play(options) {
		if (!this.sequence) return false;
		if (options.restart) {
			this.pausedAt = this.resetOffset;
			this.callbacks.onProgress(this.pausedAt, this.durationValue);
		} else if (this.durationValue > 0 && this.pausedAt >= this.durationValue) {
			this.pausedAt = this.resetOffset;
			this.callbacks.onProgress(this.pausedAt, this.durationValue);
		}
		this.stopPlayback();
		await warmMidiAudioContext();
		if (options.isStale()) return false;
		const oscillatorType = resolveMidiOscillatorType(this.getOscillator(), this.sequence?.metadata?.program);
		this.ensureSynth(oscillatorType);
		if (!this.synth || !this.sequence) return false;
		const startOffset = this.pausedAt;
		const startTime = midiPlaybackRuntime.now + scheduleLeadTime;
		this.startedAt = performance.now();
		this.disposePart();
		this.part = this.createPart(this.sequence.notes);
		this.playResumedNotes(startOffset, startTime);
		this.part?.start(0, startOffset);
		const transport = midiPlaybackRuntime.transport;
		transport.stop();
		transport.seconds = 0;
		transport.start(startTime, 0);
		this.timer = window.setTimeout(() => this.finishPlayback(), Math.max(0, this.durationValue - startOffset) * 1e3);
		return true;
	}
	pause() {
		this.pausedAt = this.currentTime;
		this.stopPlayback();
	}
	seek(seconds) {
		this.pausedAt = Math.max(0, seconds);
		this.callbacks.onProgress(this.pausedAt, this.durationValue);
	}
	stop() {
		this.pausedAt = this.resetOffset;
		this.stopPlayback();
		this.disposePart();
		this.disposeSynth();
	}
	ensureSynth(oscillatorType) {
		if (this.synth && this.synthOscillator === oscillatorType) return;
		this.disposeSynth();
		this.synth = new Tone.PolySynth(Tone.Synth, {
			envelope: {
				attack: .005,
				decay: .08,
				release: .12,
				sustain: .45
			},
			oscillator: { type: oscillatorType }
		}).toDestination();
		this.synth.volume.value = midiSynthLevel;
		this.synthOscillator = oscillatorType;
	}
	stopPlayback() {
		if (this.timer) {
			window.clearTimeout(this.timer);
			this.timer = 0;
		}
		this.part?.stop(0);
		this.part?.cancel(0);
		const transport = midiPlaybackRuntime.transport;
		if (transport.state !== "stopped") transport.pause();
		this.synth?.releaseAll();
	}
	finishPlayback() {
		this.pausedAt = this.durationValue;
		this.stopPlayback();
		this.callbacks.onProgress(this.durationValue, this.durationValue);
		this.callbacks.onFinish();
	}
	disposeSynth() {
		this.synth?.releaseAll();
		this.synth?.dispose();
		this.synth = null;
		this.synthOscillator = null;
	}
	createPart(notes) {
		return midiPlaybackRuntime.createPart((time, note) => {
			this.synth?.triggerAttackRelease(note.frequency, note.duration, time, Math.max(minimumMidiVelocity, note.velocity));
		}, notes.map((note) => ({
			duration: note.duration,
			frequency: note.frequency,
			time: note.start,
			velocity: note.velocity
		})));
	}
	playResumedNotes(startOffset, startTime) {
		if (!this.synth || !this.sequence || startOffset <= 0) return;
		for (const note of this.sequence.notes) {
			if (note.start >= startOffset || note.start + note.duration <= startOffset) continue;
			const clippedDuration = Math.max(minimumMidiNoteDuration, note.start + note.duration - startOffset);
			this.synth.triggerAttackRelease(note.frequency, clippedDuration, startTime, Math.max(minimumMidiVelocity, note.velocity));
		}
	}
	disposePart() {
		this.part?.stop(0);
		this.part?.cancel(0);
		this.part?.dispose();
		this.part = null;
	}
};
//#endregion
//#region src/lib/midi-backend.ts
var juketteMidiBackend = {
	createPlayableTrack(track, callbacks, options) {
		return new MidiPlayableTrack(track, callbacks, options.getMidiOscillator);
	},
	inferTrackType(track) {
		return /\.(?:mid|midi)(?:[?#].*)?$/i.test(track.src) ? "midi" : null;
	},
	preloadTrack: async (track, options) => {
		if (!options.preloadDuration && !options.preloadMetadata) return;
		const sequence = await loadMidiSequence(track.src);
		const result = {};
		if (options.preloadDuration) result.duration = sequence.duration;
		if (options.preloadMetadata && sequence.metadata?.title) result.metadata = { title: sequence.metadata.title };
		return result.duration || result.metadata ? result : void 0;
	},
	priority: 100,
	type: "midi"
};
var register = () => registerJuketteBackend(juketteMidiBackend);
var registerJuketteMidiBackend = () => registerJuketteBackend(juketteMidiBackend);
//#endregion
export { juketteMidiBackend, loadMidiSequence, midiProgramToOscillator, normalizeMidiOscillator, parseMidi, register, registerJuketteMidiBackend, resolveMidiOscillatorType };
