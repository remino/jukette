import { JukettePlayableTrack } from '@remino/jukette-core';
import type { PlayableTrackCallbacks, PlayableTrackLoadOptions, PlayableTrackPlayOptions, JuketteTrack } from '@remino/jukette-core';
export declare class AudioPlayableTrack extends JukettePlayableTrack {
    private readonly audio;
    constructor(track: JuketteTrack, audio: HTMLAudioElement, callbacks: PlayableTrackCallbacks);
    get currentTime(): number;
    get duration(): number;
    load(options: PlayableTrackLoadOptions): void;
    play(options: PlayableTrackPlayOptions): Promise<boolean>;
    pause(): void;
    seek(seconds: number): void;
    stop(): void;
    requestPosition(): void;
    private preloadFileMetadata;
}
