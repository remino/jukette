import type { AudioFileMetadata, JuketteTrack } from './types';
export interface RenderTrackSelectOptions {
    currentIndex: number;
    element: HTMLSelectElement;
    formatTime(seconds: number): string;
    getDisplay(track: JuketteTrack): Required<AudioFileMetadata>;
    getDuration(track: JuketteTrack): number | undefined;
    tracks: JuketteTrack[];
}
export declare const renderTrackSelect: ({ currentIndex, element, formatTime, getDisplay, getDuration, tracks, }: RenderTrackSelectOptions) => void;
