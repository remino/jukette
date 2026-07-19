export const pad = (val) => String(val).padStart(2, '0')

export const formatTime = (seconds: number): string => {
	const safeSeconds = Number.isFinite(seconds) ? Math.max(0, seconds) : 0
	const roundedSeconds = Math.floor(safeSeconds)
	const minutes = Math.floor(roundedSeconds / 60)
	const remainder = roundedSeconds % 60

	return `${minutes}:${pad(remainder)}`
}
