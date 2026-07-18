#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const manifests = [
	'package.json',
	'packages/core/package.json',
	'packages/audio/package.json',
	'packages/midi/package.json',
	'packages/soundcloud/package.json',
	'packages/jukette/package.json',
	'apps/docs/package.json',
]

const publishableVersions = new Map([
	['@remino/jukette-core', true],
	['@remino/jukette-audio', true],
	['@remino/jukette-midi', true],
	['@remino/jukette-soundcloud', true],
	['jukette', true],
])

const updateManifest = (manifest, version) => {
	manifest.version = version

	for (const field of [
		'dependencies',
		'devDependencies',
		'peerDependencies',
	]) {
		const deps = manifest[field]
		if (!deps) continue

		for (const dependency of Object.keys(deps)) {
			if (publishableVersions.has(dependency)) {
				deps[dependency] = version
			}
		}
	}

	return manifest
}

const run = async ([command, version]) => {
	if (command !== 'bump' || !version) {
		throw new Error('Usage: release-workspace-versions.mjs bump <version>')
	}

	await Promise.all(
		manifests.map(async (manifestPath) => {
			const absolutePath = resolve(root, manifestPath)
			const manifest = JSON.parse(await readFile(absolutePath, 'utf8'))
			await writeFile(
				absolutePath,
				`${JSON.stringify(updateManifest(manifest, version), null, '\t')}\n`,
			)
		}),
	)
}

if (import.meta.url === `file://${process.argv[1]}`) {
	run(process.argv.slice(2)).catch((error) => {
		console.error(error.message)
		process.exitCode = 1
	})
}
