import type { AudioFileMetadata, JuketteTrack } from './types';
export interface PlayableTrackCallbacks {
    onDuration(duration: number): void;
    onFinish(): void;
    onMetadata(metadata: AudioFileMetadata, metadataPreloadId?: number): void;
    onPause(): void;
    onPlay(): void;
    onProgress(currentTime: number, duration: number): void;
    onReady(): void;
    onStatus(message?: string): void;
}
export interface PlayableTrackLoadOptions {
    metadataPreloadId: number;
    restart: boolean;
    silent?: boolean;
}
export interface PlayableTrackPlayOptions {
    isStale(): boolean;
    restart: boolean;
}
export declare abstract class JukettePlayableTrack {
    readonly track: JuketteTrack;
    protected readonly callbacks: PlayableTrackCallbacks;
    protected durationValue: number;
    constructor(track: JuketteTrack, callbacks: PlayableTrackCallbacks);
    get currentTime(): number;
    get duration(): number;
    load(_options: PlayableTrackLoadOptions): void | Promise<void>;
    abstract play(options: PlayableTrackPlayOptions): Promise<boolean>;
    abstract pause(options?: {
        silent?: boolean;
    }): void;
    seek(_seconds: number): void;
    stop(): void;
    requestPosition(_isStale: () => boolean): void;
}
