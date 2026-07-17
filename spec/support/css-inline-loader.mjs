import { readFile } from 'node:fs/promises'

const query = '?inline'

export const resolve = async (specifier, context, nextResolve) => {
	if (!specifier.endsWith(query)) return nextResolve(specifier, context)

	const resolved = await nextResolve(
		specifier.slice(0, -query.length),
		context,
	)

	return {
		shortCircuit: true,
		url: `${resolved.url}${query}`,
	}
}

export const load = async (url, context, nextLoad) => {
	if (!url.endsWith(query)) return nextLoad(url, context)

	const source = await readFile(new URL(url.slice(0, -query.length)), 'utf8')

	return {
		format: 'module',
		shortCircuit: true,
		source: `export default ${JSON.stringify(source)}`,
	}
}
