import { mkdir, stat } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const root = process.cwd()
const demoTonePath = resolve(root, 'public/jukette/demo-tone.mp3')

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

await buildDemoTone()
