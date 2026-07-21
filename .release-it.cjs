module.exports = {
	git: {
		commitMessage: 'Bump version to ${version}',
		requireCleanWorkingDir: true,
		requireUpstream: true,
		tagAnnotation: 'Release ${version}',
		tagName: 'v${version}',
	},
	github: {
		assets: ['packages/jukette/dist/*'],
		autoGenerate: true,
		release: true,
		tokenRef: 'RELEASE_IT_GITHUB_TOKEN',
	},
	hooks: {
		'before:init': [
			'node -e "if (!process.env.RELEASE_IT_GITHUB_TOKEN) { console.error(\'RELEASE_IT_GITHUB_TOKEN is required for automated GitHub releases.\'); process.exit(1) }"',
			'npm test',
			'npm run typecheck',
			'npm run format:check',
		],
		'after:bump': [
			'node bin/release-workspace-versions.mjs bump ${version}',
			'node bin/release-changelog.mjs promote ${version}',
			'node bin/release-readme.mjs update ${version}',
			'npm run build',
			'git add package.json package-lock.json apps/docs/package.json packages/core/package.json packages/audio/package.json packages/midi/package.json packages/soundcloud/package.json packages/jukette/package.json CHANGELOG.md README.md packages/core/dist packages/audio/dist packages/midi/dist packages/soundcloud/dist packages/jukette/dist',
		],
		'before:release': 'npm run publish:workspaces:dry-run',
		'after:github:release': [
			'node bin/publish-workspaces-with-otp.mjs',
			'npm run docs:publish',
		],
	},
	npm: {
		publish: false,
	},
}
