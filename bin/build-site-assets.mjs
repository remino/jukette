import { mkdir, stat, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const root = process.cwd()
const demoTonePath = resolve(root, 'public/jukette/demo-tone.mp3')
const demoMidiPath = resolve(root, 'public/jukette/demo-scale.mid')

const fileExists = async (filePath) => {
	try {
		const file = await stat(filePath)
		return file.isFile() && file.size > 0
	} catch {
		return false
	}
}

const buildDemoTone = async () => {
	if (await fileExists(demoTonePath)) {
		console.log(`site:assets reused ${demoTonePath}`)
		return
	}

	await mkdir(dirname(demoTonePath), { recursive: true })
	await execFileAsync('ffmpeg', [
		'-hide_banner',
		'-loglevel',
		'error',
		'-y',
		'-f',
		'lavfi',
		'-i',
		'sine=frequency=440:duration=4:sample_rate=44100',
		'-filter:a',
		'volume=0.18,afade=t=in:st=0:d=0.05,afade=t=out:st=3.85:d=0.15',
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
	if (await fileExists(demoMidiPath)) {
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
