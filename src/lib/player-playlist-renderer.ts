import type { AudioFileMetadata, JuketteTrack } from './types'

export interface RenderPlaylistOptions {
	currentIndex: number
	element: HTMLOListElement
	formatTime(seconds: number): string
	getDisplay(track: JuketteTrack): Required<AudioFileMetadata>
	getDuration(track: JuketteTrack): number | undefined
	onSelect(index: number): void
	tracks: JuketteTrack[]
}

export const renderPlaylist = ({
	currentIndex,
	element,
	formatTime,
	getDisplay,
	getDuration,
	onSelect,
	tracks,
}: RenderPlaylistOptions): void => {
	element.replaceChildren(
		...tracks.map((track, index) => {
			const display = getDisplay(track)
			const item = document.createElement('li')
			const button = document.createElement('button')
			const title = document.createElement('span')
			const artist = document.createElement('span')
			const duration = document.createElement('span')
			const durationValue = getDuration(track)
			const durationText =
				durationValue === undefined
					? '--:--'
					: formatTime(durationValue)

			button.type = 'button'
			button.part.add('playlist-track')
			button.setAttribute(
				'aria-label',
				[
					display.title,
					display.artist,
					durationValue === undefined
						? 'unknown duration'
						: durationText,
				]
					.filter(Boolean)
					.join(', '),
			)

			item.part.add('playlist-item')
			title.className = 'playlist-title'
			title.part.add('playlist-title')
			title.textContent = display.title
			artist.className = 'playlist-artist'
			artist.part.add('playlist-artist')
			artist.textContent = display.artist
			duration.className = 'playlist-duration'
			duration.part.add('playlist-duration')
			duration.textContent = durationText

			button.append(title, artist, duration)
			if (index === currentIndex) {
				button.setAttribute('aria-current', 'true')
			}
			button.addEventListener('click', () => onSelect(index))
			item.append(button)
			return item
		}),
	)
}
