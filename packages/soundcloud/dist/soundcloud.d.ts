import { type JuketteBackend } from '@remino/jukette-core';
type SoundCloudEventPayload = {
    currentPosition?: number;
    loadProgress?: number;
    relativePosition?: number;
};
interface SoundCloudWidget {
    bind(eventName: string, listener: (payload?: SoundCloudEventPayload) => void): void;
    getDuration(callback: (duration: number) => void): void;
    getPosition(callback: (position: number) => void): void;
    pause(): void;
    play(): void;
    seekTo(milliseconds: number): void;
}
interface SoundCloudWidgetFactory {
    (iframe: HTMLIFrameElement | string): SoundCloudWidget;
    Events: {
        ERROR: string;
        FINISH: string;
        PAUSE: string;
        PLAY: string;
        PLAY_PROGRESS: string;
        READY: string;
    };
}
interface SoundCloudWindow {
    Widget: SoundCloudWidgetFactory;
}
declare global {
    interface Window {
        SC?: SoundCloudWindow;
    }
}
export declare const soundCloudBackend: JuketteBackend;
export declare const register: () => JuketteBackend;
export declare const registerJuketteSoundCloudBackend: () => JuketteBackend;
export {};
