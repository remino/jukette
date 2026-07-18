export const decodeAscii = (bytes: Uint8Array): string =>
	String.fromCharCode(...bytes)

export const decodeIso88591 = (bytes: Uint8Array): string =>
	String.fromCharCode(...bytes)

export const decodeUtf16Be = (bytes: Uint8Array): string => {
	const codeUnits: number[] = []
	for (let index = 0; index + 1 < bytes.length; index += 2) {
		codeUnits.push((bytes[index] << 8) | bytes[index + 1])
	}
	return String.fromCharCode(...codeUnits)
}

export const decodeTextBytes = (
	bytes: Uint8Array,
	encoding: string,
): string => {
	try {
		return new TextDecoder(encoding).decode(bytes)
	} catch {
		return encoding === 'iso-8859-1'
			? decodeIso88591(bytes)
			: decodeAscii(bytes)
	}
}

export const cleanMetadataText = (value: string): string => {
	const nullIndex = value.indexOf('\u0000')
	const trimmedValue =
		nullIndex >= 0 ? value.slice(0, nullIndex) : value.trimEnd()

	return trimmedValue.trim()
}
