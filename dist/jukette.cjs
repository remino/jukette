/*! jukette v0.3.0 | (c) 2026 Rémino Rem <https://remino.net/> | ISC Licence */
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
//#region \0rolldown/runtime.js
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJSMin = (cb, mod) => () => (mod || (cb((mod = { exports: {} }).exports, mod), cb = null), mod.exports);
var __exportAll = (all, no_symbols) => {
	let target = {};
	for (var name in all) __defProp(target, name, {
		get: all[name],
		enumerable: true
	});
	if (!no_symbols) __defProp(target, Symbol.toStringTag, { value: "Module" });
	return target;
};
var __copyProps = (to, from, except, desc) => {
	if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
		key = keys[i];
		if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
			get: ((k) => from[k]).bind(null, key),
			enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
		});
	}
	return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", {
	value: mod,
	enumerable: true
}) : target, mod));
var __toCommonJS = (mod) => __hasOwnProp.call(mod, "module.exports") ? mod["module.exports"] : __copyProps(__defProp({}, "__esModule", { value: true }), mod);
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
	stop() {
		this.pause({ silent: true });
	}
	requestPosition(_isStale) {}
};
//#endregion
//#region src/lib/backend-registry.ts
var backends = /* @__PURE__ */ new Map();
var registrationListeners = /* @__PURE__ */ new Set();
var getRegisteredJuketteBackends = () => Array.from(backends.values());
var getJuketteBackend = (type) => backends.get(type);
var registerJuketteBackend = (backend) => {
	backends.set(backend.type, backend);
	for (const listener of registrationListeners) listener(backend);
	return backend;
};
var resetJuketteBackends = () => {
	backends.clear();
	registrationListeners.clear();
};
var subscribeJuketteBackendRegistrations = (listener) => {
	registrationListeners.add(listener);
	return () => {
		registrationListeners.delete(listener);
	};
};
var resolveJuketteBackend = (track) => {
	if (track.type) return getJuketteBackend(track.type);
	for (const backend of getRegisteredJuketteBackends().sort((left, right) => (right.priority ?? 0) - (left.priority ?? 0))) if (backend.inferTrackType?.(track) === backend.type) return backend;
};
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
		const onCanPlay = () => {
			this.audio.removeEventListener("canplay", onCanPlay);
			this.callbacks.onReady();
			if (!this.audio.paused) this.callbacks.onStatus();
		};
		const onError = () => {
			this.audio.removeEventListener("canplay", onCanPlay);
			this.audio.removeEventListener("error", onError);
			this.callbacks.onStatus("Audio failed to load");
		};
		this.audio.removeEventListener("canplay", onCanPlay);
		this.audio.removeEventListener("error", onError);
		this.audio.addEventListener("canplay", onCanPlay, { once: true });
		this.audio.addEventListener("error", onError, { once: true });
		this.audio.src = this.track.src;
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
	stop() {
		this.audio.pause();
	}
	requestPosition() {
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
//#region src/lib/audio-backend.ts
var juketteAudioBackend = {
	createPlayableTrack(track, callbacks, options) {
		return new AudioPlayableTrack(track, options.audioElement, callbacks);
	},
	inferTrackType(track) {
		return /\.(?:mid|midi)(?:[?#].*)?$/i.test(track.src) ? null : "audio";
	},
	preloadTrack: async (track, options) => {
		const result = {};
		if (options.preloadDuration && typeof Audio !== "undefined") {
			const duration = await new Promise((resolve) => {
				const audio = new Audio();
				const cleanup = () => {
					audio.removeEventListener("loadedmetadata", onLoadedMetadata);
					audio.removeEventListener("error", onError);
					audio.removeAttribute("src");
					audio.load();
				};
				const onError = () => {
					cleanup();
					resolve(void 0);
				};
				const onLoadedMetadata = () => {
					const nextDuration = Number.isFinite(audio.duration) ? audio.duration : void 0;
					cleanup();
					resolve(nextDuration);
				};
				audio.preload = "metadata";
				audio.addEventListener("loadedmetadata", onLoadedMetadata);
				audio.addEventListener("error", onError, { once: true });
				audio.src = track.src;
				audio.load();
			});
			if (duration) result.duration = duration;
		}
		if (options.preloadMetadata && typeof fetch !== "undefined") {
			const response = await fetch(track.src, { headers: { Range: "bytes=0-65535" } });
			if (response.ok) result.metadata = parseAudioFileMetadata(await response.arrayBuffer());
		}
		return result.duration || result.metadata ? result : void 0;
	},
	type: "audio"
};
var registerJuketteAudioBackend = () => registerJuketteBackend(juketteAudioBackend);
//#endregion
//#region src/lib/dom.ts
var HTMLElementBase = globalThis.HTMLElement ?? class {};
//#endregion
//#region src/lib/attributes.ts
var ATTR_PLAYLIST = "playlist";
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
	for (const backend of getRegisteredJuketteBackends().sort((left, right) => (right.priority ?? 0) - (left.priority ?? 0))) {
		const inferredType = backend.inferTrackType?.(track);
		if (inferredType) return inferredType;
	}
	const source = track.src.toLowerCase();
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
	if (typeof value.type === "string" && value.type.trim()) track.type = value.type.trim();
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
//#region node_modules/midi-file/lib/midi-parser.js
var require_midi_parser = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	function parseMidi(data) {
		var p = new Parser(data);
		var headerChunk = p.readChunk();
		if (headerChunk.id != "MThd") throw "Bad MIDI file.  Expected 'MHdr', got: '" + headerChunk.id + "'";
		var header = parseHeader(headerChunk.data);
		var tracks = [];
		for (var i = 0; !p.eof() && i < header.numTracks; i++) {
			var trackChunk = p.readChunk();
			if (trackChunk.id != "MTrk") throw "Bad MIDI file.  Expected 'MTrk', got: '" + trackChunk.id + "'";
			var track = parseTrack(trackChunk.data);
			tracks.push(track);
		}
		return {
			header,
			tracks
		};
	}
	function parseHeader(data) {
		var p = new Parser(data);
		var result = {
			format: p.readUInt16(),
			numTracks: p.readUInt16()
		};
		var timeDivision = p.readUInt16();
		if (timeDivision & 32768) {
			result.framesPerSecond = 256 - (timeDivision >> 8);
			result.ticksPerFrame = timeDivision & 255;
		} else result.ticksPerBeat = timeDivision;
		return result;
	}
	function parseTrack(data) {
		var p = new Parser(data);
		var events = [];
		while (!p.eof()) {
			var event = readEvent();
			events.push(event);
		}
		return events;
		function readEvent() {
			var event = {};
			event.deltaTime = p.readVarInt();
			var eventTypeByte = p.readUInt8();
			if ((eventTypeByte & 240) === 240) if (eventTypeByte === 255) {
				event.meta = true;
				var metatypeByte = p.readUInt8();
				var length = p.readVarInt();
				switch (metatypeByte) {
					case 0:
						event.type = "sequenceNumber";
						if (length !== 2) throw "Expected length for sequenceNumber event is 2, got " + length;
						event.number = p.readUInt16();
						return event;
					case 1:
						event.type = "text";
						event.text = p.readString(length);
						return event;
					case 2:
						event.type = "copyrightNotice";
						event.text = p.readString(length);
						return event;
					case 3:
						event.type = "trackName";
						event.text = p.readString(length);
						return event;
					case 4:
						event.type = "instrumentName";
						event.text = p.readString(length);
						return event;
					case 5:
						event.type = "lyrics";
						event.text = p.readString(length);
						return event;
					case 6:
						event.type = "marker";
						event.text = p.readString(length);
						return event;
					case 7:
						event.type = "cuePoint";
						event.text = p.readString(length);
						return event;
					case 32:
						event.type = "channelPrefix";
						if (length != 1) throw "Expected length for channelPrefix event is 1, got " + length;
						event.channel = p.readUInt8();
						return event;
					case 33:
						event.type = "portPrefix";
						if (length != 1) throw "Expected length for portPrefix event is 1, got " + length;
						event.port = p.readUInt8();
						return event;
					case 47:
						event.type = "endOfTrack";
						if (length != 0) throw "Expected length for endOfTrack event is 0, got " + length;
						return event;
					case 81:
						event.type = "setTempo";
						if (length != 3) throw "Expected length for setTempo event is 3, got " + length;
						event.microsecondsPerBeat = p.readUInt24();
						return event;
					case 84:
						event.type = "smpteOffset";
						if (length != 5) throw "Expected length for smpteOffset event is 5, got " + length;
						var hourByte = p.readUInt8();
						event.frameRate = {
							0: 24,
							32: 25,
							64: 29,
							96: 30
						}[hourByte & 96];
						event.hour = hourByte & 31;
						event.min = p.readUInt8();
						event.sec = p.readUInt8();
						event.frame = p.readUInt8();
						event.subFrame = p.readUInt8();
						return event;
					case 88:
						event.type = "timeSignature";
						if (length != 2 && length != 4) throw "Expected length for timeSignature event is 4 or 2, got " + length;
						event.numerator = p.readUInt8();
						event.denominator = 1 << p.readUInt8();
						if (length === 4) {
							event.metronome = p.readUInt8();
							event.thirtyseconds = p.readUInt8();
						} else {
							event.metronome = 36;
							event.thirtyseconds = 8;
						}
						return event;
					case 89:
						event.type = "keySignature";
						if (length != 2) throw "Expected length for keySignature event is 2, got " + length;
						event.key = p.readInt8();
						event.scale = p.readUInt8();
						return event;
					case 127:
						event.type = "sequencerSpecific";
						event.data = p.readBytes(length);
						return event;
					default:
						event.type = "unknownMeta";
						event.data = p.readBytes(length);
						event.metatypeByte = metatypeByte;
						return event;
				}
			} else if (eventTypeByte == 240) {
				event.type = "sysEx";
				var length = p.readVarInt();
				event.data = p.readBytes(length);
				return event;
			} else if (eventTypeByte == 247) {
				event.type = "endSysEx";
				var length = p.readVarInt();
				event.data = p.readBytes(length);
				return event;
			} else throw "Unrecognised MIDI event type byte: " + eventTypeByte;
			else {
				var param1;
				if ((eventTypeByte & 128) === 0) {
					if (lastEventTypeByte === null) throw "Running status byte encountered before status byte";
					param1 = eventTypeByte;
					eventTypeByte = lastEventTypeByte;
					event.running = true;
				} else {
					param1 = p.readUInt8();
					lastEventTypeByte = eventTypeByte;
				}
				var eventType = eventTypeByte >> 4;
				event.channel = eventTypeByte & 15;
				switch (eventType) {
					case 8:
						event.type = "noteOff";
						event.noteNumber = param1;
						event.velocity = p.readUInt8();
						return event;
					case 9:
						var velocity = p.readUInt8();
						event.type = velocity === 0 ? "noteOff" : "noteOn";
						event.noteNumber = param1;
						event.velocity = velocity;
						if (velocity === 0) event.byte9 = true;
						return event;
					case 10:
						event.type = "noteAftertouch";
						event.noteNumber = param1;
						event.amount = p.readUInt8();
						return event;
					case 11:
						event.type = "controller";
						event.controllerType = param1;
						event.value = p.readUInt8();
						return event;
					case 12:
						event.type = "programChange";
						event.programNumber = param1;
						return event;
					case 13:
						event.type = "channelAftertouch";
						event.amount = param1;
						return event;
					case 14:
						event.type = "pitchBend";
						event.value = param1 + (p.readUInt8() << 7) - 8192;
						return event;
					default: throw "Unrecognised MIDI event type: " + eventType;
				}
			}
		}
		var lastEventTypeByte;
	}
	function Parser(data) {
		this.buffer = data;
		this.bufferLen = this.buffer.length;
		this.pos = 0;
	}
	Parser.prototype.eof = function() {
		return this.pos >= this.bufferLen;
	};
	Parser.prototype.readUInt8 = function() {
		var result = this.buffer[this.pos];
		this.pos += 1;
		return result;
	};
	Parser.prototype.readInt8 = function() {
		var u = this.readUInt8();
		if (u & 128) return u - 256;
		else return u;
	};
	Parser.prototype.readUInt16 = function() {
		var b0 = this.readUInt8(), b1 = this.readUInt8();
		return (b0 << 8) + b1;
	};
	Parser.prototype.readInt16 = function() {
		var u = this.readUInt16();
		if (u & 32768) return u - 65536;
		else return u;
	};
	Parser.prototype.readUInt24 = function() {
		var b0 = this.readUInt8(), b1 = this.readUInt8(), b2 = this.readUInt8();
		return (b0 << 16) + (b1 << 8) + b2;
	};
	Parser.prototype.readInt24 = function() {
		var u = this.readUInt24();
		if (u & 8388608) return u - 16777216;
		else return u;
	};
	Parser.prototype.readUInt32 = function() {
		var b0 = this.readUInt8(), b1 = this.readUInt8(), b2 = this.readUInt8(), b3 = this.readUInt8();
		return (b0 << 24) + (b1 << 16) + (b2 << 8) + b3;
	};
	Parser.prototype.readBytes = function(len) {
		var bytes = this.buffer.slice(this.pos, this.pos + len);
		this.pos += len;
		return bytes;
	};
	Parser.prototype.readString = function(len) {
		var bytes = this.readBytes(len);
		return String.fromCharCode.apply(null, bytes);
	};
	Parser.prototype.readVarInt = function() {
		var result = 0;
		while (!this.eof()) {
			var b = this.readUInt8();
			if (b & 128) {
				result += b & 127;
				result <<= 7;
			} else return result + b;
		}
		return result;
	};
	Parser.prototype.readChunk = function() {
		var id = this.readString(4);
		var length = this.readUInt32();
		return {
			id,
			length,
			data: this.readBytes(length)
		};
	};
	module.exports = parseMidi;
}));
//#endregion
//#region node_modules/midi-file/lib/midi-writer.js
var require_midi_writer = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	function writeMidi(data, opts) {
		if (typeof data !== "object") throw "Invalid MIDI data";
		opts = opts || {};
		var header = data.header || {};
		var tracks = data.tracks || [];
		var i, len = tracks.length;
		var w = new Writer();
		writeHeader(w, header, len);
		for (i = 0; i < len; i++) writeTrack(w, tracks[i], opts);
		return w.buffer;
	}
	function writeHeader(w, header, numTracks) {
		var format = header.format == null ? 1 : header.format;
		var timeDivision = 128;
		if (header.timeDivision) timeDivision = header.timeDivision;
		else if (header.ticksPerFrame && header.framesPerSecond) timeDivision = -(header.framesPerSecond & 255) << 8 | header.ticksPerFrame & 255;
		else if (header.ticksPerBeat) timeDivision = header.ticksPerBeat & 32767;
		var h = new Writer();
		h.writeUInt16(format);
		h.writeUInt16(numTracks);
		h.writeUInt16(timeDivision);
		w.writeChunk("MThd", h.buffer);
	}
	function writeTrack(w, track, opts) {
		var t = new Writer();
		var i, len = track.length;
		var eventTypeByte = null;
		for (i = 0; i < len; i++) {
			if (opts.running === false || !opts.running && !track[i].running) eventTypeByte = null;
			eventTypeByte = writeEvent(t, track[i], eventTypeByte, opts.useByte9ForNoteOff);
		}
		w.writeChunk("MTrk", t.buffer);
	}
	function writeEvent(w, event, lastEventTypeByte, useByte9ForNoteOff) {
		var type = event.type;
		var deltaTime = event.deltaTime;
		var text = event.text || "";
		var data = event.data || [];
		var eventTypeByte = null;
		w.writeVarInt(deltaTime);
		switch (type) {
			case "sequenceNumber":
				w.writeUInt8(255);
				w.writeUInt8(0);
				w.writeVarInt(2);
				w.writeUInt16(event.number);
				break;
			case "text":
				w.writeUInt8(255);
				w.writeUInt8(1);
				w.writeVarInt(text.length);
				w.writeString(text);
				break;
			case "copyrightNotice":
				w.writeUInt8(255);
				w.writeUInt8(2);
				w.writeVarInt(text.length);
				w.writeString(text);
				break;
			case "trackName":
				w.writeUInt8(255);
				w.writeUInt8(3);
				w.writeVarInt(text.length);
				w.writeString(text);
				break;
			case "instrumentName":
				w.writeUInt8(255);
				w.writeUInt8(4);
				w.writeVarInt(text.length);
				w.writeString(text);
				break;
			case "lyrics":
				w.writeUInt8(255);
				w.writeUInt8(5);
				w.writeVarInt(text.length);
				w.writeString(text);
				break;
			case "marker":
				w.writeUInt8(255);
				w.writeUInt8(6);
				w.writeVarInt(text.length);
				w.writeString(text);
				break;
			case "cuePoint":
				w.writeUInt8(255);
				w.writeUInt8(7);
				w.writeVarInt(text.length);
				w.writeString(text);
				break;
			case "channelPrefix":
				w.writeUInt8(255);
				w.writeUInt8(32);
				w.writeVarInt(1);
				w.writeUInt8(event.channel);
				break;
			case "portPrefix":
				w.writeUInt8(255);
				w.writeUInt8(33);
				w.writeVarInt(1);
				w.writeUInt8(event.port);
				break;
			case "endOfTrack":
				w.writeUInt8(255);
				w.writeUInt8(47);
				w.writeVarInt(0);
				break;
			case "setTempo":
				w.writeUInt8(255);
				w.writeUInt8(81);
				w.writeVarInt(3);
				w.writeUInt24(event.microsecondsPerBeat);
				break;
			case "smpteOffset":
				w.writeUInt8(255);
				w.writeUInt8(84);
				w.writeVarInt(5);
				var hourByte = event.hour & 31 | {
					24: 0,
					25: 32,
					29: 64,
					30: 96
				}[event.frameRate];
				w.writeUInt8(hourByte);
				w.writeUInt8(event.min);
				w.writeUInt8(event.sec);
				w.writeUInt8(event.frame);
				w.writeUInt8(event.subFrame);
				break;
			case "timeSignature":
				w.writeUInt8(255);
				w.writeUInt8(88);
				w.writeVarInt(4);
				w.writeUInt8(event.numerator);
				var denominator = Math.floor(Math.log(event.denominator) / Math.LN2) & 255;
				w.writeUInt8(denominator);
				w.writeUInt8(event.metronome);
				w.writeUInt8(event.thirtyseconds || 8);
				break;
			case "keySignature":
				w.writeUInt8(255);
				w.writeUInt8(89);
				w.writeVarInt(2);
				w.writeInt8(event.key);
				w.writeUInt8(event.scale);
				break;
			case "sequencerSpecific":
				w.writeUInt8(255);
				w.writeUInt8(127);
				w.writeVarInt(data.length);
				w.writeBytes(data);
				break;
			case "unknownMeta":
				if (event.metatypeByte != null) {
					w.writeUInt8(255);
					w.writeUInt8(event.metatypeByte);
					w.writeVarInt(data.length);
					w.writeBytes(data);
				}
				break;
			case "sysEx":
				w.writeUInt8(240);
				w.writeVarInt(data.length);
				w.writeBytes(data);
				break;
			case "endSysEx":
				w.writeUInt8(247);
				w.writeVarInt(data.length);
				w.writeBytes(data);
				break;
			case "noteOff":
				eventTypeByte = (useByte9ForNoteOff !== false && event.byte9 || useByte9ForNoteOff && event.velocity == 0 ? 144 : 128) | event.channel;
				if (eventTypeByte !== lastEventTypeByte) w.writeUInt8(eventTypeByte);
				w.writeUInt8(event.noteNumber);
				w.writeUInt8(event.velocity);
				break;
			case "noteOn":
				eventTypeByte = 144 | event.channel;
				if (eventTypeByte !== lastEventTypeByte) w.writeUInt8(eventTypeByte);
				w.writeUInt8(event.noteNumber);
				w.writeUInt8(event.velocity);
				break;
			case "noteAftertouch":
				eventTypeByte = 160 | event.channel;
				if (eventTypeByte !== lastEventTypeByte) w.writeUInt8(eventTypeByte);
				w.writeUInt8(event.noteNumber);
				w.writeUInt8(event.amount);
				break;
			case "controller":
				eventTypeByte = 176 | event.channel;
				if (eventTypeByte !== lastEventTypeByte) w.writeUInt8(eventTypeByte);
				w.writeUInt8(event.controllerType);
				w.writeUInt8(event.value);
				break;
			case "programChange":
				eventTypeByte = 192 | event.channel;
				if (eventTypeByte !== lastEventTypeByte) w.writeUInt8(eventTypeByte);
				w.writeUInt8(event.programNumber);
				break;
			case "channelAftertouch":
				eventTypeByte = 208 | event.channel;
				if (eventTypeByte !== lastEventTypeByte) w.writeUInt8(eventTypeByte);
				w.writeUInt8(event.amount);
				break;
			case "pitchBend":
				eventTypeByte = 224 | event.channel;
				if (eventTypeByte !== lastEventTypeByte) w.writeUInt8(eventTypeByte);
				var value14 = 8192 + event.value;
				var lsb14 = value14 & 127;
				var msb14 = value14 >> 7 & 127;
				w.writeUInt8(lsb14);
				w.writeUInt8(msb14);
				break;
			default: throw "Unrecognized event type: " + type;
		}
		return eventTypeByte;
	}
	function Writer() {
		this.buffer = [];
	}
	Writer.prototype.writeUInt8 = function(v) {
		this.buffer.push(v & 255);
	};
	Writer.prototype.writeInt8 = Writer.prototype.writeUInt8;
	Writer.prototype.writeUInt16 = function(v) {
		var b0 = v >> 8 & 255, b1 = v & 255;
		this.writeUInt8(b0);
		this.writeUInt8(b1);
	};
	Writer.prototype.writeInt16 = Writer.prototype.writeUInt16;
	Writer.prototype.writeUInt24 = function(v) {
		var b0 = v >> 16 & 255, b1 = v >> 8 & 255, b2 = v & 255;
		this.writeUInt8(b0);
		this.writeUInt8(b1);
		this.writeUInt8(b2);
	};
	Writer.prototype.writeInt24 = Writer.prototype.writeUInt24;
	Writer.prototype.writeUInt32 = function(v) {
		var b0 = v >> 24 & 255, b1 = v >> 16 & 255, b2 = v >> 8 & 255, b3 = v & 255;
		this.writeUInt8(b0);
		this.writeUInt8(b1);
		this.writeUInt8(b2);
		this.writeUInt8(b3);
	};
	Writer.prototype.writeInt32 = Writer.prototype.writeUInt32;
	Writer.prototype.writeBytes = function(arr) {
		this.buffer = this.buffer.concat(Array.prototype.slice.call(arr, 0));
	};
	Writer.prototype.writeString = function(str) {
		var i, len = str.length, arr = [];
		for (i = 0; i < len; i++) arr.push(str.codePointAt(i));
		this.writeBytes(arr);
	};
	Writer.prototype.writeVarInt = function(v) {
		if (v < 0) throw "Cannot write negative variable-length integer";
		if (v <= 127) this.writeUInt8(v);
		else {
			var i = v;
			var bytes = [];
			bytes.push(i & 127);
			i >>= 7;
			while (i) {
				var b = i & 127 | 128;
				bytes.push(b);
				i >>= 7;
			}
			this.writeBytes(bytes.reverse());
		}
	};
	Writer.prototype.writeChunk = function(id, data) {
		this.writeString(id);
		this.writeUInt32(data.length);
		this.writeBytes(data);
	};
	module.exports = writeMidi;
}));
//#endregion
//#region node_modules/midi-file/index.js
var require_midi_file = /* @__PURE__ */ __commonJSMin(((exports) => {
	exports.parseMidi = require_midi_parser();
	exports.writeMidi = require_midi_writer();
}));
//#endregion
//#region node_modules/@tonejs/midi/dist/BinarySearch.js
var require_BinarySearch = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.insert = exports.search = void 0;
	/**
	* Return the index of the element at or before the given property
	* @hidden
	*/
	function search(array, value, prop) {
		if (prop === void 0) prop = "ticks";
		var beginning = 0;
		var len = array.length;
		var end = len;
		if (len > 0 && array[len - 1][prop] <= value) return len - 1;
		while (beginning < end) {
			var midPoint = Math.floor(beginning + (end - beginning) / 2);
			var event_1 = array[midPoint];
			var nextEvent = array[midPoint + 1];
			if (event_1[prop] === value) {
				for (var i = midPoint; i < array.length; i++) if (array[i][prop] === value) midPoint = i;
				return midPoint;
			} else if (event_1[prop] < value && nextEvent[prop] > value) return midPoint;
			else if (event_1[prop] > value) end = midPoint;
			else if (event_1[prop] < value) beginning = midPoint + 1;
		}
		return -1;
	}
	exports.search = search;
	/**
	* Does a binary search to insert the note
	* in the correct spot in the array
	* @hidden
	*/
	function insert(array, event, prop) {
		if (prop === void 0) prop = "ticks";
		if (array.length) {
			var index = search(array, event[prop], prop);
			array.splice(index + 1, 0, event);
		} else array.push(event);
	}
	exports.insert = insert;
}));
//#endregion
//#region node_modules/@tonejs/midi/dist/Header.js
var require_Header = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.Header = exports.keySignatureKeys = void 0;
	var BinarySearch_1 = require_BinarySearch();
	var privatePPQMap = /* @__PURE__ */ new WeakMap();
	/**
	* @hidden
	*/
	exports.keySignatureKeys = [
		"Cb",
		"Gb",
		"Db",
		"Ab",
		"Eb",
		"Bb",
		"F",
		"C",
		"G",
		"D",
		"A",
		"E",
		"B",
		"F#",
		"C#"
	];
	exports.Header = function() {
		function Header(midiData) {
			var _this = this;
			/**
			* The array of all the tempo events.
			*/
			this.tempos = [];
			/**
			* The time signatures.
			*/
			this.timeSignatures = [];
			/**
			* The time signatures.
			*/
			this.keySignatures = [];
			/**
			* Additional meta events.
			*/
			this.meta = [];
			/**
			* The name of the MIDI file;
			*/
			this.name = "";
			privatePPQMap.set(this, 480);
			if (midiData) {
				privatePPQMap.set(this, midiData.header.ticksPerBeat);
				midiData.tracks.forEach(function(track) {
					track.forEach(function(event) {
						if (event.meta) {
							if (event.type === "timeSignature") _this.timeSignatures.push({
								ticks: event.absoluteTime,
								timeSignature: [event.numerator, event.denominator]
							});
							else if (event.type === "setTempo") _this.tempos.push({
								bpm: 6e7 / event.microsecondsPerBeat,
								ticks: event.absoluteTime
							});
							else if (event.type === "keySignature") _this.keySignatures.push({
								key: exports.keySignatureKeys[event.key + 7],
								scale: event.scale === 0 ? "major" : "minor",
								ticks: event.absoluteTime
							});
						}
					});
				});
				var firstTrackCurrentTicks_1 = 0;
				midiData.tracks[0].forEach(function(event) {
					firstTrackCurrentTicks_1 += event.deltaTime;
					if (event.meta) {
						if (event.type === "trackName") _this.name = event.text;
						else if (event.type === "text" || event.type === "cuePoint" || event.type === "marker" || event.type === "lyrics") _this.meta.push({
							text: event.text,
							ticks: firstTrackCurrentTicks_1,
							type: event.type
						});
					}
				});
				this.update();
			}
		}
		/**
		* This must be invoked after any changes are made to the tempo array
		* or the timeSignature array for the updated values to be reflected.
		*/
		Header.prototype.update = function() {
			var _this = this;
			var currentTime = 0;
			var lastEventBeats = 0;
			this.tempos.sort(function(a, b) {
				return a.ticks - b.ticks;
			});
			this.tempos.forEach(function(event, index) {
				var lastBPM = index > 0 ? _this.tempos[index - 1].bpm : _this.tempos[0].bpm;
				var beats = event.ticks / _this.ppq - lastEventBeats;
				event.time = 60 / lastBPM * beats + currentTime;
				currentTime = event.time;
				lastEventBeats += beats;
			});
			this.timeSignatures.sort(function(a, b) {
				return a.ticks - b.ticks;
			});
			this.timeSignatures.forEach(function(event, index) {
				var lastEvent = index > 0 ? _this.timeSignatures[index - 1] : _this.timeSignatures[0];
				var elapsedMeasures = (event.ticks - lastEvent.ticks) / _this.ppq / lastEvent.timeSignature[0] / (lastEvent.timeSignature[1] / 4);
				lastEvent.measures = lastEvent.measures || 0;
				event.measures = elapsedMeasures + lastEvent.measures;
			});
		};
		/**
		* Convert ticks into seconds based on the tempo changes.
		*/
		Header.prototype.ticksToSeconds = function(ticks) {
			var index = (0, BinarySearch_1.search)(this.tempos, ticks);
			if (index !== -1) {
				var tempo = this.tempos[index];
				var tempoTime = tempo.time;
				var elapsedBeats = (ticks - tempo.ticks) / this.ppq;
				return tempoTime + 60 / tempo.bpm * elapsedBeats;
			} else return 60 / 120 * (ticks / this.ppq);
		};
		/**
		* Convert ticks into measures based off of the time signatures.
		*/
		Header.prototype.ticksToMeasures = function(ticks) {
			var index = (0, BinarySearch_1.search)(this.timeSignatures, ticks);
			if (index !== -1) {
				var timeSigEvent = this.timeSignatures[index];
				var elapsedBeats = (ticks - timeSigEvent.ticks) / this.ppq;
				return timeSigEvent.measures + elapsedBeats / (timeSigEvent.timeSignature[0] / timeSigEvent.timeSignature[1]) / 4;
			} else return ticks / this.ppq / 4;
		};
		Object.defineProperty(Header.prototype, "ppq", {
			/**
			* The number of ticks per quarter note.
			*/
			get: function() {
				return privatePPQMap.get(this);
			},
			enumerable: false,
			configurable: true
		});
		/**
		* Convert seconds to ticks based on the tempo events.
		*/
		Header.prototype.secondsToTicks = function(seconds) {
			var index = (0, BinarySearch_1.search)(this.tempos, seconds, "time");
			if (index !== -1) {
				var tempo = this.tempos[index];
				var elapsedBeats = (seconds - tempo.time) / (60 / tempo.bpm);
				return Math.round(tempo.ticks + elapsedBeats * this.ppq);
			} else {
				var beats = seconds / (60 / 120);
				return Math.round(beats * this.ppq);
			}
		};
		/**
		* Convert the header into an object.
		*/
		Header.prototype.toJSON = function() {
			return {
				keySignatures: this.keySignatures,
				meta: this.meta,
				name: this.name,
				ppq: this.ppq,
				tempos: this.tempos.map(function(t) {
					return {
						bpm: t.bpm,
						ticks: t.ticks
					};
				}),
				timeSignatures: this.timeSignatures
			};
		};
		/**
		* Parse a header json object.
		*/
		Header.prototype.fromJSON = function(json) {
			this.name = json.name;
			this.tempos = json.tempos.map(function(t) {
				return Object.assign({}, t);
			});
			this.timeSignatures = json.timeSignatures.map(function(t) {
				return Object.assign({}, t);
			});
			this.keySignatures = json.keySignatures.map(function(t) {
				return Object.assign({}, t);
			});
			this.meta = json.meta.map(function(t) {
				return Object.assign({}, t);
			});
			privatePPQMap.set(this, json.ppq);
			this.update();
		};
		/**
		* Update the tempo of the midi to a single tempo. Will remove and replace
		* any other tempos currently set and update all of the event timing.
		* @param bpm The tempo in beats per second.
		*/
		Header.prototype.setTempo = function(bpm) {
			this.tempos = [{
				bpm,
				ticks: 0
			}];
			this.update();
		};
		return Header;
	}();
}));
//#endregion
//#region node_modules/@tonejs/midi/dist/ControlChange.js
var require_ControlChange = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.ControlChange = exports.controlChangeIds = exports.controlChangeNames = void 0;
	/**
	* A map of values to control change names
	* @hidden
	*/
	exports.controlChangeNames = {
		1: "modulationWheel",
		2: "breath",
		4: "footController",
		5: "portamentoTime",
		7: "volume",
		8: "balance",
		10: "pan",
		64: "sustain",
		65: "portamentoTime",
		66: "sostenuto",
		67: "softPedal",
		68: "legatoFootswitch",
		84: "portamentoControl"
	};
	/**
	* swap the keys and values
	* @hidden
	*/
	exports.controlChangeIds = Object.keys(exports.controlChangeNames).reduce(function(obj, key) {
		obj[exports.controlChangeNames[key]] = key;
		return obj;
	}, {});
	var privateHeaderMap = /* @__PURE__ */ new WeakMap();
	var privateCCNumberMap = /* @__PURE__ */ new WeakMap();
	exports.ControlChange = function() {
		/**
		* @param event
		* @param header
		*/
		function ControlChange(event, header) {
			privateHeaderMap.set(this, header);
			privateCCNumberMap.set(this, event.controllerType);
			this.ticks = event.absoluteTime;
			this.value = event.value;
		}
		Object.defineProperty(ControlChange.prototype, "number", {
			/**
			* The controller number
			*/
			get: function() {
				return privateCCNumberMap.get(this);
			},
			enumerable: false,
			configurable: true
		});
		Object.defineProperty(ControlChange.prototype, "name", {
			/**
			* return the common name of the control number if it exists
			*/
			get: function() {
				if (exports.controlChangeNames[this.number]) return exports.controlChangeNames[this.number];
				else return null;
			},
			enumerable: false,
			configurable: true
		});
		Object.defineProperty(ControlChange.prototype, "time", {
			/**
			* The time of the event in seconds
			*/
			get: function() {
				return privateHeaderMap.get(this).ticksToSeconds(this.ticks);
			},
			set: function(t) {
				var header = privateHeaderMap.get(this);
				this.ticks = header.secondsToTicks(t);
			},
			enumerable: false,
			configurable: true
		});
		ControlChange.prototype.toJSON = function() {
			return {
				number: this.number,
				ticks: this.ticks,
				time: this.time,
				value: this.value
			};
		};
		return ControlChange;
	}();
}));
//#endregion
//#region node_modules/@tonejs/midi/dist/ControlChanges.js
var require_ControlChanges = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.createControlChanges = void 0;
	var ControlChange_1 = require_ControlChange();
	/**
	* Automatically creates an alias for named control values using Proxies
	* @hidden
	*/
	function createControlChanges() {
		return new Proxy({}, {
			get: function(target, handler) {
				if (target[handler]) return target[handler];
				else if (ControlChange_1.controlChangeIds.hasOwnProperty(handler)) return target[ControlChange_1.controlChangeIds[handler]];
			},
			set: function(target, handler, value) {
				if (ControlChange_1.controlChangeIds.hasOwnProperty(handler)) target[ControlChange_1.controlChangeIds[handler]] = value;
				else target[handler] = value;
				return true;
			}
		});
	}
	exports.createControlChanges = createControlChanges;
}));
//#endregion
//#region node_modules/@tonejs/midi/dist/PitchBend.js
var require_PitchBend = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.PitchBend = void 0;
	var privateHeaderMap = /* @__PURE__ */ new WeakMap();
	exports.PitchBend = function() {
		/**
		* @param event
		* @param header
		*/
		function PitchBend(event, header) {
			privateHeaderMap.set(this, header);
			this.ticks = event.absoluteTime;
			this.value = event.value;
		}
		Object.defineProperty(PitchBend.prototype, "time", {
			/**
			* The time of the event in seconds
			*/
			get: function() {
				return privateHeaderMap.get(this).ticksToSeconds(this.ticks);
			},
			set: function(t) {
				var header = privateHeaderMap.get(this);
				this.ticks = header.secondsToTicks(t);
			},
			enumerable: false,
			configurable: true
		});
		PitchBend.prototype.toJSON = function() {
			return {
				ticks: this.ticks,
				time: this.time,
				value: this.value
			};
		};
		return PitchBend;
	}();
}));
//#endregion
//#region node_modules/@tonejs/midi/dist/InstrumentMaps.js
var require_InstrumentMaps = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.DrumKitByPatchID = exports.InstrumentFamilyByID = exports.instrumentByPatchID = void 0;
	exports.instrumentByPatchID = [
		"acoustic grand piano",
		"bright acoustic piano",
		"electric grand piano",
		"honky-tonk piano",
		"electric piano 1",
		"electric piano 2",
		"harpsichord",
		"clavi",
		"celesta",
		"glockenspiel",
		"music box",
		"vibraphone",
		"marimba",
		"xylophone",
		"tubular bells",
		"dulcimer",
		"drawbar organ",
		"percussive organ",
		"rock organ",
		"church organ",
		"reed organ",
		"accordion",
		"harmonica",
		"tango accordion",
		"acoustic guitar (nylon)",
		"acoustic guitar (steel)",
		"electric guitar (jazz)",
		"electric guitar (clean)",
		"electric guitar (muted)",
		"overdriven guitar",
		"distortion guitar",
		"guitar harmonics",
		"acoustic bass",
		"electric bass (finger)",
		"electric bass (pick)",
		"fretless bass",
		"slap bass 1",
		"slap bass 2",
		"synth bass 1",
		"synth bass 2",
		"violin",
		"viola",
		"cello",
		"contrabass",
		"tremolo strings",
		"pizzicato strings",
		"orchestral harp",
		"timpani",
		"string ensemble 1",
		"string ensemble 2",
		"synthstrings 1",
		"synthstrings 2",
		"choir aahs",
		"voice oohs",
		"synth voice",
		"orchestra hit",
		"trumpet",
		"trombone",
		"tuba",
		"muted trumpet",
		"french horn",
		"brass section",
		"synthbrass 1",
		"synthbrass 2",
		"soprano sax",
		"alto sax",
		"tenor sax",
		"baritone sax",
		"oboe",
		"english horn",
		"bassoon",
		"clarinet",
		"piccolo",
		"flute",
		"recorder",
		"pan flute",
		"blown bottle",
		"shakuhachi",
		"whistle",
		"ocarina",
		"lead 1 (square)",
		"lead 2 (sawtooth)",
		"lead 3 (calliope)",
		"lead 4 (chiff)",
		"lead 5 (charang)",
		"lead 6 (voice)",
		"lead 7 (fifths)",
		"lead 8 (bass + lead)",
		"pad 1 (new age)",
		"pad 2 (warm)",
		"pad 3 (polysynth)",
		"pad 4 (choir)",
		"pad 5 (bowed)",
		"pad 6 (metallic)",
		"pad 7 (halo)",
		"pad 8 (sweep)",
		"fx 1 (rain)",
		"fx 2 (soundtrack)",
		"fx 3 (crystal)",
		"fx 4 (atmosphere)",
		"fx 5 (brightness)",
		"fx 6 (goblins)",
		"fx 7 (echoes)",
		"fx 8 (sci-fi)",
		"sitar",
		"banjo",
		"shamisen",
		"koto",
		"kalimba",
		"bag pipe",
		"fiddle",
		"shanai",
		"tinkle bell",
		"agogo",
		"steel drums",
		"woodblock",
		"taiko drum",
		"melodic tom",
		"synth drum",
		"reverse cymbal",
		"guitar fret noise",
		"breath noise",
		"seashore",
		"bird tweet",
		"telephone ring",
		"helicopter",
		"applause",
		"gunshot"
	];
	exports.InstrumentFamilyByID = [
		"piano",
		"chromatic percussion",
		"organ",
		"guitar",
		"bass",
		"strings",
		"ensemble",
		"brass",
		"reed",
		"pipe",
		"synth lead",
		"synth pad",
		"synth effects",
		"world",
		"percussive",
		"sound effects"
	];
	exports.DrumKitByPatchID = {
		0: "standard kit",
		8: "room kit",
		16: "power kit",
		24: "electronic kit",
		25: "tr-808 kit",
		32: "jazz kit",
		40: "brush kit",
		48: "orchestra kit",
		56: "sound fx kit"
	};
}));
//#endregion
//#region node_modules/@tonejs/midi/dist/Instrument.js
var require_Instrument = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.Instrument = void 0;
	var InstrumentMaps_1 = require_InstrumentMaps();
	/**
	* @hidden
	*/
	var privateTrackMap = /* @__PURE__ */ new WeakMap();
	exports.Instrument = function() {
		/**
		* @param trackData
		* @param track
		*/
		function Instrument(trackData, track) {
			/**
			* The instrument number. Defaults to 0.
			*/
			this.number = 0;
			privateTrackMap.set(this, track);
			this.number = 0;
			if (trackData) {
				var programChange = trackData.find(function(e) {
					return e.type === "programChange";
				});
				if (programChange) this.number = programChange.programNumber;
			}
		}
		Object.defineProperty(Instrument.prototype, "name", {
			/**
			* The common name of the instrument.
			*/
			get: function() {
				if (this.percussion) return InstrumentMaps_1.DrumKitByPatchID[this.number];
				else return InstrumentMaps_1.instrumentByPatchID[this.number];
			},
			set: function(n) {
				var patchNumber = InstrumentMaps_1.instrumentByPatchID.indexOf(n);
				if (patchNumber !== -1) this.number = patchNumber;
			},
			enumerable: false,
			configurable: true
		});
		Object.defineProperty(Instrument.prototype, "family", {
			/**
			* The instrument family, e.g. "piano".
			*/
			get: function() {
				if (this.percussion) return "drums";
				else return InstrumentMaps_1.InstrumentFamilyByID[Math.floor(this.number / 8)];
			},
			enumerable: false,
			configurable: true
		});
		Object.defineProperty(Instrument.prototype, "percussion", {
			/**
			* If the instrument is a percussion instrument.
			*/
			get: function() {
				return privateTrackMap.get(this).channel === 9;
			},
			enumerable: false,
			configurable: true
		});
		/**
		* Convert it to JSON form.
		*/
		Instrument.prototype.toJSON = function() {
			return {
				family: this.family,
				number: this.number,
				name: this.name
			};
		};
		/**
		* Convert from JSON form.
		*/
		Instrument.prototype.fromJSON = function(json) {
			this.number = json.number;
		};
		return Instrument;
	}();
}));
//#endregion
//#region node_modules/@tonejs/midi/dist/Note.js
var require_Note = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.Note = void 0;
	/**
	* Convert a MIDI note into a pitch.
	*/
	function midiToPitch(midi) {
		var octave = Math.floor(midi / 12) - 1;
		return midiToPitchClass(midi) + octave.toString();
	}
	/**
	* Convert a MIDI note to a pitch class (just the pitch no octave).
	*/
	function midiToPitchClass(midi) {
		return [
			"C",
			"C#",
			"D",
			"D#",
			"E",
			"F",
			"F#",
			"G",
			"G#",
			"A",
			"A#",
			"B"
		][midi % 12];
	}
	/**
	* Convert a pitch class to a MIDI note.
	*/
	function pitchClassToMidi(pitch) {
		return [
			"C",
			"C#",
			"D",
			"D#",
			"E",
			"F",
			"F#",
			"G",
			"G#",
			"A",
			"A#",
			"B"
		].indexOf(pitch);
	}
	/**
	* Convert a pitch to a MIDI number.
	*/
	var pitchToMidi = function() {
		var regexp = /^([a-g]{1}(?:b|#|x|bb)?)(-?[0-9]+)/i;
		var noteToScaleIndex = {
			cbb: -2,
			cb: -1,
			c: 0,
			"c#": 1,
			cx: 2,
			dbb: 0,
			db: 1,
			d: 2,
			"d#": 3,
			dx: 4,
			ebb: 2,
			eb: 3,
			e: 4,
			"e#": 5,
			ex: 6,
			fbb: 3,
			fb: 4,
			f: 5,
			"f#": 6,
			fx: 7,
			gbb: 5,
			gb: 6,
			g: 7,
			"g#": 8,
			gx: 9,
			abb: 7,
			ab: 8,
			a: 9,
			"a#": 10,
			ax: 11,
			bbb: 9,
			bb: 10,
			b: 11,
			"b#": 12,
			bx: 13
		};
		return function(note) {
			var split = regexp.exec(note);
			var pitch = split[1];
			var octave = split[2];
			return noteToScaleIndex[pitch.toLowerCase()] + (parseInt(octave, 10) + 1) * 12;
		};
	}();
	var privateHeaderMap = /* @__PURE__ */ new WeakMap();
	exports.Note = function() {
		function Note(noteOn, noteOff, header) {
			privateHeaderMap.set(this, header);
			this.midi = noteOn.midi;
			this.velocity = noteOn.velocity;
			this.noteOffVelocity = noteOff.velocity;
			this.ticks = noteOn.ticks;
			this.durationTicks = noteOff.ticks - noteOn.ticks;
		}
		Object.defineProperty(Note.prototype, "name", {
			/**
			* The note name and octave in scientific pitch notation, e.g. "C4".
			*/
			get: function() {
				return midiToPitch(this.midi);
			},
			set: function(n) {
				this.midi = pitchToMidi(n);
			},
			enumerable: false,
			configurable: true
		});
		Object.defineProperty(Note.prototype, "octave", {
			/**
			* The notes octave number.
			*/
			get: function() {
				return Math.floor(this.midi / 12) - 1;
			},
			set: function(o) {
				var diff = o - this.octave;
				this.midi += diff * 12;
			},
			enumerable: false,
			configurable: true
		});
		Object.defineProperty(Note.prototype, "pitch", {
			/**
			* The pitch class name. e.g. "A".
			*/
			get: function() {
				return midiToPitchClass(this.midi);
			},
			set: function(p) {
				this.midi = 12 * (this.octave + 1) + pitchClassToMidi(p);
			},
			enumerable: false,
			configurable: true
		});
		Object.defineProperty(Note.prototype, "duration", {
			/**
			* The duration of the segment in seconds.
			*/
			get: function() {
				var header = privateHeaderMap.get(this);
				return header.ticksToSeconds(this.ticks + this.durationTicks) - header.ticksToSeconds(this.ticks);
			},
			set: function(d) {
				var noteEndTicks = privateHeaderMap.get(this).secondsToTicks(this.time + d);
				this.durationTicks = noteEndTicks - this.ticks;
			},
			enumerable: false,
			configurable: true
		});
		Object.defineProperty(Note.prototype, "time", {
			/**
			* The time of the event in seconds.
			*/
			get: function() {
				return privateHeaderMap.get(this).ticksToSeconds(this.ticks);
			},
			set: function(t) {
				var header = privateHeaderMap.get(this);
				this.ticks = header.secondsToTicks(t);
			},
			enumerable: false,
			configurable: true
		});
		Object.defineProperty(Note.prototype, "bars", {
			/**
			* The number of measures (and partial measures) to this beat.
			* Takes into account time signature changes.
			* @readonly
			*/
			get: function() {
				return privateHeaderMap.get(this).ticksToMeasures(this.ticks);
			},
			enumerable: false,
			configurable: true
		});
		Note.prototype.toJSON = function() {
			return {
				duration: this.duration,
				durationTicks: this.durationTicks,
				midi: this.midi,
				name: this.name,
				ticks: this.ticks,
				time: this.time,
				velocity: this.velocity
			};
		};
		return Note;
	}();
}));
//#endregion
//#region node_modules/@tonejs/midi/dist/Track.js
var require_Track = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.Track = void 0;
	var BinarySearch_1 = require_BinarySearch();
	var ControlChange_1 = require_ControlChange();
	var ControlChanges_1 = require_ControlChanges();
	var PitchBend_1 = require_PitchBend();
	var Instrument_1 = require_Instrument();
	var Note_1 = require_Note();
	var privateHeaderMap = /* @__PURE__ */ new WeakMap();
	exports.Track = function() {
		function Track(trackData, header) {
			var _this = this;
			/**
			* The name of the track.
			*/
			this.name = "";
			/**
			* The track's note events.
			*/
			this.notes = [];
			/**
			* The control change events.
			*/
			this.controlChanges = (0, ControlChanges_1.createControlChanges)();
			/**
			* The pitch bend events.
			*/
			this.pitchBends = [];
			privateHeaderMap.set(this, header);
			if (trackData) {
				var nameEvent = trackData.find(function(e) {
					return e.type === "trackName";
				});
				this.name = nameEvent ? nameEvent.text : "";
			}
			this.instrument = new Instrument_1.Instrument(trackData, this);
			this.channel = 0;
			if (trackData) {
				var noteOns = trackData.filter(function(event) {
					return event.type === "noteOn";
				});
				var noteOffs = trackData.filter(function(event) {
					return event.type === "noteOff";
				});
				var _loop_1 = function() {
					var currentNote = noteOns.shift();
					this_1.channel = currentNote.channel;
					var offIndex = noteOffs.findIndex(function(note) {
						return note.noteNumber === currentNote.noteNumber && note.absoluteTime >= currentNote.absoluteTime;
					});
					if (offIndex !== -1) {
						var noteOff = noteOffs.splice(offIndex, 1)[0];
						this_1.addNote({
							durationTicks: noteOff.absoluteTime - currentNote.absoluteTime,
							midi: currentNote.noteNumber,
							noteOffVelocity: noteOff.velocity / 127,
							ticks: currentNote.absoluteTime,
							velocity: currentNote.velocity / 127
						});
					}
				};
				var this_1 = this;
				while (noteOns.length) _loop_1();
				trackData.filter(function(event) {
					return event.type === "controller";
				}).forEach(function(event) {
					_this.addCC({
						number: event.controllerType,
						ticks: event.absoluteTime,
						value: event.value / 127
					});
				});
				trackData.filter(function(event) {
					return event.type === "pitchBend";
				}).forEach(function(event) {
					_this.addPitchBend({
						ticks: event.absoluteTime,
						value: event.value / Math.pow(2, 13)
					});
				});
				var endOfTrackEvent = trackData.find(function(event) {
					return event.type === "endOfTrack";
				});
				this.endOfTrackTicks = endOfTrackEvent !== void 0 ? endOfTrackEvent.absoluteTime : void 0;
			}
		}
		/**
		* Add a note to the notes array.
		* @param props The note properties to add.
		*/
		Track.prototype.addNote = function(props) {
			var header = privateHeaderMap.get(this);
			var note = new Note_1.Note({
				midi: 0,
				ticks: 0,
				velocity: 1
			}, {
				ticks: 0,
				velocity: 0
			}, header);
			Object.assign(note, props);
			(0, BinarySearch_1.insert)(this.notes, note, "ticks");
			return this;
		};
		/**
		* Add a control change to the track.
		* @param props
		*/
		Track.prototype.addCC = function(props) {
			var header = privateHeaderMap.get(this);
			var cc = new ControlChange_1.ControlChange({ controllerType: props.number }, header);
			delete props.number;
			Object.assign(cc, props);
			if (!Array.isArray(this.controlChanges[cc.number])) this.controlChanges[cc.number] = [];
			(0, BinarySearch_1.insert)(this.controlChanges[cc.number], cc, "ticks");
			return this;
		};
		/**
		* Add a control change to the track.
		*/
		Track.prototype.addPitchBend = function(props) {
			var header = privateHeaderMap.get(this);
			var pb = new PitchBend_1.PitchBend({}, header);
			Object.assign(pb, props);
			(0, BinarySearch_1.insert)(this.pitchBends, pb, "ticks");
			return this;
		};
		Object.defineProperty(Track.prototype, "duration", {
			/**
			* The end time of the last event in the track.
			*/
			get: function() {
				if (!this.notes.length) return 0;
				var maxDuration = this.notes[this.notes.length - 1].time + this.notes[this.notes.length - 1].duration;
				for (var i = 0; i < this.notes.length - 1; i++) {
					var duration = this.notes[i].time + this.notes[i].duration;
					if (maxDuration < duration) maxDuration = duration;
				}
				return maxDuration;
			},
			enumerable: false,
			configurable: true
		});
		Object.defineProperty(Track.prototype, "durationTicks", {
			/**
			* The end time of the last event in the track in ticks.
			*/
			get: function() {
				if (!this.notes.length) return 0;
				var maxDuration = this.notes[this.notes.length - 1].ticks + this.notes[this.notes.length - 1].durationTicks;
				for (var i = 0; i < this.notes.length - 1; i++) {
					var duration = this.notes[i].ticks + this.notes[i].durationTicks;
					if (maxDuration < duration) maxDuration = duration;
				}
				return maxDuration;
			},
			enumerable: false,
			configurable: true
		});
		/**
		* Assign the JSON values to this track.
		*/
		Track.prototype.fromJSON = function(json) {
			var _this = this;
			this.name = json.name;
			this.channel = json.channel;
			this.instrument = new Instrument_1.Instrument(void 0, this);
			this.instrument.fromJSON(json.instrument);
			if (json.endOfTrackTicks !== void 0) this.endOfTrackTicks = json.endOfTrackTicks;
			for (var number in json.controlChanges) if (json.controlChanges[number]) json.controlChanges[number].forEach(function(cc) {
				_this.addCC({
					number: cc.number,
					ticks: cc.ticks,
					value: cc.value
				});
			});
			json.notes.forEach(function(n) {
				_this.addNote({
					durationTicks: n.durationTicks,
					midi: n.midi,
					ticks: n.ticks,
					velocity: n.velocity
				});
			});
		};
		/**
		* Convert the track into a JSON format.
		*/
		Track.prototype.toJSON = function() {
			var controlChanges = {};
			for (var i = 0; i < 127; i++) if (this.controlChanges.hasOwnProperty(i)) controlChanges[i] = this.controlChanges[i].map(function(c) {
				return c.toJSON();
			});
			var json = {
				channel: this.channel,
				controlChanges,
				pitchBends: this.pitchBends.map(function(pb) {
					return pb.toJSON();
				}),
				instrument: this.instrument.toJSON(),
				name: this.name,
				notes: this.notes.map(function(n) {
					return n.toJSON();
				})
			};
			if (this.endOfTrackTicks !== void 0) json.endOfTrackTicks = this.endOfTrackTicks;
			return json;
		};
		return Track;
	}();
}));
//#endregion
//#region node_modules/array-flatten/dist.es2015/index.js
var dist_es2015_exports = /* @__PURE__ */ __exportAll({ flatten: () => flatten });
/**
* Flatten an array indefinitely.
*/
function flatten(array) {
	var result = [];
	$flatten(array, result);
	return result;
}
/**
* Internal flatten function recursively passes `result`.
*/
function $flatten(array, result) {
	for (var i = 0; i < array.length; i++) {
		var value = array[i];
		if (Array.isArray(value)) $flatten(value, result);
		else result.push(value);
	}
}
//#endregion
//#region node_modules/@tonejs/midi/dist/Encode.js
var require_Encode = /* @__PURE__ */ __commonJSMin(((exports) => {
	var __spreadArray = exports && exports.__spreadArray || function(to, from, pack) {
		if (pack || arguments.length === 2) {
			for (var i = 0, l = from.length, ar; i < l; i++) if (ar || !(i in from)) {
				if (!ar) ar = Array.prototype.slice.call(from, 0, i);
				ar[i] = from[i];
			}
		}
		return to.concat(ar || Array.prototype.slice.call(from));
	};
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.encode = void 0;
	var midi_file_1 = require_midi_file();
	var Header_1 = require_Header();
	var array_flatten_1 = __toCommonJS(dist_es2015_exports);
	function encodeNote(note, channel) {
		return [{
			absoluteTime: note.ticks,
			channel,
			deltaTime: 0,
			noteNumber: note.midi,
			type: "noteOn",
			velocity: Math.floor(note.velocity * 127)
		}, {
			absoluteTime: note.ticks + note.durationTicks,
			channel,
			deltaTime: 0,
			noteNumber: note.midi,
			type: "noteOff",
			velocity: Math.floor(note.noteOffVelocity * 127)
		}];
	}
	function encodeNotes(track) {
		return (0, array_flatten_1.flatten)(track.notes.map(function(note) {
			return encodeNote(note, track.channel);
		}));
	}
	function encodeControlChange(cc, channel) {
		return {
			absoluteTime: cc.ticks,
			channel,
			controllerType: cc.number,
			deltaTime: 0,
			type: "controller",
			value: Math.floor(cc.value * 127)
		};
	}
	function encodeControlChanges(track) {
		var controlChanges = [];
		for (var i = 0; i < 127; i++) if (track.controlChanges.hasOwnProperty(i)) track.controlChanges[i].forEach(function(cc) {
			controlChanges.push(encodeControlChange(cc, track.channel));
		});
		return controlChanges;
	}
	function encodePitchBend(pb, channel) {
		return {
			absoluteTime: pb.ticks,
			channel,
			deltaTime: 0,
			type: "pitchBend",
			value: pb.value
		};
	}
	function encodePitchBends(track) {
		var pitchBends = [];
		track.pitchBends.forEach(function(pb) {
			pitchBends.push(encodePitchBend(pb, track.channel));
		});
		return pitchBends;
	}
	function encodeInstrument(track) {
		return {
			absoluteTime: 0,
			channel: track.channel,
			deltaTime: 0,
			programNumber: track.instrument.number,
			type: "programChange"
		};
	}
	function encodeTrackName(name) {
		return {
			absoluteTime: 0,
			deltaTime: 0,
			meta: true,
			text: name,
			type: "trackName"
		};
	}
	function encodeTempo(tempo) {
		return {
			absoluteTime: tempo.ticks,
			deltaTime: 0,
			meta: true,
			microsecondsPerBeat: Math.floor(6e7 / tempo.bpm),
			type: "setTempo"
		};
	}
	function encodeTimeSignature(timeSig) {
		return {
			absoluteTime: timeSig.ticks,
			deltaTime: 0,
			denominator: timeSig.timeSignature[1],
			meta: true,
			metronome: 24,
			numerator: timeSig.timeSignature[0],
			thirtyseconds: 8,
			type: "timeSignature"
		};
	}
	function encodeKeySignature(keySig) {
		var keyIndex = Header_1.keySignatureKeys.indexOf(keySig.key);
		return {
			absoluteTime: keySig.ticks,
			deltaTime: 0,
			key: keyIndex + 7,
			meta: true,
			scale: keySig.scale === "major" ? 0 : 1,
			type: "keySignature"
		};
	}
	function encodeText(textEvent) {
		return {
			absoluteTime: textEvent.ticks,
			deltaTime: 0,
			meta: true,
			text: textEvent.text,
			type: textEvent.type
		};
	}
	/**
	* Convert the MIDI object to an array.
	*/
	function encode(midi) {
		var midiData = {
			header: {
				format: 1,
				numTracks: midi.tracks.length + 1,
				ticksPerBeat: midi.header.ppq
			},
			tracks: __spreadArray([__spreadArray(__spreadArray(__spreadArray(__spreadArray([{
				absoluteTime: 0,
				deltaTime: 0,
				meta: true,
				text: midi.header.name,
				type: "trackName"
			}], midi.header.keySignatures.map(function(keySig) {
				return encodeKeySignature(keySig);
			}), true), midi.header.meta.map(function(e) {
				return encodeText(e);
			}), true), midi.header.tempos.map(function(tempo) {
				return encodeTempo(tempo);
			}), true), midi.header.timeSignatures.map(function(timeSig) {
				return encodeTimeSignature(timeSig);
			}), true)], midi.tracks.map(function(track) {
				return __spreadArray(__spreadArray(__spreadArray([encodeTrackName(track.name), encodeInstrument(track)], encodeNotes(track), true), encodeControlChanges(track), true), encodePitchBends(track), true);
			}), true)
		};
		midiData.tracks = midiData.tracks.map(function(track) {
			track = track.sort(function(a, b) {
				return a.absoluteTime - b.absoluteTime;
			});
			var lastTime = 0;
			track.forEach(function(note) {
				note.deltaTime = note.absoluteTime - lastTime;
				lastTime = note.absoluteTime;
				delete note.absoluteTime;
			});
			track.push({
				deltaTime: 0,
				meta: true,
				type: "endOfTrack"
			});
			return track;
		});
		return new Uint8Array((0, midi_file_1.writeMidi)(midiData));
	}
	exports.encode = encode;
}));
(/* @__PURE__ */ __toESM((/* @__PURE__ */ __commonJSMin(((exports) => {
	var __awaiter = exports && exports.__awaiter || function(thisArg, _arguments, P, generator) {
		function adopt(value) {
			return value instanceof P ? value : new P(function(resolve) {
				resolve(value);
			});
		}
		return new (P || (P = Promise))(function(resolve, reject) {
			function fulfilled(value) {
				try {
					step(generator.next(value));
				} catch (e) {
					reject(e);
				}
			}
			function rejected(value) {
				try {
					step(generator["throw"](value));
				} catch (e) {
					reject(e);
				}
			}
			function step(result) {
				result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
			}
			step((generator = generator.apply(thisArg, _arguments || [])).next());
		});
	};
	var __generator = exports && exports.__generator || function(thisArg, body) {
		var _ = {
			label: 0,
			sent: function() {
				if (t[0] & 1) throw t[1];
				return t[1];
			},
			trys: [],
			ops: []
		}, f, y, t, g;
		return g = {
			next: verb(0),
			"throw": verb(1),
			"return": verb(2)
		}, typeof Symbol === "function" && (g[Symbol.iterator] = function() {
			return this;
		}), g;
		function verb(n) {
			return function(v) {
				return step([n, v]);
			};
		}
		function step(op) {
			if (f) throw new TypeError("Generator is already executing.");
			while (_) try {
				if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
				if (y = 0, t) op = [op[0] & 2, t.value];
				switch (op[0]) {
					case 0:
					case 1:
						t = op;
						break;
					case 4:
						_.label++;
						return {
							value: op[1],
							done: false
						};
					case 5:
						_.label++;
						y = op[1];
						op = [0];
						continue;
					case 7:
						op = _.ops.pop();
						_.trys.pop();
						continue;
					default:
						if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {
							_ = 0;
							continue;
						}
						if (op[0] === 3 && (!t || op[1] > t[0] && op[1] < t[3])) {
							_.label = op[1];
							break;
						}
						if (op[0] === 6 && _.label < t[1]) {
							_.label = t[1];
							t = op;
							break;
						}
						if (t && _.label < t[2]) {
							_.label = t[2];
							_.ops.push(op);
							break;
						}
						if (t[2]) _.ops.pop();
						_.trys.pop();
						continue;
				}
				op = body.call(thisArg, _);
			} catch (e) {
				op = [6, e];
				y = 0;
			} finally {
				f = t = 0;
			}
			if (op[0] & 5) throw op[1];
			return {
				value: op[0] ? op[1] : void 0,
				done: true
			};
		}
	};
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.Header = exports.Track = exports.Midi = void 0;
	var midi_file_1 = require_midi_file();
	var Header_1 = require_Header();
	var Track_1 = require_Track();
	var Encode_1 = require_Encode();
	exports.Midi = function() {
		/**
		* Parse the midi data
		*/
		function Midi(midiArray) {
			var _this = this;
			var midiData = null;
			if (midiArray) {
				var midiArrayLike = midiArray instanceof ArrayBuffer ? new Uint8Array(midiArray) : midiArray;
				midiData = (0, midi_file_1.parseMidi)(midiArrayLike);
				midiData.tracks.forEach(function(track) {
					var currentTicks = 0;
					track.forEach(function(event) {
						currentTicks += event.deltaTime;
						event.absoluteTime = currentTicks;
					});
				});
				midiData.tracks = splitTracks(midiData.tracks);
			}
			this.header = new Header_1.Header(midiData);
			this.tracks = [];
			if (midiArray) {
				this.tracks = midiData.tracks.map(function(trackData) {
					return new Track_1.Track(trackData, _this.header);
				});
				if (midiData.header.format === 1 && this.tracks[0].duration === 0) this.tracks.shift();
			}
		}
		/**
		* Download and parse the MIDI file. Returns a promise
		* which resolves to the generated MIDI file.
		* @param url The URL to fetch.
		*/
		Midi.fromUrl = function(url) {
			return __awaiter(this, void 0, void 0, function() {
				var response, arrayBuffer;
				return __generator(this, function(_a) {
					switch (_a.label) {
						case 0: return [4, fetch(url)];
						case 1:
							response = _a.sent();
							if (!response.ok) return [3, 3];
							return [4, response.arrayBuffer()];
						case 2:
							arrayBuffer = _a.sent();
							return [2, new Midi(arrayBuffer)];
						case 3: throw new Error("Could not load '".concat(url, "'"));
					}
				});
			});
		};
		Object.defineProperty(Midi.prototype, "name", {
			/**
			* The name of the midi file, taken from the first track.
			*/
			get: function() {
				return this.header.name;
			},
			set: function(n) {
				this.header.name = n;
			},
			enumerable: false,
			configurable: true
		});
		Object.defineProperty(Midi.prototype, "duration", {
			/**
			* The total length of the file in seconds.
			*/
			get: function() {
				var durations = this.tracks.map(function(t) {
					return t.duration;
				});
				return Math.max.apply(Math, durations);
			},
			enumerable: false,
			configurable: true
		});
		Object.defineProperty(Midi.prototype, "durationTicks", {
			/**
			* The total length of the file in ticks.
			*/
			get: function() {
				var durationTicks = this.tracks.map(function(t) {
					return t.durationTicks;
				});
				return Math.max.apply(Math, durationTicks);
			},
			enumerable: false,
			configurable: true
		});
		/**
		* Add a track to the MIDI file.
		*/
		Midi.prototype.addTrack = function() {
			var track = new Track_1.Track(void 0, this.header);
			this.tracks.push(track);
			return track;
		};
		/**
		* Encode the MIDI as a Uint8Array.
		*/
		Midi.prototype.toArray = function() {
			return (0, Encode_1.encode)(this);
		};
		/**
		* Convert the MIDI object to JSON.
		*/
		Midi.prototype.toJSON = function() {
			return {
				header: this.header.toJSON(),
				tracks: this.tracks.map(function(track) {
					return track.toJSON();
				})
			};
		};
		/**
		* Parse a JSON representation of the object. Will overwrite the current
		* tracks and header.
		*/
		Midi.prototype.fromJSON = function(json) {
			var _this = this;
			this.header = new Header_1.Header();
			this.header.fromJSON(json.header);
			this.tracks = json.tracks.map(function(trackJSON) {
				var track = new Track_1.Track(void 0, _this.header);
				track.fromJSON(trackJSON);
				return track;
			});
		};
		/**
		* Clone the entire object MIDI object.
		*/
		Midi.prototype.clone = function() {
			var midi = new Midi();
			midi.fromJSON(this.toJSON());
			return midi;
		};
		return Midi;
	}();
	var Track_2 = require_Track();
	Object.defineProperty(exports, "Track", {
		enumerable: true,
		get: function() {
			return Track_2.Track;
		}
	});
	var Header_2 = require_Header();
	Object.defineProperty(exports, "Header", {
		enumerable: true,
		get: function() {
			return Header_2.Header;
		}
	});
	/**
	* Given a list of MIDI tracks, make sure that each channel corresponds to at
	* most one channel and at most one instrument. This means splitting up tracks
	* that contain more than one channel or instrument.
	*/
	function splitTracks(tracks) {
		var newTracks = [];
		for (var i = 0; i < tracks.length; i++) {
			var defaultTrack = newTracks.length;
			var trackMap = /* @__PURE__ */ new Map();
			var currentProgram = Array(16).fill(0);
			for (var _i = 0, _a = tracks[i]; _i < _a.length; _i++) {
				var event_1 = _a[_i];
				var targetTrack = defaultTrack;
				var channel = event_1.channel;
				if (channel !== void 0) {
					if (event_1.type === "programChange") currentProgram[channel] = event_1.programNumber;
					var program = currentProgram[channel];
					var trackKey = "".concat(program, " ").concat(channel);
					if (trackMap.has(trackKey)) targetTrack = trackMap.get(trackKey);
					else {
						targetTrack = defaultTrack + trackMap.size;
						trackMap.set(trackKey, targetTrack);
					}
				}
				if (!newTracks[targetTrack]) newTracks.push([]);
				newTracks[targetTrack].push(event_1);
			}
		}
		return newTracks;
	}
})))(), 1)).default.Midi;
var normalizeMidiOscillator = (value) => {
	if (value === "sine" || value === "square" || value === "sawtooth" || value === "triangle") return value;
	return "auto";
};
//#endregion
//#region src/lib/jukette-player.css?inline
var jukette_player_default = ":host {\n	--jukette-control-size: 2em;\n	container-type: inline-size;\n	display: block;\n	font: inherit;\n	color: inherit;\n}\n\n* {\n	box-sizing: border-box;\n}\n\n.player {\n	border: 1px solid currentColor;\n	display: grid;\n	gap: 0.5lh;\n	padding: 0.5rlh 1em;\n}\n\n.track {\n	display: grid;\n	min-inline-size: 0;\n}\n\n.title,\n.meta {\n	overflow: hidden;\n	text-overflow: ellipsis;\n	white-space: nowrap;\n}\n\n.title {\n	font-weight: 700;\n}\n\n.meta {\n	opacity: 0.75;\n}\n\n.controls {\n	align-items: center;\n	display: grid;\n	gap: 0.5em;\n	grid-template-columns: var(--jukette-control-size) minmax(0, 1fr) auto;\n}\n\n.play {\n	block-size: var(--jukette-control-size);\n	inline-size: var(--jukette-control-size);\n}\n\nbutton {\n	align-items: center;\n	appearance: none;\n	background: transparent;\n	border: 1px solid currentColor;\n	block-size: var(--jukette-control-size);\n	color: inherit;\n	cursor: pointer;\n	display: inline-grid;\n	font: inherit;\n	inline-size: var(--jukette-control-size);\n	justify-content: center;\n	padding: 0;\n}\n\nbutton:focus-visible {\n	outline: 2px solid currentColor;\n	outline-offset: 0;\n	outline-radius: 0;\n}\n\nbutton:active {\n	background: rgb(\n		from currentColor calc(255 - r) calc(255 - g) calc(255 - b)\n	);\n	color: rgb(from currentColor calc(255 - r) calc(255 - g) calc(255 - b));\n}\n\nbutton[aria-pressed='true'] {\n	background: rgb(\n		from currentColor calc(255 - r) calc(255 - g) calc(255 - b)\n	);\n	color: rgb(from currentColor calc(255 - r) calc(255 - g) calc(255 - b));\n}\n\nbutton:disabled {\n	cursor: default;\n	opacity: 0.45;\n}\n\ninput[type='range'] {\n	accent-color: currentColor;\n}\n\n.seek {\n	display: grid;\n}\n\n.time {\n	border: 0;\n	block-size: auto;\n	inline-size: auto;\n	min-inline-size: 0;\n	padding: 0;\n	font-variant-numeric: tabular-nums;\n	text-align: end;\n	white-space: nowrap;\n}\n\n.time time {\n	display: block;\n}\n\n.track-select {\n	appearance: none;\n	background: transparent;\n	border: 1px solid currentColor;\n	border-radius: 0;\n	color: inherit;\n	cursor: pointer;\n	font: inherit;\n	inline-size: 100%;\n	padding: 0.35rem 0.5em;\n}\n\n.track-select:focus-visible {\n	outline: 2px solid currentColor;\n	outline-offset: 0;\n}\n\naudio {\n	display: none;\n}\n\n@container (max-width: 11rem) {\n	.controls {\n		grid-template-columns: var(--jukette-control-size) minmax(0, 1fr) auto;\n	}\n\n	.seek {\n		visibility: hidden;\n	}\n}\n";
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
				<div class="meta" part="artist status" role="status" aria-live="polite"></div>
			</div>
			<div class="controls" part="controls">
				<button class="play" part="button play-button" type="button" aria-label="Play">▶</button>
				<div class="seek" part="seek">
					<input class="seek-input" part="seek-input" type="range" min="0" max="1000" value="0" aria-label="Seek" />
				</div>
				<button class="time" part="time" type="button" aria-label="Toggle time display"><time datetime="PT0S">0:00</time></button>
			</div>
			<select class="track-select" part="track-select" aria-label="Track selection"></select>
			<audio preload="metadata"></audio>
		</div>
	`;
	return {
		audio: query(shadowRoot, "audio"),
		metaElement: query(shadowRoot, ".meta"),
		playButton: query(shadowRoot, ".play"),
		playerElement: query(shadowRoot, ".player"),
		seekInput: query(shadowRoot, ".seek-input"),
		statusElement: query(shadowRoot, ".meta"),
		titleElement: query(shadowRoot, ".title"),
		timeButton: query(shadowRoot, ".time"),
		timeElement: query(shadowRoot, ".time time"),
		trackSelect: query(shadowRoot, ".track-select")
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
		for (const track of tracks) this.preloadTrackMetadata(track, metadataPreloadId);
	}
	async preloadTrackMetadata(track, metadataPreloadId) {
		const backend = resolveJuketteBackend(track);
		if (!backend?.preloadTrack) return;
		try {
			const result = await backend.preloadTrack(track, {
				preloadDuration: this.options.getPreloadMetadata(),
				preloadMetadata: this.options.trackPrefersMediaMetadata(track)
			});
			if (metadataPreloadId !== this.preloadId || !result) return;
			if (this.options.getPreloadMetadata() && result.duration) this.setDuration(track, result.duration);
			if (this.options.trackPrefersMediaMetadata(track) && result.metadata) this.setMetadata(track, result.metadata);
		} catch {}
	}
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
		this.options.onStatusChange(message);
	}
	syncProgress(currentTime, duration) {
		const safeDuration = Number.isFinite(duration) ? Math.max(0, duration) : 0;
		const safeCurrentTime = Number.isFinite(currentTime) ? Math.min(Math.max(0, currentTime), safeDuration || Number.MAX_SAFE_INTEGER) : 0;
		const ratio = safeDuration > 0 ? Math.min(1, Math.max(0, safeCurrentTime / safeDuration)) : 0;
		this.options.dom.seekInput.value = String(Math.round(ratio * 1e3));
		const displayText = this.options.getTimeMode() === "remaining" ? `-${formatTime(Math.max(0, safeDuration - safeCurrentTime))}` : formatTime(safeCurrentTime);
		this.options.dom.timeElement.textContent = displayText;
		this.options.dom.timeElement.dateTime = `PT${Math.max(0, Math.round(this.options.getTimeMode() === "remaining" ? safeDuration - safeCurrentTime : safeCurrentTime))}S`;
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
//#region src/lib/player-track-select.ts
var renderTrackSelect = ({ currentIndex, element, formatTime, getDisplay, getDuration, tracks }) => {
	element.replaceChildren(...tracks.map((track, index) => {
		const option = document.createElement("option");
		const display = getDisplay(track);
		const durationValue = getDuration(track);
		const durationText = durationValue === void 0 ? "--:--" : formatTime(durationValue);
		const artist = display.artist ? ` - ${display.artist}` : "";
		option.value = String(index);
		option.textContent = `${display.title}${artist} (${durationText})`;
		return option;
	}));
	element.value = String(Math.max(0, Math.min(currentIndex, tracks.length - 1)));
};
//#endregion
//#region src/lib/player.ts
var JukettePlayerElement = class extends HTMLElementBase {
	static observedAttributes = [
		"src",
		ATTR_PLAYLIST,
		ATTR_PRELOAD_METADATA,
		ATTR_PREFER_MEDIA_METADATA,
		ATTR_MIDI_OSCILLATOR,
		ATTR_TRACK_INDEX
	];
	dom;
	metadataController;
	progressController;
	tracks = [];
	index = 0;
	desiredPlaying = false;
	playing = false;
	ready = false;
	trackLoadId = 0;
	duration = 0;
	activePlayableTrack = null;
	backendRegistrationCleanup = null;
	restartOnNextPlay = false;
	trackObserver = null;
	playlistOverride = null;
	loadedTrackKey = "";
	statusMessage = "";
	timeMode = "elapsed";
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
			onPlaylistDisplayChange: () => this.renderTrackSelect(),
			trackPrefersMediaMetadata: (track) => this.trackPrefersMediaMetadata(track)
		});
		this.progressController = new JuketteProgressController({
			dom: this.dom,
			getCurrentTime: () => this.getCurrentTime(),
			getDuration: () => this.duration,
			getPlaying: () => this.playing,
			getTimeMode: () => this.timeMode,
			onStatusChange: (message = "") => this.updateStatus(message)
		});
		this.dom.playButton.addEventListener("click", () => this.toggle());
		this.dom.timeButton.addEventListener("click", () => this.toggleTimeMode());
		this.dom.trackSelect.addEventListener("change", () => this.selectTrackFromInput());
		this.dom.seekInput.addEventListener("input", () => this.seekFromInput());
		this.dom.audio.addEventListener("loadedmetadata", () => this.syncAudio());
		this.dom.audio.addEventListener("timeupdate", () => this.syncAudio());
		this.dom.audio.addEventListener("ended", () => this.finishTrack());
	}
	connectedCallback() {
		this.backendRegistrationCleanup = subscribeJuketteBackendRegistrations(() => this.handleBackendRegistration());
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
		this.loadTrack();
	}
	disconnectedCallback() {
		this.backendRegistrationCleanup?.();
		this.backendRegistrationCleanup = null;
		this.trackObserver?.disconnect();
		this.stopProgressLoop();
		this.activePlayableTrack?.stop();
	}
	attributeChangedCallback(name, oldValue, newValue) {
		if (oldValue === newValue) return;
		if (name === "preload-metadata" || name === "prefer-media-metadata") {
			this.renderCurrentTrack();
			this.renderTrackSelect();
			this.preloadPlaylistMetadata();
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
		this.renderTrackSelect();
		this.preloadPlaylistMetadata();
		this.loadTrack();
	}
	async play() {
		if (!this.currentTrack || !this.ready) return;
		this.desiredPlaying = true;
		const trackLoadId = this.trackLoadId;
		const played = await this.activePlayableTrack?.play({
			isStale: () => trackLoadId !== this.trackLoadId,
			restart: this.restartOnNextPlay
		});
		this.restartOnNextPlay = false;
		if (trackLoadId !== this.trackLoadId) return;
		if (played) this.playing = true;
		this.syncPlayingState();
		if (played) this.emitJuketteEvent("jukette:play");
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
	seek(seconds) {
		if (!this.currentTrack || !this.ready) return;
		this.setStatus("Seeking");
		this.activePlayableTrack?.seek(seconds);
		if (this.playing) this.play();
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
			track: this.currentTrack,
			tracks: this.tracks,
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
		this.renderTrackSelect();
		this.preloadPlaylistMetadata();
	}
	syncChildTracks() {
		if (this.playlistOverride) return;
		const currentTrack = this.currentTrack;
		this.syncTracks();
		if (this.currentTrack?.src === currentTrack?.src) {
			this.renderTrackSelect();
			return;
		}
		this.loadTrack();
	}
	getChildTracks() {
		return Array.from(this.children).map((element) => trackFromElement(element)).filter((track) => track !== null);
	}
	createPlayableTrack(track) {
		const callbacks = this.createPlayableCallbacks(track);
		const backend = resolveJuketteBackend(track);
		if (!backend) return null;
		return backend.createPlayableTrack(track, callbacks, {
			audioElement: this.dom.audio,
			getMidiOscillator: () => this.midiOscillator,
			host: this
		});
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
			onReady: () => {
				if (!isCurrentTrack()) return;
				this.setReady(true);
				if (!this.playing) this.setStatus();
			},
			onStatus: (message = "") => {
				if (isCurrentTrack()) this.setStatus(message);
			}
		};
	}
	loadTrack() {
		this.trackLoadId += 1;
		const previousTrackKey = this.loadedTrackKey;
		this.activePlayableTrack?.stop();
		this.activePlayableTrack = null;
		this.desiredPlaying = false;
		this.playing = false;
		this.setReady(false);
		this.duration = 0;
		this.syncProgress(0, 0);
		const track = this.currentTrack;
		if (!track) {
			this.loadedTrackKey = "";
			this.statusMessage = "";
			this.dom.titleElement.textContent = "No track";
			this.dom.metaElement.textContent = "";
			this.setReady(false);
			this.dom.trackSelect.disabled = true;
			if (previousTrackKey) this.emitJuketteEvent("jukette:trackchange");
			return;
		}
		const type = inferTrackType(track);
		const trackKey = this.getTrackKey(track);
		this.loadedTrackKey = trackKey;
		this.duration = this.getTrackDuration(track) ?? 0;
		this.dataset.kind = type;
		this.setReady(false);
		this.dom.trackSelect.disabled = false;
		this.renderCurrentTrack();
		this.setStatus(`Preparing ${type}`);
		this.syncProgress(0, this.duration);
		this.activePlayableTrack = this.createPlayableTrack(track);
		if (!this.activePlayableTrack) {
			this.setStatus(`${type} playback unavailable`);
			this.renderTrackSelect();
			this.syncPlayingState();
			if (trackKey !== previousTrackKey) this.emitJuketteEvent("jukette:trackchange");
			return;
		}
		this.activePlayableTrack.load({
			metadataPreloadId: this.metadataController.metadataPreloadId,
			restart: this.restartOnNextPlay
		});
		this.renderTrackSelect();
		this.syncPlayingState();
		if (trackKey !== previousTrackKey) this.emitJuketteEvent("jukette:trackchange");
	}
	renderTrackSelect() {
		renderTrackSelect({
			currentIndex: this.index,
			element: this.dom.trackSelect,
			formatTime,
			getDisplay: (track) => this.getTrackDisplay(track),
			getDuration: (track) => this.getTrackDuration(track),
			tracks: this.tracks
		});
	}
	selectTrack(index) {
		this.restartOnNextPlay = true;
		if (index === this.index) {
			this.loadTrack();
			return;
		}
		this.index = index;
		this.loadTrack();
	}
	selectTrackFromInput() {
		const nextIndex = Number(this.dom.trackSelect.value);
		if (!Number.isInteger(nextIndex) || nextIndex < 0) return;
		this.selectTrack(nextIndex);
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
		this.renderMetaLine(display.artist || inferTrackType(track));
	}
	preloadPlaylistMetadata() {
		this.metadataController.preloadPlaylistMetadata();
	}
	toggleTimeMode() {
		if (!this.ready) return;
		this.timeMode = this.timeMode === "elapsed" ? "remaining" : "elapsed";
		this.syncProgress(this.getCurrentTime(), this.duration);
	}
	seekFromInput() {
		if (!this.ready || !this.duration) return;
		this.seek(Number(this.dom.seekInput.value) / 1e3 * this.duration);
	}
	syncAudio() {
		this.activePlayableTrack?.requestPosition(() => false);
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
	updateStatus(message = "") {
		this.statusMessage = message;
		const track = this.currentTrack;
		const display = track ? this.getTrackDisplay(track) : null;
		this.renderMetaLine(display?.artist || (track ? inferTrackType(track) : ""));
	}
	renderMetaLine(fallbackText) {
		this.dom.metaElement.textContent = this.statusMessage || fallbackText;
	}
	finishTrack() {
		this.desiredPlaying = false;
		this.playing = false;
		this.restartOnNextPlay = true;
		this.syncPlayingState();
		this.syncProgress(this.duration, this.duration);
		this.emitJuketteEvent("jukette:ended");
	}
	setReady(ready) {
		this.ready = ready;
		this.dom.playButton.disabled = !ready;
		this.dom.seekInput.disabled = !ready;
		this.dom.timeButton.disabled = !ready;
	}
	stopProgressLoop() {
		this.progressController.stop();
	}
	handleBackendRegistration() {
		this.preloadPlaylistMetadata();
		this.renderTrackSelect();
		const track = this.currentTrack;
		if (!track || this.activePlayableTrack) return;
		if (!resolveJuketteBackend(track)) return;
		this.loadTrack();
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
var defineJuketteElements = defineJuketteElement;
//#endregion
//#region src/lib/jukette.ts
registerJuketteAudioBackend();
//#endregion
exports.JukettePlayerElement = JukettePlayerElement;
exports.JuketteTrackElement = JuketteTrackElement;
exports.createJuketteEventDetail = createJuketteEventDetail;
exports.defineJuketteElement = defineJuketteElement;
exports.defineJuketteElements = defineJuketteElements;
exports.getJuketteBackend = getJuketteBackend;
exports.getRegisteredJuketteBackends = getRegisteredJuketteBackends;
exports.inferTrackType = inferTrackType;
exports.juketteAudioBackend = juketteAudioBackend;
exports.normalizeTrack = normalizeTrack;
exports.parseAudioFileMetadata = parseAudioFileMetadata;
exports.parsePlaylist = parsePlaylist;
exports.registerJuketteAudioBackend = registerJuketteAudioBackend;
exports.registerJuketteBackend = registerJuketteBackend;
exports.resetJuketteBackends = resetJuketteBackends;
exports.resolveJuketteBackend = resolveJuketteBackend;
exports.subscribeJuketteBackendRegistrations = subscribeJuketteBackendRegistrations;
exports.trackFromElement = trackFromElement;
