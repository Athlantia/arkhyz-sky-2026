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

The build produces a standalone `dist/index.html` with the application, catalogs, fonts and Milky Way image embedded. It can be served by a static web server or opened in a modern browser. Deep-sky photographs and external reference pages require internet access.

## Controls

| Action | Control |
| --- | --- |
| Look around | Drag, one-finger touch, or arrow keys |
| Zoom smoothly | Slider, scroll wheel, or pinch; ×1 / ×2 / ×4 presets are also available |
| Read an object card | Select a star, planet, the Moon, or a constellation name |
| Open a deep-sky photograph | Double-click or double-tap the object; the atlas also supports search |
| Set the date and time | Date and local-time sliders; the clock uses UTC+3 |
| Pause or change speed | Space, pause button, or ×1 / ×2 / ×4 / ×8 / ×16 |
| Change sky layers | Constellations, meteor showers, ecliptic and deep sky; use the settings button on mobile |
| Hide the interface | Eye button; restore with the corner button or Esc |
| Read the guide | The top Info button opens **Controls**; the footer **Details** button opens **About this sky** |

The Moon button shows its phase and location. If necessary, its card offers a suitable night within the available date range.

## Project structure

```text
src/
  astro.js          Observer frame, ephemerides and simulation clock
  renderer.js       Sky and landscape rendering
  meteors.js        Shower activity and event timing
  forest-life.js    Animals and the telescope observer
  milky-way.js      Photographic sky background
  field-guide.js    Bilingual controls and short explanatory panels
  content.js        Interface text and object information
  data/             Catalogs, image metadata and license notices
tests/              Astronomy, timing and rendering-model checks
scripts/            Catalog preparation and validation utilities
docs/               Scientific notes and source attribution
```

## Documentation

- [Astronomy and validation](docs/ASTRONOMY.md) — coordinate models, meteor rates, visual limits and reproducible checks.
- [Sources and credits](docs/CREDITS.md) — data, photographs, stories, software and licenses.

The interface is bilingual; repository documentation is in English. Third-party data, images, text adaptations and fonts retain their respective licenses. Attribution notices are included in the repository and the built page.
