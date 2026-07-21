#!/usr/bin/env node
import { createInterface } from 'readline'
import fs from 'fs'
import { execSync } from 'child_process'

const rl = createInterface({
	input: fs.createReadStream('/dev/tty'),
	output: fs.createWriteStream('/dev/tty'),
	terminal: true,
})

rl.question('Enter your npm OTP (one-time password): ', (otp) => {
	rl.close()

	if (!otp || otp.trim().length === 0) {
		console.error('OTP is required to publish.')
		process.exit(1)
	}

	try {
		const env = { ...process.env, npm_config_otp: otp }
		execSync('npm run publish:workspaces', {
			stdio: 'inherit',
			env,
		})
	} catch (err) {
		process.exit(1)
	}
})
