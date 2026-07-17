export const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null

export const normalizeBooleanAttribute = (
	value: string | null,
): boolean | undefined => {
	if (value === null) return undefined

	const normalizedValue = value.trim().toLowerCase()
	if (normalizedValue === '' || normalizedValue === 'true') return true
	if (normalizedValue === 'false') return false
	return undefined
}
