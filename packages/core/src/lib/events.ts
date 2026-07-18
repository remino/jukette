import type { JuketteEventDetail } from './types'
import { inferTrackType } from './tracks'

export const createJuketteEventDetail = (
	detail: Omit<JuketteEventDetail, 'type'>,
): JuketteEventDetail => ({
	...detail,
	tracks: [...detail.tracks],
	type: detail.track ? inferTrackType(detail.track) : undefined,
})
