import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { build } from 'vite'

const packageRoot = process.cwd()
const workspaceRoot = resolve(packageRoot, '../..')
const pkg = JSON.parse(
	await readFile(resolve(packageRoot, 'package.json'), 'utf8'),
)

const currentYear = new Date().getFullYear()
const copyrightYears = (startYear, endYear = currentYear) =>
	startYear === endYear ? String(startYear) : `${startYear}-${endYear}`
const authorName =
	typeof pkg.author === 'object' && pkg.author?.name
		? pkg.author.name
		: 'Rémino Rem'
const authorUrl =
	typeof pkg.author === 'object' && pkg.author?.url
		? pkg.author.url
		: 'https://remino.net/'
const license = pkg.license || 'ISC'
const banner = `/*! ${pkg.name} v${pkg.version} | (c) ${copyrightYears(2026)} ${authorName} <${authorUrl}> | ${license} Licence */`

const packageBuilds = {
	'@remino/jukette-core': {
		entries: [
			{ entry: 'src/lib/core.ts', fileBase: 'core', name: 'JuketteCore' },
		],
	},
	'@remino/jukette-audio': {
		entries: [
			{
				entry: 'src/lib/audio.ts',
				fileBase: 'audio',
				name: 'JuketteAudio',
			},
			{
				entry: 'src/lib/audio-auto.ts',
				fileBase: 'audio-auto',
				name: 'JuketteAudio',
			},
		],
	},
	'@remino/jukette-midi': {
		entries: [
			{
				entry: 'src/lib/midi-entry.ts',
				fileBase: 'midi',
				name: 'JuketteMidi',
			},
			{
				entry: 'src/lib/midi-auto.ts',
				fileBase: 'midi-auto',
				name: 'JuketteMidi',
			},
		],
	},
	'@remino/jukette-soundcloud': {
		entries: [
			{
				entry: 'src/lib/soundcloud.ts',
				fileBase: 'soundcloud',
				name: 'JuketteSoundCloud',
			},
			{
				entry: 'src/lib/soundcloud-auto.ts',
				fileBase: 'soundcloud-auto',
				name: 'JuketteSoundCloud',
			},
		],
	},
	jukette: {
		entries: [
			{
				entry: 'src/lib/jukette.ts',
				fileBase: 'jukette',
				name: 'Jukette',
			},
			{
				entry: 'src/lib/auto.ts',
				fileBase: 'jukette-auto',
				name: 'Jukette',
			},
		],
		minifiedAutoEntry: 'src/lib/auto.ts',
	},
}

const buildConfig = packageBuilds[pkg.name]
if (!buildConfig) {
	throw new Error(`Unsupported package build for ${pkg.name}`)
}

const externalPackages = [
	...Object.keys(pkg.dependencies ?? {}),
	...Object.keys(pkg.peerDependencies ?? {}),
]

const ensureBanner = async (filePath) => {
	const file = await readFile(filePath, 'utf8')
	if (file.startsWith(banner)) return
	await writeFile(filePath, `${banner}\n${file}`)
}

const buildLibrary = async ({
	entry,
	fileBase,
	formats = ['es', 'cjs'],
	minify = false,
	name,
	external = externalPackages,
}) =>
	build({
		configFile: false,
		publicDir: false,
		build: {
			emptyOutDir: false,
			lib: {
				entry: resolve(packageRoot, entry),
				fileName: (format) => {
					if (format === 'es') return `${fileBase}.mjs`
					if (format === 'cjs') return `${fileBase}.cjs`
					return `${fileBase}.js`
				},
				formats,
				name,
			},
			minify,
			outDir: resolve(packageRoot, 'dist'),
			rollupOptions: {
				external,
				output: {
					banner,
				},
			},
			sourcemap: false,
		},
		resolve: {
			alias: {
				'@remino/jukette-core': resolve(
					workspaceRoot,
					'packages/core/src/lib/core.ts',
				),
				'@remino/jukette-audio': resolve(
					workspaceRoot,
					'packages/audio/src/lib/audio.ts',
				),
				'@remino/jukette-midi': resolve(
					workspaceRoot,
					'packages/midi/src/lib/midi-entry.ts',
				),
				'@remino/jukette-soundcloud': resolve(
					workspaceRoot,
					'packages/soundcloud/src/lib/soundcloud.ts',
				),
			},
		},
	})

await rm(resolve(packageRoot, 'dist'), { force: true, recursive: true })
await mkdir(resolve(packageRoot, 'dist'), { recursive: true })

for (const entry of buildConfig.entries) {
	await buildLibrary(entry)
}

if (buildConfig.minifiedAutoEntry) {
	await buildLibrary({
		entry: buildConfig.minifiedAutoEntry,
		external: [],
		fileBase: 'jukette-auto.min',
		formats: ['iife'],
		minify: true,
		name: 'jukette',
	})
}

const distFiles = await readdir(resolve(packageRoot, 'dist'))
await Promise.all(
	distFiles
		.filter((fileName) => /\.(?:cjs|mjs|js)$/.test(fileName))
		.map((fileName) =>
			ensureBanner(resolve(packageRoot, 'dist', fileName)),
		),
)
