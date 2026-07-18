import type { JuketteTrack } from './types';
export declare const inferTrackType: (track: Pick<JuketteTrack, "src" | "type">) => string;
export declare const normalizeTrack: (value: unknown) => JuketteTrack | null;
export declare const parsePlaylist: (value: string | null) => JuketteTrack[];
export declare const trackFromElement: (element: Element) => JuketteTrack | null;
