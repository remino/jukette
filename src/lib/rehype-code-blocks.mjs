const hasClass = (node, className) => {
	const value = node.properties?.className

	return Array.isArray(value)
		? value.includes(className)
		: String(value ?? '')
				.split(/\s+/)
				.includes(className)
}

const isElement = (node) => node?.type === 'element'

const isCodeBlock = (node) => isElement(node) && hasClass(node, 'code-block')

const isPre = (node) => isElement(node) && node.tagName === 'pre'

const wrapCodeBlocks = (node, parentIsCodeBlock = false) => {
	if (!Array.isArray(node.children)) return

	for (let index = 0; index < node.children.length; index += 1) {
		const child = node.children[index]

		if (isPre(child) && !parentIsCodeBlock) {
			node.children[index] = {
				type: 'element',
				tagName: 'div',
				properties: { className: ['code-block'] },
				children: [child],
			}
			continue
		}

		wrapCodeBlocks(child, isCodeBlock(child))
	}
}

export default function rehypeCodeBlocks() {
	return (tree) => {
		wrapCodeBlocks(tree)
	}
}
