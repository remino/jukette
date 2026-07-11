# jukette

## How to Build

- This is the repo for jukette.
- There are two main components: the new jukette js lib and its docs website.
- The repo of a js lib and docs site should be modelled after the remarqueeble
  repo symlinked here.
- add readme in the style of the one found ij remarqueeble

### JS lib

- jukette js lib is a library that contains a white label jukebox
- jukebox can play tracks sound from soundcloud, local files, as well as local
  midi files
- minimal ui, with play/pause, previous/restart track, next track, volume, seek,
  track display, playlist toggle
- use css for animations
- use css and animation-delay to simulate seek handle position
- dont use fluff theming, just basic. this is made for the consumer to style
- create new jukette-player element with it

### Docs site

- create one similar to remarqueeble
- use astro 7 and directive.css
