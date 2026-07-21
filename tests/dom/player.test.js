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
			display: shadowRoot.querySelector('.display'),
			play: shadowRoot.querySelector('.play'),
			seek: shadowRoot.querySelector('.seek-input'),
			trackPicker: shadowRoot.querySelector('.track-picker'),
			select: shadowRoot.querySelector('.track-select'),
			time: shadowRoot.querySelector('.time'),
			timeValue: shadowRoot.querySelector('.time time'),
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

		expect(elements.display.localName).toBe('re-marquee')
		expect(elements.display.getAttribute('animate')).toBe('overflow')
		expect(elements.display.textContent).toBe('Loading audio')
		expect(elements.select.options).toHaveLength(2)
		expect(elements.select.options[0].textContent).toBe(
			'One - Artist (--:--)',
		)
		expect(elements.play).toBeTruthy()
		expect(elements.seek).toBeTruthy()
		expect(elements.time).toBeTruthy()
		expect(shadowRoot.querySelector('.playlist')).toBeNull()
		expect(shadowRoot.querySelector('.previous')).toBeNull()
		expect(shadowRoot.querySelector('.next')).toBeNull()
	})

	it('supports overflow, always, and never marquee modes on the merged display', () => {
		const ctx = renderPlayer(`
			<jukette-track title="One" artist="Artist" src="/one.mp3"></jukette-track>
		`)

		expect(ctx.player.displayMarquee).toBe('overflow')
		expect(ctx.elements.display.getAttribute('animate')).toBe('overflow')

		ctx.player.displayMarquee = 'always'
		expect(ctx.player.getAttribute('display-marquee')).toBe('always')
		expect(ctx.elements.display.getAttribute('animate')).toBe('always')

		ctx.player.setAttribute('display-marquee', 'never')
		expect(ctx.player.displayMarquee).toBe('never')
		expect(ctx.elements.display.getAttribute('animate')).toBe('never')

		ctx.player.setAttribute('display-marquee', 'wat')
		expect(ctx.player.displayMarquee).toBe('overflow')
		expect(ctx.elements.display.getAttribute('animate')).toBe('overflow')
	})

	it('shows the track selector by default and allows it to be hidden', () => {
		const ctx = renderPlayer(`
			<jukette-track title="One" artist="Artist" src="/one.mp3"></jukette-track>
		`)

		expect(ctx.player.showTrackSelect).toBe(true)
		expect(ctx.elements.trackPicker.hidden).toBe(false)

		ctx.player.showTrackSelect = false
		expect(ctx.player.getAttribute('show-track-select')).toBe('false')
		expect(ctx.player.showTrackSelect).toBe(false)
		expect(ctx.elements.trackPicker.hidden).toBe(true)

		ctx.player.setAttribute('show-track-select', '')
		expect(ctx.player.showTrackSelect).toBe(true)
		expect(ctx.elements.trackPicker.hidden).toBe(false)
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

	it('loads a remote playlist from playlist-src', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({
				ok: true,
				text: async () =>
					JSON.stringify([
						{ artist: 'Remote', src: '/remote.mp3', title: 'One' },
					]),
			}),
		)
		defineElement()
		registerAudio()
		document.body.innerHTML =
			'<jukette-player playlist-src="/playlist.json"></jukette-player>'
		const player = document.querySelector('jukette-player')
		const shadowRoot = player.shadowRoot
		const audio = shadowRoot.querySelector('audio')
		patchAudio(audio)

		expect(shadowRoot.querySelector('.display').textContent).toBe(
			'Loading playlist',
		)

		await flushAsync()

		const playlistRequests = fetch.mock.calls.filter(
			([url]) => url === '/playlist.json',
		)
		expect(playlistRequests).toHaveLength(1)
		expect(player.playlist).toEqual([
			{ artist: 'Remote', src: '/remote.mp3', title: 'One' },
		])
		expect(shadowRoot.querySelector('.display').textContent).toBe(
			'Loading audio',
		)
		expect(shadowRoot.querySelector('.track-select').options).toHaveLength(
			1,
		)
	})

	it('shows a playlist error when playlist-src fails to load', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({
				ok: false,
				status: 404,
				text: async () => 'missing',
			}),
		)
		defineElement()
		registerAudio()
		document.body.innerHTML =
			'<jukette-player playlist-src="/missing.json"></jukette-player>'
		const player = document.querySelector('jukette-player')
		const shadowRoot = player.shadowRoot
		const audio = shadowRoot.querySelector('audio')
		patchAudio(audio)

		await flushAsync()

		expect(player.playlist).toEqual([])
		expect(shadowRoot.querySelector('.display').textContent).toBe(
			'Playlist failed to load',
		)
		expect(shadowRoot.querySelector('.track-select').disabled).toBe(true)
	})

	it('shows a source link for the selected track when enabled on the player', () => {
		const ctx = renderPlayer(`
			<jukette-track title="One" artist="Artist" src="/one.mp3"></jukette-track>
		`)

		ctx.player.setAttribute('show-source-link', '')

		const sourceLink = ctx.shadowRoot.querySelector('.source-link')
		expect(sourceLink.hidden).toBe(false)
		expect(sourceLink.getAttribute('href')).toBe('/one.mp3')
		expect(sourceLink.textContent).toBe('↗')
	})

	it('prefers inline playlist sources over playlist-src', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({
				ok: true,
				text: async () =>
					JSON.stringify([{ src: '/remote.mp3', title: 'Remote' }]),
			}),
		)
		defineElement()
		registerAudio()
		document.body.innerHTML = `
			<jukette-player
				playlist='[{"src":"/inline.mp3","title":"Inline"}]'
				playlist-src="/playlist.json"
			></jukette-player>
		`
		const player = document.querySelector('jukette-player')
		const shadowRoot = player.shadowRoot
		const audio = shadowRoot.querySelector('audio')
		patchAudio(audio)

		await flushAsync()

		expect(player.playlist).toEqual([
			{ src: '/inline.mp3', title: 'Inline' },
		])
		expect(
			shadowRoot.querySelector('.track-select').options[0].textContent,
		).toBe('Inline (--:--)')
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
		expect(ctx.elements.display.textContent).toBe(
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

	it('keeps the toggled time mode while playback progress updates continue', async () => {
		const ctx = renderPlayer(`
			<jukette-track title="One" artist="Artist" src="/one.mp3"></jukette-track>
		`)

		markAudioReady(ctx, 10)
		await ctx.player.play()

		ctx.state.setCurrentTime(4)
		ctx.audio.dispatchEvent(new Event('timeupdate'))
		expect(ctx.elements.timeValue.textContent).toBe('0:04')

		ctx.elements.time.click()
		expect(ctx.elements.timeValue.textContent).toBe('-0:06')

		ctx.state.setCurrentTime(5)
		ctx.audio.dispatchEvent(new Event('timeupdate'))

		expect(ctx.elements.timeValue.textContent).toBe('-0:05')
	})

	it('starts audio tracks from startAt and restarts from that offset', async () => {
		const ctx = renderPlayer('')
		ctx.player.playlist = [
			{
				artist: 'Artist',
				src: '/one.mp3',
				startAt: 1.5,
				title: 'One',
			},
		]

		expect(ctx.audio.currentTime).toBe(1.5)
		expect(ctx.elements.timeValue.textContent).toBe('0:01')

		markAudioReady(ctx, 10)
		await ctx.player.play()
		expect(ctx.audio.play).toHaveBeenCalledTimes(1)

		ctx.audio.dispatchEvent(new Event('ended'))
		await ctx.player.play()
		expect(ctx.audio.currentTime).toBe(1.5)
		expect(ctx.audio.play).toHaveBeenCalledTimes(2)
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

	it('preserves the active track across a brief disconnect and reconnect', async () => {
		const ctx = renderPlayer(`
			<jukette-track title="One" artist="Artist" src="/one.mp3"></jukette-track>
		`)

		markAudioReady(ctx, 10)
		await ctx.player.play()

		ctx.state.setCurrentTime(3)
		ctx.audio.dispatchEvent(new Event('timeupdate'))
		expect(ctx.elements.timeValue.textContent).toBe('0:03')

		const player = ctx.player
		document.body.removeChild(player)
		await new Promise((resolve) => window.setTimeout(resolve, 25))
		document.body.appendChild(player)
		await flushAsync()

		expect(ctx.player.currentTrackIndex).toBe(0)
		expect(ctx.audio.play).toHaveBeenCalledTimes(1)
		expect(ctx.audio.pause).not.toHaveBeenCalled()
		expect(ctx.elements.play.getAttribute('aria-label')).toBe('Pause')
		expect(ctx.elements.timeValue.textContent).toBe('0:03')
	})

	it('tears playback down after a real disconnect beyond the reconnect window', async () => {
		const ctx = renderPlayer(`
			<jukette-track title="One" artist="Artist" src="/one.mp3"></jukette-track>
		`)

		markAudioReady(ctx, 10)
		await ctx.player.play()

		const player = ctx.player
		const stopSpy = vi.spyOn(player.activePlayableTrack, 'stop')
		document.body.removeChild(player)
		await new Promise((resolve) => window.setTimeout(resolve, 1100))

		expect(stopSpy).toHaveBeenCalledTimes(1)

		document.body.appendChild(player)
		await flushAsync()

		expect(ctx.audio.load).toHaveBeenCalledTimes(1)
	})

	it('reloads on reconnect when the selected track changes while detached', async () => {
		const ctx = renderPlayer(`
			<jukette-track title="One" artist="Artist" src="/one.mp3"></jukette-track>
			<jukette-track title="Two" artist="Band" src="/two.mp3"></jukette-track>
		`)

		markAudioReady(ctx, 10)
		const player = ctx.player
		document.body.removeChild(player)
		player.setAttribute('track-index', '1')
		document.body.appendChild(player)
		await flushAsync()

		expect(ctx.audio.load).toHaveBeenCalledTimes(1)
		expect(ctx.player.currentTrackIndex).toBe(1)
		expect(ctx.elements.display.textContent).toBe('Two - Band')
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
		const display = shadowRoot.querySelector('.display')

		expect(select.value).toBe('0')
		expect(play.disabled).toBe(true)
		expect(display.textContent).toBe('soundcloud playback unavailable')
	})

	it('renders the merged display as title and artist once ready', () => {
		const ctx = renderPlayer(`
			<jukette-track title="One" artist="Artist" src="/one.mp3"></jukette-track>
		`)

		markAudioReady(ctx, 10)

		expect(ctx.elements.display.textContent).toBe('One - Artist')
	})

	it('uses preferred media metadata in the merged display and select text', async () => {
		registerJuketteBackend({
			createPlayableTrack(track, callbacks) {
				return {
					track,
					currentTime: 0,
					duration: 10,
					load() {
						callbacks.onMetadata({
							artist: 'Tagged Artist',
							title: 'Tagged Title',
						})
						callbacks.onReady()
					},
					pause() {},
					play: async () => true,
					requestPosition() {},
					seek() {},
					stop() {},
				}
			},
			type: 'metadata-test',
		})
		defineElement()
		document.body.innerHTML = `
			<jukette-player prefer-media-metadata>
				<jukette-track title="One" artist="Artist" src="/one.mp3" type="metadata-test"></jukette-track>
			</jukette-player>
		`

		const player = document.querySelector('jukette-player')
		const shadowRoot = player.shadowRoot
		const audio = shadowRoot.querySelector('audio')
		patchAudio(audio)
		const display = shadowRoot.querySelector('.display')
		const select = shadowRoot.querySelector('.track-select')

		await flushAsync()

		expect(display.textContent).toBe('Tagged Title - Tagged Artist')
		expect(select.options[0].textContent).toBe(
			'Tagged Title - Tagged Artist (--:--)',
		)
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
