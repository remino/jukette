import { JukettePlayableTrack } from './playable-track';
import type { PlayableTrackCallbacks } from './playable-track';
import type { AudioFileMetadata, JuketteMidiOscillator, JuketteTrack, JuketteTrackKind } from './types';
export interface JuketteBackendPreloadOptions {
    preloadDuration: boolean;
    preloadMetadata: boolean;
}
export interface JuketteBackendPreloadResult {
    duration?: number;
    metadata?: AudioFileMetadata;
}
export interface JuketteBackendCreateTrackOptions {
    audioElement: HTMLAudioElement;
    getMidiOscillator(): JuketteMidiOscillator;
    host: HTMLElement;
}
export interface JuketteBackend {
    createPlayableTrack(track: JuketteTrack, callbacks: PlayableTrackCallbacks, options: JuketteBackendCreateTrackOptions): JukettePlayableTrack;
    inferTrackType?(track: Pick<JuketteTrack, 'src' | 'type'>): JuketteTrackKind | null;
    preloadTrack?(track: JuketteTrack, options: JuketteBackendPreloadOptions): Promise<JuketteBackendPreloadResult | void> | JuketteBackendPreloadResult | void;
    priority?: number;
    type: JuketteTrackKind;
}
export declare const getRegisteredJuketteBackends: () => JuketteBackend[];
export declare const getJuketteBackend: (type: JuketteTrackKind) => JuketteBackend | undefined;
export declare const registerJuketteBackend: (backend: JuketteBackend) => JuketteBackend;
export declare const resetJuketteBackends: () => void;
export declare const subscribeJuketteBackendRegistrations: (listener: (backend: JuketteBackend) => void) => (() => void);
export declare const resolveJuketteBackend: (track: Pick<JuketteTrack, "src" | "type">) => JuketteBackend | undefined;
