# Arkhyz Sky 2026

An interactive August night beside the BTA observatory in Arkhyz. Look around the sky, follow the planets, discover deep-sky objects, and wait for a meteor above the forest.

**1–25 August 2026 · Russian / English · Desktop / Mobile**

**[Explore the sky →](https://arkhyz-sky-2026.vercel.app/)**

Inspired by [Astroverts](https://astrovert.ru/) and their astronomy tours.

## Explore

- **A sky tied to a place and time.** Catalog stars and calculated positions of the Sun, Moon and planets for the BTA observing site.
- **A full 360° view.** Smooth zoom from a naked-eye view to a ×4 educational atlas; mouse, keyboard and touch controls.
- **Objects with stories.** Constellation legends, star-name histories, and photographs of 110 Messier objects and 36 selected Caldwell objects.
- **An August meteor season.** Five automatic meteor showers, with rates influenced by the date, radiant altitude and moonlight.
- **A living horizon.** A photographic Milky Way above an illustrated landscape, wandering horses and dogs, a night-time observer, and a rare forest visitor.
- **An optional Apollo soundtrack.** Eight tracks by Brian Eno with Daniel Lanois and Roger Eno, off by default. *An Ending (Ascent)* opens the first listening session, followed by the remaining tracks in shuffled, repeating rounds.

This is an educational sky simulation with an artistic landscape. Its astronomical basis and visual approximations are documented in [Astronomy and validation](docs/ASTRONOMY.md).

## Run locally

Requires **Node.js 22** and npm. No API keys or environment variables are needed.

```sh
npm ci
npm run dev
```

Open [localhost:4173](http://localhost:4173). To run the checks and create a production build:

```sh
npm test
npm run build
```

The build produces a standalone `dist/index.html` with the application, catalogs, fonts and Milky Way image embedded. It can be served by a static web server or opened in a modern browser. The audio stays in separate files under `dist/audio/`; keep that folder beside `index.html` when copying the build. Music does not load until the listener presses its button. Deep-sky photographs and external reference pages require internet access.

## Controls

| Action | Control |
| --- | --- |
| Look around | Drag, one-finger touch, or hold the arrow keys; on desktop, hover near a sky edge to pan gently |
| Zoom smoothly | Slider, scroll wheel, or pinch; ×1 / ×2 / ×4 presets are also available |
| Read an object card | Select a star, planet, the Moon, or a constellation name |
| Open a deep-sky photograph | Double-click or double-tap the object; the atlas also supports search |
| Set the date and time | Date and local-time sliders; the clock uses UTC+3 |
| Pause or change speed | Space, pause button, or ×1 / ×2 / ×4 / ×8 / ×16 |
| Change sky layers | Constellations, meteor showers, ecliptic and deep sky; use the settings button on mobile |
| Toggle music | Music-note button; press again to stop and resume later at the same position. The adjacent arrow opens volume, seek and next-track controls |
| Hide the interface | Eye button; restore with the corner button or Esc |
| Read the guide | The top Info button opens **Controls**; the footer **Details** button opens **About this sky** |

The Moon button shows its phase and location. If necessary, its card offers a suitable night within the available date range.

Desktop edge panning uses a mouse with hover support and a viewport wider than 700 pixels. It accelerates gently within an edge band of up to 96 pixels, capped at 12° per second at ×1. Keyboard panning is capped at 28° per second. Both slow down as the view zooms in, and diagonal movement stays within the same speed cap. Return the cursor to the center or release the arrow keys to stop. Edge motion pauses over controls, during dragging, in dialogs, and when the page loses focus. Form inputs keep their normal arrow-key behavior.

## Project structure

```text
src/
  astro.js          Observer frame, ephemerides and simulation clock
  renderer.js       Sky and landscape rendering
  sky-navigation.js Keyboard controls and gentle desktop edge panning
  meteors.js        Shower activity and event timing
  forest-life.js    Animals and the telescope observer
  milky-way.js      Photographic sky background
  field-guide.js    Bilingual controls and short explanatory panels
  music.js          Bilingual controls for the optional soundtrack
  audio-player.js   Lazy media loading and shuffled, repeating track order
  content.js        Interface text and object information
  data/             Catalogs, image metadata and license notices
public/audio/       Separate, versioned audio files
tests/              Astronomy, rendering, playlist and media-loading checks
scripts/            Catalog preparation and validation utilities
docs/               Scientific notes and source attribution
```

## Audio delivery

The eight stereo recordings are delivered as AAC-LC M4A at 160 kbps: **42.4 MB total for about 35 minutes**, compared with 86.2 MB of source MP3 files. The opening track is 5.4 MB. Audio bytes are not embedded in the page, and no audio source is assigned before the first user click. Only the current track is requested; turning music off cancels further buffering and preserves the position for resuming. Versioned filenames allow long-lived browser caching.

Playback is independent of the simulated date, time and acceleration. Music stays on when the sky interface is hidden; a small music button remains available to stop it. Mobile browsers may suspend playback when the screen locks or the operating system limits background activity. Devices that do not expose programmatic volume control use their hardware volume buttons. Recordings retain their separate copyright notice in `public/audio/apollo/NOTICE.txt`.

## Documentation

- [Astronomy and validation](docs/ASTRONOMY.md) — coordinate models, meteor rates, visual limits and reproducible checks.
- [Sources and credits](docs/CREDITS.md) — data, photographs, stories, software and licenses.

The interface is bilingual; repository documentation is in English. Third-party data, images, text adaptations and fonts retain their respective licenses. Attribution notices are included in the repository and the built page.
