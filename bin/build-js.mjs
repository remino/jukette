import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { build } from 'vite'

const root = process.cwd()
const pkg = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'))
const currentYear = new Date().getFullYear()
const copyrightYears = (startYear, endYear = new Date().getFullYear()) =>
	startYear === endYear ? String(startYear) : `${startYear}-${endYear}`
const banner = `/*! ${pkg.name} v${pkg.version} | (c) ${copyrightYears(2026, currentYear)} ${pkg.author.name} <${pkg.author.url}> | ${pkg.license} Licence */`

const buildLibrary = async ({
	entry,
	fileName,
	formats,
	minify = false,
	name,
}) =>
	build({
		configFile: false,
		publicDir: false,
		build: {
			emptyOutDir: false,
			lib: {
				entry,
				fileName,
				formats,
				name,
			},
			minify,
			outDir: resolve(root, 'dist'),
			rollupOptions: {
				output: {
					banner,
				},
			},
			sourcemap: false,
		},
	})

const ensureBanner = async (filePath) => {
	const file = await readFile(filePath, 'utf8')
	if (file.startsWith(banner)) return

	await writeFile(filePath, `${banner}\n${file}`)
}

await rm(resolve(root, 'dist'), { force: true, recursive: true })
await mkdir(resolve(root, 'dist'), { recursive: true })

await buildLibrary({
	entry: resolve(root, 'src/lib/jukette.ts'),
	fileName: (format) => (format === 'es' ? 'jukette.mjs' : 'jukette.cjs'),
	formats: ['es', 'cjs'],
})

await buildLibrary({
	entry: resolve(root, 'src/lib/auto.ts'),
	fileName: (format) =>
		format === 'es' ? 'jukette-auto.mjs' : 'jukette-auto.cjs',
	formats: ['es', 'cjs'],
})

await buildLibrary({
	entry: resolve(root, 'src/lib/auto.ts'),
	fileName: () => 'jukette-auto.min.js',
	formats: ['iife'],
	minify: true,
	name: 'jukette',
})

const distFiles = await readdir(resolve(root, 'dist'))
await Promise.all(
	distFiles
		.filter((fileName) => /\.(?:cjs|mjs|js)$/.test(fileName))
		.map((fileName) => ensureBanner(resolve(root, 'dist', fileName))),
)
