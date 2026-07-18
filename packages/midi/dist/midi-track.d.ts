import * as Tone from 'tone';
import { JukettePlayableTrack } from '@remino/jukette-core';
import type { PlayableTrackCallbacks, PlayableTrackLoadOptions, PlayableTrackPlayOptions, JuketteMidiOscillator, JuketteTrack } from '@remino/jukette-core';
type ScheduledMidiNote = {
    duration: number;
    frequency: number;
    time: number;
    velocity: number;
};
type ToneTransport = ReturnType<typeof Tone.getTransport>;
export declare const midiPlaybackRuntime: {
    createPart(callback: (time: number, note: ScheduledMidiNote) => void, notes: ScheduledMidiNote[]): Tone.Part<ScheduledMidiNote>;
    readonly now: number;
    resetWarmup(): void;
    start(): Promise<void>;
    readonly transport: ToneTransport;
};
export declare const warmMidiAudioContext: () => Promise<void>;
export declare class MidiPlayableTrack extends JukettePlayableTrack {
    private readonly getOscillator;
    private part;
    private pausedAt;
    private sequence;
    private startedAt;
    private synth;
    private synthOscillator;
    private timer;
    constructor(track: JuketteTrack, callbacks: PlayableTrackCallbacks, getOscillator: () => JuketteMidiOscillator);
    get currentTime(): number;
    private get resetOffset();
    load(_options: PlayableTrackLoadOptions): Promise<void>;
    play(options: PlayableTrackPlayOptions): Promise<boolean>;
    pause(): void;
    seek(seconds: number): void;
    stop(): void;
    private ensureSynth;
    private stopPlayback;
    private finishPlayback;
    private disposeSynth;
    private createPart;
    private playResumedNotes;
    private disposePart;
}
export {};
