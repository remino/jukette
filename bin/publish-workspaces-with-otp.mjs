#!/usr/bin/env node
import fs from 'fs'
import { spawnSync } from 'child_process'
import { createInterface } from 'readline'

const workspaces = [
	'@remino/jukette-core',
	'@remino/jukette-audio',
	'@remino/jukette-midi',
	'@remino/jukette-soundcloud',
	'jukette',
]

const publishOptions = {
	access: 'public',
	registry: 'https://registry.npmjs.org/',
}

function promptOTP() {
	return new Promise((resolve, reject) => {
		try {
			const rl = createInterface({
				input: fs.createReadStream('/dev/tty'),
				output: fs.createWriteStream('/dev/tty'),
				terminal: true,
			})

			rl.question('Enter npm OTP (one-time password): ', (otp) => {
				rl.close()
				resolve(otp && otp.trim())
			})
		} catch (err) {
			reject(err)
		}
	})
}

async function publishWorkspace(ws) {
	let attempts = 0
	while (attempts < 5) {
		attempts++
		const otp = await promptOTP()
		if (!otp) {
			console.error('OTP required; aborting')
			process.exit(1)
		}

		const env = { ...process.env, npm_config_otp: otp }
		const args = [
			'publish',
			'--workspace',
			ws,
			'--access',
			publishOptions.access,
			'--registry',
			publishOptions.registry,
		]

		console.log(`\nPublishing ${ws} (attempt ${attempts})...`)
		const res = spawnSync('npm', args, { stdio: 'inherit', env })

		if (res.status === 0) {
			console.log(`Published ${ws} successfully.`)
			return
		}

		console.error(`Publish failed for ${ws} (exit ${res.status}).`)
		if (attempts < 5) {
			console.log('If this was an OTP issue, enter a fresh OTP to retry.')
		}
	}

	console.error(`Failed to publish ${ws} after retries.`)
	process.exit(1)
}

async function main() {
	for (const ws of workspaces) {
		await publishWorkspace(ws)
	}
	// After all publishes succeed, optionally continue with docs publish handled by release-it hook
}

main().catch((err) => {
	console.error('Error during publish:', err)
	process.exit(1)
})
