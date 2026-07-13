type JuketteTrackKind = 'audio' | 'soundcloud' | 'midi'

export interface JuketteTrack {
	title?: string
	artist?: string
	src: string
	type?: JuketteTrackKind
}

interface MidiNote {
	duration: number
	frequency: number
	start: number
	velocity: number
}

interface MidiSequence {
	duration: number
	notes: MidiNote[]
}

const ATTR_SRC = 'src'
const ATTR_PLAYLIST = 'playlist'
const ATTR_TRACK_INDEX = 'track-index'
const CSS_VAR_PROGRESS = '--jukette-progress'
const CSS_VAR_PROGRESS_DURATION = '--jukette-progress-duration'
const CSS_VAR_PROGRESS_DELAY = '--jukette-progress-delay'
const CSS_VAR_PROGRESS_STATE = '--jukette-progress-state'
const HTMLElementBase =
	globalThis.HTMLElement ?? (class {} as typeof HTMLElement)

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null

export const inferTrackType = (track: Pick<JuketteTrack, 'src' | 'type'>) => {
	if (track.type) return track.type

	const source = track.src.toLowerCase()
	if (source.includes('soundcloud.com')) return 'soundcloud'
	if (/\.(?:mid|midi)(?:[?#].*)?$/.test(source)) return 'midi'
	return 'audio'
}

export const normalizeTrack = (value: unknown): JuketteTrack | null => {
	if (typeof value === 'string') {
		const src = value.trim()
		return src ? { src } : null
	}

	if (!isRecord(value) || typeof value.src !== 'string') return null

	const src = value.src.trim()
	if (!src) return null

	const type =
		value.type === 'audio' ||
		value.type === 'soundcloud' ||
		value.type === 'midi'
			? value.type
			: undefined

	const track: JuketteTrack = { src }

	if (typeof value.artist === 'string') track.artist = value.artist
	if (typeof value.title === 'string') track.title = value.title
	if (type) track.type = type

	return track
}

export const parsePlaylist = (value: string | null): JuketteTrack[] => {
	if (!value) return []

	try {
		const parsed = JSON.parse(value) as unknown
		const items = Array.isArray(parsed) ? parsed : [parsed]
		return items
			.map((item) => normalizeTrack(item))
			.filter((item): item is JuketteTrack => item !== null)
	} catch {
		return value
			.split('\n')
			.map((item) => normalizeTrack(item))
			.filter((item): item is JuketteTrack => item !== null)
	}
}

export class JukettePlayerElement extends HTMLElementBase {
	static observedAttributes = [ATTR_SRC, ATTR_PLAYLIST, ATTR_TRACK_INDEX]

	private readonly audio: HTMLAudioElement
	private readonly iframe: HTMLIFrameElement
	private readonly playButton: HTMLButtonElement
	private readonly previousButton: HTMLButtonElement
	private readonly nextButton: HTMLButtonElement
	private readonly volumeInput: HTMLInputElement
	private readonly seekInput: HTMLInputElement
	private readonly playlistButton: HTMLButtonElement
	private readonly playlistElement: HTMLOListElement
	private readonly titleElement: HTMLElement
	private readonly metaElement: HTMLElement
	private readonly statusElement: HTMLElement
	private readonly progressElement: HTMLElement
	private tracks: JuketteTrack[] = []
	private index = 0
	private playing = false
	private duration = 0
	private midiTimer = 0
	private midiStartedAt = 0
	private midiPausedAt = 0
	private midiAudio: AudioContext | null = null
	private midiGain: GainNode | null = null
	private midiSequence: MidiSequence | null = null
	private midiSources: OscillatorNode[] = []

	constructor() {
		super()

		const shadowRoot = this.attachShadow({ mode: 'open' })
		shadowRoot.innerHTML = `
			<style>
				:host {
					--jukette-control-size: 2rem;
					display: block;
					font: inherit;
					color: inherit;
				}

				* {
					box-sizing: border-box;
				}

				.player {
					border: 1px solid currentColor;
					display: grid;
					gap: 0.75rem;
					padding: 0.75rem;
				}

				.track {
					display: grid;
					gap: 0.15rem;
					min-inline-size: 0;
				}

				.title,
				.meta,
				.status {
					overflow: hidden;
					text-overflow: ellipsis;
					white-space: nowrap;
				}

				.title {
					font-weight: 700;
				}

				.meta,
				.status,
				.time {
					font-size: 0.875em;
					opacity: 0.75;
				}

				.controls {
					align-items: center;
					display: grid;
					gap: 0.5rem;
					grid-template-columns: repeat(3, var(--jukette-control-size)) minmax(7rem, 1fr) var(--jukette-control-size);
				}

				button {
					align-items: center;
					appearance: none;
					background: transparent;
					border: 1px solid currentColor;
					block-size: var(--jukette-control-size);
					color: inherit;
					cursor: pointer;
					display: inline-grid;
					font: inherit;
					inline-size: var(--jukette-control-size);
					justify-content: center;
					padding: 0;
				}

				button[aria-pressed="true"] {
					background: currentColor;
					color: Canvas;
				}

				button:disabled {
					cursor: default;
					opacity: 0.45;
				}

				input[type="range"] {
					accent-color: currentColor;
					inline-size: 100%;
				}

				.seek {
					display: grid;
					gap: 0.35rem;
				}

				.progress {
					background: color-mix(in srgb, currentColor 20%, transparent);
					block-size: 0.35rem;
					overflow: hidden;
				}

				.progress::before {
					animation: jukette-seek var(${CSS_VAR_PROGRESS_DURATION}, 1ms)
						linear var(${CSS_VAR_PROGRESS_DELAY}, 0ms) both;
					animation-play-state: var(${CSS_VAR_PROGRESS_STATE}, paused);
					background: currentColor;
					block-size: 100%;
					content: "";
					display: block;
					inline-size: 100%;
					transform: scaleX(var(${CSS_VAR_PROGRESS}, 0));
					transform-origin: 0 50%;
				}

				@keyframes jukette-seek {
					from {
						transform: scaleX(var(${CSS_VAR_PROGRESS}, 0));
					}

					to {
						transform: scaleX(1);
					}
				}

				.playlist {
					border-block-start: 1px solid currentColor;
					display: none;
					list-style: decimal;
					margin: 0;
					padding: 0.5rem 0 0 1.5rem;
				}

				:host([playlist-open]) .playlist {
					display: grid;
					gap: 0.25rem;
				}

				.playlist button {
					block-size: auto;
					border: 0;
					display: block;
					inline-size: 100%;
					padding: 0.25rem;
					text-align: start;
				}

				.soundcloud {
					border: 0;
					block-size: 166px;
					display: none;
					inline-size: 100%;
				}

				:host([data-kind="soundcloud"]) .soundcloud {
					display: block;
				}

				audio {
					display: none;
				}

				@media (max-width: 34rem) {
					.controls {
						grid-template-columns: repeat(4, var(--jukette-control-size));
					}

					.volume {
						grid-column: 1 / -1;
					}
				}
			</style>

			<div class="player">
				<div class="track" aria-live="polite">
					<div class="title"></div>
					<div class="meta"></div>
					<div class="status"></div>
				</div>
				<div class="seek">
					<div class="progress" part="progress"></div>
					<input class="seek-input" type="range" min="0" max="1000" value="0" aria-label="Seek" />
				</div>
				<div class="controls">
					<button class="previous" type="button" aria-label="Previous or restart track">|&lt;</button>
					<button class="play" type="button" aria-label="Play">▶</button>
					<button class="next" type="button" aria-label="Next track">&gt;|</button>
					<input class="volume" type="range" min="0" max="1" step="0.01" value="1" aria-label="Volume" />
					<button class="playlist-toggle" type="button" aria-label="Toggle playlist" aria-pressed="false">☰</button>
				</div>
				<iframe class="soundcloud" title="SoundCloud player" allow="autoplay"></iframe>
				<audio preload="metadata"></audio>
				<ol class="playlist"></ol>
			</div>
		`

		this.audio = this.query<HTMLAudioElement>(shadowRoot, 'audio')
		this.iframe = this.query<HTMLIFrameElement>(shadowRoot, '.soundcloud')
		this.playButton = this.query<HTMLButtonElement>(shadowRoot, '.play')
		this.previousButton = this.query<HTMLButtonElement>(
			shadowRoot,
			'.previous',
		)
		this.nextButton = this.query<HTMLButtonElement>(shadowRoot, '.next')
		this.volumeInput = this.query<HTMLInputElement>(shadowRoot, '.volume')
		this.seekInput = this.query<HTMLInputElement>(shadowRoot, '.seek-input')
		this.playlistButton = this.query<HTMLButtonElement>(
			shadowRoot,
			'.playlist-toggle',
		)
		this.playlistElement = this.query<HTMLOListElement>(
			shadowRoot,
			'.playlist',
		)
		this.titleElement = this.query<HTMLElement>(shadowRoot, '.title')
		this.metaElement = this.query<HTMLElement>(shadowRoot, '.meta')
		this.statusElement = this.query<HTMLElement>(shadowRoot, '.status')
		this.progressElement = this.query<HTMLElement>(shadowRoot, '.progress')

		this.playButton.addEventListener('click', () => this.toggle())
		this.previousButton.addEventListener('click', () => this.previous())
		this.nextButton.addEventListener('click', () => this.next())
		this.playlistButton.addEventListener('click', () =>
			this.togglePlaylist(),
		)
		this.volumeInput.addEventListener('input', () => this.syncVolume())
		this.seekInput.addEventListener('input', () => this.seekFromInput())
		this.audio.addEventListener('loadedmetadata', () =>
			this.syncFromMedia(),
		)
		this.audio.addEventListener('timeupdate', () => this.syncFromMedia())
		this.audio.addEventListener('ended', () => this.next())
	}

	connectedCallback(): void {
		this.syncTracks()
		this.loadTrack()
	}

	disconnectedCallback(): void {
		this.stopMidi()
	}

	attributeChangedCallback(
		_name: string,
		oldValue: string | null,
		newValue: string | null,
	): void {
		if (oldValue === newValue) return
		this.syncTracks()
		this.loadTrack()
	}

	get currentTrack(): JuketteTrack | null {
		return this.tracks[this.index] ?? null
	}

	get playlist(): JuketteTrack[] {
		return [...this.tracks]
	}

	set playlist(tracks: JuketteTrack[]) {
		this.tracks = tracks
			.map((track) => normalizeTrack(track))
			.filter((track): track is JuketteTrack => track !== null)
		this.index = 0
		this.renderPlaylist()
		this.loadTrack()
	}

	async play(): Promise<void> {
		const track = this.currentTrack
		if (!track) return

		const type = inferTrackType(track)
		if (type === 'audio') {
			await this.audio.play()
			this.playing = true
		} else if (type === 'midi') {
			await this.playMidi()
		} else {
			this.playing = true
		}

		this.syncPlayingState()
	}

	pause(): void {
		if (inferTrackType(this.currentTrack ?? { src: '' }) === 'audio') {
			this.audio.pause()
		} else if (
			inferTrackType(this.currentTrack ?? { src: '' }) === 'midi'
		) {
			this.pauseMidi()
		}

		this.playing = false
		this.syncPlayingState()
	}

	toggle(): void {
		if (this.playing) {
			this.pause()
			return
		}

		void this.play()
	}

	next(): void {
		if (this.tracks.length === 0) return
		this.index = (this.index + 1) % this.tracks.length
		this.loadTrack()
		if (this.playing) void this.play()
	}

	previous(): void {
		if (this.tracks.length === 0) return

		if (this.currentTime > 3) {
			this.seek(0)
			return
		}

		this.index = (this.index - 1 + this.tracks.length) % this.tracks.length
		this.loadTrack()
		if (this.playing) void this.play()
	}

	seek(seconds: number): void {
		const track = this.currentTrack
		if (!track) return

		if (inferTrackType(track) === 'audio') {
			this.audio.currentTime = seconds
		} else if (inferTrackType(track) === 'midi') {
			this.midiPausedAt = Math.max(0, seconds)
			if (this.playing) this.playMidi()
		}

		this.syncProgress(seconds, this.duration)
	}

	private get currentTime(): number {
		const track = this.currentTrack
		if (!track) return 0
		if (inferTrackType(track) === 'audio') return this.audio.currentTime
		if (inferTrackType(track) === 'midi') {
			return this.playing
				? (performance.now() - this.midiStartedAt) / 1000 +
						this.midiPausedAt
				: this.midiPausedAt
		}
		return 0
	}

	private query<T extends Element>(root: ParentNode, selector: string): T {
		const element = root.querySelector<T>(selector)
		if (!element) throw new Error(`Missing Jukette element: ${selector}`)
		return element
	}

	private syncTracks(): void {
		const tracks = parsePlaylist(this.getAttribute(ATTR_PLAYLIST))
		const src = this.getAttribute(ATTR_SRC)
		const singleTrack = normalizeTrack(src ?? undefined)
		this.tracks =
			tracks.length > 0 ? tracks : singleTrack ? [singleTrack] : []

		const nextIndex = Number(this.getAttribute(ATTR_TRACK_INDEX))
		this.index =
			Number.isInteger(nextIndex) && nextIndex >= 0
				? Math.min(nextIndex, Math.max(0, this.tracks.length - 1))
				: Math.min(this.index, Math.max(0, this.tracks.length - 1))

		this.renderPlaylist()
	}

	private loadTrack(): void {
		this.stopMidi()
		this.audio.pause()
		this.audio.removeAttribute('src')
		this.iframe.removeAttribute('src')
		this.duration = 0
		this.midiSequence = null
		this.midiPausedAt = 0
		this.syncProgress(0, 0)

		const track = this.currentTrack
		if (!track) {
			this.titleElement.textContent = 'No track'
			this.metaElement.textContent = ''
			this.statusElement.textContent = ''
			this.playButton.disabled = true
			return
		}

		const type = inferTrackType(track)
		this.dataset.kind = type
		this.playButton.disabled = false
		this.titleElement.textContent = track.title || track.src
		this.metaElement.textContent = track.artist || type
		this.statusElement.textContent =
			type === 'soundcloud'
				? 'SoundCloud embed'
				: type === 'midi'
					? 'MIDI file'
					: 'Audio file'

		if (type === 'audio') {
			this.audio.src = track.src
			this.audio.volume = Number(this.volumeInput.value)
		} else if (type === 'soundcloud') {
			const url = new URL('https://w.soundcloud.com/player/')
			url.searchParams.set('url', track.src)
			url.searchParams.set('auto_play', 'false')
			this.iframe.src = url.toString()
		} else {
			this.duration = 180
			this.syncProgress(0, this.duration)
		}

		this.renderPlaylist()
		this.syncPlayingState()
	}

	private renderPlaylist(): void {
		this.playlistElement.replaceChildren(
			...this.tracks.map((track, index) => {
				const item = document.createElement('li')
				const button = document.createElement('button')
				button.type = 'button'
				button.textContent = track.title || track.src
				button.disabled = index === this.index
				button.addEventListener('click', () => {
					this.index = index
					this.loadTrack()
					if (this.playing) void this.play()
				})
				item.append(button)
				return item
			}),
		)
	}

	private togglePlaylist(): void {
		const open = !this.hasAttribute('playlist-open')
		this.toggleAttribute('playlist-open', open)
		this.playlistButton.setAttribute('aria-pressed', String(open))
	}

	private syncVolume(): void {
		this.audio.volume = Number(this.volumeInput.value)
		if (this.midiGain)
			this.midiGain.gain.value = Number(this.volumeInput.value)
	}

	private seekFromInput(): void {
		if (!this.duration) return
		this.seek((Number(this.seekInput.value) / 1000) * this.duration)
	}

	private syncFromMedia(): void {
		this.duration = Number.isFinite(this.audio.duration)
			? this.audio.duration
			: 0
		this.syncProgress(this.audio.currentTime, this.duration)
	}

	private syncProgress(currentTime: number, duration: number): void {
		const ratio =
			duration > 0 ? Math.min(1, Math.max(0, currentTime / duration)) : 0
		this.seekInput.value = String(Math.round(ratio * 1000))
		this.progressElement.style.setProperty(CSS_VAR_PROGRESS, String(ratio))
		this.progressElement.style.setProperty(
			CSS_VAR_PROGRESS_DURATION,
			`${Math.max(1, (duration - currentTime) * 1000)}ms`,
		)
		this.progressElement.style.setProperty(
			CSS_VAR_PROGRESS_DELAY,
			`${Math.min(0, -currentTime * 1000)}ms`,
		)
	}

	private syncPlayingState(): void {
		this.playButton.textContent = this.playing ? 'Ⅱ' : '▶'
		this.playButton.setAttribute(
			'aria-label',
			this.playing ? 'Pause' : 'Play',
		)
		this.progressElement.style.setProperty(
			CSS_VAR_PROGRESS_STATE,
			this.playing ? 'running' : 'paused',
		)
	}

	private async playMidi(): Promise<void> {
		const track = this.currentTrack
		if (!track) return

		if (!this.midiSequence) {
			this.statusElement.textContent = 'Loading MIDI file'
			this.midiSequence = await loadMidiSequence(track.src)
			this.duration = this.midiSequence.duration
		}

		this.stopMidi()
		this.playing = true
		this.midiStartedAt = performance.now()
		this.statusElement.textContent = 'MIDI file'
		this.ensureMidiAudio()

		if (!this.midiAudio || !this.midiGain || !this.midiSequence) return

		if (this.midiAudio.state === 'suspended') {
			await this.midiAudio.resume()
		}

		const startOffset = this.midiPausedAt
		const startTime = this.midiAudio.currentTime + 0.03
		this.midiSources = this.midiSequence.notes
			.filter((note) => note.start + note.duration > startOffset)
			.map((note) => {
				const oscillator = this.midiAudio!.createOscillator()
				const envelope = this.midiAudio!.createGain()
				const relativeStart = Math.max(0, note.start - startOffset)
				const clippedOffset = Math.max(0, startOffset - note.start)
				const clippedDuration = Math.max(
					0.03,
					note.duration - clippedOffset,
				)
				const noteStart = startTime + relativeStart
				const noteEnd = noteStart + clippedDuration

				oscillator.type = 'triangle'
				oscillator.frequency.value = note.frequency
				envelope.gain.setValueAtTime(0, noteStart)
				envelope.gain.linearRampToValueAtTime(
					note.velocity * 0.18,
					noteStart + 0.01,
				)
				envelope.gain.setValueAtTime(
					note.velocity * 0.16,
					Math.max(noteStart + 0.02, noteEnd - 0.04),
				)
				envelope.gain.linearRampToValueAtTime(0, noteEnd)
				oscillator.connect(envelope)
				envelope.connect(this.midiGain!)
				oscillator.start(noteStart)
				oscillator.stop(noteEnd + 0.02)
				return oscillator
			})

		this.midiTimer = window.setTimeout(
			() => this.next(),
			Math.max(0, this.duration - startOffset) * 1000,
		)
	}

	private pauseMidi(): void {
		this.midiPausedAt = this.currentTime
		this.stopMidi()
	}

	private stopMidi(): void {
		if (this.midiTimer) {
			window.clearTimeout(this.midiTimer)
			this.midiTimer = 0
		}

		for (const source of this.midiSources) {
			try {
				source.stop()
			} catch {
				// Already stopped.
			}
		}
		this.midiSources = []
	}

	private ensureMidiAudio(): void {
		if (this.midiAudio && this.midiGain) return

		const AudioContextConstructor =
			globalThis.AudioContext ??
			(
				globalThis as typeof globalThis & {
					webkitAudioContext?: typeof AudioContext
				}
			).webkitAudioContext

		if (!AudioContextConstructor) {
			this.statusElement.textContent = 'MIDI playback needs Web Audio'
			return
		}

		this.midiAudio = new AudioContextConstructor()
		this.midiGain = this.midiAudio.createGain()
		this.midiGain.gain.value = Number(this.volumeInput.value)
		this.midiGain.connect(this.midiAudio.destination)
	}
}

class MidiReader {
	private offset = 0

	constructor(private readonly data: Uint8Array) {}

	get done(): boolean {
		return this.offset >= this.data.length
	}

	read(length: number): Uint8Array {
		const value = this.data.slice(this.offset, this.offset + length)
		this.offset += length
		return value
	}

	unread(length = 1): void {
		this.offset = Math.max(0, this.offset - length)
	}

	readText(length: number): string {
		return String.fromCharCode(...this.read(length))
	}

	readU8(): number {
		return this.data[this.offset++] ?? 0
	}

	readU16(): number {
		return (this.readU8() << 8) | this.readU8()
	}

	readU32(): number {
		return (
			(this.readU8() << 24) |
			(this.readU8() << 16) |
			(this.readU8() << 8) |
			this.readU8()
		)
	}

	readVar(): number {
		let value = 0
		let byte: number

		do {
			byte = this.readU8()
			value = (value << 7) | (byte & 0x7f)
		} while (byte & 0x80)

		return value
	}
}

const midiNoteFrequency = (note: number): number =>
	440 * Math.pow(2, (note - 69) / 12)

export const parseMidi = (buffer: ArrayBuffer): MidiSequence => {
	const reader = new MidiReader(new Uint8Array(buffer))
	if (reader.readText(4) !== 'MThd') throw new Error('Invalid MIDI header.')

	const headerLength = reader.readU32()
	reader.readU16()
	const trackCount = reader.readU16()
	const division = reader.readU16()
	if (headerLength > 6) reader.read(headerLength - 6)
	if (division & 0x8000)
		throw new Error('SMPTE MIDI timing is not supported.')

	const ticksPerBeat = division
	const notes: MidiNote[] = []
	let tempo = 500000
	let duration = 0

	for (
		let trackIndex = 0;
		trackIndex < trackCount && !reader.done;
		trackIndex++
	) {
		if (reader.readText(4) !== 'MTrk') break

		const trackReader = new MidiReader(reader.read(reader.readU32()))
		const activeNotes = new Map<
			number,
			{ start: number; velocity: number }
		>()
		let runningStatus = 0
		let seconds = 0

		while (!trackReader.done) {
			const delta = trackReader.readVar()
			seconds += (delta * tempo) / ticksPerBeat / 1000000
			let status = trackReader.readU8()

			if (status < 0x80) {
				trackReader.unread()
				status = runningStatus
			} else {
				runningStatus = status
			}

			if (status === 0xff) {
				const type = trackReader.readU8()
				const length = trackReader.readVar()
				if (type === 0x51 && length === 3) {
					const bytes = trackReader.read(3)
					tempo = (bytes[0] << 16) | (bytes[1] << 8) | bytes[2]
				} else {
					trackReader.read(length)
				}
				continue
			}

			if (status === 0xf0 || status === 0xf7) {
				trackReader.read(trackReader.readVar())
				continue
			}

			const command = status & 0xf0
			if (command === 0xc0 || command === 0xd0) {
				trackReader.readU8()
				continue
			}

			const note = trackReader.readU8()
			const velocity = trackReader.readU8()

			if (command === 0x90 && velocity > 0) {
				activeNotes.set(note, {
					start: seconds,
					velocity: velocity / 127,
				})
			} else if (command === 0x80 || command === 0x90) {
				const active = activeNotes.get(note)
				if (active) {
					notes.push({
						duration: Math.max(0.03, seconds - active.start),
						frequency: midiNoteFrequency(note),
						start: active.start,
						velocity: active.velocity,
					})
					activeNotes.delete(note)
				}
			}

			duration = Math.max(duration, seconds)
		}
	}

	return { duration: Math.max(duration, 1), notes }
}

export const loadMidiSequence = async (src: string): Promise<MidiSequence> => {
	const response = await fetch(src)
	if (!response.ok) throw new Error(`Unable to load MIDI file: ${src}`)
	return parseMidi(await response.arrayBuffer())
}

export const defineJuketteElement = (): void => {
	if (typeof customElements === 'undefined') return

	if (!customElements.get('jukette-player')) {
		customElements.define('jukette-player', JukettePlayerElement)
	}
}

declare global {
	interface HTMLElementTagNameMap {
		'jukette-player': JukettePlayerElement
	}
}
