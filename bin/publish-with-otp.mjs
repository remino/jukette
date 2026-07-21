#!/usr/bin/env node
import { spawn } from 'child_process'
import { createInterface } from 'readline'

const rl = createInterface({
	input: process.stdin,
	output: process.stdout,
})

function askForOTP() {
	return new Promise((resolve) => {
		rl.question('Enter your npm OTP (one-time password): ', (answer) => {
			rl.close()
			resolve(answer)
		})
	})
}

async function publish() {
	try {
		const otp = await askForOTP()

		if (!otp || otp.trim().length === 0) {
			console.error('OTP is required to publish.')
			process.exit(1)
		}

		const args = process.argv.slice(2)
		const npmPublishCmd = ['npm', 'publish', ...args, '--otp', otp]

		const child = spawn(npmPublishCmd[0], npmPublishCmd.slice(1), {
			stdio: 'inherit',
		})

		child.on('exit', (code) => {
			process.exit(code)
		})

		child.on('error', (err) => {
			console.error('Error running npm publish:', err)
			process.exit(1)
		})
	} catch (err) {
		console.error('Error:', err)
		process.exit(1)
	}
}

publish()
