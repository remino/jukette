# ROADMAP

This file tracks forward-looking work for `jukette`.

These items describe intended direction, not release promises.

## Planned

### SoundCloud addon

Reintroduce SoundCloud support as a separate addon package rather than moving it
back into `jukette` core.

The target shape is a playback-provider addon, tentatively named
`jukette-soundcloud`, that keeps the existing player surface:

- continue using `<jukette-player>`
- continue using `<jukette-track type="soundcloud">`
- activate SoundCloud support only after the addon is imported and registered

Core should stay focused on browser-native audio and local MIDI playback. If
the addon needs hooks in core, add a small provider or backend registration
surface when implementing the addon rather than hard-coding SoundCloud behavior
back into `JukettePlayerElement`.

The addon should own all SoundCloud-specific behavior:

- widget and iframe lifecycle
- per-track prepare or preload behavior
- oEmbed metadata loading
- SoundCloud-specific status and error handling
- trusted-interaction playback quirks

Known constraint: iOS Safari trusted-interaction and autoplay rules may still
limit how reliably a SoundCloud track can start from a delayed widget-ready
callback. The addon should document that clearly instead of promising native
audio-style behavior where the platform does not allow it.
