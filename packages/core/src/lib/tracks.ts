import {
	ATTR_ARTIST,
	ATTR_PREFER_MEDIA_METADATA,
	ATTR_PRELOAD,
	ATTR_START_AT,
	ATTR_SRC,
	ATTR_TITLE,
	ATTR_TYPE,
} from './attributes'
import { getRegisteredJuketteBackends } from './backend-registry'
import type { JuketteTrack } from './types'
import { isRecord, normalizeBooleanAttribute } from './utils'

const normalizeStartAt = (value: unknown): number | undefined => {
	if (typeof value === 'number') {
		return Number.isFinite(value) ? Math.max(0, value) : undefined
	}

	if (typeof value !== 'string') return undefined
	const trimmed = value.trim()
	if (!trimmed) return undefined
	const parsed = Number(trimmed)
	return Number.isFinite(parsed) ? Math.max(0, parsed) : undefined
}

export const inferTrackType = (track: Pick<JuketteTrack, 'src' | 'type'>) => {
	if (track.type) return track.type

	for (const backend of getRegisteredJuketteBackends().sort(
		(left, right) => (right.priority ?? 0) - (left.priority ?? 0),
	)) {
		const inferredType = backend.inferTrackType?.(track)
		if (inferredType) return inferredType
	}

	const source = track.src.toLowerCase()
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
	const startAt = normalizeStartAt(value.startAt)
	if (startAt !== undefined) track.startAt = startAt
	if (typeof value.title === 'string') track.title = value.title
	if (typeof value.type === 'string' && value.type.trim()) {
		track.type = value.type.trim()
	}

	return track
}

export const parsePlaylist = (value: string | null): JuketteTrack[] => {
	if (!value) return []

	try {
		return normalizePlaylistItems(JSON.parse(value) as unknown)
	} catch {
		return value
			.split('\n')
			.map((item) => normalizeTrack(item))
			.filter((item): item is JuketteTrack => item !== null)
	}
}

export const normalizePlaylistItems = (value: unknown): JuketteTrack[] => {
	const items = Array.isArray(value) ? value : [value]
	return items
		.map((item) => normalizeTrack(item))
		.filter((item): item is JuketteTrack => item !== null)
}

export const trackFromElement = (element: Element): JuketteTrack | null => {
	if (element.localName !== 'jukette-track') return null

	return normalizeTrack({
		artist: element.getAttribute(ATTR_ARTIST) ?? undefined,
		preferMediaMetadata:
			element.getAttribute(ATTR_PREFER_MEDIA_METADATA) ?? undefined,
		preload: element.getAttribute(ATTR_PRELOAD) ?? undefined,
		startAt: element.getAttribute(ATTR_START_AT) ?? undefined,
		src: element.getAttribute(ATTR_SRC) ?? '',
		title: element.getAttribute(ATTR_TITLE) ?? undefined,
		type: element.getAttribute(ATTR_TYPE) ?? undefined,
	})
}
