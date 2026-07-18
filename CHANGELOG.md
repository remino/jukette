# CHANGELOG

<!-- mtoc-start -->

- [HEAD](#head)
- [v0.3.0](#v030)
- [v0.2.0](#v020)
- [v0.1.0](#v010)

<!-- mtoc-end -->

## HEAD

- Repo
    - Replace the root Jasmine runner with Vitest, port the release-script
      and helper tests, and add `jsdom`-based player DOM coverage.
    - Migrate the repository to an npm workspaces monorepo with
      `packages/jukette`, `packages/core`, `packages/audio`,
      `packages/midi`, and `apps/docs`.
    - Publish modular packages as `@remino/jukette-core`,
      `@remino/jukette-audio`, and `@remino/jukette-midi` while keeping
      unscoped `jukette` as the convenience bundle.
    - Move the Astro docs and demo site into the `apps/docs` workspace and
      update shared build, typecheck, release, and publish tooling to run
      across the workspace layout in lockstep.
    - Keep the docs site on the shared `@remino/astro-site-nav` components and
      leave `SITE_NAV_INCLUDE_ROOT` as the environment-provided source of HTML
      partials instead of checking partials into this repository.
    - Add a workspace-local docs `.env` so `SITE_NAV_INCLUDE_ROOT` resolves
      correctly for the Astro app without extra launch wrappers.
    - Rename the private workspace root package and add explicit `dev:docs`,
      `build:packages`, `build:docs`, `preview:docs`, and targeted typecheck
      scripts so the monorepo entrypoints read more clearly.
    - Remove the stale `ROADMAP.md` planning file now that the SoundCloud
      addon direction has either landed or moved into the changelog.
    - Fix lockstep release automation so version bumps and release staging now
      include `@remino/jukette-soundcloud` and the docs workspace manifest.
    - Make root `typecheck` read-only for release preflight by removing
      workspace builds from that script and splitting package validation into
      dedicated non-composite `tsconfig.typecheck.json` files.
- Library
    - Shorten the explicit package setup APIs to `defineElement()` for
      `jukette` and `register()` for addon backends, while keeping the
      existing verbose aliases available during the `0.x` line.
    - Keep SoundCloud preload opt-in so player-level `preload-metadata` alone
      does not fetch or prepare SoundCloud tracks, while per-track `preload`
      remains the signal for early widget setup.
    - Reintroduce SoundCloud support as the optional
      `@remino/jukette-soundcloud` backend addon with per-track widget
      preparation, oEmbed metadata loading, and selection-time readiness
      gating.
    - Reuse per-track SoundCloud widgets while resetting selection-time state
      correctly so reselected tracks rewind to the beginning, ignore stale
      progress from earlier play sessions, and no longer surface `Pause`
      before an explicit user play request.
    - Remove SoundCloud playback from the core library so `jukette-player`
      focuses on browser-native audio and local MIDI tracks.
    - Simplify `jukette-player` into a track selector with a single
      play/pause control row, native track `<select>`, clickable elapsed or
      remaining time readout, and no previous/next or playlist panel UI.
    - Let the focused track `<select>` act as a transport shortcut: `Enter`
      now toggles play or pause for the prepared selected track, and `Space`
      starts playback when the player is idle.
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
