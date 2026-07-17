import {
	ATTR_ARTIST,
	ATTR_PREFER_MEDIA_METADATA,
	ATTR_PRELOAD,
	ATTR_SRC,
	ATTR_TITLE,
	ATTR_TYPE,
} from './attributes'
import type { JuketteTrack } from './types'
import { isRecord, normalizeBooleanAttribute } from './utils'

export const inferTrackType = (track: Pick<JuketteTrack, 'src' | 'type'>) => {
	if (track.type) return track.type

	const source = track.src.toLowerCase()
	if (source.includes('soundcloud.com')) return 'soundcloud'
	if (/\.(?:mid|midi)(?:[?#].*)?$/.test(source)) return 'midi'
	return 'audio'
}

export const normalizeTrack = (value: unknown): JuketteTrack | null => {
	if (typeof value === 'string') {
		const src = value.trim()
		return src ? { src } : null
	}

	if (!isRecord(value) || typeof value.src !== 'string') return null

	const src = value.src.trim()
	if (!src) return null

	const type =
		value.type === 'audio' ||
		value.type === 'soundcloud' ||
		value.type === 'midi'
			? value.type
			: undefined

	const track: JuketteTrack = { src }

	if (typeof value.artist === 'string') track.artist = value.artist
	if (typeof value.preferMediaMetadata === 'boolean') {
		track.preferMediaMetadata = value.preferMediaMetadata
	} else if (typeof value.preferMediaMetadata === 'string') {
		const preferMediaMetadata = normalizeBooleanAttribute(
			value.preferMediaMetadata,
		)
		if (preferMediaMetadata !== undefined) {
			track.preferMediaMetadata = preferMediaMetadata
		}
	}
	if (typeof value.preload === 'boolean') {
		track.preload = value.preload
	} else if (typeof value.preload === 'string') {
		const preload = normalizeBooleanAttribute(value.preload)
		if (preload !== undefined) track.preload = preload
	}
	if (typeof value.title === 'string') track.title = value.title
	if (type) track.type = type

	return track
}

export const parsePlaylist = (value: string | null): JuketteTrack[] => {
	if (!value) return []

	try {
		const parsed = JSON.parse(value) as unknown
		const items = Array.isArray(parsed) ? parsed : [parsed]
		return items
			.map((item) => normalizeTrack(item))
			.filter((item): item is JuketteTrack => item !== null)
	} catch {
		return value
			.split('\n')
			.map((item) => normalizeTrack(item))
			.filter((item): item is JuketteTrack => item !== null)
	}
}

export const trackFromElement = (element: Element): JuketteTrack | null => {
	if (element.localName !== 'jukette-track') return null

	return normalizeTrack({
		artist: element.getAttribute(ATTR_ARTIST) ?? undefined,
		preferMediaMetadata:
			element.getAttribute(ATTR_PREFER_MEDIA_METADATA) ?? undefined,
		preload: element.getAttribute(ATTR_PRELOAD) ?? undefined,
		src: element.getAttribute(ATTR_SRC) ?? '',
		title: element.getAttribute(ATTR_TITLE) ?? undefined,
		type: element.getAttribute(ATTR_TYPE) ?? undefined,
	})
}
