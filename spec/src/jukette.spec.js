import {
	inferTrackType,
	normalizeTrack,
	parseMidi,
	parsePlaylist,
	trackFromElement,
} from '../../src/lib/jukette'

describe('jukette', () => {
	it('normalizes string tracks', () => {
		expect(normalizeTrack('/track.mp3')).toEqual({ src: '/track.mp3' })
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

	it('parses jukette-track elements', () => {
		const element = {
			localName: 'jukette-track',
			getAttribute(name) {
				return (
					{
						artist: 'Example',
						src: '/one.mp3',
						title: 'One',
						type: 'audio',
					}[name] ?? null
				)
			},
		}

		expect(trackFromElement(element)).toEqual({
			artist: 'Example',
			src: '/one.mp3',
			title: 'One',
			type: 'audio',
		})
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
})
