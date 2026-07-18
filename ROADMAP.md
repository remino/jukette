# ROADMAP

This file tracks forward-looking work for `jukette`.

These items describe intended direction, not release promises.

## Planned

### SoundCloud hardening

SoundCloud support now lives in the separate
`@remino/jukette-soundcloud` addon. Remaining work is mostly about hardening:

- iOS Safari trusted-interaction behaviour
- clearer SoundCloud-specific failure and retry states
- tighter widget lifecycle cleanup when authored track elements change
