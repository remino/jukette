export interface JukettePlayerDom {
    audio: HTMLAudioElement;
    metaElement: HTMLElement;
    playButton: HTMLButtonElement;
    playerElement: HTMLElement;
    seekInput: HTMLInputElement;
    statusElement: HTMLElement;
    titleElement: HTMLElement;
    trackSelect: HTMLSelectElement;
    timeButton: HTMLButtonElement;
    timeElement: HTMLTimeElement;
}
export declare const createJukettePlayerDom: (host: HTMLElement) => JukettePlayerDom;
