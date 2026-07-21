import { createHighlighterCore } from 'shiki/core'
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript'
import html from 'shiki/langs/html.mjs'
import githubDark from 'shiki/themes/github-dark.mjs'
import 'jukette/auto'
import '@remino/jukette-midi/auto'
import '@remino/jukette-soundcloud/auto'

const form = document.querySelector('[data-playground]')
const player = document.querySelector('[data-player]')
const code = document.querySelector('code-viewer')
const copyButton = document.querySelector('[data-copy]')
const resetButton = document.querySelector('[data-reset]')
const CODE_VIEWER_TAG_NAME = 'code-viewer'

const defaultValues = {
	displayMarquee: 'overflow',
	midiOscillator: 'auto',
	preferMediaMetadata: 'true',
	preloadMetadata: 'true',
	showSourceLink: 'true',
	showTrackSelect: 'true',
}

const trackMarkup = [
	`  <jukette-track`,
	`    title="C-sharp arpeggiator for late-night cassette deck calibration and soft neon hallway testing"`,
	`    artist="Jukette"`,
	`    src="/jukette/demo-tone.mp3"`,
	`    preload`,
	`  ></jukette-track>`,
	`  <jukette-track`,
	`    title="MIDI scale"`,
	`    artist="Jukette"`,
	`    src="/jukette/demo-scale.mid"`,
	`    type="midi"`,
	`  ></jukette-track>`,
	`  <jukette-track`,
	`    title="Flickermood"`,
	`    artist="Forss"`,
	`    src="https://soundcloud.com/forss/flickermood"`,
	`    type="soundcloud"`,
	`  ></jukette-track>`,
	`  <jukette-track`,
	`    title="Wii Shop Music"`,
	`    artist="Nintendo"`,
	`    src="https://soundcloud.com/yanocon/nintendo-shop-theme-wii-shop"`,
	`    type="soundcloud"`,
	`    start-at="59"`,
	`  ></jukette-track>`,
].join('\n')

const highlighter = createHighlighterCore({
	engine: createJavaScriptRegexEngine(),
	langs: [html],
	themes: [githubDark],
})

const highlightCode = async (value) => {
	const shiki = await highlighter

	return shiki
		.codeToHtml(value, {
			lang: 'html',
			theme: 'github-dark',
		})
		.replace('class="shiki ', 'class="astro-code ')
}

class CodeViewer extends HTMLElement {
	mutationObserver = new MutationObserver(() => {
		this.source = this.textContent ?? ''
	})
	renderId = 0
	sourceValue = ''

	connectedCallback() {
		this.removeAttribute('data-source')

		if (!this.sourceValue) {
			this.sourceValue = this.textContent ?? ''
		}

		this.observeSource()
		this.render()
	}

	disconnectedCallback() {
		this.mutationObserver.disconnect()
	}

	get source() {
		return this.sourceValue
	}

	set source(value) {
		this.sourceValue = value
		this.render()
	}

	observeSource() {
		this.mutationObserver.observe(this, {
			characterData: true,
			childList: true,
			subtree: true,
		})
	}

	async render() {
		const currentRenderId = ++this.renderId
		const highlighted = await highlightCode(this.sourceValue)

		if (!this.isConnected || currentRenderId !== this.renderId) return

		this.removeAttribute('data-source')
		this.mutationObserver.disconnect()
		this.innerHTML = highlighted
		this.observeSource()
	}
}

if (
	typeof customElements !== 'undefined' &&
	!customElements.get(CODE_VIEWER_TAG_NAME)
) {
	customElements.define(CODE_VIEWER_TAG_NAME, CodeViewer)
}

const getControl = (name) => form?.elements.namedItem(name)

const readSetting = (name) => {
	const control = getControl(name)

	if (control instanceof HTMLInputElement && control.type === 'checkbox') {
		return control.checked ? 'true' : 'false'
	}

	return control?.value ?? defaultValues[name] ?? ''
}

const writeSetting = (name, value) => {
	const control = getControl(name)

	if (control instanceof HTMLInputElement && control.type === 'checkbox') {
		control.checked = value === 'true'
		return
	}

	if (control) {
		control.value = value
	}
}

const toggleBooleanAttribute = (element, name, enabled) => {
	if (!element) return

	if (enabled) {
		element.setAttribute(name, '')
		return
	}

	element.removeAttribute(name)
}

const buildEmbedCode = (settings) => {
	const attributes = []

	if (settings.preloadMetadata === 'true') {
		attributes.push('preload-metadata')
	}

	if (settings.preferMediaMetadata === 'true') {
		attributes.push('prefer-media-metadata')
	}

	if (settings.showSourceLink === 'true') {
		attributes.push('show-source-link')
	}

	if (settings.showTrackSelect === 'false') {
		attributes.push('show-track-select="false"')
	}

	if (settings.displayMarquee !== 'overflow') {
		attributes.push(`display-marquee="${settings.displayMarquee}"`)
	}

	if (settings.midiOscillator !== 'auto') {
		attributes.push(`midi-oscillator="${settings.midiOscillator}"`)
	}

	return `<jukette-player ${attributes.join(' ')}>\n${trackMarkup}\n</jukette-player>\n\n<script type="module">\n  import 'jukette/auto'\n  import '@remino/jukette-midi/auto'\n  import '@remino/jukette-soundcloud/auto'\n</script>`
}

let previousSettings = {}

const render = () => {
	if (!player) return

	const settings = {
		displayMarquee: readSetting('displayMarquee'),
		midiOscillator: readSetting('midiOscillator'),
		preferMediaMetadata: readSetting('preferMediaMetadata'),
		preloadMetadata: readSetting('preloadMetadata'),
		showSourceLink: readSetting('showSourceLink'),
		showTrackSelect: readSetting('showTrackSelect'),
		trackIndex: readSetting('trackIndex'),
	}

	// Only update attributes that changed
	if (settings.displayMarquee !== previousSettings.displayMarquee) {
		player.setAttribute('display-marquee', settings.displayMarquee)
	}

	if (settings.midiOscillator !== previousSettings.midiOscillator) {
		player.setAttribute('midi-oscillator', settings.midiOscillator)
	}

	if (settings.preferMediaMetadata !== previousSettings.preferMediaMetadata) {
		toggleBooleanAttribute(
			player,
			'prefer-media-metadata',
			settings.preferMediaMetadata === 'true',
		)
	}

	if (settings.preloadMetadata !== previousSettings.preloadMetadata) {
		toggleBooleanAttribute(
			player,
			'preload-metadata',
			settings.preloadMetadata === 'true',
		)
	}

	if (settings.showSourceLink !== previousSettings.showSourceLink) {
		toggleBooleanAttribute(
			player,
			'show-source-link',
			settings.showSourceLink === 'true',
		)
	}

	if (settings.showTrackSelect !== previousSettings.showTrackSelect) {
		if (settings.showTrackSelect === 'true') {
			player.removeAttribute('show-track-select')
		} else {
			player.setAttribute('show-track-select', 'false')
		}
	}

	const embedCode = buildEmbedCode(settings)

	if (code) {
		code.setAttribute('data-copy-source', embedCode)
		code.source = embedCode
	}

	previousSettings = { ...settings }
}

const resetSettings = () => {
	for (const [name, value] of Object.entries(defaultValues)) {
		writeSetting(name, value)
	}

	render()
}

form?.addEventListener('input', render)
form?.addEventListener('change', render)
resetButton?.addEventListener('click', resetSettings)

copyButton?.addEventListener('click', async () => {
	const source = code?.getAttribute('data-copy-source')
	if (!source) return

	await navigator.clipboard.writeText(source)
	copyButton.textContent = 'Copied'
	setTimeout(() => {
		copyButton.textContent = 'Copy'
	}, 1200)
})

render()
