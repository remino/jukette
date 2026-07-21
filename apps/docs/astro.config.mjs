// @ts-check
import { defineConfig } from 'astro/config'
import { resolve } from 'node:path'
import { unified } from '@astrojs/markdown-remark'
import compressor from 'astro-compressor'
import minifyHtml from 'astro-minify-html'
import rehypeCodeBlocks from './src/lib/rehype-code-blocks.mjs'

export default defineConfig({
	outDir: '../../deploy/public',
	srcDir: './src',
	site: 'https://remino.net/jukette/',
	trailingSlash: 'always',
	markdown: {
		processor: unified({
			rehypePlugins: [rehypeCodeBlocks],
		}),
	},
	integrations: [
		minifyHtml({
			collapseWhitespace: true,
			removeComments: true,
			minifyCSS: true,
			minifyJS: true,
		}),
		compressor({
			fileExtensions: [
				'.css',
				'.js',
				'.json',
				'.html',
				'.xml',
				'.cjs',
				'.mjs',
				'.svg',
			],
		}),
	],
	build: {
		assets: 'jukette',
	},
	vite: {
		build: {
			assetsInlineLimit: 0,
		},
		resolve: {
			alias: {
				'@remino/jukette-audio/auto': resolve(
					'../../packages/audio/src/lib/audio-auto.ts',
				),
				'@remino/jukette-midi/auto': resolve(
					'../../packages/midi/src/lib/midi-auto.ts',
				),
				'@remino/jukette-soundcloud/auto': resolve(
					'../../packages/soundcloud/src/lib/soundcloud-auto.ts',
				),
				'jukette/auto': resolve(
					'../../packages/jukette/src/lib/auto.ts',
				),
				'@remino/jukette-core': resolve(
					'../../packages/core/src/lib/core.ts',
				),
				'@remino/jukette-audio': resolve(
					'../../packages/audio/src/lib/audio.ts',
				),
				'@remino/jukette-midi': resolve(
					'../../packages/midi/src/lib/midi-entry.ts',
				),
				'@remino/jukette-soundcloud': resolve(
					'../../packages/soundcloud/src/lib/soundcloud.ts',
				),
				jukette: resolve('../../packages/jukette/src/lib/jukette.ts'),
			},
		},
	},
})
