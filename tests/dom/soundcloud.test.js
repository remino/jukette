import { describe, expect, it, vi } from 'vitest'

import { defineElement } from '@remino/jukette-core'
import { register as registerAudio } from '@remino/jukette-audio'
import { register as registerSoundCloud } from '@remino/jukette-soundcloud'

const soundCloudTrackUrl = 'https://soundcloud.com/forss/flickermood'

const patchAudio = (audio) => {
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
		get: () => 10,
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
}

const createSoundCloudApi = () => {
	const widgets = []
	const createWidget = (iframe) => {
		const listeners = new Map()
		const widget = {
			bind: vi.fn((eventName, listener) => {
				listeners.set(eventName, listener)
			}),
			emit(eventName, payload) {
				listeners.get(eventName)?.(payload)
			},
			getDuration: vi.fn((callback) => callback(123000)),
			getPosition: vi.fn((callback) => callback(0)),
			pause: vi.fn(() => {
				widget.emit(events.PAUSE)
			}),
			play: vi.fn(() => {
				widget.emit(events.PLAY)
			}),
			seekTo: vi.fn(),
		}

		widgets.push({ iframe, listeners, widget })
		return widget
	}
	const events = {
		ERROR: 'error',
		FINISH: 'finish',
		PAUSE: 'pause',
		PLAY: 'play',
		PLAY_PROGRESS: 'play-progress',
		READY: 'ready',
	}

	return {
		api: { Widget: Object.assign(createWidget, { Events: events }) },
		events,
		widgets,
	}
}

const stubSoundCloudEnvironment = () => {
	const soundCloud = createSoundCloudApi()
	vi.stubGlobal(
		'fetch',
		vi.fn(async (url) => ({
			json: async () => ({
				author_name: 'Forss',
				html: '<iframe src="https://w.soundcloud.com/player/?url=https%3A%2F%2Fapi.soundcloud.com%2Ftracks%2F293"></iframe>',
				title: 'Flickermood by Forss',
			}),
			ok: true,
			url,
		})),
	)
	window.SC = soundCloud.api
	return soundCloud
}

const renderPlayer = (markup) => {
	defineElement()
	registerAudio()
	registerSoundCloud()
	document.body.innerHTML = `<jukette-player>${markup}</jukette-player>`
	const player = document.querySelector('jukette-player')
	const shadowRoot = player.shadowRoot
	const audio = shadowRoot.querySelector('audio')
	patchAudio(audio)

	return {
		audio,
		elements: {
			meta: shadowRoot.querySelector('.meta'),
			play: shadowRoot.querySelector('.play'),
			select: shadowRoot.querySelector('.track-select'),
			title: shadowRoot.querySelector('.title'),
		},
		player,
		shadowRoot,
	}
}

const flushAsync = async (count = 3) => {
	for (let index = 0; index < count; index += 1) {
		await Promise.resolve()
		await new Promise((resolve) => window.setTimeout(resolve, 0))
	}
}

const waitFor = async (predicate, message) => {
	for (let index = 0; index < 20; index += 1) {
		if (predicate()) return
		await flushAsync(1)
	}

	throw new Error(message)
}

describe('SoundCloud addon', () => {
	it('prepares the first selected SoundCloud track and enables play on READY', async () => {
		const soundCloud = stubSoundCloudEnvironment()
		const ctx = renderPlayer(`
			<jukette-track src="${soundCloudTrackUrl}" type="soundcloud"></jukette-track>
		`)

		await waitFor(
			() => soundCloud.widgets.length === 1,
			'Expected SoundCloud widget to be created.',
		)
		expect(ctx.elements.play.disabled).toBe(true)

		soundCloud.widgets[0].widget.emit(soundCloud.events.READY)
		await waitFor(
			() => ctx.elements.play.disabled === false,
			'Expected SoundCloud track to become ready.',
		)

		expect(ctx.elements.play.disabled).toBe(false)
		await waitFor(
			() => ctx.elements.title.textContent === 'Flickermood',
			'Expected SoundCloud title metadata to update.',
		)
		expect(ctx.elements.title.textContent).toBe('Flickermood')
		expect(ctx.elements.meta.textContent).toBe('Forss')

		await ctx.player.play()
		expect(soundCloud.widgets[0].widget.play).toHaveBeenCalledTimes(1)
		expect(ctx.elements.play.getAttribute('aria-label')).toBe('Pause')
	})

	it('reuses the same widget when the same SoundCloud track is reselected', async () => {
		const soundCloud = stubSoundCloudEnvironment()
		const ctx = renderPlayer(`
			<jukette-track src="${soundCloudTrackUrl}" type="soundcloud"></jukette-track>
			<jukette-track title="Audio" src="/track.mp3"></jukette-track>
		`)

		await waitFor(
			() => soundCloud.widgets.length === 1,
			'Expected first SoundCloud widget to be created.',
		)
		soundCloud.widgets[0].widget.emit(soundCloud.events.READY)
		await waitFor(
			() => ctx.elements.play.disabled === false,
			'Expected initial SoundCloud track to become ready.',
		)
		ctx.elements.select.value = '1'
		ctx.elements.select.dispatchEvent(new Event('change'))
		ctx.audio.dispatchEvent(new Event('canplay'))
		ctx.elements.select.value = '0'
		ctx.elements.select.dispatchEvent(new Event('change'))
		await waitFor(
			() => soundCloud.widgets.length === 1,
			'Expected SoundCloud widget to be reused after reselecting the track.',
		)

		expect(soundCloud.widgets).toHaveLength(1)
	})

	it('resets a reselected SoundCloud track back to the beginning', async () => {
		const soundCloud = stubSoundCloudEnvironment()
		const ctx = renderPlayer(`
			<jukette-track src="${soundCloudTrackUrl}" type="soundcloud"></jukette-track>
			<jukette-track title="Audio" src="/track.mp3"></jukette-track>
		`)

		await waitFor(
			() => soundCloud.widgets.length === 1,
			'Expected first SoundCloud widget to be created.',
		)
		soundCloud.widgets[0].widget.emit(soundCloud.events.READY)
		await waitFor(
			() => ctx.elements.play.disabled === false,
			'Expected initial SoundCloud track to become ready.',
		)

		await ctx.player.play()
		soundCloud.widgets[0].widget.emit(soundCloud.events.PLAY_PROGRESS, {
			currentPosition: 42000,
		})
		await flushAsync()

		ctx.elements.select.value = '1'
		ctx.elements.select.dispatchEvent(new Event('change'))
		ctx.audio.dispatchEvent(new Event('canplay'))

		ctx.elements.select.value = '0'
		ctx.elements.select.dispatchEvent(new Event('change'))
		await waitFor(
			() => ctx.elements.play.disabled === true,
			'Expected reselected SoundCloud track to prepare again.',
		)
		soundCloud.widgets[0].widget.emit(soundCloud.events.READY)
		await waitFor(
			() => ctx.elements.play.disabled === false,
			'Expected reselected SoundCloud track to become ready.',
		)

		expect(soundCloud.widgets[0].widget.seekTo).toHaveBeenLastCalledWith(0)
		expect(ctx.player.currentTime).toBe(0)
	})

	it('ignores late progress from an old SoundCloud play session after reselection', async () => {
		const soundCloud = stubSoundCloudEnvironment()
		const ctx = renderPlayer(`
			<jukette-track src="${soundCloudTrackUrl}" type="soundcloud"></jukette-track>
			<jukette-track title="Audio" src="/track.mp3"></jukette-track>
		`)

		await waitFor(
			() => soundCloud.widgets.length === 1,
			'Expected first SoundCloud widget to be created.',
		)
		soundCloud.widgets[0].widget.emit(soundCloud.events.READY)
		await waitFor(
			() => ctx.elements.play.disabled === false,
			'Expected initial SoundCloud track to become ready.',
		)

		await ctx.player.play()
		soundCloud.widgets[0].widget.emit(soundCloud.events.PLAY_PROGRESS, {
			currentPosition: 42000,
		})
		await flushAsync()
		expect(ctx.player.currentTime).toBe(42)

		ctx.elements.select.value = '1'
		ctx.elements.select.dispatchEvent(new Event('change'))
		ctx.audio.dispatchEvent(new Event('canplay'))

		ctx.elements.select.value = '0'
		ctx.elements.select.dispatchEvent(new Event('change'))
		soundCloud.widgets[0].widget.emit(soundCloud.events.PLAY_PROGRESS, {
			currentPosition: 42000,
		})
		await waitFor(
			() => ctx.elements.play.disabled === true,
			'Expected reselected SoundCloud track to prepare again.',
		)
		soundCloud.widgets[0].widget.emit(soundCloud.events.READY)
		await waitFor(
			() => ctx.elements.play.disabled === false,
			'Expected reselected SoundCloud track to become ready.',
		)

		expect(ctx.player.currentTime).toBe(0)
	})

	it('preloads a non-selected SoundCloud track when that track has preload', async () => {
		const soundCloud = stubSoundCloudEnvironment()
		renderPlayer(`
			<jukette-track title="Audio" src="/track.mp3"></jukette-track>
			<jukette-track src="${soundCloudTrackUrl}" type="soundcloud" preload></jukette-track>
		`)

		await waitFor(
			() => soundCloud.widgets.length === 1,
			'Expected preloaded SoundCloud widget to be created.',
		)

		expect(soundCloud.widgets).toHaveLength(1)
		expect(
			fetch.mock.calls.filter(([url]) =>
				String(url).startsWith('https://soundcloud.com/oembed'),
			),
		).toHaveLength(1)
	})

	it('ignores stale SoundCloud readiness after switching to another SoundCloud track', async () => {
		const soundCloud = stubSoundCloudEnvironment()
		const ctx = renderPlayer(`
			<jukette-track src="${soundCloudTrackUrl}" type="soundcloud"></jukette-track>
			<jukette-track src="https://soundcloud.com/forss/soulhack" type="soundcloud"></jukette-track>
		`)

		await waitFor(
			() => soundCloud.widgets.length === 1,
			'Expected first SoundCloud widget to be created.',
		)
		ctx.elements.select.value = '1'
		ctx.elements.select.dispatchEvent(new Event('change'))
		await waitFor(
			() => soundCloud.widgets.length === 2,
			'Expected second SoundCloud widget to be created.',
		)

		expect(soundCloud.widgets).toHaveLength(2)

		soundCloud.widgets[0].widget.emit(soundCloud.events.READY)
		await flushAsync(1)
		expect(ctx.elements.play.disabled).toBe(true)

		soundCloud.widgets[1].widget.emit(soundCloud.events.READY)
		await flushAsync()
		expect(ctx.elements.play.disabled).toBe(false)
	})
})
