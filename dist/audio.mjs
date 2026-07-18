/*! jukette v0.3.0 | (c) 2026 Rémino Rem <https://remino.net/> | ISC Licence */
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
var registerJuketteBackend = (backend) => {
	backends.set(backend.type, backend);
	for (const listener of registrationListeners) listener(backend);
	return backend;
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
export { juketteAudioBackend, parseAudioFileMetadata, registerJuketteAudioBackend };
