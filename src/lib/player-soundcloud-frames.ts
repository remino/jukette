import type { PlayableTrackCallbacks } from './playable-track'
import { SoundCloudPlayableTrack } from './soundcloud-track'
import { inferTrackType } from './tracks'
import type { JuketteTrack } from './types'

export interface JuketteSoundCloudFrameControllerOptions {
	audio: HTMLAudioElement
	createCallbacks(track: JuketteTrack): PlayableTrackCallbacks
	getCurrentTrack(): JuketteTrack | null
	getMetadataPreloadId(): number
	getTrackKey(track: JuketteTrack): string
	getTracks(): JuketteTrack[]
	getVolume(): number
	playerElement: HTMLElement
}

export class JuketteSoundCloudFrameController {
	private readonly frames = new Map<string, SoundCloudPlayableTrack>()

	constructor(
		private readonly options: JuketteSoundCloudFrameControllerOptions,
	) {}

	getPlayableTrack(track: JuketteTrack): SoundCloudPlayableTrack {
		const key = this.options.getTrackKey(track)
		const cachedTrack = this.frames.get(key)
		if (cachedTrack) return cachedTrack

		const playableTrack = new SoundCloudPlayableTrack(
			track,
			this.createIframe(),
			this.options.createCallbacks(track),
		)
		this.frames.set(key, playableTrack)
		return playableTrack
	}

	sync(): void {
		const playlistKeys = new Set<string>()
		const currentTrack = this.options.getCurrentTrack()
		const activeKey =
			currentTrack && inferTrackType(currentTrack) === 'soundcloud'
				? this.options.getTrackKey(currentTrack)
				: ''
		for (const track of this.options.getTracks()) {
			if (inferTrackType(track) !== 'soundcloud') continue
			const key = this.options.getTrackKey(track)
			playlistKeys.add(key)
			if (!track.preload) continue

			const playableTrack = this.getPlayableTrack(track)
			void playableTrack.load({
				metadataPreloadId: this.options.getMetadataPreloadId(),
				restart: false,
				silent: key !== activeKey,
				volume: this.options.getVolume(),
			})
		}

		for (const [key, track] of this.frames) {
			const active = key === activeKey
			track.setActive(active)
			if (playlistKeys.has(key) || active) continue

			track.stop()
			track.iframe.remove()
			this.frames.delete(key)
		}
	}

	deactivateAll(): void {
		for (const track of this.frames.values()) {
			track.setActive(false)
		}
	}

	dispose(): void {
		for (const track of this.frames.values()) {
			track.stop()
			track.iframe.remove()
		}
		this.frames.clear()
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
