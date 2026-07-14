/*! jukette v0.3.0 | (c) 2026 Rémino Rem <https://remino.net/> | ISC Licence */
//#region src/lib/jukette.ts
var ATTR_SRC = "src";
var ATTR_PLAYLIST = "playlist";
var ATTR_PLAYLIST_OPEN = "playlist-open";
var ATTR_PRELOAD_METADATA = "preload-metadata";
var ATTR_PREFER_MEDIA_METADATA = "prefer-media-metadata";
var ATTR_MIDI_OSCILLATOR = "midi-oscillator";
var ATTR_TRACK_INDEX = "track-index";
var ATTR_TITLE = "title";
var ATTR_ARTIST = "artist";
var ATTR_TYPE = "type";
var SOUNDCLOUD_API_SRC = "https://w.soundcloud.com/player/api.js";
var SOUNDCLOUD_LOAD_TIMEOUT = 1e4;
var SOUNDCLOUD_PLAY_TIMEOUT = 5e3;
var HTMLElementBase = globalThis.HTMLElement ?? class {};
var soundCloudApiPromise = null;
var isRecord = (value) => typeof value === "object" && value !== null;
var normalizeBooleanAttribute = (value) => {
	if (value === null) return void 0;
	const normalizedValue = value.trim().toLowerCase();
	if (normalizedValue === "" || normalizedValue === "true") return true;
	if (normalizedValue === "false") return false;
};
var inferTrackType = (track) => {
	if (track.type) return track.type;
	const source = track.src.toLowerCase();
	if (source.includes("soundcloud.com")) return "soundcloud";
	if (/\.(?:mid|midi)(?:[?#].*)?$/.test(source)) return "midi";
	return "audio";
};
var createJuketteEventDetail = (detail) => ({
	...detail,
	tracks: [...detail.tracks],
	type: detail.track ? inferTrackType(detail.track) : void 0
});
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
var trackFromElement = (element) => {
	if (element.localName !== "jukette-track") return null;
	return normalizeTrack({
		artist: element.getAttribute(ATTR_ARTIST) ?? void 0,
		preferMediaMetadata: element.getAttribute(ATTR_PREFER_MEDIA_METADATA) ?? void 0,
		src: element.getAttribute(ATTR_SRC) ?? "",
		title: element.getAttribute(ATTR_TITLE) ?? void 0,
		type: element.getAttribute(ATTR_TYPE) ?? void 0
	});
};
var SoundCloudAdapter = class {
	iframe;
	callbacks;
	currentIsStale = () => false;
	eventsBound = false;
	loadId = 0;
	loadedDuration = 0;
	loadedSrc = "";
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
	getPlayerUrl(src) {
		const url = new URL("https://w.soundcloud.com/player/");
		url.searchParams.set("url", src);
		url.searchParams.set("auto_play", "false");
		url.searchParams.set("visual", "false");
		return url.toString();
	}
	prepare(src) {
		if (!this.widget && !this.iframe.src) this.iframe.src = this.getPlayerUrl(src);
	}
	async load(src, isStale) {
		this.currentIsStale = isStale;
		const widget = await this.getWidget(isStale);
		if (!widget || isStale()) return false;
		if (this.loadedSrc === src) {
			this.emitDuration(widget, isStale);
			return true;
		}
		const loadId = this.loadId += 1;
		this.loadedDuration = 0;
		if (!await new Promise((resolve) => {
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
		}) || isStale() || loadId !== this.loadId) return false;
		this.loadedSrc = src;
		this.emitDuration(widget, isStale);
		return true;
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
		widget.bind(api.Widget.Events.READY, () => {
			if (this.isStale() || widget !== this.widget) return;
			widget.getDuration((duration) => {
				if (this.isStale() || widget !== this.widget) return;
				this.loadedDuration = duration / 1e3;
				this.callbacks.onDuration(this.loadedDuration);
			});
			this.requestPosition(this.currentIsStale);
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
var JukettePlayerElement = class extends HTMLElementBase {
	static observedAttributes = [
		ATTR_SRC,
		ATTR_PLAYLIST,
		ATTR_PLAYLIST_OPEN,
		ATTR_PRELOAD_METADATA,
		ATTR_PREFER_MEDIA_METADATA,
		ATTR_MIDI_OSCILLATOR,
		ATTR_TRACK_INDEX
	];
	audio;
	iframe;
	playButton;
	previousButton;
	nextButton;
	volumeInput;
	seekInput;
	playlistButton;
	playlistElement;
	titleElement;
	metaElement;
	statusElement;
	elapsedTimeElement;
	remainingTimeElement;
	totalTimeElement;
	tracks = [];
	trackDurations = /* @__PURE__ */ new Map();
	trackMetadata = /* @__PURE__ */ new Map();
	index = 0;
	desiredPlaying = false;
	playing = false;
	trackLoadId = 0;
	duration = 0;
	midiTimer = 0;
	midiStartedAt = 0;
	midiPausedAt = 0;
	midiAudio = null;
	midiGain = null;
	midiSequence = null;
	midiSources = [];
	soundCloudAdapter = null;
	soundCloudPosition = 0;
	soundCloudPositionRequested = false;
	restartOnNextPlay = false;
	progressFrame = 0;
	metadataPreloadId = 0;
	trackObserver = null;
	playlistOverride = null;
	loadedTrackKey = "";
	constructor() {
		super();
		if (typeof MutationObserver !== "undefined") this.trackObserver = new MutationObserver(() => this.syncChildTracks());
		const shadowRoot = this.attachShadow({ mode: "open" });
		shadowRoot.innerHTML = `
			<style>
				:host {
					--jukette-control-size: 2em;
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
					gap: 0.5lh;
					padding: 0.5rlh 1em;
				}

				.track {
					display: grid;
					min-inline-size: 0;
				}

				.progress {
					display: grid;
					gap: 0;
				}

				.title,
				.meta {
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
					opacity: 0.75;
				}

				.status {
					min-block-size: 1lh;
					overflow: hidden;
					text-overflow: ellipsis;
					white-space: nowrap;
				}

				.controls {
					align-items: center;
					display: grid;
					gap: 0.5lh 0.5em;
					grid-template-areas: "previous play next volume playlist";
					grid-template-columns: repeat(3, var(--jukette-control-size)) minmax(7rem, 1fr) var(--jukette-control-size);
				}

				.previous {
					grid-area: previous;
				}

				.play {
					grid-area: play;
				}

				.next {
					grid-area: next;
				}

				.volume {
					grid-area: volume;
				}

				.playlist-toggle {
					grid-area: playlist;
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

				button:focus-visible {
					outline: 2px solid currentColor;
					outline-offset: 0;
					outline-radius: 0;
				}

				button:active {
					background: rgb(from currentColor calc(255 - r) calc(255 - g) calc(255 - b));
					color: rgb(from currentColor calc(255 - r) calc(255 - g) calc(255 - b));
				}

				button[aria-pressed="true"] {
					background: rgb(from currentColor calc(255 - r) calc(255 - g) calc(255 - b));
					color: rgb(from currentColor calc(255 - r) calc(255 - g) calc(255 - b));
				}

				button:disabled {
					cursor: default;
					opacity: 0.45;
				}

				input[type="range"] {
					accent-color: currentColor;
				}

				.seek {
					display: grid;
				}

				.time {
					display: grid;
					gap: 0.5em;
					grid-template-columns: repeat(3, 1fr);
					font-variant-numeric: tabular-nums;
				}

				.time span:nth-child(2) {
					text-align: center;
				}

				.time span:nth-child(3) {
					text-align: end;
				}

				.playlist {
					border-block-start: 1px solid currentColor;
					counter-reset: jukette-playlist;
					display: none;
					gap: 0.5lh 0;
					list-style: none;
					margin: 0;
					padding: 1lh 0 0.5lh;
				}

				:host([playlist-open]) .playlist {
					display: grid;
				}

				.playlist li {
					align-items: start;
					counter-increment: jukette-playlist;
					display: grid;
				}

				.playlist li button {
					padding-inline: 0.5em;
				}

				.playlist li button::before {
					content: counter(jukette-playlist) ".";
					grid-column: 1;
					grid-row: 1 / span 2;
					font-variant-numeric: tabular-nums;
					text-align: end;
				}

				.playlist li button[aria-current="true"] {
					background: rgb(from currentColor calc(255 - r) calc(255 - g) calc(255 - b));
					color: rgb(from currentColor calc(255 - r) calc(255 - g) calc(255 - b));
				}

				.playlist button {
					align-items: start;
					block-size: auto;
					border: 0;
					display: grid;
					gap: 0 0.5em;
					grid-template-columns: 2ch minmax(0, 1fr) auto;
					inline-size: 100%;
					text-align: start;
				}

				.playlist-title,
				.playlist-artist {
					overflow: hidden;
					text-overflow: ellipsis;
					white-space: nowrap;
				}

				.playlist-title {
					font-weight: 700;
					grid-column: 2;
				}

				.playlist-artist,
				.playlist-duration {
					opacity: 0.75;
				}

				.playlist-duration {
					align-self: center;
					font-variant-numeric: tabular-nums;
					grid-column: 3;
					grid-row: 1 / span 2;
					white-space: nowrap;
				}

				.playlist-artist {
					grid-column: 2;
				}

				.soundcloud {
					border: 0;
					block-size: 166px;
					display: none;
					inline-size: 100%;
				}

				audio {
					display: none;
				}

				@media (max-width: 34em) {
					.controls {
						grid-template-areas:
							"volume volume volume volume volume"
							"previous play next . playlist";
						grid-template-columns: repeat(3, var(--jukette-control-size)) minmax(0, 1fr) var(--jukette-control-size);
						justify-content: start;
					}
				}
			</style>

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
				<iframe class="soundcloud" part="soundcloud" title="SoundCloud player" allow="autoplay"></iframe>
				<audio preload="metadata"></audio>
				<ol class="playlist" part="playlist"></ol>
			</div>
		`;
		this.audio = this.query(shadowRoot, "audio");
		this.iframe = this.query(shadowRoot, ".soundcloud");
		this.playButton = this.query(shadowRoot, ".play");
		this.previousButton = this.query(shadowRoot, ".previous");
		this.nextButton = this.query(shadowRoot, ".next");
		this.volumeInput = this.query(shadowRoot, ".volume");
		this.seekInput = this.query(shadowRoot, ".seek-input");
		this.playlistButton = this.query(shadowRoot, ".playlist-toggle");
		this.playlistElement = this.query(shadowRoot, ".playlist");
		this.titleElement = this.query(shadowRoot, ".title");
		this.metaElement = this.query(shadowRoot, ".meta");
		this.statusElement = this.query(shadowRoot, ".status");
		this.elapsedTimeElement = this.query(shadowRoot, ".elapsed");
		this.remainingTimeElement = this.query(shadowRoot, ".remaining");
		this.totalTimeElement = this.query(shadowRoot, ".total");
		this.soundCloudAdapter = new SoundCloudAdapter(this.iframe, {
			onDuration: (duration) => {
				this.duration = duration;
				this.setTrackDuration(this.currentTrack, duration);
				this.syncProgress(this.soundCloudPosition, this.duration);
			},
			onFinish: () => this.finishTrack(),
			onPause: () => {
				const wasPlaying = this.playing || this.desiredPlaying;
				this.desiredPlaying = false;
				this.playing = false;
				this.syncPlayingState();
				if (wasPlaying) this.emitJuketteEvent("jukette:pause");
			},
			onPlay: () => {
				this.desiredPlaying = true;
				this.playing = true;
				this.syncPlayingState();
				this.emitJuketteEvent("jukette:play");
			},
			onPositionRequestComplete: () => {
				this.soundCloudPositionRequested = false;
			},
			onProgress: (position) => {
				this.soundCloudPosition = position;
				this.soundCloudPositionRequested = false;
				this.syncProgress(this.soundCloudPosition, this.duration);
			},
			onRelativeProgress: (relativePosition) => {
				if (this.duration <= 0) return;
				this.soundCloudPosition = relativePosition * this.duration;
				this.syncProgress(this.soundCloudPosition, this.duration);
			}
		});
		this.playButton.addEventListener("click", () => this.toggle());
		this.previousButton.addEventListener("click", () => this.previous());
		this.nextButton.addEventListener("click", () => this.next());
		this.playlistButton.addEventListener("click", () => this.togglePlaylist());
		this.volumeInput.addEventListener("input", () => this.syncVolume());
		this.seekInput.addEventListener("input", () => this.seekFromInput());
		this.audio.addEventListener("loadedmetadata", () => this.syncFromMedia());
		this.audio.addEventListener("timeupdate", () => this.syncFromMedia());
		this.audio.addEventListener("ended", () => this.finishTrack());
	}
	connectedCallback() {
		this.trackObserver?.observe(this, {
			attributeFilter: [
				ATTR_ARTIST,
				ATTR_PREFER_MEDIA_METADATA,
				ATTR_SRC,
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
		this.stopMidi();
	}
	attributeChangedCallback(name, oldValue, newValue) {
		if (oldValue === newValue) return;
		if (name === ATTR_PRELOAD_METADATA || name === ATTR_PREFER_MEDIA_METADATA) {
			this.renderCurrentTrack();
			this.renderPlaylist();
			this.preloadPlaylistMetadata();
			return;
		}
		if (name === ATTR_PLAYLIST_OPEN) {
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
		this.loadTrack();
	}
	async play() {
		const track = this.currentTrack;
		if (!track) return;
		this.desiredPlaying = true;
		const trackLoadId = this.trackLoadId;
		const type = inferTrackType(track);
		if (type === "audio") {
			this.setStatus("Starting audio");
			await this.audio.play();
			if (trackLoadId !== this.trackLoadId) return;
			this.playing = true;
		} else if (type === "midi") await this.playMidi(trackLoadId);
		else if (type === "soundcloud") await this.playSoundCloud(trackLoadId);
		else this.playing = true;
		this.syncPlayingState();
		if (type !== "soundcloud") this.emitJuketteEvent("jukette:play");
	}
	pause() {
		const wasPlaying = this.playing || this.desiredPlaying;
		this.setStatus();
		this.desiredPlaying = false;
		if (inferTrackType(this.currentTrack ?? { src: "" }) === "audio") this.audio.pause();
		else if (inferTrackType(this.currentTrack ?? { src: "" }) === "midi") this.pauseMidi();
		else if (inferTrackType(this.currentTrack ?? { src: "" }) === "soundcloud") this.soundCloudAdapter?.pause();
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
		if (inferTrackType(track) === "audio") this.audio.currentTime = seconds;
		else if (inferTrackType(track) === "midi") {
			this.midiPausedAt = Math.max(0, seconds);
			if (this.playing) this.playMidi();
		} else if (inferTrackType(track) === "soundcloud") {
			this.soundCloudPosition = Math.max(0, seconds);
			this.soundCloudAdapter?.seek(seconds);
		}
		this.syncProgress(seconds, this.duration);
		this.emitJuketteEvent("jukette:seek");
		window.setTimeout(() => {
			if (this.playing || !this.desiredPlaying) this.setStatus();
		}, 500);
	}
	getCurrentTime() {
		const track = this.currentTrack;
		if (!track) return 0;
		if (inferTrackType(track) === "audio") return this.audio.currentTime;
		if (inferTrackType(track) === "midi") return this.playing ? (performance.now() - this.midiStartedAt) / 1e3 + this.midiPausedAt : this.midiPausedAt;
		if (inferTrackType(track) === "soundcloud") return this.soundCloudPosition;
		return 0;
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
			volume: Number(this.volumeInput.value),
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
	query(root, selector) {
		const element = root.querySelector(selector);
		if (!element) throw new Error(`Missing Jukette element: ${selector}`);
		return element;
	}
	syncTracks() {
		const childTracks = this.getChildTracks();
		const attributeTracks = parsePlaylist(this.getAttribute(ATTR_PLAYLIST));
		const singleTrack = normalizeTrack(this.getAttribute(ATTR_SRC) ?? void 0);
		this.tracks = this.playlistOverride ?? (childTracks.length > 0 ? childTracks : attributeTracks.length > 0 ? attributeTracks : singleTrack ? [singleTrack] : []);
		const nextIndex = Number(this.getAttribute(ATTR_TRACK_INDEX));
		this.index = Number.isInteger(nextIndex) && nextIndex >= 0 ? Math.min(nextIndex, Math.max(0, this.tracks.length - 1)) : Math.min(this.index, Math.max(0, this.tracks.length - 1));
		this.renderPlaylist();
		this.preloadPlaylistMetadata();
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
	loadTrack() {
		this.trackLoadId += 1;
		const previousTrackKey = this.loadedTrackKey;
		this.stopMidi();
		this.audio.pause();
		this.audio.removeAttribute("src");
		this.soundCloudAdapter?.pause({ silent: true });
		this.soundCloudPosition = 0;
		this.soundCloudPositionRequested = false;
		this.playing = false;
		this.duration = 0;
		this.midiSequence = null;
		this.midiPausedAt = 0;
		this.syncProgress(0, 0);
		const track = this.currentTrack;
		if (!track) {
			this.loadedTrackKey = "";
			this.titleElement.textContent = "No track";
			this.metaElement.textContent = "";
			this.statusElement.textContent = "";
			this.playButton.disabled = true;
			if (previousTrackKey) this.emitJuketteEvent("jukette:trackchange");
			return;
		}
		const type = inferTrackType(track);
		const trackKey = this.getTrackKey(track);
		this.loadedTrackKey = trackKey;
		this.duration = this.getTrackDuration(track) ?? 0;
		this.dataset.kind = type;
		this.playButton.disabled = false;
		this.renderCurrentTrack();
		this.setStatus();
		this.syncProgress(0, this.duration);
		if (type === "audio") {
			this.setStatus("Loading audio");
			this.audio.src = track.src;
			this.audio.volume = Number(this.volumeInput.value);
			this.audio.load();
			this.audio.currentTime = 0;
			this.preloadAudioFileMetadata(track, this.metadataPreloadId);
		} else if (type === "soundcloud") {
			this.setStatus("Preparing SoundCloud");
			this.loadSoundCloudTrack(track);
		} else {
			this.setStatus("Ready");
			window.setTimeout(() => {
				if (!this.playing) this.setStatus();
			}, 700);
		}
		this.renderPlaylist();
		this.syncPlayingState();
		if (trackKey !== previousTrackKey) this.emitJuketteEvent("jukette:trackchange");
	}
	renderPlaylist() {
		this.playlistElement.replaceChildren(...this.tracks.map((track, index) => {
			const display = this.getTrackDisplay(track);
			const item = document.createElement("li");
			const button = document.createElement("button");
			const title = document.createElement("span");
			const artist = document.createElement("span");
			const duration = document.createElement("span");
			const durationValue = this.getTrackDuration(track);
			const durationText = durationValue === void 0 ? "--:--" : this.formatTime(durationValue);
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
			if (index === this.index) button.setAttribute("aria-current", "true");
			button.addEventListener("click", () => {
				this.desiredPlaying = true;
				this.restartOnNextPlay = true;
				this.index = index;
				this.loadTrack();
				this.play();
			});
			item.append(button);
			return item;
		}));
	}
	getTrackDuration(track) {
		if (!track) return void 0;
		return this.trackDurations.get(this.getTrackKey(track));
	}
	setTrackDuration(track, duration) {
		if (!track || !Number.isFinite(duration) || duration <= 0) return;
		const key = this.getTrackKey(track);
		const currentDuration = this.trackDurations.get(key);
		if (currentDuration !== void 0 && Math.abs(currentDuration - duration) < .5) return;
		this.trackDurations.set(key, duration);
		this.renderPlaylist();
	}
	getTrackKey(track) {
		return `${inferTrackType(track)}:${track.src}`;
	}
	trackPrefersMediaMetadata(track) {
		return track.preferMediaMetadata ?? this.preferMediaMetadata;
	}
	getTrackDisplay(track) {
		const metadata = this.trackPrefersMediaMetadata(track) ? this.trackMetadata.get(this.getTrackKey(track)) : void 0;
		return {
			artist: metadata?.artist || track.artist || "",
			title: metadata?.title || track.title || track.src
		};
	}
	renderCurrentTrack() {
		const track = this.currentTrack;
		if (!track) return;
		const display = this.getTrackDisplay(track);
		this.titleElement.textContent = display.title;
		this.metaElement.textContent = display.artist || inferTrackType(track);
	}
	setTrackMetadata(track, metadata) {
		if (!track) return;
		const nextMetadata = {
			artist: metadata.artist?.trim() || void 0,
			title: metadata.title?.trim() || void 0
		};
		if (!nextMetadata.artist && !nextMetadata.title) return;
		const key = this.getTrackKey(track);
		const currentMetadata = this.trackMetadata.get(key);
		if (currentMetadata !== void 0 && currentMetadata.artist === nextMetadata.artist && currentMetadata.title === nextMetadata.title) return;
		this.trackMetadata.set(key, nextMetadata);
		if (this.currentTrack && this.getTrackKey(this.currentTrack) === key) this.renderCurrentTrack();
		this.renderPlaylist();
	}
	preloadPlaylistMetadata() {
		this.metadataPreloadId += 1;
		const hasMetadataPreference = this.tracks.some((track) => this.trackPrefersMediaMetadata(track));
		if (!this.preloadMetadata && !hasMetadataPreference) return;
		const metadataPreloadId = this.metadataPreloadId;
		for (const track of this.tracks) {
			const type = inferTrackType(track);
			const preferMediaMetadata = this.trackPrefersMediaMetadata(track);
			if (type === "audio") {
				if (this.preloadMetadata) this.preloadAudioMetadata(track, metadataPreloadId);
				if (preferMediaMetadata) this.preloadAudioFileMetadata(track, metadataPreloadId);
			} else if (type === "midi") {
				if (this.preloadMetadata || preferMediaMetadata) this.preloadMidiMetadata(track, metadataPreloadId);
			} else if (type === "soundcloud") {
				if (preferMediaMetadata) this.preloadSoundCloudMetadata(track, metadataPreloadId);
			}
		}
	}
	preloadAudioMetadata(track, metadataPreloadId) {
		if (this.getTrackDuration(track) !== void 0) return;
		if (typeof Audio === "undefined") return;
		const audio = new Audio();
		const cleanup = () => {
			audio.removeEventListener("loadedmetadata", onLoadedMetadata);
			audio.removeEventListener("error", cleanup);
			audio.removeAttribute("src");
			audio.load();
		};
		const onLoadedMetadata = () => {
			if (metadataPreloadId === this.metadataPreloadId) this.setTrackDuration(track, audio.duration);
			cleanup();
		};
		audio.preload = "metadata";
		audio.addEventListener("loadedmetadata", onLoadedMetadata);
		audio.addEventListener("error", cleanup, { once: true });
		audio.src = track.src;
		audio.load();
	}
	async preloadAudioFileMetadata(track, metadataPreloadId) {
		if (!this.trackPrefersMediaMetadata(track)) return;
		if (this.trackMetadata.has(this.getTrackKey(track))) return;
		if (typeof fetch === "undefined") return;
		try {
			const response = await fetch(track.src, { headers: { Range: "bytes=0-65535" } });
			if (!response.ok) return;
			const metadata = parseAudioFileMetadata(await response.arrayBuffer());
			if (metadataPreloadId === this.metadataPreloadId) this.setTrackMetadata(track, metadata);
		} catch {}
	}
	async preloadMidiMetadata(track, metadataPreloadId) {
		try {
			const sequence = await loadMidiSequence(track.src);
			if (metadataPreloadId === this.metadataPreloadId) {
				if (this.preloadMetadata) this.setTrackDuration(track, sequence.duration);
				if (this.trackPrefersMediaMetadata(track)) this.setMidiTrackMetadata(track, sequence);
			}
		} catch {}
	}
	async preloadSoundCloudMetadata(track, metadataPreloadId) {
		if (!this.trackPrefersMediaMetadata(track)) return;
		if (this.trackMetadata.has(this.getTrackKey(track))) return;
		if (typeof fetch === "undefined") return;
		try {
			const url = new URL("https://soundcloud.com/oembed");
			url.searchParams.set("format", "json");
			url.searchParams.set("url", track.src);
			const response = await fetch(url);
			if (!response.ok) return;
			const metadata = parseSoundCloudOEmbedMetadata(await response.json());
			if (metadataPreloadId === this.metadataPreloadId) this.setTrackMetadata(track, metadata);
		} catch {}
	}
	setMidiTrackMetadata(track, sequence) {
		if (!sequence.metadata?.title) return;
		this.setTrackMetadata(track, { title: sequence.metadata.title });
	}
	togglePlaylist() {
		this.playlistOpen = !this.playlistOpen;
	}
	syncPlaylistButton() {
		this.playlistButton.setAttribute("aria-pressed", String(this.playlistOpen));
	}
	syncVolume() {
		this.audio.volume = Number(this.volumeInput.value);
		if (this.midiGain) this.midiGain.gain.value = Number(this.volumeInput.value);
		this.soundCloudAdapter?.setVolume(Number(this.volumeInput.value));
		this.emitJuketteEvent("jukette:volumechange");
	}
	seekFromInput() {
		if (!this.duration) return;
		this.seek(Number(this.seekInput.value) / 1e3 * this.duration);
	}
	syncFromMedia() {
		this.duration = Number.isFinite(this.audio.duration) ? this.audio.duration : 0;
		this.setTrackDuration(this.currentTrack, this.duration);
		this.syncProgress(this.audio.currentTime, this.duration);
		if (!this.playing) this.setStatus();
	}
	syncProgress(currentTime, duration) {
		const safeDuration = Number.isFinite(duration) ? Math.max(0, duration) : 0;
		const safeCurrentTime = Number.isFinite(currentTime) ? Math.min(Math.max(0, currentTime), safeDuration || Number.MAX_SAFE_INTEGER) : 0;
		const ratio = safeDuration > 0 ? Math.min(1, Math.max(0, safeCurrentTime / safeDuration)) : 0;
		this.seekInput.value = String(Math.round(ratio * 1e3));
		this.elapsedTimeElement.textContent = this.formatTime(safeCurrentTime);
		this.remainingTimeElement.textContent = `-${this.formatTime(Math.max(0, safeDuration - safeCurrentTime))}`;
		this.totalTimeElement.textContent = this.formatTime(safeDuration);
	}
	formatTime(seconds) {
		const roundedSeconds = Math.floor(Number.isFinite(seconds) ? Math.max(0, seconds) : 0);
		const minutes = Math.floor(roundedSeconds / 60);
		const remainder = roundedSeconds % 60;
		return `${minutes}:${String(remainder).padStart(2, "0")}`;
	}
	syncPlayingState() {
		this.playButton.textContent = this.playing ? "Ⅱ" : "▶";
		this.playButton.setAttribute("aria-label", this.playing ? "Pause" : "Play");
		if (this.playing) {
			this.setStatus();
			this.startProgressLoop();
		} else this.stopProgressLoop();
	}
	setStatus(message = "") {
		this.statusElement.textContent = message;
	}
	finishTrack() {
		this.emitJuketteEvent("jukette:ended");
		this.next();
	}
	async playMidi(trackLoadId = this.trackLoadId) {
		const track = this.currentTrack;
		if (!track) return;
		if (!this.midiSequence) {
			this.setStatus("Loading MIDI");
			this.midiSequence = await loadMidiSequence(track.src);
			if (trackLoadId !== this.trackLoadId) return;
			this.duration = this.midiSequence.duration;
			this.setTrackDuration(track, this.duration);
			if (this.trackPrefersMediaMetadata(track)) this.setMidiTrackMetadata(track, this.midiSequence);
			this.syncProgress(this.midiPausedAt, this.duration);
		}
		this.stopMidi();
		if (trackLoadId !== this.trackLoadId) return;
		this.playing = true;
		this.midiStartedAt = performance.now();
		this.ensureMidiAudio();
		if (!this.midiAudio || !this.midiGain || !this.midiSequence) return;
		if (this.midiAudio.state === "suspended") await this.midiAudio.resume();
		const startOffset = this.midiPausedAt;
		const startTime = this.midiAudio.currentTime + .03;
		const oscillatorType = resolveMidiOscillatorType(this.midiOscillator, this.midiSequence.metadata?.program);
		this.midiSources = this.midiSequence.notes.filter((note) => note.start + note.duration > startOffset).map((note) => {
			const oscillator = this.midiAudio.createOscillator();
			const envelope = this.midiAudio.createGain();
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
			envelope.connect(this.midiGain);
			oscillator.start(noteStart);
			oscillator.stop(noteEnd + .02);
			return oscillator;
		});
		this.midiTimer = window.setTimeout(() => this.finishTrack(), Math.max(0, this.duration - startOffset) * 1e3);
	}
	async playSoundCloud(trackLoadId = this.trackLoadId) {
		const track = this.currentTrack;
		if (!track) return;
		this.playButton.disabled = true;
		this.setStatus("Loading SoundCloud");
		const isStale = () => trackLoadId !== this.trackLoadId;
		let loaded;
		try {
			loaded = await this.soundCloudAdapter?.load(track.src, isStale) ?? false;
		} catch {
			loaded = false;
		}
		if (isStale()) return;
		if (!loaded) {
			this.playButton.disabled = false;
			this.setStatus("SoundCloud unavailable");
			return;
		}
		this.soundCloudAdapter?.setVolume(Number(this.volumeInput.value));
		if (this.restartOnNextPlay) {
			this.soundCloudAdapter?.seek(0);
			this.soundCloudPosition = 0;
			this.syncProgress(0, this.duration);
		}
		this.restartOnNextPlay = false;
		this.setStatus("Starting SoundCloud");
		const played = await this.soundCloudAdapter?.play(isStale);
		if (isStale()) return;
		if (!played) {
			this.playButton.disabled = false;
			this.setStatus("SoundCloud did not start");
			return;
		}
		this.playButton.disabled = false;
	}
	loadSoundCloudTrack(track) {
		this.soundCloudPosition = 0;
		this.syncProgress(0, this.getTrackDuration(track) ?? 0);
		this.soundCloudAdapter?.prepare(track.src);
	}
	startProgressLoop() {
		if (this.progressFrame || typeof requestAnimationFrame === "undefined") return;
		const tick = () => {
			if (!this.playing) {
				this.progressFrame = 0;
				return;
			}
			if (inferTrackType(this.currentTrack ?? { src: "" }) === "soundcloud") this.requestSoundCloudPosition();
			this.syncProgress(this.getCurrentTime(), this.duration);
			this.progressFrame = requestAnimationFrame(tick);
		};
		this.progressFrame = requestAnimationFrame(tick);
	}
	stopProgressLoop() {
		if (!this.progressFrame || typeof cancelAnimationFrame === "undefined") {
			this.progressFrame = 0;
			return;
		}
		cancelAnimationFrame(this.progressFrame);
		this.progressFrame = 0;
		this.syncProgress(this.getCurrentTime(), this.duration);
	}
	requestSoundCloudPosition() {
		if (!this.soundCloudAdapter || this.soundCloudPositionRequested) return;
		this.soundCloudPositionRequested = true;
		const trackLoadId = this.trackLoadId;
		window.setTimeout(() => {
			if (trackLoadId === this.trackLoadId) this.soundCloudPositionRequested = false;
		}, 500);
		this.soundCloudAdapter.requestPosition(() => trackLoadId !== this.trackLoadId);
	}
	pauseMidi() {
		this.midiPausedAt = this.getCurrentTime();
		this.stopMidi();
	}
	stopMidi() {
		if (this.midiTimer) {
			window.clearTimeout(this.midiTimer);
			this.midiTimer = 0;
		}
		for (const source of this.midiSources) try {
			source.stop();
		} catch {}
		this.midiSources = [];
	}
	ensureMidiAudio() {
		if (this.midiAudio && this.midiGain) return;
		const AudioContextConstructor = globalThis.AudioContext ?? globalThis.webkitAudioContext;
		if (!AudioContextConstructor) {
			this.setStatus("MIDI playback needs Web Audio");
			return;
		}
		this.midiAudio = new AudioContextConstructor();
		this.midiGain = this.midiAudio.createGain();
		this.midiGain.gain.value = Number(this.volumeInput.value);
		this.midiGain.connect(this.midiAudio.destination);
	}
};
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
