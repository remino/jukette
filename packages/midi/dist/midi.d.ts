import type { JuketteMidiOscillator, MidiSequence } from '@remino/jukette-core';
export declare const midiProgramToOscillator: (program?: number) => OscillatorType;
export declare const resolveMidiOscillatorType: (oscillator: JuketteMidiOscillator, program?: number) => OscillatorType;
export declare const parseMidi: (buffer: ArrayBuffer) => MidiSequence;
export declare const loadMidiSequence: (src: string) => Promise<MidiSequence>;
