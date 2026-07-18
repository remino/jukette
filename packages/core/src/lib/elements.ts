import { HTMLElementBase } from './dom'
import { JukettePlayerElement } from './player'

export const defineElement = (): void => {
	if (typeof customElements === 'undefined') return

	if (!customElements.get('jukette-track')) {
		customElements.define('jukette-track', JuketteTrackElement)
	}

	if (!customElements.get('jukette-player')) {
		customElements.define('jukette-player', JukettePlayerElement)
	}
}

export class JuketteTrackElement extends HTMLElementBase {}

export const defineElements = defineElement
export const defineJuketteElement = defineElement
export const defineJuketteElements = defineElement

declare global {
	interface HTMLElementTagNameMap {
		'jukette-player': JukettePlayerElement
		'jukette-track': JuketteTrackElement
	}
}
