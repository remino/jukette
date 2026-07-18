import {
	cleanMetadataText,
	decodeAscii,
	decodeIso88591,
	decodeTextBytes,
	decodeUtf16Be,
	type AudioFileMetadata,
} from '@remino/jukette-core'

const readSynchsafeInteger = (
	data: Uint8Array,
	offset: number,
	length = 4,
): number => {
	let value = 0
	for (let index = 0; index < length; index++) {
		value = (value << 7) | (data[offset + index] & 0x7f)
	}
	return value
}

const readUint32 = (data: Uint8Array, offset: number): number =>
	((data[offset] << 24) |
		(data[offset + 1] << 16) |
		(data[offset + 2] << 8) |
		data[offset + 3]) >>>
	0

const decodeId3TextFrame = (frameData: Uint8Array): string => {
	if (frameData.length < 2) return ''

	const encoding = frameData[0]
	const content = frameData.slice(1)
	if (encoding === 0) return cleanMetadataText(decodeIso88591(content))
	if (encoding === 3) {
		return cleanMetadataText(decodeTextBytes(content, 'utf-8'))
	}
	if (encoding === 2) return cleanMetadataText(decodeUtf16Be(content))

	return cleanMetadataText(decodeTextBytes(content, 'utf-16'))
}

export const parseAudioFileMetadata = (
	buffer: ArrayBuffer,
): AudioFileMetadata => {
	const data = new Uint8Array(buffer)
	if (data.length < 10 || decodeAscii(data.slice(0, 3)) !== 'ID3') {
		return {}
	}

	const version = data[3]
	const flags = data[5]
	const tagEnd = Math.min(data.length, 10 + readSynchsafeInteger(data, 6))
	let offset = 10

	if (flags & 0x40 && offset + 4 <= tagEnd) {
		const extendedHeaderSize =
			version === 4
				? readSynchsafeInteger(data, offset)
				: readUint32(data, offset) + 4
		offset += extendedHeaderSize
	}

	const metadata: AudioFileMetadata = {}
	while (offset + 10 <= tagEnd) {
		const frameId = decodeAscii(data.slice(offset, offset + 4))
		if (!/^[A-Z0-9]{4}$/.test(frameId)) break

		const frameSize =
			version === 4
				? readSynchsafeInteger(data, offset + 4)
				: readUint32(data, offset + 4)
		const frameStart = offset + 10
		const frameEnd = frameStart + frameSize
		if (frameSize <= 0 || frameEnd > tagEnd) break

		const frameData = data.slice(frameStart, frameEnd)
		if (frameId === 'TIT2') metadata.title = decodeId3TextFrame(frameData)
		if (frameId === 'TPE1') metadata.artist = decodeId3TextFrame(frameData)
		offset = frameEnd
	}

	return metadata
}
