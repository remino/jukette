import { afterEach, beforeEach, vi } from 'vitest'

import { resetJuketteBackends } from '@remino/jukette-core'

beforeEach(() => {
	resetJuketteBackends()

	if (typeof HTMLMediaElement !== 'undefined') {
		HTMLMediaElement.prototype.load = vi.fn()
		HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined)
		HTMLMediaElement.prototype.pause = vi.fn()
	}

	if (typeof window !== 'undefined') {
		vi.stubGlobal(
			'requestAnimationFrame',
			vi.fn(() => 1),
		)
		vi.stubGlobal('cancelAnimationFrame', vi.fn())
	}
})

afterEach(() => {
	resetJuketteBackends()
	vi.restoreAllMocks()
	vi.unstubAllGlobals()

	if (typeof document !== 'undefined') {
		document.body.innerHTML = ''
	}
})
