import js from '@eslint/js'
import astroParser from 'astro-eslint-parser'
import astroPlugin from 'eslint-plugin-astro'
import prettier from 'eslint-config-prettier'
import globals from 'globals'
import tseslint from 'typescript-eslint'

const toArray = (value) => (Array.isArray(value) ? value : value ? [value] : [])

export default [
	{
		ignores: [
			'.astro/**',
			'apps/**/.astro/**',
			'apps/**/dist/**',
			'deploy/**',
			'dist/**',
			'node_modules/**',
			'packages/**/dist/**',
		],
	},
	...toArray(js.configs.recommended),
	...toArray(tseslint.configs.recommended),
	...toArray(astroPlugin.configs['flat/recommended']),
	{
		files: ['**/*.{js,mjs,cjs}'],
		languageOptions: {
			globals: globals.node,
			sourceType: 'module',
		},
	},
	{
		files: ['packages/*/src/lib/**/*.ts'],
		languageOptions: {
			globals: globals.browser,
		},
	},
	{
		files: ['apps/*/src/assets/**/*.js'],
		languageOptions: {
			globals: globals.browser,
		},
	},
	{
		files: ['tests/**/*.js'],
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.node,
				...globals.vitest,
			},
		},
	},
	{
		files: ['apps/*/src/**/*.astro'],
		languageOptions: {
			parser: astroParser,
			parserOptions: {
				extraFileExtensions: ['.astro'],
				parser: tseslint.parser,
			},
			globals: {
				...globals.browser,
				...globals.node,
			},
		},
	},
	{
		rules: {
			'no-unused-vars': 'off',
			'@typescript-eslint/no-unused-vars': [
				'warn',
				{ argsIgnorePattern: '^_', ignoreRestSiblings: true },
			],
		},
	},
	prettier,
]
