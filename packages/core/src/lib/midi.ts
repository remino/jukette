import type { JuketteMidiOscillator } from './types'

export const normalizeMidiOscillator = (
	value: string | null,
): JuketteMidiOscillator => {
	if (
		value === 'sine' ||
		value === 'square' ||
		value === 'sawtooth' ||
		value === 'triangle'
	) {
		return value
	}

	return 'auto'
}
