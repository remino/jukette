#!/usr/bin/env node

import { copyFile, rm } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')

const run = async (args) => {
	const [packagePath, mode = 'copy'] = args
	if (!packagePath) {
		throw new Error(
			'Usage: sync-package-readme.mjs <package-path> [copy|clean]',
		)
	}

	const target = resolve(root, packagePath, 'README.md')
	if (mode === 'clean') {
		await rm(target, { force: true })
		return
	}
	if (mode !== 'copy') {
		throw new Error(
			'Usage: sync-package-readme.mjs <package-path> [copy|clean]',
		)
	}

	await copyFile(resolve(root, 'README.md'), target)
}

if (import.meta.url === `file://${process.argv[1]}`) {
	run(process.argv.slice(2)).catch((error) => {
		console.error(error.message)
		process.exitCode = 1
	})
}
