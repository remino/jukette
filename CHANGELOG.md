# CHANGELOG

<!-- mtoc-start -->

- [HEAD](#head)
- [v0.3.0](#v030)
- [v0.2.0](#v020)
- [v0.1.0](#v010)

<!-- mtoc-end -->

## HEAD

- Library
    - Remove SoundCloud playback from the core library so `jukette-player`
      focuses on browser-native audio and local MIDI tracks.
    - Simplify `jukette-player` into a track selector with a single
      play/pause control row, native track `<select>`, clickable elapsed or
      remaining time readout, and no previous/next or playlist panel UI.
    - Remove playlist navigation and toggle APIs from the player public
      surface, keeping track selection and playback state focused on the
      current track.
    - Fold transient status messaging into the track meta line so the player
      falls back to the artist display when no status is active.
    - Remove the built-in volume control from the simplified player UI and
      internal playback plumbing.
    - Split track parsing, metadata parsing, MIDI parsing, shared types, and
      constants into focused `src/lib` modules.
    - Move player shadow styles into `src/lib/jukette-player.css` and generate
      a minified inline style module for builds and tests.
    - Move `JukettePlayerElement` and custom-element registration out of the
      public `jukette.ts` entrypoint.
    - Split native audio and MIDI playback behavior into internal playable
      track classes so the player element can focus on UI and playlist
      orchestration.
    - Move player DOM setup, playlist rendering, metadata preloading,
      and progress/status display into focused internal controller and helper
      modules.
    - Import player shadow CSS through Vite's inline CSS pipeline instead of a
      custom generated TypeScript style module.
    - Add a per-track `preload` flag for future playback preparation policies.
    - Add per-track `prefer-media-metadata` and `preload` overrides so authored
      playlists can control metadata display and playback preparation on a
      track-by-track basis.
    - Replace the handwritten MIDI parser and oscillator scheduler with
      `@tonejs/midi` plus a Tone.js synth-backed playback path.
    - Move MIDI playback to a Tone transport and part lifecycle so pause,
      replay, and rapid resume behavior work predictably for local MIDI files.
    - Expose the time readout as `button > time` in the player shadow DOM and
      simplify the control styling surface around the new compact layout.

## v0.3.0

- Library
    - Add stable `::part()` hooks for styling the shadow UI.
- Site
    - Document the supported Jukette styling surface.

## v0.2.0

- Repo
    - Add Husky, lint-staged, release-it, and changelog release tooling.
- Library
    - Add `jukette:*` custom events for playback, navigation, progress, volume,
      playlist toggling, and track changes.
    - Add a public `currentTime` getter/setter for reading and seeking the
      playback position.
    - Add `currentTrackIndex`, `totalTracks`, and `playlistOpen` public
      properties.
- Site
    - Add an updates page rendered from this changelog.

## v0.1.0

- Library
    - Add the initial `jukette-player` custom element for audio and MIDI
      playlists.
- Site
    - Add the initial Astro documentation site and demo.
