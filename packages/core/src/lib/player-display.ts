import type { AudioFileMetadata, JuketteDisplayMarquee } from './types'

export const normalizeDisplayMarquee = (
	value: string | null,
): JuketteDisplayMarquee => {
	if (value === 'always' || value === 'never' || value === 'overflow') {
		return value
	}
	return 'overflow'
}

export const formatTrackDisplay = (
	display: Required<AudioFileMetadata>,
): string => {
	const title = display.title.trim()
	const artist = display.artist.trim()
	if (!artist) return title
	return `${title} - ${artist}`
}
