# Astronomy and validation

Arkhyz Sky 2026 combines catalog positions and calculated ephemerides with an illustrated observing scene. This document describes what is calculated, what is approximated, and how the results are checked.

## Observer and time

| Parameter | Value |
| --- | --- |
| Site | BTA, Special Astrophysical Observatory of the Russian Academy of Sciences |
| Latitude | 43.6533333333° N |
| Longitude | 41.4416666667° E |
| Elevation | 2,070 m |
| Available dates | 1–25 August 2026 |
| Displayed time | UTC+3, independent of the viewer's device time zone |
| Starting scene | 12 August 2026, 23:00 local time |

The clock starts at real-time speed. Pause and ×2, ×4, ×8 and ×16 apply to the sky and simulated events. The clock stops at the end of 25 August. Returning from a background tab does not produce a burst of accumulated meteor events.

The forest, mountain profiles and observatory silhouette are artistic. They are fixed in azimuth but do not reproduce a surveyed horizon. Near-horizon visibility in the scene can therefore differ from the real observing site.

## Stars and the Solar System

**Stars.** HYG v4.1 supplies 41,487 entries down to magnitude 8, including 8,920 down to magnitude 6.5 across the entire celestial sphere. J2000 positions include proper motion applied through space velocities to 8 August 2026. The remaining motion across the available period is small at this display scale. Precession and nutation are recomputed for the selected time. Annual stellar aberration and parallax are not modeled separately; differences of tens of arcseconds are possible.

**Sun, Moon and planets.** Astronomy Engine 2.1.19 calculates topocentric positions, including light travel time and aberration. Solar and lunar angular sizes follow their calculated distances. Planet portraits in the information cards are decorative. Lunar illumination affects the approximate sky-visibility model.

**Refraction.** A standard approximation is scaled by 0.78 for the site's elevation. Actual pressure and temperature are not supplied.

**Visibility and zoom.** The ×1 display assumes clear skies and dark-adapted eyes, with a zenith limit near magnitude 6.5. Atmospheric extinction, moonlight and twilight reduce visibility. Smooth zoom toward ×4 gradually opens an educational atlas down to magnitude 8. A continuous brightness curve emphasizes bright stars without selectively boosting particular constellations. Weather, local lighting and individual eyesight are not reconstructed.

The Moon shortcut searches within the supported dates for a time with lunar altitude at least 15°, illuminated fraction at least 8%, and solar altitude at most −10°. It changes the selected date explicitly.

## Constellations and deep sky

D3 Celestial supplies constellation figures. Connecting lines are conventional; official constellations are bounded regions of the sky. Labels follow the drawn star figures, with short leaders where needed to reduce ambiguity. Legends are concise retellings of a Western tradition. There are also 35 sourced, bilingual star-name histories; uncertain etymologies remain uncertain.

The deep-sky atlas includes all 110 Messier entries and 36 selected Caldwell entries with OpenNGC coordinates. The Caldwell selection is not the complete catalog. Actual observability depends on the time, sky conditions and equipment.

- **M40** is an optical star pair.
- **M102** uses NGC 5866, with the historical identification ambiguity stated in its card.
- Established common names are shown where available. Missing visual magnitudes are not replaced with values from a different photometric band.
- Photographs are processed exposures, not a promise of the color or detail seen through an eyepiece. M99's image is identified as a region of the galaxy.

Photographs load from Wikimedia Commons, NASA/Hubble, ESO or the DSS2 survey through CDS. Each card includes its image credit, license and source. A DSS2 view of the same coordinates is used as a fallback when available. Network failures are shown in the card.

## Meteor showers

Activity follows the [IMO 2026 calendar](https://www.imo.net/files/meteor-shower/cal2026.pdf). The implementation uses these nominal reference values:

| Shower | Reference peak | Peak ZHR |
| --- | --- | ---: |
| Perseids | 12–13 August | 100 |
| Southern delta Aquariids | 31 July | 25 |
| Alpha Capricornids | 31 July | 5 |
| Eta Eridanids | 7 August | 3 |
| Kappa Cygnids | 17 August | 3 |

ZHR describes ideal conditions: a radiant at the zenith and a limiting magnitude of 6.5. The model estimates a local hourly rate for each shower as:

```text
rate = ZHR × max(0, sin(radiant altitude)) × r^(limiting magnitude − 6.5)
```

Here `r` is the shower's population index. Daylight suppresses events. The total excludes sporadic meteors and many other weak showers. Rates near the edges of August can be low, especially as moonlight increases.

Intervals follow a Poisson process whose integrated rate responds to the changing sky. Directions diverge from each shower's radiant. Activity envelopes and linear radiant drift are approximations, not a reconstruction of individual 2026 meteors. A verified 2026 observing curve has not been incorporated. For the broad kappa-Cygnid complex, the model uses the detailed calendar section's radiant (288°, +55°), which differs from its summary table.

By default, the estimated **all-sky rate is collected in the current view** for the interactive scene. The shower panel states this and offers a whole-sky distribution mode. The preview button creates a separate example that is excluded from the event counter.

### Meteor appearance

Most visually observed meteors look white or pale. The population index controls relative magnitude counts; the palette and persistent-train rules are illustrative. Color is limited to a small subset of bright events. In a seeded sample of 100,000 Perseid events under the dark-sky settings, about 98.5% were neutral, 0.7% green-tinted and 0.7% had a lingering train. These are **display-model outcomes**, not measured natural frequencies or chemical identifications.

The current display gently raises streak brightness, width and wake visibility, with a luminous head and a soft glow. This aesthetic adjustment does not change the event rate, sampled magnitudes, radiant positions or color probabilities. [NASA's discussion of visible colors](https://www.nasa.gov/blogs/watch-the-skies/2023/12/05/gorgeously-green-geminids-peak-next-week/) and [meteor spectra](https://ntrs.nasa.gov/citations/20205006958) provide context.

## Milky Way and the horizon

The background adapts the [ESO/S. Brunier photographic panorama](https://www.eso.org/public/images/eso0932a/), licensed under CC BY 4.0. A 2048 × 1024 JPEG is embedded in the page. Filtering suppresses photographic point sources; the visible stars are rendered from the catalog. Diffuse star clouds and dust lanes retain the photographic morphology.

A spherical orientation correction of 3.80° was fitted to nine HYG stars. Eight additional stars, excluded from the fit, gave a maximum alignment residual of 0.300°. This is the alignment accuracy of a diffuse texture, separate from catalog-star astrometry. Reference points and the transform are stored in `src/data/milky-way-registration.json`.

The panorama follows galactic coordinates through J2000 into the observer's horizon frame. Twilight, moonlight and low-altitude attenuation affect its appearance. Brightness and nearly neutral color are artistic choices rather than a photometric calibration of human vision. WebGL draws the background, with a Canvas 2D fallback.

Forest visitors are timed animation scenes. Horses occupy overlapping visits around the horizon, dogs appear frequently, and the bear is a rare encounter. The telescope observer arrives, sets up, adjusts the telescope, packs it and leaves during the night. These are decorative events, not wildlife observations.

## Satellites

The satellite filter remains hidden until suitable historical orbital data is supplied. Random or contemporary orbital elements are not substituted for the selected dates. The existing import logic validates date coverage and uses an orbital epoch within 24 hours of the requested time. Even with such data, a reconstructed pass would depend on element accuracy and the visibility assumptions.

## Reproduce the checks

```sh
npm ci
npm test
npm run build
```

The test suite covers:

- 459 independent NASA JPL Horizons positions for nine Solar System bodies, with a maximum airless topocentric difference of **0.263432 arcmin**, below the 1-arcminute threshold.
- Observer-frame orientation, Polaris altitude, calendar boundaries, lunar discovery and orbit-file validation.
- Complete Messier and constellation catalogs, object-image metadata and star-history identifiers.
- Shower activity, lunar suppression, random event timing, speed and pause behavior, and the illustrative color distribution.
- Smooth zoom and faint-star appearance; constellation-label anchors for all 88 figures and 20 principal August constellations across 12 sample times.
- Milky Way alignment on held-out stars, horizon wrapping, and the timing of animals and the observer.

The Horizons comparison covers the sampled dates, not every possible instant. Fixtures are under `tests/fixtures/`; `scripts/horizons.mjs` reproduces the reference-data workflow.

An earlier media check retrieved all 146 primary image URLs successfully; its results are in `tests/fixtures/media-check.json`. Recheck external availability with `node scripts/check-media.mjs`. External servers can change independently of the application.

Catalog preparation utilities live in `scripts/`. They are maintenance tools and may fetch external datasets; normal development and builds use the checked-in data. Desktop and emulated mobile browser layouts are checked visually. Native iOS and Android devices are not separately certified.
