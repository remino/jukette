/*! @remino/jukette-core v0.7.1 | (c) 2026 Rémino Rem <https://remino.net/> | ISC Licence */
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
let remarqueeble = require("remarqueeble");
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
//#region src/lib/dom.ts
var HTMLElementBase = globalThis.HTMLElement ?? class {};
//#endregion
//#region src/lib/attributes.ts
var ATTR_PLAYLIST = "playlist";
var ATTR_PLAYLIST_SRC = "playlist-src";
var ATTR_PRELOAD = "preload";
var ATTR_PRELOAD_METADATA = "preload-metadata";
var ATTR_PREFER_MEDIA_METADATA = "prefer-media-metadata";
var ATTR_DISPLAY_MARQUEE = "display-marquee";
var ATTR_MIDI_OSCILLATOR = "midi-oscillator";
var ATTR_TRACK_INDEX = "track-index";
var ATTR_TITLE = "title";
var ATTR_ARTIST = "artist";
var ATTR_TYPE = "type";
var ATTR_SHOW_SOURCE_LINK = "show-source-link";
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
var normalizeStartAt = (value) => {
	if (typeof value === "number") return Number.isFinite(value) ? Math.max(0, value) : void 0;
	if (typeof value !== "string") return void 0;
	const trimmed = value.trim();
	if (!trimmed) return void 0;
	const parsed = Number(trimmed);
	return Number.isFinite(parsed) ? Math.max(0, parsed) : void 0;
};
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
	if (typeof value.showSourceLink === "boolean") track.showSourceLink = value.showSourceLink;
	else if (typeof value.showSourceLink === "string") {
		const showSourceLink = normalizeBooleanAttribute(value.showSourceLink);
		if (showSourceLink !== void 0) track.showSourceLink = showSourceLink;
	}
	const startAt = normalizeStartAt(value.startAt);
	if (startAt !== void 0) track.startAt = startAt;
	if (typeof value.title === "string") track.title = value.title;
	if (typeof value.type === "string" && value.type.trim()) track.type = value.type.trim();
	return track;
};
var parsePlaylist = (value) => {
	if (!value) return [];
	try {
		return normalizePlaylistItems(JSON.parse(value));
	} catch {
		return value.split("\n").map((item) => normalizeTrack(item)).filter((item) => item !== null);
	}
};
var normalizePlaylistItems = (value) => {
	return (Array.isArray(value) ? value : [value]).map((item) => normalizeTrack(item)).filter((item) => item !== null);
};
var trackFromElement = (element) => {
	if (element.localName !== "jukette-track") return null;
	return normalizeTrack({
		artist: element.getAttribute("artist") ?? void 0,
		preferMediaMetadata: element.getAttribute("prefer-media-metadata") ?? void 0,
		preload: element.getAttribute("preload") ?? void 0,
		showSourceLink: element.getAttribute("show-source-link") ?? void 0,
		startAt: element.getAttribute("start-at") ?? void 0,
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
//#region src/lib/midi.ts
var normalizeMidiOscillator = (value) => {
	if (value === "sine" || value === "square" || value === "sawtooth" || value === "triangle") return value;
	return "auto";
};
//#endregion
//#region src/lib/player-display.ts
var normalizeDisplayMarquee = (value) => {
	if (value === "always" || value === "never" || value === "overflow") return value;
	return "overflow";
};
var formatTrackDisplay = (display) => {
	const title = display.title.trim();
	const artist = display.artist.trim();
	if (!artist) return title;
	return `${title} - ${artist}`;
};
//#endregion
//#region src/lib/jukette-player.css?inline
var jukette_player_default = ":host{--jukette-control-size:2em;font:inherit;color:inherit;display:block;container-type:inline-size}*{box-sizing:border-box}.player{border:1px solid;gap:.5lh;padding:.5rlh 1em;display:grid}.track{grid-template-columns:minmax(0,1fr) auto;align-items:start;gap:.5em;min-inline-size:0;display:grid}.display{white-space:nowrap;align-self:center;font-weight:700;display:block;overflow:hidden}.source-link{color:inherit;min-block-size:var(--jukette-control-size);min-inline-size:var(--jukette-control-size);border:1px solid;align-self:center;place-items:center;font-weight:700;line-height:1;text-decoration:none;display:inline-grid}.source-link-glyph{transform:translateY(-.04em)}.source-link:focus-visible{outline-offset:.1em;outline:2px solid}.source-link[hidden]{display:none}.controls{grid-template-columns:var(--jukette-control-size) minmax(0, 1fr) auto;align-items:center;gap:.5em;display:grid}.play{block-size:var(--jukette-control-size);inline-size:var(--jukette-control-size)}button{appearance:none;block-size:var(--jukette-control-size);color:inherit;cursor:pointer;font:inherit;inline-size:var(--jukette-control-size);background:0 0;border:1px solid;justify-content:center;align-items:center;padding:0;display:inline-grid}button:focus-visible{outline-offset:0;outline-radius:0;outline:2px solid}button:active,button[aria-pressed=true]{background:rgb(from currentColor calc(255 - r) calc(255 - g) calc(255 - b));color:rgb(from currentColor calc(255 - r) calc(255 - g) calc(255 - b))}button:disabled{cursor:default;opacity:.45}input[type=range]{accent-color:currentColor;width:100%;margin:0}.seek{display:grid}.time{text-align:end;white-space:nowrap;border:0;justify-content:end;justify-items:end;block-size:auto;inline-size:auto;padding:0}.time time{font-variant-numeric:tabular-nums;min-inline-size:3em;font-family:monospace;display:block}.track-select{appearance:none;color:inherit;cursor:pointer;font:inherit;background:0 0;border:1px solid;border-radius:0;inline-size:100%;padding:.35rem .5em}.track-select:focus-visible{outline-offset:0;outline:2px solid}audio{display:none}@container (width<=11rem){.controls{grid-template-columns:var(--jukette-control-size) minmax(0, 1fr) auto}.seek{visibility:hidden}}";
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
				<re-marquee class="display" part="display" role="status" aria-live="polite" animate="overflow"></re-marquee>
				<a
					class="source-link"
					part="source-link"
					aria-label="Open source page"
					hidden
					rel="noopener noreferrer"
					target="_blank"
					title="Open source page"
				><span class="source-link-glyph">↗</span></a>
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
		displayElement: query(shadowRoot, ".display"),
		playButton: query(shadowRoot, ".play"),
		playerElement: query(shadowRoot, ".player"),
		seekInput: query(shadowRoot, ".seek-input"),
		sourceLink: query(shadowRoot, ".source-link"),
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
		const metadata = this.metadata.get(this.options.getTrackKey(track));
		const preferMetadata = this.options.trackPrefersMediaMetadata(track);
		return {
			artist: preferMetadata ? metadata?.artist || track.artist || "" : track.artist || metadata?.artist || "",
			title: preferMetadata ? metadata?.title || track.title || track.src : track.title || metadata?.title || track.src
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
		const hasPrepareRequests = tracks.some((track) => track.preload);
		if (!this.options.getPreloadMetadata() && !hasMetadataPreference && !hasPrepareRequests) return;
		const metadataPreloadId = this.preloadId;
		for (const track of tracks) this.preloadTrackMetadata(track, metadataPreloadId);
	}
	async preloadTrackMetadata(track, metadataPreloadId) {
		const backend = resolveJuketteBackend(track);
		if (!backend?.preloadTrack) return;
		try {
			const result = await backend.preloadTrack(track, {
				host: this.options.getHost(),
				preloadDuration: this.options.getPreloadMetadata(),
				preloadMetadata: this.options.trackPrefersMediaMetadata(track),
				prepare: Boolean(track.preload),
				trackElement: this.options.getTrackElement(track)
			});
			if (metadataPreloadId !== this.preloadId || !result) return;
			if (result.duration) this.setDuration(track, result.duration);
			if (result.metadata) this.setMetadata(track, result.metadata);
		} catch {}
	}
};
//#endregion
//#region src/lib/player-time.ts
var pad = (val) => String(val).padStart(2, "0");
var formatTime = (seconds) => {
	const roundedSeconds = Math.floor(Number.isFinite(seconds) ? Math.max(0, seconds) : 0);
	return `${Math.floor(roundedSeconds / 60)}:${pad(roundedSeconds % 60)}`;
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
	restart() {
		this.stop();
		this.start();
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
		option.value = String(index);
		option.textContent = `${formatTrackDisplay(display)} (${durationText})`;
		return option;
	}));
	element.value = String(Math.max(0, Math.min(currentIndex, tracks.length - 1)));
};
//#endregion
//#region src/lib/player.ts
var JukettePlayerElement = class JukettePlayerElement extends HTMLElementBase {
	static observedAttributes = [
		"src",
		ATTR_PLAYLIST,
		ATTR_PLAYLIST_SRC,
		ATTR_PRELOAD_METADATA,
		ATTR_PREFER_MEDIA_METADATA,
		ATTR_SHOW_SOURCE_LINK,
		ATTR_DISPLAY_MARQUEE,
		ATTR_MIDI_OSCILLATOR,
		ATTR_TRACK_INDEX
	];
	static reconnectGraceMs = 1e3;
	dom;
	metadataController;
	progressController;
	trackElements = /* @__PURE__ */ new WeakMap();
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
	remotePlaylist = null;
	remotePlaylistError = "";
	remotePlaylistLoading = false;
	remotePlaylistRequestId = 0;
	remotePlaylistSource = "";
	remotePlaylistSelected = false;
	loadedTrackKey = "";
	statusMessage = "";
	timeMode = "elapsed";
	disconnectTeardownId = null;
	constructor() {
		super();
		(0, remarqueeble.defineRemarqueebleElements)();
		if (typeof MutationObserver !== "undefined") this.trackObserver = new MutationObserver(() => this.syncChildTracks());
		this.dom = createJukettePlayerDom(this);
		this.syncDisplayMarqueeMode();
		this.metadataController = new JuketteMetadataController({
			getHost: () => this,
			getPreloadMetadata: () => this.preloadMetadata,
			getTrackElement: (track) => this.trackElements.get(track) ?? null,
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
		this.dom.trackSelect.addEventListener("keyup", (event) => this.handleTrackSelectKeyup(event));
		this.dom.seekInput.addEventListener("input", () => this.seekFromInput());
		this.dom.audio.addEventListener("loadedmetadata", () => this.syncAudio());
		this.dom.audio.addEventListener("timeupdate", () => this.syncAudio());
		this.dom.audio.addEventListener("ended", () => this.finishTrack());
	}
	connectedCallback() {
		if (this.disconnectTeardownId !== null) {
			window.clearTimeout(this.disconnectTeardownId);
			this.disconnectTeardownId = null;
		}
		this.backendRegistrationCleanup = subscribeJuketteBackendRegistrations(() => this.handleBackendRegistration());
		this.trackObserver?.observe(this, {
			attributeFilter: [
				ATTR_ARTIST,
				ATTR_PREFER_MEDIA_METADATA,
				ATTR_PRELOAD,
				ATTR_SHOW_SOURCE_LINK,
				"src",
				ATTR_TITLE,
				ATTR_TYPE
			],
			attributes: true,
			childList: true,
			subtree: true
		});
		if (this.hasRemotePlaylistSource()) this.syncRemotePlaylist();
		if (this.canResumeConnectedTrack()) {
			this.restoreConnectedTrack();
			return;
		}
		this.syncTracks();
		this.loadTrack();
	}
	disconnectedCallback() {
		this.backendRegistrationCleanup?.();
		this.backendRegistrationCleanup = null;
		this.trackObserver?.disconnect();
		this.stopProgressLoop();
		this.disconnectTeardownId = window.setTimeout(() => {
			if (this.isConnected) return;
			this.activePlayableTrack?.stop();
			this.activePlayableTrack = null;
			this.disconnectTeardownId = null;
		}, JukettePlayerElement.reconnectGraceMs);
	}
	attributeChangedCallback(name, oldValue, newValue) {
		if (oldValue === newValue) return;
		if (name === "preload-metadata" || name === "prefer-media-metadata") {
			this.renderCurrentTrack();
			this.renderTrackSelect();
			this.preloadPlaylistMetadata();
			return;
		}
		if (name === "display-marquee") {
			this.syncDisplayMarqueeMode();
			return;
		}
		if (name === "playlist-src" && this.isConnected) this.syncRemotePlaylist();
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
	get showSourceLink() {
		return this.hasAttribute(ATTR_SHOW_SOURCE_LINK);
	}
	set showSourceLink(show) {
		this.toggleAttribute(ATTR_SHOW_SOURCE_LINK, show);
	}
	get displayMarquee() {
		return normalizeDisplayMarquee(this.getAttribute(ATTR_DISPLAY_MARQUEE));
	}
	set displayMarquee(mode) {
		this.setAttribute(ATTR_DISPLAY_MARQUEE, normalizeDisplayMarquee(mode));
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
		const remoteTracks = this.remotePlaylist ?? [];
		const singleTrack = normalizeTrack(this.getAttribute("src") ?? void 0);
		this.remotePlaylistSelected = this.playlistOverride === null && childTracks.length === 0 && attributeTracks.length === 0 && this.hasRemotePlaylistSource();
		this.tracks = this.playlistOverride ?? (childTracks.length > 0 ? childTracks : attributeTracks.length > 0 ? attributeTracks : remoteTracks.length > 0 ? remoteTracks : singleTrack ? [singleTrack] : []);
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
		return Array.from(this.children).flatMap((element) => {
			const track = trackFromElement(element);
			if (!track) return [];
			this.trackElements.set(track, element);
			return [track];
		});
	}
	createPlayableTrack(track) {
		const callbacks = this.createPlayableCallbacks(track);
		const backend = resolveJuketteBackend(track);
		if (!backend) return null;
		return backend.createPlayableTrack(track, callbacks, {
			audioElement: this.dom.audio,
			getMidiOscillator: () => this.midiOscillator,
			host: this,
			trackElement: this.trackElements.get(track) ?? null
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
			this.renderDisplay(this.getEmptyTrackDisplayText());
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
	handleTrackSelectKeyup(event) {
		if (event.key !== "Enter" && event.key !== " ") return;
		if (!this.ready || this.dom.trackSelect.disabled) return;
		if (event.key === "Enter") {
			this.toggle();
			return;
		}
		if (this.playing) return;
		this.play();
	}
	canResumeConnectedTrack() {
		const track = this.currentTrack;
		if (!track) return false;
		if (!this.activePlayableTrack) return false;
		return this.loadedTrackKey === this.getTrackKey(track);
	}
	restoreConnectedTrack() {
		this.dom.trackSelect.disabled = false;
		this.renderCurrentTrack();
		this.renderTrackSelect();
		this.syncProgress(this.getCurrentTime(), this.duration);
		this.syncPlayingState();
		if (!this.playing) this.setStatus();
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
		this.renderDisplay(this.statusMessage || formatTrackDisplay(display), track);
	}
	preloadPlaylistMetadata() {
		this.metadataController.preloadPlaylistMetadata();
	}
	toggleTimeMode() {
		if (!this.ready) return;
		this.timeMode = this.timeMode === "elapsed" ? "remaining" : "elapsed";
		this.syncProgress(this.getCurrentTime(), this.duration);
		if (this.playing) this.progressController.restart();
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
		if (!track) {
			this.renderDisplay(message || "No track");
			return;
		}
		this.renderDisplay(message || formatTrackDisplay(this.getTrackDisplay(track)), track);
	}
	renderDisplay(text, track = null) {
		this.dom.displayElement.textContent = text;
		this.dom.displayElement.stop();
		this.dom.displayElement.start();
		this.syncSourceLink(track);
	}
	syncSourceLink(track) {
		const sourceUrl = this.getTrackSourceUrl(track);
		if (!sourceUrl) {
			this.dom.sourceLink.hidden = true;
			this.dom.sourceLink.removeAttribute("href");
			return;
		}
		this.dom.sourceLink.href = sourceUrl;
		this.dom.sourceLink.hidden = false;
	}
	getTrackSourceUrl(track) {
		if (!track) return null;
		if (!this.trackShowsSourceLink(track)) return null;
		return track.src;
	}
	trackShowsSourceLink(track) {
		return track.showSourceLink ?? this.showSourceLink;
	}
	syncDisplayMarqueeMode() {
		this.dom.displayElement.setAttribute("animate", this.displayMarquee);
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
	getEmptyTrackDisplayText() {
		if (!this.remotePlaylistSelected) return "No track";
		if (this.remotePlaylistLoading) return "Loading playlist";
		if (this.remotePlaylistError) return this.remotePlaylistError;
		return "No track";
	}
	hasRemotePlaylistSource() {
		return (this.getAttribute("playlist-src") ?? "").trim().length > 0;
	}
	async syncRemotePlaylist() {
		const playlistSrc = (this.getAttribute("playlist-src") ?? "").trim();
		if (!playlistSrc) {
			this.remotePlaylistRequestId += 1;
			this.remotePlaylistSource = "";
			this.remotePlaylist = null;
			this.remotePlaylistError = "";
			this.remotePlaylistLoading = false;
			this.syncTracks();
			this.loadTrack();
			return;
		}
		if (playlistSrc === this.remotePlaylistSource && (this.remotePlaylistLoading || this.remotePlaylist !== null || this.remotePlaylistError !== "")) return;
		const requestId = ++this.remotePlaylistRequestId;
		this.remotePlaylistSource = playlistSrc;
		this.remotePlaylist = null;
		this.remotePlaylistError = "";
		this.remotePlaylistLoading = true;
		this.syncTracks();
		this.loadTrack();
		if (typeof fetch === "undefined") {
			if (requestId !== this.remotePlaylistRequestId) return;
			this.remotePlaylistLoading = false;
			this.remotePlaylistError = "Playlist fetch unavailable";
			this.syncTracks();
			this.loadTrack();
			return;
		}
		try {
			const response = await fetch(playlistSrc);
			if (!response.ok) throw new Error(`Playlist request failed: ${response.status}`);
			const parsed = normalizePlaylistItems(JSON.parse(await response.text()));
			if (requestId !== this.remotePlaylistRequestId) return;
			this.remotePlaylist = parsed;
			this.remotePlaylistError = "";
			this.remotePlaylistLoading = false;
		} catch {
			if (requestId !== this.remotePlaylistRequestId) return;
			this.remotePlaylist = null;
			this.remotePlaylistError = "Playlist failed to load";
			this.remotePlaylistLoading = false;
		}
		this.syncTracks();
		this.loadTrack();
	}
};
//#endregion
//#region src/lib/elements.ts
var defineElement = () => {
	if (typeof customElements === "undefined") return;
	if (!customElements.get("jukette-track")) customElements.define("jukette-track", JuketteTrackElement);
	if (!customElements.get("jukette-player")) customElements.define("jukette-player", JukettePlayerElement);
};
var JuketteTrackElement = class extends HTMLElementBase {};
var defineElements = defineElement;
var defineJuketteElement = defineElement;
var defineJuketteElements = defineElement;
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
exports.JukettePlayableTrack = JukettePlayableTrack;
exports.JukettePlayerElement = JukettePlayerElement;
exports.JuketteTrackElement = JuketteTrackElement;
exports.cleanMetadataText = cleanMetadataText;
exports.createJuketteEventDetail = createJuketteEventDetail;
exports.decodeAscii = decodeAscii;
exports.decodeIso88591 = decodeIso88591;
exports.decodeTextBytes = decodeTextBytes;
exports.decodeUtf16Be = decodeUtf16Be;
exports.defineElement = defineElement;
exports.defineElements = defineElements;
exports.defineJuketteElement = defineJuketteElement;
exports.defineJuketteElements = defineJuketteElements;
exports.formatTrackDisplay = formatTrackDisplay;
exports.getJuketteBackend = getJuketteBackend;
exports.getRegisteredJuketteBackends = getRegisteredJuketteBackends;
exports.inferTrackType = inferTrackType;
exports.normalizeDisplayMarquee = normalizeDisplayMarquee;
exports.normalizeMidiOscillator = normalizeMidiOscillator;
exports.normalizeTrack = normalizeTrack;
exports.parsePlaylist = parsePlaylist;
exports.registerJuketteBackend = registerJuketteBackend;
exports.resetJuketteBackends = resetJuketteBackends;
exports.resolveJuketteBackend = resolveJuketteBackend;
exports.subscribeJuketteBackendRegistrations = subscribeJuketteBackendRegistrations;
exports.trackFromElement = trackFromElement;
