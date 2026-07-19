import type { JukettePlayerDom } from './player-dom'
import { formatTime } from './player-time'

export interface JuketteProgressControllerOptions {
	dom: JukettePlayerDom
	getCurrentTime(): number
	getDuration(): number
	getPlaying(): boolean
	getTimeMode(): 'elapsed' | 'remaining'
	onStatusChange(message?: string): void
}

export class JuketteProgressController {
	private progressFrame = 0

	constructor(private readonly options: JuketteProgressControllerOptions) {}

	setStatus(message = ''): void {
		this.options.onStatusChange(message)
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
		const displayText =
			this.options.getTimeMode() === 'remaining'
				? `-${formatTime(Math.max(0, safeDuration - safeCurrentTime))}`
				: formatTime(safeCurrentTime)
		this.options.dom.timeElement.textContent = displayText
		this.options.dom.timeElement.dateTime = `PT${Math.max(
			0,
			Math.round(
				this.options.getTimeMode() === 'remaining'
					? safeDuration - safeCurrentTime
					: safeCurrentTime,
			),
		)}S`
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

	restart(): void {
		this.stop()
		this.start()
	}
}
