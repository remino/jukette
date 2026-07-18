import { JukettePlayableTrack } from './playable-track'
import type { PlayableTrackCallbacks } from './playable-track'
import type {
	AudioFileMetadata,
	JuketteMidiOscillator,
	JuketteTrack,
	JuketteTrackKind,
} from './types'

export interface JuketteBackendPreloadOptions {
	host: HTMLElement
	preloadDuration: boolean
	preloadMetadata: boolean
	prepare: boolean
	trackElement: Element | null
}

export interface JuketteBackendPreloadResult {
	duration?: number
	metadata?: AudioFileMetadata
}

export interface JuketteBackendCreateTrackOptions {
	audioElement: HTMLAudioElement
	getMidiOscillator(): JuketteMidiOscillator
	host: HTMLElement
	trackElement: Element | null
}

export interface JuketteBackend {
	createPlayableTrack(
		track: JuketteTrack,
		callbacks: PlayableTrackCallbacks,
		options: JuketteBackendCreateTrackOptions,
	): JukettePlayableTrack
	inferTrackType?(
		track: Pick<JuketteTrack, 'src' | 'type'>,
	): JuketteTrackKind | null
	preloadTrack?(
		track: JuketteTrack,
		options: JuketteBackendPreloadOptions,
	):
		| Promise<JuketteBackendPreloadResult | void>
		| JuketteBackendPreloadResult
		| void
	priority?: number
	type: JuketteTrackKind
}

const backends = new Map<JuketteTrackKind, JuketteBackend>()
const registrationListeners = new Set<(backend: JuketteBackend) => void>()

export const getRegisteredJuketteBackends = (): JuketteBackend[] =>
	Array.from(backends.values())

export const getJuketteBackend = (
	type: JuketteTrackKind,
): JuketteBackend | undefined => backends.get(type)

export const registerJuketteBackend = (
	backend: JuketteBackend,
): JuketteBackend => {
	backends.set(backend.type, backend)
	for (const listener of registrationListeners) listener(backend)
	return backend
}

export const resetJuketteBackends = (): void => {
	backends.clear()
	registrationListeners.clear()
}

export const subscribeJuketteBackendRegistrations = (
	listener: (backend: JuketteBackend) => void,
): (() => void) => {
	registrationListeners.add(listener)
	return () => {
		registrationListeners.delete(listener)
	}
}

export const resolveJuketteBackend = (
	track: Pick<JuketteTrack, 'src' | 'type'>,
): JuketteBackend | undefined => {
	if (track.type) return getJuketteBackend(track.type)

	for (const backend of getRegisteredJuketteBackends().sort(
		(left, right) => (right.priority ?? 0) - (left.priority ?? 0),
	)) {
		if (backend.inferTrackType?.(track) === backend.type) {
			return backend
		}
	}

	return undefined
}
