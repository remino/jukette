# jukette

A white-label jukebox custom element exposed as `<jukette-player>`.

Jukette v0.3.0

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
- [Roadmap](#roadmap)
- [Development](#development)
- [Release](#release)
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
<script src="https://unpkg.com/jukette@0.3.0"></script>
```

If you want the API instead of auto-registration, import the ES module directly:

```html
<script type="module">
	import { defineElement } from 'https://unpkg.com/jukette@0.3.0/dist/jukette.mjs'

	defineElement()
</script>
```

### npm

Install the convenience package first:

```sh
npm install jukette
```

Then register the custom element automatically:

```js
import 'jukette/auto'
```

Or import the explicit API:

```js
import { defineElement } from 'jukette'

defineElement()
```

TypeScript declarations are included with the package.

Optional modular packages:

```sh
npm install jukette @remino/jukette-midi @remino/jukette-soundcloud
```

- `jukette`: convenience package with `@remino/jukette-core` and
  `@remino/jukette-audio`.
- `@remino/jukette-core`: backendless player infrastructure.
- `@remino/jukette-audio` and `@remino/jukette-audio/auto`: browser-native
  audio backend.
- `@remino/jukette-midi` and `@remino/jukette-midi/auto`: optional MIDI
  backend.
- `@remino/jukette-soundcloud` and `@remino/jukette-soundcloud/auto`:
  optional SoundCloud backend.

Typical addon usage:

```js
import 'jukette/auto'
import '@remino/jukette-midi/auto'
import '@remino/jukette-soundcloud/auto'
```

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
		title="Flickermood"
		artist="Forss"
		src="https://soundcloud.com/forss/flickermood"
		type="soundcloud"
		preload
	></jukette-track>
	<jukette-track
		title="Reprise"
		artist="Local"
		src="/audio/reprise.ogg"
	></jukette-track>
</jukette-player>
```

Changing the selected track prepares it for playback but does not start it
automatically. Jukette enables play, seek, and time controls once the selected
track is ready.

The default `jukette` entry includes browser-native audio support only. Import
addons for other track types:

```js
import 'jukette/auto'
import '@remino/jukette-midi/auto'
import '@remino/jukette-soundcloud/auto'
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
		"type": "audio",
		"preload": true,
		"preferMediaMetadata": false
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

- `src`: required URL for a local audio file, local MIDI file, or public
  SoundCloud track URL when `type="soundcloud"` is used.
- `title`: optional display title.
- `artist`: optional display artist.
- `type`: optional backend-owned track type such as `audio`, `midi`, or
  `soundcloud`.
- `preload` attribute / `preload` object field: optional per-track playback
  preparation preference.
- `prefer-media-metadata` / `preferMediaMetadata`: optional per-track override
  for the player's media metadata preference.

If `type` is omitted, Jukette treats `.mid` / `.midi` sources as `midi`.
Everything else defaults to `audio`.

In practice, the convenience `jukette` package registers the browser-native
audio backend for you, so tracks without an explicit `type` normally behave as
audio tracks unless their source looks like MIDI.

MIDI playback uses `@tonejs/midi` for parsing and a compact Tone.js synth for
browser playback. It is intentionally simple and suitable for local MIDI
previews, not a full General MIDI instrument set.

SoundCloud playback is available through the optional
`@remino/jukette-soundcloud` addon. Selecting a SoundCloud track prepares the
hidden widget and oEmbed metadata first, then enables Play once the widget is
ready to accept playback calls. Player-level `preload-metadata` does not
prepare SoundCloud tracks by itself; use per-track `preload` when you want a
SoundCloud widget prepared before selection, and `prefer-media-metadata` when
you want authored labels to yield to fetched SoundCloud metadata.

If a selected track type has no registered backend, Jukette leaves the track
selected, keeps playback controls disabled, and surfaces that the track type is
unavailable.

[Back to top](#)

---

## API

Each element exposes:

```js
const player = document.querySelector('jukette-player')

player.play()
player.pause()
player.toggle()
player.seek(30)
player.currentTime = 30
console.log(player.currentTime)
console.log(player.currentTrack)
console.log(player.currentTrackIndex)
console.log(player.totalTracks)
player.playlist = [{ title: 'Track', src: '/track.mp3' }]
player.preloadMetadata = true
player.preferMediaMetadata = true
player.midiOscillator = 'sine'
```

Core and addon imports:

```js
import { defineElement } from '@remino/jukette-core'
import { register as registerAudio } from '@remino/jukette-audio'
import { register as registerMidi } from '@remino/jukette-midi'
import { register as registerSoundCloud } from '@remino/jukette-soundcloud'

registerAudio()
registerMidi()
registerSoundCloud()
defineElement()
```

Use the `preload-metadata` attribute or `preloadMetadata` property to discover
playlist durations before tracks are played. Jukette preloads metadata for
registered backends that provide preload hooks, including browser-native audio
and local MIDI. SoundCloud stays opt-in here: player-level `preload-metadata`
alone does not fetch or prepare SoundCloud tracks.

Use `currentTime` to read the current playback position in seconds. Assigning
to `currentTime` seeks, matching native media element behavior.

Use `currentTrack`, `currentTrackIndex`, and `totalTracks` to inspect the track
selection state.

Selecting a track prepares it and resets playback to the start of that track.
Playback begins only after an explicit `play()` call or a user press on the
play button.

If the selected track backend is unavailable, Jukette keeps the selected track
visible but leaves play, seek, and time controls disabled.

Use `prefer-media-metadata` or `preferMediaMetadata` to let readable media-file
tags override authored track titles and artists. Jukette currently reads MP3
ID3 `TIT2` title and `TPE1` artist tags, plus MIDI track/sequence names as
titles. MIDI artists stay authored-only. Authored values stay in place when
tags are missing, unreadable, or unsupported.

Direct `<jukette-track>` children and JavaScript track objects can override the
player-level preference per track. Use `prefer-media-metadata` or
`preferMediaMetadata: true` to force metadata display for that track, use
`prefer-media-metadata="false"` or `preferMediaMetadata: false` to force
authored display values, or omit it to inherit the player setting.

Use `preload` or `preload: true` to ask Jukette to prepare a track for playback
when possible. The flag is track-local and does not change media metadata
preloading. For SoundCloud tracks, it also opts that track into early widget
preparation before the user selects it.

Use `midi-oscillator` or `midiOscillator` to choose the Tone.js MIDI preview
oscillator. Supported values are `auto`, `sine`, `square`, `sawtooth`, and
`triangle`. `auto` is the default and maps MIDI program changes to a simple
preview timbre; invalid values fall back to `auto`. The property matters only
when the MIDI addon is registered.

Jukette dispatches bubbling composed custom events from the `<jukette-player>`
host:

- `jukette:play`
- `jukette:pause`
- `jukette:seek`
- `jukette:ended`
- `jukette:trackchange`

Each event includes `event.detail` with the current `track`, `tracks`, `index`,
`type`, `currentTime`, `duration`, and `playing`.

[Back to top](#)

---

## Styling

Jukette keeps the default UI basic on purpose. It uses inherited text color and
font, a single border, and native range controls. Style the host element first:

```css
jukette-player {
	color: #111;
	font:
		1rem/1.4 system-ui,
		sans-serif;
	max-inline-size: 36rem;
	--jukette-control-size: 2.25rem;
}
```

The host supports these stable styling inputs:

- `color`: inherited by text, borders, buttons, and range accents.
- `font`: inherited by labels, buttons, and the track selector.
- `--jukette-control-size`: controls the square play button size. Defaults to
  `2em`.
- `inline-size`, `max-inline-size`, `margin`, and other normal layout
  properties on `jukette-player`.

Use host attributes for state-specific styling:

```css
jukette-player[data-kind='midi'] {
	color: #164e63;
}
```

Range inputs use `accent-color: currentColor` inside the shadow DOM, so changing
the host `color` changes the seek accent in browsers that support native range
accent styling.

For deeper styling, Jukette exposes stable `::part()` hooks:

- Layout: `player`, `track`, `seek`, `time`, `controls`.
- Track display: `title`, `artist`, `status`.
- Controls: `button`, `play-button`, `seek-input`, `track-select`.

```css
jukette-player::part(player) {
	border: 0;
	padding: 0;
}

jukette-player::part(play-button) {
	border-radius: 999px;
}

jukette-player::part(track-select) {
	font-size: 0.95rem;
}
```

[Back to top](#)

---

## Roadmap

Forward-looking work lives in [ROADMAP.md](./ROADMAP.md). For now, that covers
the planned SoundCloud addon direction without expanding `jukette` core again.

[Back to top](#)

---

## Development

```sh
npm install
npm run dev
npm run build
```

This repository is an npm workspaces monorepo:

- `packages/jukette`: publishes `jukette`.
- `packages/core`: publishes `@remino/jukette-core`.
- `packages/audio`: publishes `@remino/jukette-audio`.
- `packages/midi`: publishes `@remino/jukette-midi`.
- `apps/docs`: Astro docs and demo site.

Root scripts orchestrate builds in dependency order. Use `npm run build`,
`npm run typecheck`, and `npm test` from the repo root.

Common root shortcuts:

- `npm run dev` or `npm run dev:docs`: start the Astro docs site.
- `npm run build:packages`: build the publishable packages only.
- `npm run build:docs`: build the docs app only.
- `npm run preview:docs`: preview the built docs app.

[Back to top](#)

---

## Release

Release automation is available through `release-it`. A release runs checks,
bumps the root and publishable workspace package versions in lockstep, builds
the workspace packages, dry-runs publish order, publishes the scoped packages
first, publishes `jukette` last, creates the GitHub release, and then publishes
docs:

```sh
npm run release:dry-run
npm run release
```

If docs publishing fails after the package release, rerun it directly:

```sh
npm run docs:publish
```

Before running a real release, make sure `RELEASE_IT_GITHUB_TOKEN` is set and
`npm whoami --registry https://registry.npmjs.org/` passes. Release-it prompts
for an npm OTP when npm requires one.

[Back to top](#)

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
