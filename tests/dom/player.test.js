import { describe, expect, it, vi } from 'vitest'

import { defineElement, registerJuketteBackend } from '@remino/jukette-core'
import { register as registerAudio } from '@remino/jukette-audio'

const patchAudio = (audio, { duration = 10 } = {}) => {
	let currentTime = 0
	let paused = true

	Object.defineProperty(audio, 'currentTime', {
		configurable: true,
		get: () => currentTime,
		set: (value) => {
			currentTime = value
		},
	})
	Object.defineProperty(audio, 'duration', {
		configurable: true,
		get: () => duration,
	})
	Object.defineProperty(audio, 'paused', {
		configurable: true,
		get: () => paused,
	})

	audio.load = vi.fn()
	audio.play = vi.fn().mockImplementation(async () => {
		paused = false
	})
	audio.pause = vi.fn().mockImplementation(() => {
		paused = true
	})

	return {
		setCurrentTime(value) {
			currentTime = value
		},
	}
}

const renderPlayer = (tracksMarkup) => {
	defineElement()
	registerAudio()

	document.body.innerHTML = `<jukette-player>${tracksMarkup}</jukette-player>`
	const player = document.querySelector('jukette-player')
	const shadowRoot = player.shadowRoot
	const audio = shadowRoot.querySelector('audio')
	const state = patchAudio(audio)

	return {
		audio,
		player,
		shadowRoot,
		state,
		elements: {
			meta: shadowRoot.querySelector('.meta'),
			play: shadowRoot.querySelector('.play'),
			seek: shadowRoot.querySelector('.seek-input'),
			select: shadowRoot.querySelector('.track-select'),
			time: shadowRoot.querySelector('.time'),
			timeValue: shadowRoot.querySelector('.time time'),
			title: shadowRoot.querySelector('.title'),
		},
	}
}

const markAudioReady = ({ audio }, duration = 10) => {
	Object.defineProperty(audio, 'duration', {
		configurable: true,
		get: () => duration,
	})
	audio.dispatchEvent(new Event('loadedmetadata'))
	audio.dispatchEvent(new Event('canplay'))
}

const flushAsync = async (count = 3) => {
	for (let index = 0; index < count; index += 1) {
		await Promise.resolve()
		await new Promise((resolve) => window.setTimeout(resolve, 0))
	}
}

describe('JukettePlayerElement DOM', () => {
	it('renders the simplified player shape without playlist UI', () => {
		const { elements, shadowRoot } = renderPlayer(`
			<jukette-track title="One" artist="Artist" src="/one.mp3"></jukette-track>
			<jukette-track title="Two" artist="Band" src="/two.mp3"></jukette-track>
		`)

		expect(elements.title.textContent).toBe('One')
		expect(elements.meta.textContent).toBe('Loading audio')
		expect(elements.select.options).toHaveLength(2)
		expect(elements.play).toBeTruthy()
		expect(elements.seek).toBeTruthy()
		expect(elements.time).toBeTruthy()
		expect(shadowRoot.querySelector('.playlist')).toBeNull()
		expect(shadowRoot.querySelector('.previous')).toBeNull()
		expect(shadowRoot.querySelector('.next')).toBeNull()
	})

	it('keeps controls disabled until canplay, not merely loadedmetadata', () => {
		const ctx = renderPlayer(`
			<jukette-track title="One" artist="Artist" src="/one.mp3"></jukette-track>
		`)

		expect(ctx.elements.play.disabled).toBe(true)
		expect(ctx.elements.seek.disabled).toBe(true)
		expect(ctx.elements.time.disabled).toBe(true)

		ctx.audio.dispatchEvent(new Event('loadedmetadata'))
		expect(ctx.elements.play.disabled).toBe(true)

		ctx.audio.dispatchEvent(new Event('canplay'))
		expect(ctx.elements.play.disabled).toBe(false)
		expect(ctx.elements.seek.disabled).toBe(false)
		expect(ctx.elements.time.disabled).toBe(false)
	})

	it('changes selection without autoplay and resets the current track', async () => {
		const ctx = renderPlayer(`
			<jukette-track title="One" artist="Artist" src="/one.mp3"></jukette-track>
			<jukette-track title="Two" artist="Band" src="/two.mp3"></jukette-track>
		`)
		const trackChange = vi.fn()
		const playEvent = vi.fn()

		ctx.player.addEventListener('jukette:trackchange', trackChange)
		ctx.player.addEventListener('jukette:play', playEvent)

		markAudioReady(ctx, 10)
		await ctx.player.play()
		expect(playEvent).toHaveBeenCalledTimes(1)
		expect(ctx.audio.play).toHaveBeenCalledTimes(1)

		ctx.state.setCurrentTime(4)
		ctx.elements.select.value = '1'
		ctx.elements.select.dispatchEvent(new Event('change'))

		expect(trackChange).toHaveBeenCalled()
		expect(ctx.elements.play.disabled).toBe(true)
		expect(ctx.elements.seek.disabled).toBe(true)
		expect(ctx.elements.time.disabled).toBe(true)
		expect(ctx.elements.play.getAttribute('aria-label')).toBe('Play')
		expect(ctx.elements.timeValue.textContent).toBe('0:00')
		expect(ctx.audio.play).toHaveBeenCalledTimes(1)
	})

	it('does not unlock the new selection from a stale old canplay event', () => {
		const ctx = renderPlayer(`
			<jukette-track title="One" artist="Artist" src="/one.mp3"></jukette-track>
			<jukette-track title="Missing" src="/missing" type="soundcloud"></jukette-track>
		`)

		ctx.elements.select.value = '1'
		ctx.elements.select.dispatchEvent(new Event('change'))
		ctx.audio.dispatchEvent(new Event('canplay'))

		expect(ctx.elements.play.disabled).toBe(true)
		expect(ctx.elements.seek.disabled).toBe(true)
		expect(ctx.elements.time.disabled).toBe(true)
		expect(ctx.elements.meta.textContent).toBe(
			'soundcloud playback unavailable',
		)
	})

	it('plays, pauses, seeks, toggles time mode, and ends without auto-advance', async () => {
		const ctx = renderPlayer(`
			<jukette-track title="One" artist="Artist" src="/one.mp3"></jukette-track>
		`)
		const playEvent = vi.fn()
		const pauseEvent = vi.fn()
		const seekEvent = vi.fn()
		const endedEvent = vi.fn()
		const trackChange = vi.fn()

		ctx.player.addEventListener('jukette:play', playEvent)
		ctx.player.addEventListener('jukette:pause', pauseEvent)
		ctx.player.addEventListener('jukette:seek', seekEvent)
		ctx.player.addEventListener('jukette:ended', endedEvent)
		ctx.player.addEventListener('jukette:trackchange', trackChange)

		markAudioReady(ctx, 10)
		await ctx.player.play()

		expect(playEvent).toHaveBeenCalledTimes(1)
		expect(ctx.elements.play.getAttribute('aria-label')).toBe('Pause')

		ctx.elements.seek.value = '500'
		ctx.elements.seek.dispatchEvent(new Event('input'))
		expect(seekEvent).toHaveBeenCalledTimes(1)
		expect(ctx.audio.currentTime).toBe(5)
		expect(ctx.elements.timeValue.textContent).toBe('0:05')

		ctx.elements.time.click()
		expect(ctx.elements.timeValue.textContent).toBe('-0:05')

		ctx.player.pause()
		expect(pauseEvent).toHaveBeenCalledTimes(1)
		expect(ctx.elements.play.getAttribute('aria-label')).toBe('Play')

		await ctx.player.play()
		ctx.audio.dispatchEvent(new Event('ended'))

		expect(endedEvent).toHaveBeenCalledTimes(1)
		expect(trackChange).not.toHaveBeenCalled()
		expect(ctx.player.currentTrackIndex).toBe(0)
		expect(ctx.elements.play.getAttribute('aria-label')).toBe('Play')
	})

	it('toggles play or pause from Enter and starts playback from Space on the focused select', async () => {
		const ctx = renderPlayer(`
			<jukette-track title="One" artist="Artist" src="/one.mp3"></jukette-track>
			<jukette-track title="Two" artist="Band" src="/two.mp3"></jukette-track>
		`)

		markAudioReady(ctx, 10)
		ctx.elements.select.focus()

		ctx.elements.select.dispatchEvent(
			new KeyboardEvent('keyup', {
				bubbles: true,
				cancelable: true,
				key: 'Enter',
			}),
		)
		await flushAsync()

		expect(ctx.audio.play).toHaveBeenCalledTimes(1)
		expect(ctx.elements.play.getAttribute('aria-label')).toBe('Pause')

		ctx.elements.select.dispatchEvent(
			new KeyboardEvent('keyup', {
				bubbles: true,
				cancelable: true,
				key: 'Enter',
			}),
		)
		await flushAsync()

		expect(ctx.audio.pause).toHaveBeenCalledTimes(1)
		expect(ctx.elements.play.getAttribute('aria-label')).toBe('Play')

		ctx.elements.select.value = '1'
		ctx.elements.select.dispatchEvent(new Event('change'))
		markAudioReady(ctx, 10)

		ctx.elements.select.dispatchEvent(
			new KeyboardEvent('keyup', {
				bubbles: true,
				cancelable: true,
				key: ' ',
			}),
		)
		await flushAsync()

		expect(ctx.audio.play).toHaveBeenCalledTimes(2)
		expect(ctx.elements.play.getAttribute('aria-label')).toBe('Pause')
	})

	it('keeps unsupported tracks selected and disabled', () => {
		defineElement()
		document.body.innerHTML = `
			<jukette-player>
				<jukette-track title="Cloud" src="https://example.com/track" type="soundcloud"></jukette-track>
			</jukette-player>
		`
		const player = document.querySelector('jukette-player')
		const shadowRoot = player.shadowRoot
		const audio = shadowRoot.querySelector('audio')
		patchAudio(audio)

		const play = shadowRoot.querySelector('.play')
		const select = shadowRoot.querySelector('.track-select')
		const meta = shadowRoot.querySelector('.meta')

		expect(select.value).toBe('0')
		expect(play.disabled).toBe(true)
		expect(meta.textContent).toBe('soundcloud playback unavailable')
	})

	it('allows a registered backend to unlock the player through onReady', () => {
		registerJuketteBackend({
			createPlayableTrack(track, callbacks) {
				return {
					track,
					currentTime: 0,
					duration: 0,
					load() {
						callbacks.onReady()
					},
					pause() {},
					play: async () => true,
					requestPosition() {},
					seek() {},
					stop() {},
				}
			},
			type: 'custom',
		})
		defineElement()

		document.body.innerHTML = `
			<jukette-player>
				<jukette-track title="Custom" src="/custom.track" type="custom"></jukette-track>
			</jukette-player>
		`

		const player = document.querySelector('jukette-player')
		const shadowRoot = player.shadowRoot
		const play = shadowRoot.querySelector('.play')
		const seek = shadowRoot.querySelector('.seek-input')
		const time = shadowRoot.querySelector('.time')

		expect(play.disabled).toBe(false)
		expect(seek.disabled).toBe(false)
		expect(time.disabled).toBe(false)
	})
})
