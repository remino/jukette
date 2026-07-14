# jukette

A white-label jukebox custom element exposed as `<jukette-player>`.

Jukette v0.1.0

By Rémino Rem  
<https://remino.net/>

[Docs](https://remino.net/jukette/) |
[Code Repo](https://github.com/remino/jukette) |
[npm Package](https://www.npmjs.com/package/jukette)

---

<!-- mtoc-start -->

- [Installation](#installation)
    - [HTML (CDN)](#html-cdn)
    - [npm](#npm)
    - [Direct download](#direct-download)
- [Usage](#usage)
- [Playlist](#playlist)
- [Tracks](#tracks)
- [API](#api)
- [Styling](#styling)
- [Development](#development)
- [Contributing](#contributing)
- [Licence](#licence)

<!-- mtoc-end -->

---

## Installation

### HTML (CDN)

Register the custom element automatically from a CDN:

```html
<script src="https://unpkg.com/jukette"></script>
```

Mirrors:

- https://unpkg.com/jukette
- https://cdn.jsdelivr.net/npm/jukette

Use a pinned version in production:

```html
<script src="https://unpkg.com/jukette@0.1.0"></script>
```

If you want the API instead of auto-registration, import the ES module directly:

```html
<script type="module">
	import { defineJuketteElement } from 'https://unpkg.com/jukette@0.1.0/dist/jukette.mjs'

	defineJuketteElement()
</script>
```

### npm

Install the package first:

```sh
npm install jukette
```

Then register the custom element automatically:

```js
import 'jukette/auto'
```

Or import the explicit API:

```js
import { defineJuketteElement } from 'jukette'

defineJuketteElement()
```

TypeScript declarations are included with the package.

### Direct download

Download the package tarball or individual files from npm/CDN:

- https://www.npmjs.com/package/jukette
- https://unpkg.com/jukette/dist/
- https://cdn.jsdelivr.net/npm/jukette/dist/

The browser-ready auto-registration file is `dist/jukette-auto.min.js`.

Distribution files:

- `dist/jukette.mjs`: ES module library API.
- `dist/jukette.cjs`: CommonJS library API.
- `dist/jukette-auto.mjs`: ES module auto-registration entry.
- `dist/jukette-auto.cjs`: CommonJS auto-registration entry.
- `dist/jukette-auto.min.js`: minified classic browser auto-registration.

[Back to top](#)

---

## Usage

After registration, use the element with a single source:

```html
<jukette-player src="/audio/theme.mp3"></jukette-player>
```

Or pass a playlist with child track elements:

```html
<jukette-player preload-metadata prefer-media-metadata>
	<jukette-track
		title="Theme"
		artist="Local"
		src="/audio/theme.mp3"
	></jukette-track>
	<jukette-track
		title="Sketch"
		src="/midi/sketch.mid"
		type="midi"
	></jukette-track>
	<jukette-track
		title="Set"
		src="https://soundcloud.com/example/set"
	></jukette-track>
</jukette-player>
```

[Back to top](#)

---

## Playlist

Use direct `<jukette-track>` children for authored HTML. Browser HTML requires
explicit closing tags, so write `<jukette-track></jukette-track>` rather than a
self-closing tag.

For generated markup or compatibility with older usage, the `playlist`
attribute also accepts JSON. Each item can be either a URL string or a track
object.

```json
[
	"/audio/one.mp3",
	{
		"title": "Two",
		"artist": "Example",
		"src": "/audio/two.ogg",
		"type": "audio"
	}
]
```

When JSON parsing fails, Jukette treats the attribute as a newline-separated URL
list.

Track sources are resolved in this order:

- `player.playlist` set from JavaScript.
- Direct `<jukette-track>` children.
- `playlist` attribute JSON or newline list.
- Single `src` attribute.

[Back to top](#)

---

## Tracks

`<jukette-track>` attributes and track object fields:

- `src`: required URL for a local audio file, local MIDI file, or SoundCloud URL.
- `title`: optional display title.
- `artist`: optional display artist.
- `type`: optional `audio`, `midi`, or `soundcloud`.

If `type` is omitted, Jukette infers SoundCloud URLs and `.mid` / `.midi` files.
Everything else is treated as browser-native audio.

MIDI playback uses a small built-in Standard MIDI File parser and Web Audio
synth. It is intentionally simple and suitable for local MIDI previews, not a
full General MIDI instrument set.

[Back to top](#)

---

## API

Each element exposes:

```js
const player = document.querySelector('jukette-player')

player.play()
player.pause()
player.toggle()
player.next()
player.previous()
player.seek(30)
player.playlist = [{ title: 'Track', src: '/track.mp3' }]
player.preloadMetadata = true
player.preferMediaMetadata = true
player.midiOscillator = 'sine'
```

Use the `preload-metadata` attribute or `preloadMetadata` property to discover
playlist durations before tracks are played. Jukette preloads metadata for
browser-native audio and local MIDI tracks. SoundCloud durations are reported
when the SoundCloud widget has loaded that track.

Use `prefer-media-metadata` or `preferMediaMetadata` to let readable media-file
tags override authored track titles and artists. Jukette currently reads MP3
ID3 `TIT2` title and `TPE1` artist tags, plus MIDI track/sequence names as
titles. SoundCloud display metadata is loaded from oEmbed when available. MIDI
artists stay authored-only. Authored values stay in place when tags are missing,
unreadable, or unsupported.

Use `midi-oscillator` or `midiOscillator` to choose the built-in MIDI preview
oscillator. Supported values are `auto`, `sine`, `square`, `sawtooth`, and
`triangle`. `auto` is the default and maps MIDI program changes to a simple
preview timbre; invalid values fall back to `auto`.

[Back to top](#)

---

## Styling

Jukette keeps the default UI basic on purpose. It uses inherited text color and
font, a single border, and native range controls.

```css
jukette-player {
	max-inline-size: 36rem;
}
```

[Back to top](#)

---

## Development

```sh
npm install
npm run dev
npm run build
```

The library source lives in `src/lib`. The documentation site is built with
Astro and lives in the rest of `src`.

---

## Contributing

1. Fork the repository.
2. Create a feature branch: `git checkout -b feature/amazing-feature`.
3. Make your changes.
4. Run `npm run build` and `npm test`.
5. Commit, push, and open a pull request.

---

## Licence

ISC. See [LICENSE.md](LICENSE.md).
