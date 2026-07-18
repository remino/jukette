import type { AudioFileMetadata, JuketteTrack } from './types';
export interface JuketteMetadataControllerOptions {
    getPreloadMetadata(): boolean;
    getTrackKey(track: JuketteTrack): string;
    getTracks(): JuketteTrack[];
    isCurrentTrack(track: JuketteTrack): boolean;
    onCurrentTrackDisplayChange(): void;
    onPlaylistDisplayChange(): void;
    trackPrefersMediaMetadata(track: JuketteTrack): boolean;
}
export declare class JuketteMetadataController {
    private readonly options;
    private readonly durations;
    private readonly metadata;
    private preloadId;
    constructor(options: JuketteMetadataControllerOptions);
    get metadataPreloadId(): number;
    getDuration(track: JuketteTrack | null): number | undefined;
    setDuration(track: JuketteTrack | null, duration: number): void;
    getDisplay(track: JuketteTrack): Required<AudioFileMetadata>;
    setMetadata(track: JuketteTrack | null, metadata: AudioFileMetadata): void;
    preloadPlaylistMetadata(): void;
    private preloadTrackMetadata;
}
