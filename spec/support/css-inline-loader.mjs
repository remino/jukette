import { readFile } from 'node:fs/promises'

const query = '?inline'
const cssPattern = /\.css(?:\?inline)?$/

export const resolve = async (specifier, context, nextResolve) => {
	if (!specifier.endsWith(query) && !specifier.endsWith('.css')) {
		return nextResolve(specifier, context)
	}

	const target = specifier.endsWith(query)
		? specifier.slice(0, -query.length)
		: specifier
	const resolved = await nextResolve(target, context)

	return {
		shortCircuit: true,
		url: `${resolved.url}${specifier.endsWith(query) ? query : ''}`,
	}
}

export const load = async (url, context, nextLoad) => {
	if (!cssPattern.test(url)) return nextLoad(url, context)

	const cssUrl = url.endsWith(query) ? url.slice(0, -query.length) : url
	const source = await readFile(new URL(cssUrl), 'utf8')

	return {
		format: 'module',
		shortCircuit: true,
		source: `export default ${JSON.stringify(source)}`,
	}
}
