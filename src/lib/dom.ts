export const HTMLElementBase =
	globalThis.HTMLElement ?? (class {} as typeof HTMLElement)
