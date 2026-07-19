import type { AudioFileMetadata, JuketteTrack } from './types'
import { formatTrackDisplay } from './player-display'

export interface RenderTrackSelectOptions {
	currentIndex: number
	element: HTMLSelectElement
	formatTime(seconds: number): string
	getDisplay(track: JuketteTrack): Required<AudioFileMetadata>
	getDuration(track: JuketteTrack): number | undefined
	tracks: JuketteTrack[]
}

export const renderTrackSelect = ({
	currentIndex,
	element,
	formatTime,
	getDisplay,
	getDuration,
	tracks,
}: RenderTrackSelectOptions): void => {
	element.replaceChildren(
		...tracks.map((track, index) => {
			const option = document.createElement('option')
			const display = getDisplay(track)
			const durationValue = getDuration(track)
			const durationText =
				durationValue === undefined
					? '--:--'
					: formatTime(durationValue)

			option.value = String(index)
			option.textContent = `${formatTrackDisplay(display)} (${durationText})`
			return option
		}),
	)

	element.value = String(
		Math.max(0, Math.min(currentIndex, tracks.length - 1)),
	)
}
