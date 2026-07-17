import { playerStyles } from './jukette-player.css.generated'

export interface JukettePlayerDom {
	audio: HTMLAudioElement
	elapsedTimeElement: HTMLElement
	iframe: HTMLIFrameElement
	metaElement: HTMLElement
	nextButton: HTMLButtonElement
	playButton: HTMLButtonElement
	playerElement: HTMLElement
	playlistButton: HTMLButtonElement
	playlistElement: HTMLOListElement
	previousButton: HTMLButtonElement
	remainingTimeElement: HTMLElement
	seekInput: HTMLInputElement
	statusElement: HTMLElement
	titleElement: HTMLElement
	totalTimeElement: HTMLElement
	volumeInput: HTMLInputElement
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
				<div class="meta" part="artist"></div>
			</div>
			<div class="progress" part="progress">
				<div class="status" part="status" role="status" aria-live="polite"></div>
				<div class="seek" part="seek">
					<input class="seek-input" part="seek-input" type="range" min="0" max="1000" value="0" aria-label="Seek" />
					<div class="time" part="time" aria-live="off">
						<span class="elapsed" part="elapsed">0:00</span>
						<span class="remaining" part="remaining">-0:00</span>
						<span class="total" part="total">0:00</span>
					</div>
				</div>
			</div>
			<div class="controls" part="controls">
				<button class="previous" part="button previous-button" type="button" aria-label="Previous or restart track">&#x23ee;&#xfe0e;</button>
				<button class="play" part="button play-button" type="button" aria-label="Play">▶</button>
				<button class="next" part="button next-button" type="button" aria-label="Next track">&#x23ed;&#xfe0e;</button>
				<input class="volume" part="volume" type="range" min="0" max="1" step="0.01" value="1" aria-label="Volume" />
				<button class="playlist-toggle" part="button playlist-button" type="button" aria-label="Toggle playlist" aria-pressed="false">☰</button>
			</div>
			<iframe class="soundcloud" part="soundcloud" title="SoundCloud player" allow="autoplay"></iframe>
			<audio preload="metadata"></audio>
			<ol class="playlist" part="playlist"></ol>
		</div>
	`

	return {
		audio: query<HTMLAudioElement>(shadowRoot, 'audio'),
		elapsedTimeElement: query<HTMLElement>(shadowRoot, '.elapsed'),
		iframe: query<HTMLIFrameElement>(shadowRoot, '.soundcloud'),
		metaElement: query<HTMLElement>(shadowRoot, '.meta'),
		nextButton: query<HTMLButtonElement>(shadowRoot, '.next'),
		playButton: query<HTMLButtonElement>(shadowRoot, '.play'),
		playerElement: query<HTMLElement>(shadowRoot, '.player'),
		playlistButton: query<HTMLButtonElement>(
			shadowRoot,
			'.playlist-toggle',
		),
		playlistElement: query<HTMLOListElement>(shadowRoot, '.playlist'),
		previousButton: query<HTMLButtonElement>(shadowRoot, '.previous'),
		remainingTimeElement: query<HTMLElement>(shadowRoot, '.remaining'),
		seekInput: query<HTMLInputElement>(shadowRoot, '.seek-input'),
		statusElement: query<HTMLElement>(shadowRoot, '.status'),
		titleElement: query<HTMLElement>(shadowRoot, '.title'),
		totalTimeElement: query<HTMLElement>(shadowRoot, '.total'),
		volumeInput: query<HTMLInputElement>(shadowRoot, '.volume'),
	}
}
