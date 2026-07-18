/*! @remino/jukette-soundcloud v0.4.2 | (c) 2026 Rémino Rem <https://remino.net/> | ISC Licence */
import { JukettePlayableTrack, registerJuketteBackend } from "@remino/jukette-core";
//#region src/lib/soundcloud.ts
var soundCloudWidgetApiUrl = "https://w.soundcloud.com/player/api.js";
var soundCloudOEmbedUrl = "https://soundcloud.com/oembed";
var soundCloudRootAttribute = "data-jukette-soundcloud-root";
var soundCloudPlayerType = "soundcloud";
var soundCloudWidgetPromise = null;
var elementStates = /* @__PURE__ */ new WeakMap();
var hostStates = /* @__PURE__ */ new WeakMap();
var getSoundCloudWindow = () => typeof window !== "undefined" && window.SC?.Widget ? window.SC : null;
var ensureSoundCloudWidgetApi = async () => {
	const available = getSoundCloudWindow();
	if (available) return available;
	if (soundCloudWidgetPromise) return soundCloudWidgetPromise;
	if (typeof document === "undefined") throw new Error("SoundCloud widget API requires a document context.");
	soundCloudWidgetPromise = new Promise((resolve, reject) => {
		const existingScript = document.querySelector(`script[src="${soundCloudWidgetApiUrl}"]`);
		const script = existingScript ?? document.createElement("script");
		const cleanup = () => {
			script.removeEventListener("load", onLoad);
			script.removeEventListener("error", onError);
		};
		const onError = () => {
			cleanup();
			soundCloudWidgetPromise = null;
			reject(/* @__PURE__ */ new Error("Failed to load the SoundCloud widget API."));
		};
		const onLoad = () => {
			cleanup();
			const nextAvailable = getSoundCloudWindow();
			if (!nextAvailable) {
				soundCloudWidgetPromise = null;
				reject(/* @__PURE__ */ new Error("SoundCloud widget API did not initialize."));
				return;
			}
			resolve(nextAvailable);
		};
		script.addEventListener("load", onLoad, { once: true });
		script.addEventListener("error", onError, { once: true });
		if (!existingScript) {
			script.async = true;
			script.src = soundCloudWidgetApiUrl;
			document.head.append(script);
		}
	});
	return soundCloudWidgetPromise;
};
var getHostStateKey = (track) => `${track.type ?? soundCloudPlayerType}:${track.src}`;
var parseSoundCloudMetadata = (oembed) => {
	const title = oembed.title?.replace(/\s+by\s+[^]+$/, "").trim();
	const artist = oembed.author_name?.trim();
	if (!title && !artist) return;
	return {
		artist,
		title
	};
};
var parseSoundCloudIframeSrc = (oembed) => {
	if (!oembed.html || typeof document === "undefined") return null;
	const template = document.createElement("template");
	template.innerHTML = oembed.html;
	return template.content.querySelector("iframe")?.getAttribute("src") ?? null;
};
var createHiddenIframe = (src) => {
	const iframe = document.createElement("iframe");
	iframe.src = src;
	iframe.hidden = true;
	iframe.tabIndex = -1;
	iframe.title = "SoundCloud player";
	iframe.setAttribute("aria-hidden", "true");
	iframe.setAttribute("allow", "autoplay; encrypted-media");
	iframe.setAttribute("data-jukette-soundcloud-iframe", "");
	iframe.style.blockSize = "0";
	iframe.style.border = "0";
	iframe.style.inlineSize = "0";
	iframe.style.opacity = "0";
	iframe.style.pointerEvents = "none";
	iframe.style.position = "absolute";
	return iframe;
};
var getSoundCloudRoot = (host) => {
	const rootNode = host.shadowRoot ?? host;
	const existing = rootNode.querySelector(`[${soundCloudRootAttribute}]`);
	if (existing) return existing;
	const root = document.createElement("div");
	root.hidden = true;
	root.setAttribute(soundCloudRootAttribute, "");
	root.style.display = "none";
	rootNode.append(root);
	return root;
};
var SoundCloudTrackState = class {
	track;
	host;
	trackElement;
	activeTrack = null;
	durationSeconds = 0;
	iframeElement = null;
	metadata;
	oEmbedPromise = null;
	playRequested = false;
	playing = false;
	positionSeconds = 0;
	ready = false;
	widget = null;
	widgetReadyPromise = null;
	widgetReadyReject = null;
	widgetReadyResolve = null;
	constructor(track, host, trackElement) {
		this.track = track;
		this.host = host;
		this.trackElement = trackElement;
	}
	get currentTime() {
		return this.positionSeconds;
	}
	get duration() {
		return this.durationSeconds;
	}
	attach(track) {
		this.activeTrack = track;
	}
	detach(track) {
		if (this.activeTrack === track) {
			this.activeTrack = null;
			this.playRequested = false;
			this.playing = false;
		}
	}
	async preload(options) {
		if (!options.prepare && !options.preloadMetadata) return;
		if (options.preloadMetadata || options.prepare) await this.ensureOEmbed();
		if (options.prepare) await this.ensurePrepared();
		return {
			duration: this.durationSeconds || void 0,
			metadata: this.metadata
		};
	}
	async load(_options) {
		this.playRequested = false;
		this.playing = false;
		this.activeTrack?.trackCallbacks.onStatus("Loading SoundCloud");
		await this.ensureOEmbed();
		await this.ensurePrepared();
		this.widget?.pause();
		this.seekTo(0);
		this.activeTrack?.trackCallbacks.onMetadata(this.metadata ?? {});
		if (this.durationSeconds > 0) this.activeTrack?.trackCallbacks.onDuration(this.durationSeconds);
		this.activeTrack?.trackCallbacks.onProgress(this.positionSeconds, this.durationSeconds);
		this.activeTrack?.trackCallbacks.onReady();
		this.activeTrack?.trackCallbacks.onStatus();
	}
	async play(options) {
		await this.ensurePrepared();
		if (options.isStale()) return false;
		if (!this.widget) return false;
		if (options.restart || this.durationSeconds > 0 && this.positionSeconds >= this.durationSeconds) this.seekTo(0);
		this.playRequested = true;
		this.activeTrack?.trackCallbacks.onStatus("Starting SoundCloud");
		this.widget.play();
		return false;
	}
	pause() {
		this.playRequested = false;
		this.playing = false;
		this.widget?.pause();
	}
	seekTo(seconds) {
		const safeSeconds = Math.max(0, seconds);
		this.positionSeconds = safeSeconds;
		this.widget?.seekTo(Math.round(safeSeconds * 1e3));
	}
	async requestPosition() {
		if (!this.widget) return;
		const [position, duration] = await Promise.all([new Promise((resolve) => this.widget?.getPosition((value) => resolve(value / 1e3))), new Promise((resolve) => this.widget?.getDuration((value) => resolve(value / 1e3)))]);
		if (duration > 0) this.durationSeconds = duration;
		if (position >= 0) this.positionSeconds = position;
		this.activeTrack?.trackCallbacks.onProgress(this.positionSeconds, this.durationSeconds);
	}
	async ensureOEmbed() {
		if (this.oEmbedPromise) return this.oEmbedPromise;
		if (typeof fetch === "undefined") throw new Error("SoundCloud oEmbed requires fetch support.");
		const params = new URLSearchParams({
			auto_play: "false",
			buying: "false",
			download: "false",
			format: "json",
			maxheight: "166",
			sharing: "false",
			show_artwork: "false",
			show_comments: "false",
			show_playcount: "false",
			show_user: "true",
			url: this.track.src
		});
		this.oEmbedPromise = fetch(`${soundCloudOEmbedUrl}?${params.toString()}`).then(async (response) => {
			if (!response.ok) throw new Error("SoundCloud oEmbed request failed.");
			return await response.json();
		}).then((oembed) => {
			this.metadata = parseSoundCloudMetadata(oembed);
			return oembed;
		});
		return this.oEmbedPromise;
	}
	async ensurePrepared() {
		if (this.ready) return;
		const api = await ensureSoundCloudWidgetApi();
		const iframeSrc = parseSoundCloudIframeSrc(await this.ensureOEmbed());
		if (!iframeSrc) throw new Error("SoundCloud oEmbed did not include an iframe.");
		if (!this.iframeElement) {
			this.iframeElement = createHiddenIframe(iframeSrc);
			getSoundCloudRoot(this.host).append(this.iframeElement);
		}
		if (!this.widget) {
			this.widget = api.Widget(this.iframeElement);
			this.widgetReadyPromise = new Promise((resolve, reject) => {
				this.widgetReadyResolve = resolve;
				this.widgetReadyReject = reject;
			});
			this.bindWidgetEvents(api.Widget.Events);
		}
		await this.widgetReadyPromise;
		await this.readDuration();
	}
	bindWidgetEvents(events) {
		if (!this.widget) return;
		this.widget.bind(events.READY, () => {
			this.ready = true;
			this.widgetReadyResolve?.();
		});
		this.widget.bind(events.PLAY_PROGRESS, (payload) => {
			if (!this.playing) return;
			const position = (payload?.currentPosition ?? 0) / 1e3;
			if (Number.isFinite(position)) this.positionSeconds = position;
			this.activeTrack?.trackCallbacks.onProgress(this.positionSeconds, this.durationSeconds);
		});
		this.widget.bind(events.PLAY, () => {
			if (!this.playRequested && !this.playing) return;
			this.playing = true;
			this.activeTrack?.handlePlayEvent();
		});
		this.widget.bind(events.PAUSE, () => {
			this.playRequested = false;
			this.playing = false;
			this.activeTrack?.handlePauseEvent();
		});
		this.widget.bind(events.FINISH, () => {
			this.playRequested = false;
			this.playing = false;
			this.positionSeconds = this.durationSeconds;
			this.activeTrack?.trackCallbacks.onFinish();
		});
		this.widget.bind(events.ERROR, () => {
			this.widgetReadyReject?.(/* @__PURE__ */ new Error("SoundCloud widget reported an error."));
			this.activeTrack?.trackCallbacks.onStatus("SoundCloud playback failed");
		});
	}
	async readDuration() {
		if (!this.widget) return;
		const duration = await new Promise((resolve) => this.widget?.getDuration((value) => resolve(value / 1e3)));
		if (duration > 0) {
			this.durationSeconds = duration;
			this.activeTrack?.trackCallbacks.onDuration(this.durationSeconds);
		}
	}
};
var SoundCloudPlayableTrack = class extends JukettePlayableTrack {
	state;
	ignoreNextPauseEvent = false;
	constructor(track, callbacks, state) {
		super(track, callbacks);
		this.state = state;
		this.state.attach(this);
	}
	get trackCallbacks() {
		return this.callbacks;
	}
	get currentTime() {
		return this.state.currentTime;
	}
	get duration() {
		return this.state.duration;
	}
	load(options) {
		return this.state.load(options);
	}
	play(options) {
		return this.state.play(options);
	}
	pause(_options = {}) {
		this.ignoreNextPauseEvent = true;
		this.state.pause();
	}
	seek(seconds) {
		this.state.seekTo(seconds);
		this.callbacks.onProgress(seconds, this.duration);
	}
	stop() {
		this.pause({ silent: true });
		this.state.detach(this);
	}
	requestPosition() {
		this.state.requestPosition();
	}
	handlePauseEvent() {
		if (this.ignoreNextPauseEvent) {
			this.ignoreNextPauseEvent = false;
			return;
		}
		this.callbacks.onPause();
	}
	handlePlayEvent() {
		this.callbacks.onStatus();
		this.callbacks.onPlay();
	}
};
var createSoundCloudTrackState = (track, host, trackElement) => {
	if (trackElement) {
		const current = elementStates.get(trackElement);
		if (current) return current;
		const next = new SoundCloudTrackState(track, host, trackElement);
		elementStates.set(trackElement, next);
		return next;
	}
	let states = hostStates.get(host);
	if (!states) {
		states = /* @__PURE__ */ new Map();
		hostStates.set(host, states);
	}
	const key = getHostStateKey(track);
	const current = states.get(key);
	if (current) return current;
	const next = new SoundCloudTrackState(track, host, null);
	states.set(key, next);
	return next;
};
var soundCloudBackend = {
	createPlayableTrack(track, callbacks, options) {
		return new SoundCloudPlayableTrack(track, callbacks, createSoundCloudTrackState(track, options.host, options.trackElement));
	},
	preloadTrack: async (track, options) => createSoundCloudTrackState(track, options.host, options.trackElement).preload(options),
	type: soundCloudPlayerType
};
var register = () => registerJuketteBackend(soundCloudBackend);
var registerJuketteSoundCloudBackend = () => registerJuketteBackend(soundCloudBackend);
//#endregion
export { register, registerJuketteSoundCloudBackend, soundCloudBackend };
