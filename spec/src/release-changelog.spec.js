import {
	extractReleaseNotes,
	promoteHead,
} from '../../bin/release-changelog.mjs'

describe('bin/release-changelog.mjs', () => {
	const changelog = `# CHANGELOG

<!-- mtoc-start -->

- [HEAD](#head)
- [v0.1.0](#v010)

<!-- mtoc-end -->

## HEAD

- Library
    - Add useful behaviour.
- Site
    - Document useful behaviour.

## v0.1.0

- Library
    - Previous release.
`

	it('promotes HEAD notes under the requested version', () => {
		const next = promoteHead(changelog, '0.2.0')

		expect(next).toContain('- [v0.2.0](#v020)\n- [v0.1.0](#v010)')
		expect(next).toContain(`## HEAD

## v0.2.0

- Library
    - Add useful behaviour.
- Site
    - Document useful behaviour.

## v0.1.0`)
	})

	it('extracts release notes for a version', () => {
		const next = promoteHead(changelog, '0.2.0')

		expect(extractReleaseNotes(next, '0.2.0')).toBe(`- Library
    - Add useful behaviour.
- Site
    - Document useful behaviour.
`)
	})

	it('fails when HEAD has no release notes', () => {
		const emptyHead = `# CHANGELOG

<!-- mtoc-start -->

- [HEAD](#head)
- [v0.1.0](#v010)

<!-- mtoc-end -->

## HEAD

## v0.1.0

- Library
    - Previous release.
`

		expect(() => promoteHead(emptyHead, '0.2.0')).toThrowError(
			'HEAD changelog section is empty.',
		)
	})

	it('fails when the requested version already exists', () => {
		const next = promoteHead(changelog, '0.2.0')

		expect(() => promoteHead(next, '0.2.0')).toThrowError(
			'Changelog already has a section for v0.2.0.',
		)
	})
})
