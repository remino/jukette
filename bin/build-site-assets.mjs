import { mkdir, stat, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { execFile } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const root = resolve(import.meta.dirname, '..')
const generatorPath = fileURLToPath(import.meta.url)
const demoTonePath = resolve(root, 'apps/docs/public/jukette/demo-tone.mp3')
const demoMidiPath = resolve(root, 'apps/docs/public/jukette/demo-scale.mid')

const fileIsCurrent = async (filePath) => {
	try {
		const file = await stat(filePath)
		const generator = await stat(generatorPath)
		return (
			file.isFile() && file.size > 0 && file.mtimeMs >= generator.mtimeMs
		)
	} catch {
		return false
	}
}

const buildDemoTone = async () => {
	if (await fileIsCurrent(demoTonePath)) {
		console.log(`site:assets reused ${demoTonePath}`)
		return
	}

	const noteDuration = 0.18
	const arpeggio = [
		277.18, // C#4
		329.63, // E4
		415.3, // G#4
		493.88, // B4
		554.37, // C#5
		493.88, // B4
		415.3, // G#4
		329.63, // E4
	]
	const notes = Array.from({ length: 4 }, () => arpeggio).flat()
	const noteFilters = notes.map(
		(_frequency, index) =>
			`[${index}:a]afade=t=in:st=0:d=0.01,afade=t=out:st=${noteDuration - 0.03}:d=0.03,volume=0.58[n${index}]`,
	)
	const concatInputs = notes
		.map((_frequency, index) => `[n${index}]`)
		.join('')
	const filterComplex = [
		...noteFilters,
		`${concatInputs}concat=n=${notes.length}:v=0:a=1,alimiter=limit=0.9[out]`,
	].join(';')

	await mkdir(dirname(demoTonePath), { recursive: true })
	await execFileAsync('ffmpeg', [
		'-hide_banner',
		'-loglevel',
		'error',
		'-y',
		...notes.flatMap((frequency) => [
			'-f',
			'lavfi',
			'-i',
			`sine=frequency=${frequency}:duration=${noteDuration}:sample_rate=44100`,
		]),
		'-filter_complex',
		filterComplex,
		'-map',
		'[out]',
		'-codec:a',
		'libmp3lame',
		'-b:a',
		'128k',
		demoTonePath,
	])

	console.log(`site:assets generated ${demoTonePath}`)
}

const variableLength = (value) => {
	const bytes = [value & 0x7f]
	value >>= 7

	while (value > 0) {
		bytes.unshift((value & 0x7f) | 0x80)
		value >>= 7
	}

	return bytes
}

const textBytes = (value) =>
	[...value].map((character) => character.charCodeAt(0))

const buildDemoMidi = async () => {
	if (await fileIsCurrent(demoMidiPath)) {
		console.log(`site:assets reused ${demoMidiPath}`)
		return
	}

	const ticksPerBeat = 96
	const track = [0x00, 0xff, 0x51, 0x03, 0x07, 0xa1, 0x20, 0x00, 0xc0, 0x50]
	const notes = [60, 62, 64, 67, 72, 67, 64, 60]

	for (const note of notes) {
		track.push(0x00, 0x90, note, 0x60)
		track.push(...variableLength(ticksPerBeat), 0x80, note, 0x00)
	}

	track.push(0x00, 0xff, 0x2f, 0x00)

	const header = [
		...textBytes('MThd'),
		0x00,
		0x00,
		0x00,
		0x06,
		0x00,
		0x00,
		0x00,
		0x01,
		(ticksPerBeat >> 8) & 0xff,
		ticksPerBeat & 0xff,
	]
	const trackLength = track.length
	const midi = Buffer.from([
		...header,
		...textBytes('MTrk'),
		(trackLength >> 24) & 0xff,
		(trackLength >> 16) & 0xff,
		(trackLength >> 8) & 0xff,
		trackLength & 0xff,
		...track,
	])

	await mkdir(dirname(demoMidiPath), { recursive: true })
	await writeFile(demoMidiPath, midi)
	console.log(`site:assets generated ${demoMidiPath}`)
}

await buildDemoTone()
await buildDemoMidi()
