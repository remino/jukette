import type { AudioFileMetadata, JuketteDisplayMarquee } from './types';
export declare const normalizeDisplayMarquee: (value: string | null) => JuketteDisplayMarquee;
export declare const formatTrackDisplay: (display: Required<AudioFileMetadata>) => string;
