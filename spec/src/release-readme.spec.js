import { updateReadmeVersion } from '../../bin/release-readme.mjs'

describe('bin/release-readme.mjs', () => {
	const readme = `# jukette

A white-label jukebox custom element.

By Rémino Rem

<script src="https://unpkg.com/jukette"></script>

- https://unpkg.com/jukette
- https://cdn.jsdelivr.net/npm/jukette

<script src="https://unpkg.com/jukette@0.1.0"></script>

import { defineJuketteElement } from 'https://unpkg.com/jukette@0.1.0/dist/jukette.mjs'
`

	it('adds the visible README version line', () => {
		const next = updateReadmeVersion(readme, '0.2.0')

		expect(next).toContain('Jukette v0.2.0\n\nBy Rémino Rem')
	})

	it('updates an existing visible README version line', () => {
		const next = updateReadmeVersion(
			readme.replace('By Rémino Rem', 'Jukette v0.1.0\nBy Rémino Rem'),
			'0.2.0',
		)

		expect(next).toContain('Jukette v0.2.0\nBy Rémino Rem')
		expect(next).not.toContain('Jukette v0.1.0')
	})

	it('updates pinned CDN examples', () => {
		const next = updateReadmeVersion(readme, '0.2.0')

		expect(next).toContain('https://unpkg.com/jukette@0.2.0')
		expect(next).toContain(
			'https://unpkg.com/jukette@0.2.0/dist/jukette.mjs',
		)
		expect(next).not.toContain('jukette@0.1.0')
	})

	it('leaves unpinned CDN URLs unchanged', () => {
		const next = updateReadmeVersion(readme, '0.2.0')

		expect(next).toContain('https://unpkg.com/jukette"></script>')
		expect(next).toContain('- https://unpkg.com/jukette')
		expect(next).toContain('- https://cdn.jsdelivr.net/npm/jukette')
	})

	it('fails when expected pinned URLs are missing', () => {
		expect(() =>
			updateReadmeVersion(
				readme.replaceAll('https://unpkg.com/jukette@0.1.0', ''),
				'0.2.0',
			),
		).toThrowError(
			'Expected to update 2 pinned README CDN URLs, updated 0.',
		)
	})
})
