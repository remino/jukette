import js from '@eslint/js'
import astroParser from 'astro-eslint-parser'
import astroPlugin from 'eslint-plugin-astro'
import prettier from 'eslint-config-prettier'
import globals from 'globals'
import tseslint from 'typescript-eslint'

const toArray = (value) => (Array.isArray(value) ? value : value ? [value] : [])

export default [
	{
		ignores: ['.astro/**', 'deploy/**', 'dist/**', 'node_modules/**'],
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
		files: ['src/lib/**/*.ts'],
		languageOptions: {
			globals: globals.browser,
		},
	},
	{
		files: ['src/assets/**/*.js'],
		languageOptions: {
			globals: globals.browser,
		},
	},
	{
		files: ['spec/**/*.js'],
		languageOptions: {
			globals: globals.jasmine,
		},
	},
	{
		files: ['src/**/*.astro'],
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
