import { describe, expect, it, vi, beforeEach } from 'vitest'

import {
	createJuketteEventDetail,
	getJuketteBackend,
	inferTrackType,
	JukettePlayerElement,
	normalizeTrack,
	parsePlaylist,
	resetJuketteBackends,
	subscribeJuketteBackendRegistrations,
	trackFromElement,
} from '@remino/jukette-core'
import { AudioPlayableTrack } from '../../packages/audio/src/lib/audio-track'
import { parseAudioFileMetadata, register } from '@remino/jukette-audio'
import {
	midiProgramToOscillator,
	normalizeMidiOscillator,
	parseMidi,
	register as registerMidi,
	resolveMidiOscillatorType,
} from '@remino/jukette-midi'
import {
	midiPlaybackRuntime,
	MidiPlayableTrack,
	warmMidiAudioContext,
} from '../../packages/midi/src/lib/midi-track'

describe('jukette helpers', () => {
	beforeEach(() => {
		resetJuketteBackends()
		register()
	})

	it('normalizes string tracks', () => {
		expect(normalizeTrack('/track.mp3')).toEqual({ src: '/track.mp3' })
	})

	it('normalizes track metadata preferences', () => {
		expect(
			normalizeTrack({
				preferMediaMetadata: true,
				src: '/track.mp3',
			}),
		).toEqual({ preferMediaMetadata: true, src: '/track.mp3' })
		expect(
			normalizeTrack({
				preferMediaMetadata: 'false',
				src: '/track.mp3',
			}),
		).toEqual({ preferMediaMetadata: false, src: '/track.mp3' })
	})

	it('normalizes track preload preferences', () => {
		expect(
			normalizeTrack({
				preload: true,
				src: '/track.mp3',
			}),
		).toEqual({ preload: true, src: '/track.mp3' })
		expect(
			normalizeTrack({
				preload: 'false',
				src: '/track.mp3',
			}),
		).toEqual({ preload: false, src: '/track.mp3' })
	})

	it('infers supported track types', () => {
		expect(inferTrackType({ src: '/track.mp3' })).toBe('audio')
		registerMidi()
		expect(inferTrackType({ src: '/track.mid' })).toBe('midi')
		expect(inferTrackType({ src: 'https://example.com/track' })).toBe(
			'audio',
		)
	})

	it('registers built-in backends', () => {
		expect(getJuketteBackend('audio')?.type).toBe('audio')
		expect(getJuketteBackend('midi')).toBeUndefined()

		registerMidi()

		expect(getJuketteBackend('midi')?.type).toBe('midi')
	})

	it('notifies listeners when a backend is registered', () => {
		const listener = vi.fn()
		const unsubscribe = subscribeJuketteBackendRegistrations(listener)

		registerMidi()

		expect(listener).toHaveBeenCalledWith(
			expect.objectContaining({ type: 'midi' }),
		)

		unsubscribe()
	})

	it('parses JSON playlists', () => {
		expect(parsePlaylist('[{"title":"One","src":"/one.mp3"}]')).toEqual([
			{ src: '/one.mp3', title: 'One' },
		])
	})

	it('creates event details with inferred track type', () => {
		const track = { src: '/track.mid' }
		const tracks = [track]
		const detail = createJuketteEventDetail({
			currentTime: 2,
			duration: 8,
			index: 0,
			playing: true,
			track,
			tracks,
		})

		expect(detail).toEqual({
			currentTime: 2,
			duration: 8,
			index: 0,
			playing: true,
			track,
			tracks: [track],
			type: 'midi',
		})
		expect(detail.tracks).not.toBe(tracks)
	})

	it('parses jukette-track elements', () => {
		const element = {
			localName: 'jukette-track',
			getAttribute(name) {
				return (
					{
						artist: 'Example',
						'prefer-media-metadata': 'false',
						preload: 'true',
						src: '/one.mp3',
						title: 'One',
						type: 'audio',
					}[name] ?? null
				)
			},
		}

		expect(trackFromElement(element)).toEqual({
			artist: 'Example',
			preferMediaMetadata: false,
			preload: true,
			src: '/one.mp3',
			title: 'One',
			type: 'audio',
		})
	})

	it('observes preload metadata option changes', () => {
		expect(JukettePlayerElement.observedAttributes).toContain(
			'preload-metadata',
		)
		expect(JukettePlayerElement.observedAttributes).not.toContain(
			'playlist-open',
		)
		expect(JukettePlayerElement.observedAttributes).toContain(
			'midi-oscillator',
		)
		expect(JukettePlayerElement.observedAttributes).toContain(
			'prefer-media-metadata',
		)
	})

	it('ignores non-track elements', () => {
		const element = {
			localName: 'div',
			getAttribute() {
				return null
			},
		}

		expect(trackFromElement(element)).toBeNull()
	})

	it('parses simple MIDI files', () => {
		const bytes = new Uint8Array([
			0x4d, 0x54, 0x68, 0x64, 0x00, 0x00, 0x00, 0x06, 0x00, 0x00, 0x00,
			0x01, 0x00, 0x60, 0x4d, 0x54, 0x72, 0x6b, 0x00, 0x00, 0x00, 0x0c,
			0x00, 0x90, 0x3c, 0x40, 0x60, 0x80, 0x3c, 0x00, 0x00, 0xff, 0x2f,
			0x00,
		])

		const midi = parseMidi(bytes.buffer)
		expect(midi.notes.length).toBe(1)
		expect(midi.duration).toBeGreaterThan(0)
	})

	it('parses MIDI track names as titles', () => {
		const title = new TextEncoder().encode('MIDI title')
		const events = new Uint8Array([
			0x00,
			0xff,
			0x03,
			title.length,
			...title,
			0x00,
			0x90,
			0x3c,
			0x40,
			0x60,
			0x80,
			0x3c,
			0x00,
			0x00,
			0xff,
			0x2f,
			0x00,
		])
		const bytes = new Uint8Array([
			0x4d,
			0x54,
			0x68,
			0x64,
			0x00,
			0x00,
			0x00,
			0x06,
			0x00,
			0x00,
			0x00,
			0x01,
			0x00,
			0x60,
			0x4d,
			0x54,
			0x72,
			0x6b,
			0x00,
			0x00,
			0x00,
			events.length,
			...events,
		])

		expect(parseMidi(bytes.buffer).metadata).toEqual({
			title: 'MIDI title',
		})
	})

	it('parses MIDI program changes', () => {
		const events = new Uint8Array([
			0x00, 0xc0, 0x18, 0x00, 0x90, 0x3c, 0x40, 0x60, 0x80, 0x3c, 0x00,
			0x00, 0xff, 0x2f, 0x00,
		])
		const bytes = new Uint8Array([
			0x4d,
			0x54,
			0x68,
			0x64,
			0x00,
			0x00,
			0x00,
			0x06,
			0x00,
			0x00,
			0x00,
			0x01,
			0x00,
			0x60,
			0x4d,
			0x54,
			0x72,
			0x6b,
			0x00,
			0x00,
			0x00,
			events.length,
			...events,
		])

		expect(parseMidi(bytes.buffer).metadata).toEqual({ program: 24 })
	})

	it('resolves MIDI oscillator options', () => {
		expect(normalizeMidiOscillator('sine')).toBe('sine')
		expect(normalizeMidiOscillator('nope')).toBe('auto')
		expect(midiProgramToOscillator(20)).toBe('sine')
		expect(midiProgramToOscillator(34)).toBe('square')
		expect(midiProgramToOscillator(61)).toBe('sawtooth')
		expect(midiProgramToOscillator()).toBe('triangle')
		expect(resolveMidiOscillatorType('sawtooth', 20)).toBe('sawtooth')
		expect(resolveMidiOscillatorType('auto', 20)).toBe('sine')
	})

	it('parses ID3 title and artist tags', () => {
		const textFrame = (id, value) => {
			const content = new TextEncoder().encode(value)
			const bytes = new Uint8Array(11 + content.length)
			bytes.set(new TextEncoder().encode(id), 0)
			bytes[7] = content.length + 1
			bytes[10] = 3
			bytes.set(content, 11)
			return bytes
		}
		const frames = [
			textFrame('TIT2', 'Tagged title'),
			textFrame('TPE1', 'Tagged artist'),
		]
		const frameLength = frames.reduce(
			(total, frame) => total + frame.length,
			0,
		)
		const bytes = new Uint8Array(10 + frameLength)
		bytes.set(new TextEncoder().encode('ID3'), 0)
		bytes[3] = 4
		bytes[9] = frameLength
		let offset = 10
		for (const frame of frames) {
			bytes.set(frame, offset)
			offset += frame.length
		}

		expect(parseAudioFileMetadata(bytes.buffer)).toEqual({
			artist: 'Tagged artist',
			title: 'Tagged title',
		})
	})

	it('keeps the audio source attached when stopping an audio track', () => {
		const audio = {
			currentTime: 0,
			duration: 0,
			pause: vi.fn(),
			removeAttribute: vi.fn(),
		}
		const track = new AudioPlayableTrack({ src: '/track.mp3' }, audio, {
			onDuration() {},
			onFinish() {},
			onMetadata() {},
			onPause() {},
			onPlay() {},
			onProgress() {},
			onReady() {},
			onStatus() {},
		})

		track.stop()

		expect(audio.pause).toHaveBeenCalled()
		expect(audio.removeAttribute).not.toHaveBeenCalled()
	})

	it('marks audio tracks ready on canplay', () => {
		const listeners = new Map()
		const audio = {
			addEventListener(type, listener) {
				listeners.set(type, listener)
			},
			currentTime: 0,
			duration: 0,
			load: vi.fn(),
			pause: vi.fn(),
			removeEventListener(type) {
				listeners.delete(type)
			},
			set src(value) {
				this._src = value
			},
		}
		const onReady = vi.fn()
		const track = new AudioPlayableTrack({ src: '/track.mp3' }, audio, {
			onDuration() {},
			onFinish() {},
			onMetadata() {},
			onPause() {},
			onPlay() {},
			onProgress() {},
			onReady,
			onStatus() {},
		})

		track.load({ metadataPreloadId: 1, restart: true })
		listeners.get('canplay')()

		expect(onReady).toHaveBeenCalled()
	})

	it('marks MIDI tracks ready after preparation completes', async () => {
		const onReady = vi.fn()
		const bytes = new Uint8Array([
			0x4d, 0x54, 0x68, 0x64, 0x00, 0x00, 0x00, 0x06, 0x00, 0x00, 0x00,
			0x01, 0x00, 0x60, 0x4d, 0x54, 0x72, 0x6b, 0x00, 0x00, 0x00, 0x0c,
			0x00, 0x90, 0x3c, 0x40, 0x60, 0x80, 0x3c, 0x00, 0x00, 0xff, 0x2f,
			0x00,
		])

		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({
				arrayBuffer: () => Promise.resolve(bytes.buffer),
				ok: true,
			}),
		)

		const track = new MidiPlayableTrack(
			{ src: '/track.mid', type: 'midi' },
			{
				onDuration() {},
				onFinish() {},
				onMetadata() {},
				onPause() {},
				onPlay() {},
				onProgress() {},
				onReady,
				onStatus() {},
			},
			() => 'auto',
		)

		await track.load({ metadataPreloadId: 1, restart: true })

		expect(onReady).toHaveBeenCalled()
	})

	it('warms the shared MIDI audio context once from a suspended state', async () => {
		midiPlaybackRuntime.resetWarmup()
		const start = vi
			.spyOn(midiPlaybackRuntime, 'start')
			.mockResolvedValue(undefined)

		await warmMidiAudioContext()
		await warmMidiAudioContext()

		expect(start).toHaveBeenCalledTimes(1)
		midiPlaybackRuntime.resetWarmup()
	})
})
