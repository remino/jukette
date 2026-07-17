import type { JukettePlayerDom } from './player-dom'
import { formatTime } from './player-time'

export interface JuketteProgressControllerOptions {
	dom: JukettePlayerDom
	getCurrentTime(): number
	getDuration(): number
	getPlaying(): boolean
	isSoundCloudTrack(): boolean
	requestSoundCloudPosition(): void
}

export class JuketteProgressController {
	private progressFrame = 0

	constructor(private readonly options: JuketteProgressControllerOptions) {}

	setStatus(message = ''): void {
		this.options.dom.statusElement.textContent = message
	}

	syncProgress(currentTime: number, duration: number): void {
		const safeDuration = Number.isFinite(duration)
			? Math.max(0, duration)
			: 0
		const safeCurrentTime = Number.isFinite(currentTime)
			? Math.min(
					Math.max(0, currentTime),
					safeDuration || Number.MAX_SAFE_INTEGER,
				)
			: 0
		const ratio =
			safeDuration > 0
				? Math.min(1, Math.max(0, safeCurrentTime / safeDuration))
				: 0
		this.options.dom.seekInput.value = String(Math.round(ratio * 1000))
		this.options.dom.elapsedTimeElement.textContent =
			formatTime(safeCurrentTime)
		this.options.dom.remainingTimeElement.textContent = `-${formatTime(
			Math.max(0, safeDuration - safeCurrentTime),
		)}`
		this.options.dom.totalTimeElement.textContent = formatTime(safeDuration)
	}

	syncPlayingState(): void {
		const playing = this.options.getPlaying()
		this.options.dom.playButton.textContent = playing ? 'Ⅱ' : '▶'
		this.options.dom.playButton.setAttribute(
			'aria-label',
			playing ? 'Pause' : 'Play',
		)
		if (playing) {
			this.setStatus()
			this.start()
		} else {
			this.stop()
		}
	}

	start(): void {
		if (
			this.progressFrame ||
			typeof requestAnimationFrame === 'undefined'
		) {
			return
		}

		const tick = () => {
			if (!this.options.getPlaying()) {
				this.progressFrame = 0
				return
			}

			if (this.options.isSoundCloudTrack()) {
				this.options.requestSoundCloudPosition()
			}

			this.syncProgress(
				this.options.getCurrentTime(),
				this.options.getDuration(),
			)
			this.progressFrame = requestAnimationFrame(tick)
		}

		this.progressFrame = requestAnimationFrame(tick)
	}

	stop(): void {
		if (
			!this.progressFrame ||
			typeof cancelAnimationFrame === 'undefined'
		) {
			this.progressFrame = 0
			return
		}

		cancelAnimationFrame(this.progressFrame)
		this.progressFrame = 0
		this.syncProgress(
			this.options.getCurrentTime(),
			this.options.getDuration(),
		)
	}
}
