export type JuketteTrackKind = 'audio' | 'soundcloud' | 'midi'
export type JuketteMidiOscillator = OscillatorType | 'auto'
export type JuketteEventName =
	| 'jukette:ended'
	| 'jukette:next'
	| 'jukette:pause'
	| 'jukette:play'
	| 'jukette:playlisttoggle'
	| 'jukette:previous'
	| 'jukette:restart'
	| 'jukette:seek'
	| 'jukette:trackchange'
	| 'jukette:volumechange'

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
	direction?: 'next' | 'previous'
	duration: number
	fromIndex?: number
	index: number
	open?: boolean
	playing: boolean
	playlistOpen: boolean
	toIndex?: number
	track: JuketteTrack | null
	tracks: JuketteTrack[]
	type?: JuketteTrackKind
	volume: number
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
