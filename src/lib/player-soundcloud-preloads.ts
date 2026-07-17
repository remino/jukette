import type { PlayableTrackCallbacks } from './playable-track'
import { SoundCloudPlayableTrack } from './soundcloud-track'
import { inferTrackType } from './tracks'
import type { JuketteSoundCloudPreload, JuketteTrack } from './types'

export interface JuketteSoundCloudPreloadControllerOptions {
	audio: HTMLAudioElement
	baseIframe: HTMLIFrameElement
	createCallbacks(track: JuketteTrack): PlayableTrackCallbacks
	getCurrentIndex(): number
	getCurrentTrack(): JuketteTrack | null
	getMetadataPreloadId(): number
	getPreload(): JuketteSoundCloudPreload
	getTrackKey(track: JuketteTrack): string
	getTracks(): JuketteTrack[]
	getVolume(): number
	playerElement: HTMLElement
}

export class JuketteSoundCloudPreloadController {
	private readonly preloads = new Map<string, SoundCloudPlayableTrack>()

	constructor(
		private readonly options: JuketteSoundCloudPreloadControllerOptions,
	) {}

	getPlayableTrack(track: JuketteTrack): SoundCloudPlayableTrack {
		const key = this.options.getTrackKey(track)
		const cachedTrack = this.preloads.get(key)
		if (cachedTrack) return cachedTrack

		const iframe =
			this.preloads.size === 0
				? this.options.baseIframe
				: this.createIframe()
		const playableTrack = new SoundCloudPlayableTrack(
			track,
			iframe,
			this.options.createCallbacks(track),
		)
		this.preloads.set(key, playableTrack)
		return playableTrack
	}

	sync(): void {
		const wantedKeys = new Set<string>()
		const currentTrack = this.options.getCurrentTrack()
		const activeKey =
			currentTrack && inferTrackType(currentTrack) === 'soundcloud'
				? this.options.getTrackKey(currentTrack)
				: ''
		for (const [index, track] of this.options.getTracks().entries()) {
			if (!this.trackShouldPreload(track, index)) continue

			const key = this.options.getTrackKey(track)
			wantedKeys.add(key)
			const playableTrack = this.getPlayableTrack(track)
			void playableTrack.load({
				metadataPreloadId: this.options.getMetadataPreloadId(),
				restart: false,
				silent: key !== activeKey,
				volume: this.options.getVolume(),
			})
		}

		for (const [key, track] of this.preloads) {
			const active = key === activeKey
			track.setActive(active)
			if (wantedKeys.has(key) || active) continue

			track.stop()
			if (track.iframe !== this.options.baseIframe) track.iframe.remove()
			this.preloads.delete(key)
		}
	}

	deactivateAll(): void {
		for (const track of this.preloads.values()) {
			track.setActive(false)
		}
	}

	dispose(): void {
		for (const track of this.preloads.values()) {
			track.stop()
			if (track.iframe !== this.options.baseIframe) track.iframe.remove()
		}
		this.preloads.clear()
	}

	private trackShouldPreload(track: JuketteTrack, index: number): boolean {
		if (inferTrackType(track) !== 'soundcloud') return false
		if (track.preload !== undefined) return track.preload

		const preload = this.options.getPreload()
		if (preload === 'none') return false
		if (preload === 'all') return true
		if (preload === 'current')
			return index === this.options.getCurrentIndex()
		if (preload === 'next') {
			const tracks = this.options.getTracks()
			const currentIndex = this.options.getCurrentIndex()
			const nextIndex =
				tracks.length === 0
					? currentIndex
					: (currentIndex + 1) % tracks.length
			return index === currentIndex || index === nextIndex
		}

		return false
	}

	private createIframe(): HTMLIFrameElement {
		const iframe = document.createElement('iframe')
		iframe.className = 'soundcloud'
		iframe.part.add('soundcloud')
		iframe.title = 'SoundCloud player'
		iframe.allow = 'autoplay'
		this.options.playerElement.insertBefore(iframe, this.options.audio)
		return iframe
	}
}
