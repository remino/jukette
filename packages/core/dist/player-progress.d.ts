import type { JukettePlayerDom } from './player-dom';
export interface JuketteProgressControllerOptions {
    dom: JukettePlayerDom;
    getCurrentTime(): number;
    getDuration(): number;
    getPlaying(): boolean;
    getTimeMode(): 'elapsed' | 'remaining';
    onStatusChange(message?: string): void;
}
export declare class JuketteProgressController {
    private readonly options;
    private progressFrame;
    constructor(options: JuketteProgressControllerOptions);
    setStatus(message?: string): void;
    syncProgress(currentTime: number, duration: number): void;
    syncPlayingState(): void;
    start(): void;
    stop(): void;
}
