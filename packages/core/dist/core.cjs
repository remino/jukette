/*! @remino/jukette-core v0.3.0 | (c) 2026 Rémino Rem <https://remino.net/> | ISC Licence */
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
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
//#region src/lib/midi.ts
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
	loadedTrackKey = "";
	statusMessage = "";
	timeMode = "elapsed";
	constructor() {
		super();
		if (typeof MutationObserver !== "undefined") this.trackObserver = new MutationObserver(() => this.syncChildTracks());
		this.dom = createJukettePlayerDom(this);
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
exports.getJuketteBackend = getJuketteBackend;
exports.getRegisteredJuketteBackends = getRegisteredJuketteBackends;
exports.inferTrackType = inferTrackType;
exports.normalizeMidiOscillator = normalizeMidiOscillator;
exports.normalizeTrack = normalizeTrack;
exports.parsePlaylist = parsePlaylist;
exports.registerJuketteBackend = registerJuketteBackend;
exports.resetJuketteBackends = resetJuketteBackends;
exports.resolveJuketteBackend = resolveJuketteBackend;
exports.subscribeJuketteBackendRegistrations = subscribeJuketteBackendRegistrations;
exports.trackFromElement = trackFromElement;
