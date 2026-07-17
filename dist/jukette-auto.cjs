/*! jukette v0.3.0 | (c) 2026 Rémino Rem <https://remino.net/> | ISC Licence */
//#region src/lib/dom.ts
var HTMLElementBase = globalThis.HTMLElement ?? class {};
//#endregion
//#region src/lib/attributes.ts
var ATTR_PLAYLIST = "playlist";
var ATTR_PLAYLIST_OPEN = "playlist-open";
var ATTR_PRELOAD = "preload";
var ATTR_PRELOAD_METADATA = "preload-metadata";
var ATTR_PREFER_MEDIA_METADATA = "prefer-media-metadata";
var ATTR_MIDI_OSCILLATOR = "midi-oscillator";
var ATTR_TRACK_INDEX = "track-index";
var ATTR_TITLE = "title";
var ATTR_ARTIST = "artist";
var ATTR_TYPE = "type";
//#endregion
//#region src/lib/utils.ts
var isRecord = (value) => typeof value === "object" && value !== null;
var normalizeBooleanAttribute = (value) => {
	if (value === null) return void 0;
	const normalizedValue = value.trim().toLowerCase();
	if (normalizedValue === "" || normalizedValue === "true") return true;
	if (normalizedValue === "false") return false;
};
//#endregion
//#region src/lib/tracks.ts
var inferTrackType = (track) => {
	if (track.type) return track.type;
	const source = track.src.toLowerCase();
	if (source.includes("soundcloud.com")) return "soundcloud";
	if (/\.(?:mid|midi)(?:[?#].*)?$/.test(source)) return "midi";
	return "audio";
};
var normalizeTrack = (value) => {
	if (typeof value === "string") {
		const src = value.trim();
		return src ? { src } : null;
	}
	if (!isRecord(value) || typeof value.src !== "string") return null;
	const src = value.src.trim();
	if (!src) return null;
	const type = value.type === "audio" || value.type === "soundcloud" || value.type === "midi" ? value.type : void 0;
	const track = { src };
	if (typeof value.artist === "string") track.artist = value.artist;
	if (typeof value.preferMediaMetadata === "boolean") track.preferMediaMetadata = value.preferMediaMetadata;
	else if (typeof value.preferMediaMetadata === "string") {
		const preferMediaMetadata = normalizeBooleanAttribute(value.preferMediaMetadata);
		if (preferMediaMetadata !== void 0) track.preferMediaMetadata = preferMediaMetadata;
	}
	if (typeof value.preload === "boolean") track.preload = value.preload;
	else if (typeof value.preload === "string") {
		const preload = normalizeBooleanAttribute(value.preload);
		if (preload !== void 0) track.preload = preload;
	}
	if (typeof value.title === "string") track.title = value.title;
	if (type) track.type = type;
	return track;
};
var parsePlaylist = (value) => {
	if (!value) return [];
	try {
		const parsed = JSON.parse(value);
		return (Array.isArray(parsed) ? parsed : [parsed]).map((item) => normalizeTrack(item)).filter((item) => item !== null);
	} catch {
		return value.split("\n").map((item) => normalizeTrack(item)).filter((item) => item !== null);
	}
};
var trackFromElement = (element) => {
	if (element.localName !== "jukette-track") return null;
	return normalizeTrack({
		artist: element.getAttribute("artist") ?? void 0,
		preferMediaMetadata: element.getAttribute("prefer-media-metadata") ?? void 0,
		preload: element.getAttribute("preload") ?? void 0,
		src: element.getAttribute("src") ?? "",
		title: element.getAttribute("title") ?? void 0,
		type: element.getAttribute("type") ?? void 0
	});
};
//#endregion
//#region src/lib/events.ts
var createJuketteEventDetail = (detail) => ({
	...detail,
	tracks: [...detail.tracks],
	type: detail.track ? inferTrackType(detail.track) : void 0
});
//#endregion
//#region src/lib/text.ts
var decodeAscii = (bytes) => String.fromCharCode(...bytes);
var decodeIso88591 = (bytes) => String.fromCharCode(...bytes);
var decodeUtf16Be = (bytes) => {
	const codeUnits = [];
	for (let index = 0; index + 1 < bytes.length; index += 2) codeUnits.push(bytes[index] << 8 | bytes[index + 1]);
	return String.fromCharCode(...codeUnits);
};
var decodeTextBytes = (bytes, encoding) => {
	try {
		return new TextDecoder(encoding).decode(bytes);
	} catch {
		return encoding === "iso-8859-1" ? decodeIso88591(bytes) : decodeAscii(bytes);
	}
};
var cleanMetadataText = (value) => {
	const nullIndex = value.indexOf("\0");
	return (nullIndex >= 0 ? value.slice(0, nullIndex) : value.trimEnd()).trim();
};
//#endregion
//#region src/lib/midi.ts
var MidiReader = class {
	data;
	offset = 0;
	constructor(data) {
		this.data = data;
	}
	get done() {
		return this.offset >= this.data.length;
	}
	read(length) {
		const value = this.data.slice(this.offset, this.offset + length);
		this.offset += length;
		return value;
	}
	unread(length = 1) {
		this.offset = Math.max(0, this.offset - length);
	}
	readText(length) {
		return String.fromCharCode(...this.read(length));
	}
	readU8() {
		return this.data[this.offset++] ?? 0;
	}
	readU16() {
		return this.readU8() << 8 | this.readU8();
	}
	readU32() {
		return this.readU8() << 24 | this.readU8() << 16 | this.readU8() << 8 | this.readU8();
	}
	readVar() {
		let value = 0;
		let byte;
		do {
			byte = this.readU8();
			value = value << 7 | byte & 127;
		} while (byte & 128);
		return value;
	}
};
var midiNoteFrequency = (note) => 440 * Math.pow(2, (note - 69) / 12);
var decodeMidiText = (bytes) => cleanMetadataText(decodeTextBytes(bytes, "utf-8"));
var normalizeMidiOscillator = (value) => {
	if (value === "sine" || value === "square" || value === "sawtooth" || value === "triangle") return value;
	return "auto";
};
var midiProgramToOscillator = (program) => {
	if (program === void 0) return "triangle";
	if (program >= 16 && program <= 23) return "sine";
	if (program >= 32 && program <= 39) return "square";
	if (program >= 80 && program <= 87) return "square";
	if (program >= 56 && program <= 87) return "sawtooth";
	return "triangle";
};
var resolveMidiOscillatorType = (oscillator, program) => oscillator === "auto" ? midiProgramToOscillator(program) : oscillator;
var parseMidi = (buffer) => {
	const reader = new MidiReader(new Uint8Array(buffer));
	if (reader.readText(4) !== "MThd") throw new Error("Invalid MIDI header.");
	const headerLength = reader.readU32();
	reader.readU16();
	const trackCount = reader.readU16();
	const division = reader.readU16();
	if (headerLength > 6) reader.read(headerLength - 6);
	if (division & 32768) throw new Error("SMPTE MIDI timing is not supported.");
	const ticksPerBeat = division;
	const notes = [];
	const metadata = {};
	let program;
	let tempo = 5e5;
	let duration = 0;
	for (let trackIndex = 0; trackIndex < trackCount && !reader.done; trackIndex++) {
		if (reader.readText(4) !== "MTrk") break;
		const trackReader = new MidiReader(reader.read(reader.readU32()));
		const activeNotes = /* @__PURE__ */ new Map();
		let runningStatus = 0;
		let seconds = 0;
		while (!trackReader.done) {
			const delta = trackReader.readVar();
			seconds += delta * tempo / ticksPerBeat / 1e6;
			let status = trackReader.readU8();
			if (status < 128) {
				trackReader.unread();
				status = runningStatus;
			} else runningStatus = status;
			if (status === 255) {
				const type = trackReader.readU8();
				const length = trackReader.readVar();
				if (type === 81 && length === 3) {
					const bytes = trackReader.read(3);
					tempo = bytes[0] << 16 | bytes[1] << 8 | bytes[2];
				} else if (type === 3) {
					const title = decodeMidiText(trackReader.read(length));
					if (!metadata.title && title) metadata.title = title;
				} else trackReader.read(length);
				continue;
			}
			if (status === 240 || status === 247) {
				trackReader.read(trackReader.readVar());
				continue;
			}
			const command = status & 240;
			if (command === 192) {
				const nextProgram = trackReader.readU8();
				if (program === void 0) program = nextProgram;
				continue;
			}
			if (command === 208) {
				trackReader.readU8();
				continue;
			}
			const note = trackReader.readU8();
			const velocity = trackReader.readU8();
			if (command === 144 && velocity > 0) activeNotes.set(note, {
				start: seconds,
				velocity: velocity / 127
			});
			else if (command === 128 || command === 144) {
				const active = activeNotes.get(note);
				if (active) {
					notes.push({
						duration: Math.max(.03, seconds - active.start),
						frequency: midiNoteFrequency(note),
						start: active.start,
						velocity: active.velocity
					});
					activeNotes.delete(note);
				}
			}
			duration = Math.max(duration, seconds);
		}
	}
	const sequenceMetadata = {};
	if (metadata.title) sequenceMetadata.title = metadata.title;
	if (program !== void 0) sequenceMetadata.program = program;
	return {
		duration: Math.max(duration, 1),
		metadata: sequenceMetadata.title || sequenceMetadata.program !== void 0 ? sequenceMetadata : void 0,
		notes
	};
};
var loadMidiSequence = async (src) => {
	const response = await fetch(src);
	if (!response.ok) throw new Error(`Unable to load MIDI file: ${src}`);
	return parseMidi(await response.arrayBuffer());
};
//#endregion
//#region src/lib/metadata.ts
var readSynchsafeInteger = (data, offset, length = 4) => {
	let value = 0;
	for (let index = 0; index < length; index++) value = value << 7 | data[offset + index] & 127;
	return value;
};
var readUint32 = (data, offset) => (data[offset] << 24 | data[offset + 1] << 16 | data[offset + 2] << 8 | data[offset + 3]) >>> 0;
var decodeId3TextFrame = (frameData) => {
	if (frameData.length < 2) return "";
	const encoding = frameData[0];
	const content = frameData.slice(1);
	if (encoding === 0) return cleanMetadataText(decodeIso88591(content));
	if (encoding === 3) return cleanMetadataText(decodeTextBytes(content, "utf-8"));
	if (encoding === 2) return cleanMetadataText(decodeUtf16Be(content));
	return cleanMetadataText(decodeTextBytes(content, "utf-16"));
};
var parseAudioFileMetadata = (buffer) => {
	const data = new Uint8Array(buffer);
	if (data.length < 10 || decodeAscii(data.slice(0, 3)) !== "ID3") return {};
	const version = data[3];
	const flags = data[5];
	const tagEnd = Math.min(data.length, 10 + readSynchsafeInteger(data, 6));
	let offset = 10;
	if (flags & 64 && offset + 4 <= tagEnd) {
		const extendedHeaderSize = version === 4 ? readSynchsafeInteger(data, offset) : readUint32(data, offset) + 4;
		offset += extendedHeaderSize;
	}
	const metadata = {};
	while (offset + 10 <= tagEnd) {
		const frameId = decodeAscii(data.slice(offset, offset + 4));
		if (!/^[A-Z0-9]{4}$/.test(frameId)) break;
		const frameSize = version === 4 ? readSynchsafeInteger(data, offset + 4) : readUint32(data, offset + 4);
		const frameStart = offset + 10;
		const frameEnd = frameStart + frameSize;
		if (frameSize <= 0 || frameEnd > tagEnd) break;
		const frameData = data.slice(frameStart, frameEnd);
		if (frameId === "TIT2") metadata.title = decodeId3TextFrame(frameData);
		if (frameId === "TPE1") metadata.artist = decodeId3TextFrame(frameData);
		offset = frameEnd;
	}
	return metadata;
};
var parseSoundCloudOEmbedMetadata = (value) => {
	if (!isRecord(value) || typeof value.title !== "string") return {};
	const title = value.title.trim();
	if (!title) return {};
	const match = /^(?<title>.+?) by (?<artist>.+)$/.exec(title);
	if (!match?.groups) return { title };
	return {
		artist: match.groups.artist.trim() || void 0,
		title: match.groups.title.trim() || title
	};
};
//#endregion
//#region src/lib/playable-track.ts
var JukettePlayableTrack = class {
	track;
	callbacks;
	durationValue = 0;
	constructor(track, callbacks) {
		this.track = track;
		this.callbacks = callbacks;
	}
	get currentTime() {
		return 0;
	}
	get duration() {
		return this.durationValue;
	}
	load(_options) {}
	seek(_seconds) {}
	setVolume(_volume) {}
	stop() {
		this.pause({ silent: true });
	}
	requestPosition(_isStale) {}
};
//#endregion
//#region src/lib/audio-track.ts
var AudioPlayableTrack = class extends JukettePlayableTrack {
	audio;
	constructor(track, audio, callbacks) {
		super(track, callbacks);
		this.audio = audio;
	}
	get currentTime() {
		return this.audio.currentTime;
	}
	get duration() {
		return Number.isFinite(this.audio.duration) ? this.audio.duration : 0;
	}
	load(options) {
		this.callbacks.onStatus("Loading audio");
		this.audio.src = this.track.src;
		this.audio.volume = options.volume;
		this.audio.load();
		this.audio.currentTime = 0;
		this.preloadFileMetadata(options.metadataPreloadId);
	}
	async play(options) {
		this.callbacks.onStatus("Starting audio");
		await this.audio.play();
		return !options.isStale();
	}
	pause() {
		this.audio.pause();
	}
	seek(seconds) {
		this.audio.currentTime = seconds;
	}
	setVolume(volume) {
		this.audio.volume = volume;
	}
	stop() {
		this.audio.pause();
		this.audio.removeAttribute("src");
	}
	syncFromMedia() {
		this.durationValue = this.duration;
		this.callbacks.onDuration(this.durationValue);
		this.callbacks.onProgress(this.audio.currentTime, this.durationValue);
	}
	async preloadFileMetadata(metadataPreloadId) {
		if (typeof fetch === "undefined") return;
		try {
			const response = await fetch(this.track.src, { headers: { Range: "bytes=0-65535" } });
			if (!response.ok) return;
			this.callbacks.onMetadata(parseAudioFileMetadata(await response.arrayBuffer()), metadataPreloadId);
		} catch {}
	}
};
//#endregion
//#region src/lib/midi-track.ts
var MidiPlayableTrack = class extends JukettePlayableTrack {
	getOscillator;
	audio = null;
	gain = null;
	pausedAt = 0;
	sequence = null;
	sources = [];
	startedAt = 0;
	timer = 0;
	volume = 1;
	constructor(track, callbacks, getOscillator) {
		super(track, callbacks);
		this.getOscillator = getOscillator;
	}
	get currentTime() {
		return this.timer ? (performance.now() - this.startedAt) / 1e3 + this.pausedAt : this.pausedAt;
	}
	load(_options) {
		this.callbacks.onStatus("Ready");
		window.setTimeout(() => {
			if (!this.timer) this.callbacks.onStatus();
		}, 700);
	}
	async play(options) {
		if (!this.sequence) {
			this.callbacks.onStatus("Loading MIDI");
			this.sequence = await loadMidiSequence(this.track.src);
			if (options.isStale()) return false;
			this.durationValue = this.sequence.duration;
			this.callbacks.onDuration(this.durationValue);
			if (this.sequence.metadata?.title) this.callbacks.onMetadata({ title: this.sequence.metadata.title });
			this.callbacks.onProgress(this.pausedAt, this.durationValue);
		}
		if (options.restart) {
			this.pausedAt = 0;
			this.callbacks.onProgress(0, this.durationValue);
		}
		this.volume = options.volume;
		this.stopSources();
		if (options.isStale()) return false;
		this.startedAt = performance.now();
		this.ensureAudio();
		if (!this.audio || !this.gain || !this.sequence) return false;
		if (this.audio.state === "suspended") await this.audio.resume();
		const startOffset = this.pausedAt;
		const startTime = this.audio.currentTime + .03;
		const oscillatorType = resolveMidiOscillatorType(this.getOscillator(), this.sequence.metadata?.program);
		this.sources = this.sequence.notes.filter((note) => note.start + note.duration > startOffset).map((note) => {
			const oscillator = this.audio.createOscillator();
			const envelope = this.audio.createGain();
			const relativeStart = Math.max(0, note.start - startOffset);
			const clippedOffset = Math.max(0, startOffset - note.start);
			const clippedDuration = Math.max(.03, note.duration - clippedOffset);
			const noteStart = startTime + relativeStart;
			const noteEnd = noteStart + clippedDuration;
			oscillator.type = oscillatorType;
			oscillator.frequency.value = note.frequency;
			envelope.gain.setValueAtTime(0, noteStart);
			envelope.gain.linearRampToValueAtTime(note.velocity * .18, noteStart + .01);
			envelope.gain.setValueAtTime(note.velocity * .16, Math.max(noteStart + .02, noteEnd - .04));
			envelope.gain.linearRampToValueAtTime(0, noteEnd);
			oscillator.connect(envelope);
			envelope.connect(this.gain);
			oscillator.start(noteStart);
			oscillator.stop(noteEnd + .02);
			return oscillator;
		});
		this.timer = window.setTimeout(() => this.callbacks.onFinish(), Math.max(0, this.durationValue - startOffset) * 1e3);
		return true;
	}
	pause() {
		this.pausedAt = this.currentTime;
		this.stopSources();
	}
	seek(seconds) {
		this.pausedAt = Math.max(0, seconds);
		this.callbacks.onProgress(this.pausedAt, this.durationValue);
	}
	setVolume(volume) {
		this.volume = volume;
		if (this.gain) this.gain.gain.value = volume;
	}
	stop() {
		this.stopSources();
	}
	stopSources() {
		if (this.timer) {
			window.clearTimeout(this.timer);
			this.timer = 0;
		}
		for (const source of this.sources) try {
			source.stop();
		} catch {}
		this.sources = [];
	}
	ensureAudio() {
		if (this.audio && this.gain) return;
		const AudioContextConstructor = globalThis.AudioContext ?? globalThis.webkitAudioContext;
		if (!AudioContextConstructor) {
			this.callbacks.onStatus("MIDI playback needs Web Audio");
			return;
		}
		this.audio = new AudioContextConstructor();
		this.gain = this.audio.createGain();
		this.gain.gain.value = this.volume;
		this.gain.connect(this.audio.destination);
	}
};
//#endregion
//#region src/lib/jukette-player.css?inline
var jukette_player_default = ":host {\n	--jukette-control-size: 2em;\n	display: block;\n	font: inherit;\n	color: inherit;\n}\n\n* {\n	box-sizing: border-box;\n}\n\n.player {\n	border: 1px solid currentColor;\n	display: grid;\n	gap: 0.5lh;\n	padding: 0.5rlh 1em;\n}\n\n.track {\n	display: grid;\n	min-inline-size: 0;\n}\n\n.progress {\n	display: grid;\n	gap: 0;\n}\n\n.title,\n.meta {\n	overflow: hidden;\n	text-overflow: ellipsis;\n	white-space: nowrap;\n}\n\n.title {\n	font-weight: 700;\n}\n\n.meta,\n.status,\n.time {\n	opacity: 0.75;\n}\n\n.status {\n	min-block-size: 1lh;\n	overflow: hidden;\n	text-overflow: ellipsis;\n	white-space: nowrap;\n}\n\n.controls {\n	align-items: center;\n	display: grid;\n	gap: 0.5lh 0.5em;\n	grid-template-areas: 'previous play next volume playlist';\n	grid-template-columns:\n		repeat(3, var(--jukette-control-size)) minmax(7rem, 1fr)\n		var(--jukette-control-size);\n}\n\n.previous {\n	grid-area: previous;\n}\n\n.play {\n	grid-area: play;\n}\n\n.next {\n	grid-area: next;\n}\n\n.volume {\n	grid-area: volume;\n}\n\n.playlist-toggle {\n	grid-area: playlist;\n}\n\nbutton {\n	align-items: center;\n	appearance: none;\n	background: transparent;\n	border: 1px solid currentColor;\n	block-size: var(--jukette-control-size);\n	color: inherit;\n	cursor: pointer;\n	display: inline-grid;\n	font: inherit;\n	inline-size: var(--jukette-control-size);\n	justify-content: center;\n	padding: 0;\n}\n\nbutton:focus-visible {\n	outline: 2px solid currentColor;\n	outline-offset: 0;\n	outline-radius: 0;\n}\n\nbutton:active {\n	background: rgb(\n		from currentColor calc(255 - r) calc(255 - g) calc(255 - b)\n	);\n	color: rgb(from currentColor calc(255 - r) calc(255 - g) calc(255 - b));\n}\n\nbutton[aria-pressed='true'] {\n	background: rgb(\n		from currentColor calc(255 - r) calc(255 - g) calc(255 - b)\n	);\n	color: rgb(from currentColor calc(255 - r) calc(255 - g) calc(255 - b));\n}\n\nbutton:disabled {\n	cursor: default;\n	opacity: 0.45;\n}\n\ninput[type='range'] {\n	accent-color: currentColor;\n}\n\n.seek {\n	display: grid;\n}\n\n.time {\n	display: grid;\n	gap: 0.5em;\n	grid-template-columns: repeat(3, 1fr);\n	font-variant-numeric: tabular-nums;\n}\n\n.time span:nth-child(2) {\n	text-align: center;\n}\n\n.time span:nth-child(3) {\n	text-align: end;\n}\n\n.playlist {\n	border-block-start: 1px solid currentColor;\n	counter-reset: jukette-playlist;\n	display: none;\n	gap: 0.5lh 0;\n	list-style: none;\n	margin: 0;\n	padding: 1lh 0 0.5lh;\n}\n\n:host([playlist-open]) .playlist {\n	display: grid;\n}\n\n.playlist li {\n	align-items: start;\n	counter-increment: jukette-playlist;\n	display: grid;\n}\n\n.playlist li button {\n	padding-inline: 0.5em;\n}\n\n.playlist li button::before {\n	content: counter(jukette-playlist) '.';\n	grid-column: 1;\n	grid-row: 1 / span 2;\n	font-variant-numeric: tabular-nums;\n	text-align: end;\n}\n\n.playlist li button[aria-current='true'] {\n	background: rgb(\n		from currentColor calc(255 - r) calc(255 - g) calc(255 - b)\n	);\n	color: rgb(from currentColor calc(255 - r) calc(255 - g) calc(255 - b));\n}\n\n.playlist button {\n	align-items: start;\n	block-size: auto;\n	border: 0;\n	display: grid;\n	gap: 0 0.5em;\n	grid-template-columns: 2ch minmax(0, 1fr) auto;\n	inline-size: 100%;\n	text-align: start;\n}\n\n.playlist-title,\n.playlist-artist {\n	overflow: hidden;\n	text-overflow: ellipsis;\n	white-space: nowrap;\n}\n\n.playlist-title {\n	font-weight: 700;\n	grid-column: 2;\n}\n\n.playlist-artist,\n.playlist-duration {\n	opacity: 0.75;\n}\n\n.playlist-duration {\n	align-self: center;\n	font-variant-numeric: tabular-nums;\n	grid-column: 3;\n	grid-row: 1 / span 2;\n	white-space: nowrap;\n}\n\n.playlist-artist {\n	grid-column: 2;\n}\n\n.soundcloud {\n	border: 0;\n	block-size: 166px;\n	display: block;\n	inline-size: 100%;\n}\n\naudio {\n	display: none;\n}\n\n@media (max-width: 34em) {\n	.controls {\n		grid-template-areas:\n			'volume volume volume volume volume'\n			'previous play next spacer playlist';\n		grid-template-columns:\n			repeat(3, var(--jukette-control-size)) minmax(0, 1fr)\n			var(--jukette-control-size);\n		justify-content: start;\n	}\n}\n";
//#endregion
//#region src/lib/player-dom.ts
var query = (root, selector) => {
	const element = root.querySelector(selector);
	if (!element) throw new Error(`Missing Jukette element: ${selector}`);
	return element;
};
var createJukettePlayerDom = (host) => {
	const shadowRoot = host.attachShadow({ mode: "open" });
	shadowRoot.innerHTML = `
		<style>${jukette_player_default}</style>

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
			<audio preload="metadata"></audio>
			<ol class="playlist" part="playlist"></ol>
		</div>
	`;
	return {
		audio: query(shadowRoot, "audio"),
		elapsedTimeElement: query(shadowRoot, ".elapsed"),
		metaElement: query(shadowRoot, ".meta"),
		nextButton: query(shadowRoot, ".next"),
		playButton: query(shadowRoot, ".play"),
		playerElement: query(shadowRoot, ".player"),
		playlistButton: query(shadowRoot, ".playlist-toggle"),
		playlistElement: query(shadowRoot, ".playlist"),
		previousButton: query(shadowRoot, ".previous"),
		remainingTimeElement: query(shadowRoot, ".remaining"),
		seekInput: query(shadowRoot, ".seek-input"),
		statusElement: query(shadowRoot, ".status"),
		titleElement: query(shadowRoot, ".title"),
		totalTimeElement: query(shadowRoot, ".total"),
		volumeInput: query(shadowRoot, ".volume")
	};
};
//#endregion
//#region src/lib/player-metadata.ts
var JuketteMetadataController = class {
	options;
	durations = /* @__PURE__ */ new Map();
	metadata = /* @__PURE__ */ new Map();
	preloadId = 0;
	constructor(options) {
		this.options = options;
	}
	get metadataPreloadId() {
		return this.preloadId;
	}
	getDuration(track) {
		if (!track) return void 0;
		return this.durations.get(this.options.getTrackKey(track));
	}
	setDuration(track, duration) {
		if (!track || !Number.isFinite(duration) || duration <= 0) return;
		const key = this.options.getTrackKey(track);
		const currentDuration = this.durations.get(key);
		if (currentDuration !== void 0 && Math.abs(currentDuration - duration) < .5) return;
		this.durations.set(key, duration);
		this.options.onPlaylistDisplayChange();
	}
	getDisplay(track) {
		const metadata = this.options.trackPrefersMediaMetadata(track) ? this.metadata.get(this.options.getTrackKey(track)) : void 0;
		return {
			artist: metadata?.artist || track.artist || "",
			title: metadata?.title || track.title || track.src
		};
	}
	setMetadata(track, metadata) {
		if (!track) return;
		const nextMetadata = {
			artist: metadata.artist?.trim() || void 0,
			title: metadata.title?.trim() || void 0
		};
		if (!nextMetadata.artist && !nextMetadata.title) return;
		const key = this.options.getTrackKey(track);
		const currentMetadata = this.metadata.get(key);
		if (currentMetadata !== void 0 && currentMetadata.artist === nextMetadata.artist && currentMetadata.title === nextMetadata.title) return;
		this.metadata.set(key, nextMetadata);
		if (this.options.isCurrentTrack(track)) this.options.onCurrentTrackDisplayChange();
		this.options.onPlaylistDisplayChange();
	}
	preloadPlaylistMetadata() {
		this.preloadId += 1;
		const tracks = this.options.getTracks();
		const hasMetadataPreference = tracks.some((track) => this.options.trackPrefersMediaMetadata(track));
		if (!this.options.getPreloadMetadata() && !hasMetadataPreference) return;
		const metadataPreloadId = this.preloadId;
		for (const track of tracks) {
			const type = inferTrackType(track);
			const preferMediaMetadata = this.options.trackPrefersMediaMetadata(track);
			if (type === "audio") {
				if (this.options.getPreloadMetadata()) this.preloadAudioMetadata(track, metadataPreloadId);
				if (preferMediaMetadata) this.preloadAudioFileMetadata(track, metadataPreloadId);
			} else if (type === "midi") {
				if (this.options.getPreloadMetadata() || preferMediaMetadata) this.preloadMidiMetadata(track, metadataPreloadId);
			} else if (type === "soundcloud") {
				if (preferMediaMetadata) this.preloadSoundCloudMetadata(track, metadataPreloadId);
			}
		}
	}
	preloadAudioMetadata(track, metadataPreloadId) {
		if (this.getDuration(track) !== void 0) return;
		if (typeof Audio === "undefined") return;
		const audio = new Audio();
		const cleanup = () => {
			audio.removeEventListener("loadedmetadata", onLoadedMetadata);
			audio.removeEventListener("error", cleanup);
			audio.removeAttribute("src");
			audio.load();
		};
		const onLoadedMetadata = () => {
			if (metadataPreloadId === this.preloadId) this.setDuration(track, audio.duration);
			cleanup();
		};
		audio.preload = "metadata";
		audio.addEventListener("loadedmetadata", onLoadedMetadata);
		audio.addEventListener("error", cleanup, { once: true });
		audio.src = track.src;
		audio.load();
	}
	async preloadAudioFileMetadata(track, metadataPreloadId) {
		if (!this.options.trackPrefersMediaMetadata(track)) return;
		if (this.metadata.has(this.options.getTrackKey(track))) return;
		if (typeof fetch === "undefined") return;
		try {
			const response = await fetch(track.src, { headers: { Range: "bytes=0-65535" } });
			if (!response.ok) return;
			const metadata = parseAudioFileMetadata(await response.arrayBuffer());
			if (metadataPreloadId === this.preloadId) this.setMetadata(track, metadata);
		} catch {}
	}
	async preloadMidiMetadata(track, metadataPreloadId) {
		try {
			const sequence = await loadMidiSequence(track.src);
			if (metadataPreloadId === this.preloadId) {
				if (this.options.getPreloadMetadata()) this.setDuration(track, sequence.duration);
				if (this.options.trackPrefersMediaMetadata(track)) this.setMidiTrackMetadata(track, sequence);
			}
		} catch {}
	}
	async preloadSoundCloudMetadata(track, metadataPreloadId) {
		if (!this.options.trackPrefersMediaMetadata(track)) return;
		if (this.metadata.has(this.options.getTrackKey(track))) return;
		if (typeof fetch === "undefined") return;
		try {
			const url = new URL("https://soundcloud.com/oembed");
			url.searchParams.set("format", "json");
			url.searchParams.set("url", track.src);
			const response = await fetch(url);
			if (!response.ok) return;
			const metadata = parseSoundCloudOEmbedMetadata(await response.json());
			if (metadataPreloadId === this.preloadId) this.setMetadata(track, metadata);
		} catch {}
	}
	setMidiTrackMetadata(track, sequence) {
		if (!sequence.metadata?.title) return;
		this.setMetadata(track, { title: sequence.metadata.title });
	}
};
//#endregion
//#region src/lib/player-playlist-renderer.ts
var renderPlaylist = ({ currentIndex, element, formatTime, getDisplay, getDuration, onSelect, tracks }) => {
	element.replaceChildren(...tracks.map((track, index) => {
		const display = getDisplay(track);
		const item = document.createElement("li");
		const button = document.createElement("button");
		const title = document.createElement("span");
		const artist = document.createElement("span");
		const duration = document.createElement("span");
		const durationValue = getDuration(track);
		const durationText = durationValue === void 0 ? "--:--" : formatTime(durationValue);
		button.type = "button";
		button.part.add("playlist-track");
		button.setAttribute("aria-label", [
			display.title,
			display.artist,
			durationValue === void 0 ? "unknown duration" : durationText
		].filter(Boolean).join(", "));
		item.part.add("playlist-item");
		title.className = "playlist-title";
		title.part.add("playlist-title");
		title.textContent = display.title;
		artist.className = "playlist-artist";
		artist.part.add("playlist-artist");
		artist.textContent = display.artist;
		duration.className = "playlist-duration";
		duration.part.add("playlist-duration");
		duration.textContent = durationText;
		button.append(title, artist, duration);
		if (index === currentIndex) button.setAttribute("aria-current", "true");
		button.addEventListener("click", () => onSelect(index));
		item.append(button);
		return item;
	}));
};
//#endregion
//#region src/lib/player-time.ts
var formatTime = (seconds) => {
	const roundedSeconds = Math.floor(Number.isFinite(seconds) ? Math.max(0, seconds) : 0);
	const minutes = Math.floor(roundedSeconds / 60);
	const remainder = roundedSeconds % 60;
	return `${minutes}:${String(remainder).padStart(2, "0")}`;
};
//#endregion
//#region src/lib/player-progress.ts
var JuketteProgressController = class {
	options;
	progressFrame = 0;
	constructor(options) {
		this.options = options;
	}
	setStatus(message = "") {
		this.options.dom.statusElement.textContent = message;
	}
	syncProgress(currentTime, duration) {
		const safeDuration = Number.isFinite(duration) ? Math.max(0, duration) : 0;
		const safeCurrentTime = Number.isFinite(currentTime) ? Math.min(Math.max(0, currentTime), safeDuration || Number.MAX_SAFE_INTEGER) : 0;
		const ratio = safeDuration > 0 ? Math.min(1, Math.max(0, safeCurrentTime / safeDuration)) : 0;
		this.options.dom.seekInput.value = String(Math.round(ratio * 1e3));
		this.options.dom.elapsedTimeElement.textContent = formatTime(safeCurrentTime);
		this.options.dom.remainingTimeElement.textContent = `-${formatTime(Math.max(0, safeDuration - safeCurrentTime))}`;
		this.options.dom.totalTimeElement.textContent = formatTime(safeDuration);
	}
	syncPlayingState() {
		const playing = this.options.getPlaying();
		this.options.dom.playButton.textContent = playing ? "Ⅱ" : "▶";
		this.options.dom.playButton.setAttribute("aria-label", playing ? "Pause" : "Play");
		if (playing) {
			this.setStatus();
			this.start();
		} else this.stop();
	}
	start() {
		if (this.progressFrame || typeof requestAnimationFrame === "undefined") return;
		const tick = () => {
			if (!this.options.getPlaying()) {
				this.progressFrame = 0;
				return;
			}
			if (this.options.isSoundCloudTrack()) this.options.requestSoundCloudPosition();
			this.syncProgress(this.options.getCurrentTime(), this.options.getDuration());
			this.progressFrame = requestAnimationFrame(tick);
		};
		this.progressFrame = requestAnimationFrame(tick);
	}
	stop() {
		if (!this.progressFrame || typeof cancelAnimationFrame === "undefined") {
			this.progressFrame = 0;
			return;
		}
		cancelAnimationFrame(this.progressFrame);
		this.progressFrame = 0;
		this.syncProgress(this.options.getCurrentTime(), this.options.getDuration());
	}
};
//#endregion
//#region src/lib/soundcloud.ts
var SOUNDCLOUD_API_SRC = "https://w.soundcloud.com/player/api.js";
var SOUNDCLOUD_LOAD_TIMEOUT = 1e4;
var SOUNDCLOUD_PLAY_TIMEOUT = 5e3;
var SOUNDCLOUD_READY_TIMEOUT = 1e4;
var soundCloudApiPromise = null;
var getSoundCloudApi = async () => {
	const existingApi = globalThis.SC;
	if (existingApi?.Widget) return existingApi;
	if (soundCloudApiPromise) return soundCloudApiPromise;
	if (typeof document === "undefined") throw new Error("SoundCloud playback requires a browser document.");
	soundCloudApiPromise = new Promise((resolve, reject) => {
		const existingScript = document.querySelector(`script[src="${SOUNDCLOUD_API_SRC}"]`);
		const script = existingScript ?? document.createElement("script");
		const resolveIfReady = () => {
			const api = globalThis.SC;
			if (api?.Widget) resolve(api);
		};
		script.addEventListener("load", resolveIfReady, { once: true });
		script.addEventListener("error", () => reject(/* @__PURE__ */ new Error("Unable to load SoundCloud Widget API.")), { once: true });
		if (!existingScript) {
			script.async = true;
			script.src = SOUNDCLOUD_API_SRC;
			document.head.append(script);
		}
		resolveIfReady();
	});
	return soundCloudApiPromise;
};
var SoundCloudAdapter = class {
	iframe;
	callbacks;
	currentIsStale = () => false;
	eventsBound = false;
	loadId = 0;
	loadingPromise = null;
	loadingSrc = "";
	loadedDuration = 0;
	loadedSrc = "";
	preparedSrc = "";
	readyPromise = null;
	resolveReady = null;
	resolvePlay = null;
	silentPause = false;
	widget = null;
	constructor(iframe, callbacks) {
		this.iframe = iframe;
		this.callbacks = callbacks;
	}
	get hasWidget() {
		return this.widget !== null;
	}
	isLoaded(src) {
		return this.loadedSrc === src;
	}
	isPrepared(src) {
		return this.preparedSrc === src && this.widget !== null;
	}
	getPlayerUrl(src) {
		const url = new URL("https://w.soundcloud.com/player/");
		url.searchParams.set("url", src);
		url.searchParams.set("auto_play", "false");
		url.searchParams.set("visual", "false");
		return url.toString();
	}
	prepare(src) {
		if (this.widget) return;
		const playerUrl = this.getPlayerUrl(src);
		this.preparedSrc = src;
		if (this.iframe.src !== playerUrl) this.iframe.src = playerUrl;
		this.getWidget(() => false);
	}
	async load(src, isStale) {
		this.currentIsStale = isStale;
		const widget = await this.getWidget(isStale);
		if (!widget || isStale()) return false;
		if (this.loadedSrc === src) {
			this.emitDuration(widget, isStale);
			return true;
		}
		if (this.loadingSrc === src && this.loadingPromise) return this.loadingPromise;
		const loadId = this.loadId += 1;
		this.loadedDuration = 0;
		this.preparedSrc = src;
		this.loadingSrc = src;
		this.loadingPromise = new Promise((resolve) => {
			let settled = false;
			const timeout = window.setTimeout(() => settle(false), SOUNDCLOUD_LOAD_TIMEOUT);
			const settle = (ready) => {
				if (settled) return;
				settled = true;
				window.clearTimeout(timeout);
				resolve(ready);
			};
			widget.load(src, {
				auto_play: false,
				callback: () => settle(true)
			});
		});
		const loaded = await this.loadingPromise;
		if (this.loadingSrc === src) {
			this.loadingPromise = null;
			this.loadingSrc = "";
		}
		if (!loaded || isStale() || loadId !== this.loadId) return false;
		this.loadedSrc = src;
		this.emitDuration(widget, isStale);
		return true;
	}
	async waitUntilReady(src, isStale) {
		this.currentIsStale = isStale;
		if (!await this.getWidget(isStale) || isStale()) return false;
		if (this.loadedSrc === src) return true;
		const ready = await this.readyPromise;
		return Boolean(ready && !isStale() && this.loadedSrc === src);
	}
	pause(options = {}) {
		if (options.silent) this.silentPause = true;
		this.resolvePlay?.(false);
		this.resolvePlay = null;
		this.widget?.pause();
	}
	async play(isStale) {
		this.currentIsStale = isStale;
		if (!this.widget || isStale()) return false;
		this.silentPause = false;
		return new Promise((resolve) => {
			let settled = false;
			const timeout = window.setTimeout(() => settle(false), SOUNDCLOUD_PLAY_TIMEOUT);
			const settle = (played) => {
				if (settled) return;
				settled = true;
				window.clearTimeout(timeout);
				this.resolvePlay = null;
				resolve(played);
			};
			this.resolvePlay = settle;
			this.widget?.play();
		});
	}
	requestPosition(isStale) {
		this.currentIsStale = isStale;
		this.widget?.getPosition((position) => {
			if (!isStale()) this.callbacks.onProgress(position / 1e3);
			this.callbacks.onPositionRequestComplete();
		});
	}
	seek(seconds) {
		this.widget?.seekTo(Math.max(0, seconds) * 1e3);
	}
	setVolume(volume) {
		this.widget?.setVolume(Math.max(0, Math.min(100, volume * 100)));
	}
	async getWidget(isStale) {
		if (this.widget) return this.widget;
		const api = await getSoundCloudApi();
		if (isStale()) return null;
		const widget = api.Widget(this.iframe);
		this.widget = widget;
		this.bindEvents(api, widget);
		this.readyPromise = new Promise((resolve) => {
			let settled = false;
			const timeout = window.setTimeout(() => settle(false), SOUNDCLOUD_READY_TIMEOUT);
			const settle = (ready) => {
				if (settled) return;
				settled = true;
				window.clearTimeout(timeout);
				this.resolveReady = null;
				resolve(ready);
			};
			this.resolveReady = settle;
		});
		widget.bind(api.Widget.Events.READY, () => {
			if (this.isStale() || widget !== this.widget) return;
			this.loadedSrc = this.preparedSrc;
			widget.getDuration((duration) => {
				if (this.isStale() || widget !== this.widget) return;
				this.loadedDuration = duration / 1e3;
				this.callbacks.onDuration(this.loadedDuration);
			});
			this.requestPosition(this.currentIsStale);
			this.resolveReady?.(true);
		});
		return widget;
	}
	bindEvents(api, widget) {
		if (this.eventsBound) return;
		this.eventsBound = true;
		widget.bind(api.Widget.Events.PLAY, () => {
			if (this.isStale() || widget !== this.widget) return;
			this.silentPause = false;
			this.resolvePlay?.(true);
			this.callbacks.onPlay();
		});
		widget.bind(api.Widget.Events.PLAY_PROGRESS, (event) => {
			if (this.isStale() || widget !== this.widget) return;
			if (event && typeof event === "object") {
				if ("currentPosition" in event && typeof event.currentPosition === "number") this.callbacks.onProgress(event.currentPosition / 1e3);
				if ("relativePosition" in event && typeof event.relativePosition === "number") this.callbacks.onRelativeProgress(event.relativePosition);
			}
		});
		widget.bind(api.Widget.Events.PAUSE, () => {
			if (this.isStale() || widget !== this.widget) return;
			if (this.silentPause) {
				this.silentPause = false;
				return;
			}
			this.callbacks.onPause();
		});
		widget.bind(api.Widget.Events.FINISH, () => {
			if (this.isStale() || widget !== this.widget) return;
			this.callbacks.onFinish();
		});
	}
	isStale() {
		return this.currentIsStale();
	}
	emitDuration(widget, isStale) {
		if (this.loadedDuration > 0) this.callbacks.onDuration(this.loadedDuration);
		widget.getDuration((duration) => {
			if (isStale()) return;
			this.loadedDuration = duration / 1e3;
			this.callbacks.onDuration(this.loadedDuration);
		});
	}
};
//#endregion
//#region src/lib/soundcloud-track.ts
var SoundCloudPlayableTrack = class extends JukettePlayableTrack {
	iframe;
	adapter;
	position = 0;
	positionRequested = false;
	constructor(track, iframe, callbacks) {
		super(track, callbacks);
		this.iframe = iframe;
		this.adapter = new SoundCloudAdapter(iframe, {
			onDuration: (duration) => {
				this.durationValue = duration;
				this.callbacks.onDuration(duration);
				this.callbacks.onProgress(this.position, this.durationValue);
			},
			onFinish: () => this.callbacks.onFinish(),
			onPause: () => this.callbacks.onPause(),
			onPlay: () => this.callbacks.onPlay(),
			onPositionRequestComplete: () => {
				this.positionRequested = false;
			},
			onProgress: (position) => {
				this.position = position;
				this.positionRequested = false;
				this.callbacks.onProgress(this.position, this.durationValue);
			},
			onRelativeProgress: (relativePosition) => {
				if (this.durationValue <= 0) return;
				this.position = relativePosition * this.durationValue;
				this.callbacks.onProgress(this.position, this.durationValue);
			}
		});
	}
	get currentTime() {
		return this.position;
	}
	setActive(active) {
		this.iframe.toggleAttribute("data-active", active);
	}
	load(options) {
		this.position = 0;
		this.callbacks.onProgress(0, this.durationValue);
		if (!options.silent) this.callbacks.onStatus("Preparing SoundCloud");
		this.adapter.prepare(this.track.src);
	}
	async play(options) {
		this.callbacks.onStatus("Loading SoundCloud");
		if (!this.adapter.isLoaded(this.track.src)) {
			let didLoad;
			try {
				didLoad = this.adapter.isPrepared(this.track.src) ? await this.adapter.waitUntilReady(this.track.src, options.isStale) : await this.adapter.load(this.track.src, options.isStale);
			} catch {
				didLoad = false;
			}
			if (options.isStale()) return false;
			if (!didLoad) {
				this.callbacks.onStatus("SoundCloud unavailable");
				return false;
			}
		}
		this.adapter.setVolume(options.volume);
		if (options.restart) this.seek(0);
		this.callbacks.onStatus("Starting SoundCloud");
		const played = await this.adapter.play(options.isStale);
		if (options.isStale()) return false;
		if (!played) {
			this.callbacks.onStatus("SoundCloud did not start");
			return false;
		}
		return true;
	}
	pause(options = {}) {
		this.adapter.pause(options);
	}
	seek(seconds) {
		this.position = Math.max(0, seconds);
		this.adapter.seek(this.position);
		this.callbacks.onProgress(this.position, this.durationValue);
	}
	setVolume(volume) {
		this.adapter.setVolume(volume);
	}
	requestPosition(isStale) {
		if (this.positionRequested) return;
		this.positionRequested = true;
		window.setTimeout(() => {
			if (!isStale()) this.positionRequested = false;
		}, 500);
		this.adapter.requestPosition(isStale);
	}
};
//#endregion
//#region src/lib/player-soundcloud-frames.ts
var JuketteSoundCloudFrameController = class {
	options;
	frames = /* @__PURE__ */ new Map();
	constructor(options) {
		this.options = options;
	}
	getPlayableTrack(track) {
		const key = this.options.getTrackKey(track);
		const cachedTrack = this.frames.get(key);
		if (cachedTrack) return cachedTrack;
		const playableTrack = new SoundCloudPlayableTrack(track, this.createIframe(), this.options.createCallbacks(track));
		this.frames.set(key, playableTrack);
		return playableTrack;
	}
	sync() {
		const playlistKeys = /* @__PURE__ */ new Set();
		const currentTrack = this.options.getCurrentTrack();
		const activeKey = currentTrack && inferTrackType(currentTrack) === "soundcloud" ? this.options.getTrackKey(currentTrack) : "";
		for (const track of this.options.getTracks()) {
			if (inferTrackType(track) !== "soundcloud") continue;
			const key = this.options.getTrackKey(track);
			playlistKeys.add(key);
			if (!track.preload) continue;
			this.getPlayableTrack(track).load({
				metadataPreloadId: this.options.getMetadataPreloadId(),
				restart: false,
				silent: key !== activeKey,
				volume: this.options.getVolume()
			});
		}
		for (const [key, track] of this.frames) {
			const active = key === activeKey;
			track.setActive(active);
			if (playlistKeys.has(key) || active) continue;
			track.stop();
			track.iframe.remove();
			this.frames.delete(key);
		}
	}
	deactivateAll() {
		for (const track of this.frames.values()) track.setActive(false);
	}
	dispose() {
		for (const track of this.frames.values()) {
			track.stop();
			track.iframe.remove();
		}
		this.frames.clear();
	}
	createIframe() {
		const iframe = document.createElement("iframe");
		iframe.className = "soundcloud";
		iframe.part.add("soundcloud");
		iframe.title = "SoundCloud player";
		iframe.allow = "autoplay";
		this.options.playerElement.insertBefore(iframe, this.options.audio);
		return iframe;
	}
};
//#endregion
//#region src/lib/player.ts
var JukettePlayerElement = class extends HTMLElementBase {
	static observedAttributes = [
		"src",
		ATTR_PLAYLIST,
		ATTR_PLAYLIST_OPEN,
		ATTR_PRELOAD_METADATA,
		ATTR_PREFER_MEDIA_METADATA,
		ATTR_MIDI_OSCILLATOR,
		ATTR_TRACK_INDEX
	];
	dom;
	metadataController;
	progressController;
	soundCloudFrameController;
	tracks = [];
	index = 0;
	desiredPlaying = false;
	playing = false;
	trackLoadId = 0;
	duration = 0;
	activePlayableTrack = null;
	restartOnNextPlay = false;
	trackObserver = null;
	playlistOverride = null;
	loadedTrackKey = "";
	constructor() {
		super();
		if (typeof MutationObserver !== "undefined") this.trackObserver = new MutationObserver(() => this.syncChildTracks());
		this.dom = createJukettePlayerDom(this);
		this.metadataController = new JuketteMetadataController({
			getPreloadMetadata: () => this.preloadMetadata,
			getTrackKey: (track) => this.getTrackKey(track),
			getTracks: () => this.tracks,
			isCurrentTrack: (track) => this.isCurrentTrack(track),
			onCurrentTrackDisplayChange: () => this.renderCurrentTrack(),
			onPlaylistDisplayChange: () => this.renderPlaylist(),
			trackPrefersMediaMetadata: (track) => this.trackPrefersMediaMetadata(track)
		});
		this.progressController = new JuketteProgressController({
			dom: this.dom,
			getCurrentTime: () => this.getCurrentTime(),
			getDuration: () => this.duration,
			getPlaying: () => this.playing,
			isSoundCloudTrack: () => inferTrackType(this.currentTrack ?? { src: "" }) === "soundcloud",
			requestSoundCloudPosition: () => this.requestSoundCloudPosition()
		});
		this.soundCloudFrameController = new JuketteSoundCloudFrameController({
			audio: this.dom.audio,
			createCallbacks: (track) => this.createPlayableCallbacks(track),
			getCurrentTrack: () => this.currentTrack,
			getMetadataPreloadId: () => this.metadataController.metadataPreloadId,
			getTrackKey: (track) => this.getTrackKey(track),
			getTracks: () => this.tracks,
			getVolume: () => Number(this.dom.volumeInput.value),
			playerElement: this.dom.playerElement
		});
		this.dom.playButton.addEventListener("click", () => this.toggle());
		this.dom.previousButton.addEventListener("click", () => this.previous());
		this.dom.nextButton.addEventListener("click", () => this.next());
		this.dom.playlistButton.addEventListener("click", () => this.togglePlaylist());
		this.dom.volumeInput.addEventListener("input", () => this.syncVolume());
		this.dom.seekInput.addEventListener("input", () => this.seekFromInput());
		this.dom.audio.addEventListener("loadedmetadata", () => this.syncAudio());
		this.dom.audio.addEventListener("timeupdate", () => this.syncAudio());
		this.dom.audio.addEventListener("ended", () => this.finishTrack());
	}
	connectedCallback() {
		this.trackObserver?.observe(this, {
			attributeFilter: [
				ATTR_ARTIST,
				ATTR_PREFER_MEDIA_METADATA,
				ATTR_PRELOAD,
				"src",
				ATTR_TITLE,
				ATTR_TYPE
			],
			attributes: true,
			childList: true,
			subtree: true
		});
		this.syncTracks();
		this.syncPlaylistButton();
		this.loadTrack();
	}
	disconnectedCallback() {
		this.trackObserver?.disconnect();
		this.stopProgressLoop();
		this.activePlayableTrack?.stop();
		this.soundCloudFrameController.dispose();
	}
	attributeChangedCallback(name, oldValue, newValue) {
		if (oldValue === newValue) return;
		if (name === "preload-metadata" || name === "prefer-media-metadata") {
			this.renderCurrentTrack();
			this.renderPlaylist();
			this.preloadPlaylistMetadata();
			this.syncSoundCloudFrames();
			return;
		}
		if (name === "playlist-open") {
			const open = newValue !== null;
			this.syncPlaylistButton();
			this.emitJuketteEvent("jukette:playlisttoggle", { open });
			return;
		}
		this.syncTracks();
		this.loadTrack();
	}
	get currentTrack() {
		return this.tracks[this.index] ?? null;
	}
	get currentTrackIndex() {
		return this.index;
	}
	get currentTime() {
		return this.getCurrentTime();
	}
	set currentTime(seconds) {
		this.seek(seconds);
	}
	get playlist() {
		return [...this.tracks];
	}
	get playlistOpen() {
		return this.hasAttribute(ATTR_PLAYLIST_OPEN);
	}
	set playlistOpen(open) {
		this.toggleAttribute(ATTR_PLAYLIST_OPEN, open);
	}
	get totalTracks() {
		return this.tracks.length;
	}
	get preloadMetadata() {
		return this.hasAttribute(ATTR_PRELOAD_METADATA);
	}
	set preloadMetadata(preload) {
		this.toggleAttribute(ATTR_PRELOAD_METADATA, preload);
	}
	get preferMediaMetadata() {
		return this.hasAttribute(ATTR_PREFER_MEDIA_METADATA);
	}
	set preferMediaMetadata(prefer) {
		this.toggleAttribute(ATTR_PREFER_MEDIA_METADATA, prefer);
	}
	get midiOscillator() {
		return normalizeMidiOscillator(this.getAttribute(ATTR_MIDI_OSCILLATOR));
	}
	set midiOscillator(oscillator) {
		this.setAttribute(ATTR_MIDI_OSCILLATOR, oscillator);
	}
	set playlist(tracks) {
		this.playlistOverride = tracks.map((track) => normalizeTrack(track)).filter((track) => track !== null);
		this.tracks = [...this.playlistOverride];
		this.index = 0;
		this.renderPlaylist();
		this.preloadPlaylistMetadata();
		this.syncSoundCloudFrames();
		this.loadTrack();
	}
	async play() {
		const track = this.currentTrack;
		if (!track) return;
		this.desiredPlaying = true;
		const trackLoadId = this.trackLoadId;
		const type = inferTrackType(track);
		const played = await this.activePlayableTrack?.play({
			isStale: () => trackLoadId !== this.trackLoadId,
			restart: this.restartOnNextPlay,
			volume: Number(this.dom.volumeInput.value)
		});
		this.restartOnNextPlay = false;
		if (trackLoadId !== this.trackLoadId) return;
		if (played) this.playing = true;
		this.syncPlayingState();
		if (type !== "soundcloud") this.emitJuketteEvent("jukette:play");
	}
	pause() {
		const wasPlaying = this.playing || this.desiredPlaying;
		this.setStatus();
		this.desiredPlaying = false;
		this.activePlayableTrack?.pause();
		this.playing = false;
		this.syncPlayingState();
		if (wasPlaying) this.emitJuketteEvent("jukette:pause");
	}
	toggle() {
		if (this.playing) {
			this.pause();
			return;
		}
		this.play();
	}
	next() {
		if (this.tracks.length === 0) return;
		const fromIndex = this.index;
		const shouldPlay = this.desiredPlaying || this.playing;
		this.index = (this.index + 1) % this.tracks.length;
		this.restartOnNextPlay = true;
		this.loadTrack();
		this.emitJuketteEvent("jukette:next", {
			direction: "next",
			fromIndex,
			toIndex: this.index
		});
		if (shouldPlay) this.play();
	}
	previous() {
		if (this.tracks.length === 0) return;
		if (this.getCurrentTime() > 3) {
			this.restartOnNextPlay = true;
			this.seek(0);
			this.emitJuketteEvent("jukette:restart");
			if (this.desiredPlaying || this.playing) this.play();
			return;
		}
		const fromIndex = this.index;
		const shouldPlay = this.desiredPlaying || this.playing;
		this.index = (this.index - 1 + this.tracks.length) % this.tracks.length;
		this.restartOnNextPlay = true;
		this.loadTrack();
		this.emitJuketteEvent("jukette:previous", {
			direction: "previous",
			fromIndex,
			toIndex: this.index
		});
		if (shouldPlay) this.play();
	}
	seek(seconds) {
		const track = this.currentTrack;
		if (!track) return;
		this.setStatus("Seeking");
		this.activePlayableTrack?.seek(seconds);
		if (this.playing && inferTrackType(track) === "midi") this.play();
		this.syncProgress(seconds, this.duration);
		this.emitJuketteEvent("jukette:seek");
		window.setTimeout(() => {
			if (this.playing || !this.desiredPlaying) this.setStatus();
		}, 500);
	}
	getCurrentTime() {
		if (!this.currentTrack) return 0;
		return this.activePlayableTrack?.currentTime ?? 0;
	}
	getJuketteEventDetail(detail = {}) {
		return createJuketteEventDetail({
			currentTime: this.getCurrentTime(),
			duration: this.duration,
			index: this.index,
			playing: this.playing,
			playlistOpen: this.playlistOpen,
			track: this.currentTrack,
			tracks: this.tracks,
			volume: Number(this.dom.volumeInput.value),
			...detail
		});
	}
	emitJuketteEvent(name, detail = {}) {
		if (typeof CustomEvent === "undefined") return;
		this.dispatchEvent(new CustomEvent(name, {
			bubbles: true,
			composed: true,
			detail: this.getJuketteEventDetail(detail)
		}));
	}
	syncTracks() {
		const childTracks = this.getChildTracks();
		const attributeTracks = parsePlaylist(this.getAttribute(ATTR_PLAYLIST));
		const singleTrack = normalizeTrack(this.getAttribute("src") ?? void 0);
		this.tracks = this.playlistOverride ?? (childTracks.length > 0 ? childTracks : attributeTracks.length > 0 ? attributeTracks : singleTrack ? [singleTrack] : []);
		const nextIndex = Number(this.getAttribute(ATTR_TRACK_INDEX));
		this.index = Number.isInteger(nextIndex) && nextIndex >= 0 ? Math.min(nextIndex, Math.max(0, this.tracks.length - 1)) : Math.min(this.index, Math.max(0, this.tracks.length - 1));
		this.renderPlaylist();
		this.preloadPlaylistMetadata();
		this.syncSoundCloudFrames();
	}
	syncChildTracks() {
		if (this.playlistOverride) return;
		const currentTrack = this.currentTrack;
		this.syncTracks();
		if (this.currentTrack?.src === currentTrack?.src) {
			this.renderPlaylist();
			return;
		}
		this.loadTrack();
		if (this.playing) this.play();
	}
	getChildTracks() {
		return Array.from(this.children).map((element) => trackFromElement(element)).filter((track) => track !== null);
	}
	createPlayableTrack(track) {
		const callbacks = this.createPlayableCallbacks(track);
		const type = inferTrackType(track);
		if (type === "audio") return new AudioPlayableTrack(track, this.dom.audio, callbacks);
		if (type === "midi") return new MidiPlayableTrack(track, callbacks, () => this.midiOscillator);
		return this.getSoundCloudPlayableTrack(track);
	}
	getSoundCloudPlayableTrack(track) {
		return this.soundCloudFrameController.getPlayableTrack(track);
	}
	createPlayableCallbacks(track) {
		const isCurrentTrack = () => this.currentTrack !== null && this.getTrackKey(this.currentTrack) === this.getTrackKey(track);
		return {
			onDuration: (duration) => {
				this.metadataController.setDuration(track, duration);
				if (!isCurrentTrack()) return;
				this.duration = duration;
				this.syncProgress(this.getCurrentTime(), this.duration);
			},
			onFinish: () => {
				if (isCurrentTrack()) this.finishTrack();
			},
			onMetadata: (metadata, metadataPreloadId) => {
				if (metadataPreloadId !== void 0 && metadataPreloadId !== this.metadataController.metadataPreloadId) return;
				if (!this.trackPrefersMediaMetadata(track)) return;
				this.metadataController.setMetadata(track, metadata);
			},
			onPause: () => {
				if (!isCurrentTrack()) return;
				const wasPlaying = this.playing || this.desiredPlaying;
				this.desiredPlaying = false;
				this.playing = false;
				this.syncPlayingState();
				if (wasPlaying) this.emitJuketteEvent("jukette:pause");
			},
			onPlay: () => {
				if (!isCurrentTrack()) return;
				this.desiredPlaying = true;
				this.playing = true;
				this.syncPlayingState();
				this.emitJuketteEvent("jukette:play");
			},
			onProgress: (currentTime, duration) => {
				if (!isCurrentTrack()) return;
				this.syncProgress(currentTime, duration);
			},
			onStatus: (message = "") => {
				if (isCurrentTrack()) this.setStatus(message);
			}
		};
	}
	syncSoundCloudFrames() {
		this.soundCloudFrameController.sync();
	}
	loadTrack() {
		this.trackLoadId += 1;
		const previousTrackKey = this.loadedTrackKey;
		this.activePlayableTrack?.stop();
		this.activePlayableTrack = null;
		this.playing = false;
		this.duration = 0;
		this.syncProgress(0, 0);
		const track = this.currentTrack;
		if (!track) {
			this.loadedTrackKey = "";
			this.dom.titleElement.textContent = "No track";
			this.dom.metaElement.textContent = "";
			this.dom.statusElement.textContent = "";
			this.dom.playButton.disabled = true;
			if (previousTrackKey) this.emitJuketteEvent("jukette:trackchange");
			return;
		}
		const type = inferTrackType(track);
		const trackKey = this.getTrackKey(track);
		this.loadedTrackKey = trackKey;
		this.duration = this.getTrackDuration(track) ?? 0;
		this.dataset.kind = type;
		this.dom.playButton.disabled = false;
		this.renderCurrentTrack();
		this.setStatus();
		this.syncProgress(0, this.duration);
		this.activePlayableTrack = this.createPlayableTrack(track);
		if (this.activePlayableTrack instanceof SoundCloudPlayableTrack) this.syncSoundCloudFrames();
		else this.soundCloudFrameController.deactivateAll();
		this.activePlayableTrack.load({
			metadataPreloadId: this.metadataController.metadataPreloadId,
			restart: this.restartOnNextPlay,
			volume: Number(this.dom.volumeInput.value)
		});
		this.renderPlaylist();
		this.syncPlayingState();
		if (trackKey !== previousTrackKey) this.emitJuketteEvent("jukette:trackchange");
	}
	renderPlaylist() {
		renderPlaylist({
			currentIndex: this.index,
			element: this.dom.playlistElement,
			formatTime,
			getDisplay: (track) => this.getTrackDisplay(track),
			getDuration: (track) => this.getTrackDuration(track),
			onSelect: (index) => this.selectPlaylistTrack(index),
			tracks: this.tracks
		});
	}
	selectPlaylistTrack(index) {
		this.desiredPlaying = true;
		this.restartOnNextPlay = true;
		if (index === this.index) {
			this.seek(0);
			this.play();
			return;
		}
		this.index = index;
		this.loadTrack();
		this.play();
	}
	getTrackDuration(track) {
		return this.metadataController.getDuration(track);
	}
	getTrackKey(track) {
		return `${inferTrackType(track)}:${track.src}`;
	}
	isCurrentTrack(track) {
		return this.currentTrack !== null && this.getTrackKey(this.currentTrack) === this.getTrackKey(track);
	}
	trackPrefersMediaMetadata(track) {
		return track.preferMediaMetadata ?? this.preferMediaMetadata;
	}
	getTrackDisplay(track) {
		return this.metadataController.getDisplay(track);
	}
	renderCurrentTrack() {
		const track = this.currentTrack;
		if (!track) return;
		const display = this.getTrackDisplay(track);
		this.dom.titleElement.textContent = display.title;
		this.dom.metaElement.textContent = display.artist || inferTrackType(track);
	}
	preloadPlaylistMetadata() {
		this.metadataController.preloadPlaylistMetadata();
	}
	togglePlaylist() {
		this.playlistOpen = !this.playlistOpen;
	}
	syncPlaylistButton() {
		this.dom.playlistButton.setAttribute("aria-pressed", String(this.playlistOpen));
	}
	syncVolume() {
		this.activePlayableTrack?.setVolume(Number(this.dom.volumeInput.value));
		this.emitJuketteEvent("jukette:volumechange");
	}
	seekFromInput() {
		if (!this.duration) return;
		this.seek(Number(this.dom.seekInput.value) / 1e3 * this.duration);
	}
	syncAudio() {
		if (this.activePlayableTrack instanceof AudioPlayableTrack) this.activePlayableTrack.syncFromMedia();
		if (!this.playing) this.setStatus();
	}
	syncProgress(currentTime, duration) {
		this.progressController.syncProgress(currentTime, duration);
	}
	syncPlayingState() {
		this.progressController.syncPlayingState();
	}
	setStatus(message = "") {
		this.progressController.setStatus(message);
	}
	finishTrack() {
		this.emitJuketteEvent("jukette:ended");
		this.next();
	}
	stopProgressLoop() {
		this.progressController.stop();
	}
	requestSoundCloudPosition() {
		const trackLoadId = this.trackLoadId;
		this.activePlayableTrack?.requestPosition(() => trackLoadId !== this.trackLoadId);
	}
};
//#endregion
//#region src/lib/elements.ts
var defineJuketteElement = () => {
	if (typeof customElements === "undefined") return;
	if (!customElements.get("jukette-track")) customElements.define("jukette-track", JuketteTrackElement);
	if (!customElements.get("jukette-player")) customElements.define("jukette-player", JukettePlayerElement);
};
var JuketteTrackElement = class extends HTMLElementBase {};
//#endregion
//#region src/lib/auto.ts
defineJuketteElement();
//#endregion
