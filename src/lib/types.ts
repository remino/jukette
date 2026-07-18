export type JuketteTrackKind = 'audio' | 'midi'
export type JuketteMidiOscillator = OscillatorType | 'auto'
export type JuketteEventName =
	| 'jukette:ended'
	| 'jukette:pause'
	| 'jukette:play'
	| 'jukette:seek'
	| 'jukette:trackchange'

export interface JuketteTrack {
	title?: string
	artist?: string
	preferMediaMetadata?: boolean
	preload?: boolean
	src: string
	type?: JuketteTrackKind
}

export interface AudioFileMetadata {
	artist?: string
	title?: string
}

export interface JuketteEventDetail {
	currentTime: number
	duration: number
	index: number
	playing: boolean
	track: JuketteTrack | null
	tracks: JuketteTrack[]
	type?: JuketteTrackKind
}

export interface MidiNote {
	duration: number
	frequency: number
	start: number
	velocity: number
}

export interface MidiSequence {
	duration: number
	metadata?: {
		program?: number
		title?: string
	}
	notes: MidiNote[]
}
