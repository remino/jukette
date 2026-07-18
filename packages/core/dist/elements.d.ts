import { HTMLElementBase } from './dom';
import { JukettePlayerElement } from './player';
export declare const defineElement: () => void;
export declare class JuketteTrackElement extends HTMLElementBase {
}
export declare const defineElements: () => void;
export declare const defineJuketteElement: () => void;
export declare const defineJuketteElements: () => void;
declare global {
    interface HTMLElementTagNameMap {
        'jukette-player': JukettePlayerElement;
        'jukette-track': JuketteTrackElement;
    }
}
