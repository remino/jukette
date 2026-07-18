import playerStyles from './jukette-player.css?inline'

export interface JukettePlayerDom {
	audio: HTMLAudioElement
	metaElement: HTMLElement
	playButton: HTMLButtonElement
	playerElement: HTMLElement
	seekInput: HTMLInputElement
	statusElement: HTMLElement
	titleElement: HTMLElement
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
				<div class="title" part="title"></div>
				<div class="meta" part="artist status" role="status" aria-live="polite"></div>
			</div>
			<div class="controls" part="controls">
				<button class="play" part="button play-button" type="button" aria-label="Play">▶</button>
				<div class="seek" part="seek">
					<input class="seek-input" part="seek-input" type="range" min="0" max="1000" value="0" aria-label="Seek" />
				</div>
				<button class="time" part="time" type="button" aria-label="Toggle time display"><time datetime="PT0S">0:00</time></button>
			</div>
			<select class="track-select" part="track-select" aria-label="Track selection"></select>
			<audio preload="metadata"></audio>
		</div>
	`

	return {
		audio: query<HTMLAudioElement>(shadowRoot, 'audio'),
		metaElement: query<HTMLElement>(shadowRoot, '.meta'),
		playButton: query<HTMLButtonElement>(shadowRoot, '.play'),
		playerElement: query<HTMLElement>(shadowRoot, '.player'),
		seekInput: query<HTMLInputElement>(shadowRoot, '.seek-input'),
		statusElement: query<HTMLElement>(shadowRoot, '.meta'),
		titleElement: query<HTMLElement>(shadowRoot, '.title'),
		timeButton: query<HTMLButtonElement>(shadowRoot, '.time'),
		timeElement: query<HTMLTimeElement>(shadowRoot, '.time time'),
		trackSelect: query<HTMLSelectElement>(shadowRoot, '.track-select'),
	}
}
