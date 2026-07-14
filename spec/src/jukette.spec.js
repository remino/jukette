import {
	createJuketteEventDetail,
	inferTrackType,
	JukettePlayerElement,
	midiProgramToOscillator,
	normalizeTrack,
	normalizeMidiOscillator,
	parseAudioFileMetadata,
	parseMidi,
	parsePlaylist,
	parseSoundCloudOEmbedMetadata,
	resolveMidiOscillatorType,
	trackFromElement,
} from '../../src/lib/jukette'

describe('jukette', () => {
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

	it('infers supported track types', () => {
		expect(inferTrackType({ src: '/track.mp3' })).toBe('audio')
		expect(inferTrackType({ src: '/track.mid' })).toBe('midi')
		expect(inferTrackType({ src: 'https://soundcloud.com/a/b' })).toBe(
			'soundcloud',
		)
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
			playlistOpen: false,
			track,
			tracks,
			volume: 0.5,
		})

		expect(detail).toEqual({
			currentTime: 2,
			duration: 8,
			index: 0,
			playing: true,
			playlistOpen: false,
			track,
			tracks: [track],
			type: 'midi',
			volume: 0.5,
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
			src: '/one.mp3',
			title: 'One',
			type: 'audio',
		})
	})

	it('observes preload metadata option changes', () => {
		expect(JukettePlayerElement.observedAttributes).toContain(
			'preload-metadata',
		)
		expect(JukettePlayerElement.observedAttributes).toContain(
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

	it('parses SoundCloud oEmbed titles', () => {
		expect(
			parseSoundCloudOEmbedMetadata({
				title: 'Flickermood by Forss',
			}),
		).toEqual({
			artist: 'Forss',
			title: 'Flickermood',
		})

		expect(
			parseSoundCloudOEmbedMetadata({
				title: 'Untitled SoundCloud track',
			}),
		).toEqual({
			title: 'Untitled SoundCloud track',
		})
	})
})
