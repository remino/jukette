import type { RemarqueebleElement } from 'remarqueeble';
export interface JukettePlayerDom {
    audio: HTMLAudioElement;
    displayElement: RemarqueebleElement;
    playButton: HTMLButtonElement;
    playerElement: HTMLElement;
    seekInput: HTMLInputElement;
    sourceLink: HTMLAnchorElement;
    trackSelect: HTMLSelectElement;
    timeButton: HTMLButtonElement;
    timeElement: HTMLTimeElement;
}
export declare const createJukettePlayerDom: (host: HTMLElement) => JukettePlayerDom;
