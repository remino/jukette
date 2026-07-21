import playerStyles from './jukette-player.css?inline'
import type { RemarqueebleElement } from 'remarqueeble'

export interface JukettePlayerDom {
	audio: HTMLAudioElement
	displayElement: RemarqueebleElement
	playButton: HTMLButtonElement
	playerElement: HTMLElement
	seekInput: HTMLInputElement
	sourceLink: HTMLAnchorElement
	trackPicker: HTMLElement
	trackSelect: HTMLSelectElement
	timeButton: HTMLButtonElement
	timeElement: HTMLTimeElement
}

const query = <T extends Element>(root: ParentNode, selector: string): T => {
	const element = root.querySelector<T>(selector)
	if (!element) throw new Error(`Missing Jukette element: ${selector}`)
	return element
}

export const createJukettePlayerDom = (host: HTMLElement): JukettePlayerDom => {
	const shadowRoot = host.attachShadow({ mode: 'open' })
	shadowRoot.innerHTML = `
		<style>${playerStyles}</style>

		<div class="player" part="player">
			<div class="track" part="track" aria-live="polite">
				<re-marquee class="display" part="display" role="status" aria-live="polite" animate="overflow"></re-marquee>
				<a
					class="source-link"
					part="source-link"
					aria-label="Open source page"
					hidden
					rel="noopener noreferrer"
					target="_blank"
					title="Open source page"
				><span class="source-link-glyph">↗</span></a>
			</div>
			<div class="controls" part="controls">
				<button class="play" part="button play-button" type="button" aria-label="Play">▶</button>
				<div class="seek" part="seek">
					<input class="seek-input" part="seek-input" type="range" min="0" max="1000" value="0" aria-label="Seek" />
				</div>
				<button class="time" part="time" type="button" aria-label="Toggle time display"><time datetime="PT0S">0:00</time></button>
			</div>
			<div class="track-picker" part="track-picker">
				<select class="track-select" part="track-select" aria-label="Track selection"></select>
			</div>
			<audio preload="metadata"></audio>
		</div>
	`

	return {
		audio: query<HTMLAudioElement>(shadowRoot, 'audio'),
		displayElement: query<RemarqueebleElement>(shadowRoot, '.display'),
		playButton: query<HTMLButtonElement>(shadowRoot, '.play'),
		playerElement: query<HTMLElement>(shadowRoot, '.player'),
		seekInput: query<HTMLInputElement>(shadowRoot, '.seek-input'),
		sourceLink: query<HTMLAnchorElement>(shadowRoot, '.source-link'),
		trackPicker: query<HTMLElement>(shadowRoot, '.track-picker'),
		timeButton: query<HTMLButtonElement>(shadowRoot, '.time'),
		timeElement: query<HTMLTimeElement>(shadowRoot, '.time time'),
		trackSelect: query<HTMLSelectElement>(shadowRoot, '.track-select'),
	}
}
