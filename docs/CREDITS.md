# Sources and credits

Inspired by [Astroverts](https://astrovert.ru/), a science travel club offering astronomy tours.

## Data and scientific references

| Source | Use in this project | License or notice |
| --- | --- | --- |
| [SAO RAS: BTA](https://www.sao.ru/Doc-en/Telescopes/bta/descrip.html) | Observing-site coordinates and elevation | Reference source |
| [HYG Database v4.1](https://github.com/astronexus/HYG-Database) | Stellar positions, magnitudes and names | CC BY-SA 4.0; derived catalogs retain this license |
| [D3 Celestial](https://github.com/ofrohn/d3-celestial) | Constellation figures and Messier coordinates, with Messier data tracing to SEDS | BSD-3-Clause |
| [OpenNGC](https://github.com/mattiaverga/OpenNGC) | Coordinates and properties of 36 selected Caldwell objects | Mattia Verga and contributors; CC BY-SA 4.0 |
| [Astronomy Engine](https://github.com/cosinekitty/astronomy) | Sun, Moon and planetary ephemerides; coordinate transforms | MIT |
| [NASA JPL Horizons](https://ssd.jpl.nasa.gov/horizons/) | Independent Solar System validation fixtures | Reference source |
| [IMO Meteor Shower Calendar 2026](https://www.imo.net/files/meteor-shower/cal2026.pdf) | Shower dates, rates and radiant references | Calendar reference; activity envelopes are project approximations |
| [CelesTrak archives](https://celestrak.org/NORAD/archives/request.php) | Historical-orbit reference | No historical orbital dataset is bundled |

The HYG and OpenNGC subsets transform and select the source data. Their attribution and license notices are retained in `src/data/LICENSE-HYG.txt` and `src/data/LICENSE-OpenNGC.txt`.

## Photographs

**Milky Way:** [ESO/S. Brunier, eso0932a](https://www.eso.org/public/images/eso0932a/), CC BY 4.0. Adaptations include downsampling, point-source filtering, luminance conversion, smoothing, star-based registration, reprojection and brightness adjustment. The full notice is in `src/data/LICENSE-ESO-MILKY-WAY.txt`.

**Deep-sky objects:** Wikimedia Commons, NASA/Hubble, ESO and the DSS2 sky survey through CDS. Authors, source pages, image URLs, licenses and adaptation notes are stored per object in `src/data/dso-media.json` and shown in each card. These photographs have individual terms; they are not covered by one blanket image license.

Useful source collections:

- [NASA Hubble Messier Catalog](https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/)
- [NASA Hubble Caldwell Catalog](https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-caldwell-catalog/)
- [Wikimedia Commons: Messier objects](https://commons.wikimedia.org/wiki/Category:Messier_objects)
- [ESO images](https://www.eso.org/public/images/)
- [CDS: HiPS and DSS2](https://aladin.cds.unistra.fr/hips/)

## Stories and names

The 35 star-name histories are concise Russian and English retellings and translations of [All Skies Encyclopaedia](https://ase.exopla.net/), by the IAU-WGSN Etymology Group, Susanne M Hoffmann, Youla Azkarrula, Ian Ridpath and contributing article authors. The source material is CC BY 4.0. Each curated star card links to its specific source; uncertain etymologies remain explicitly uncertain.

Navi's history follows the [NASA Apollo Lunar Surface Journal](https://www.nasa.gov/wp-content/uploads/static/history/alsj/a11/a11.launch.html). Modern names are checked against the [IAU WGSN catalog](https://exopla.net/star-names/modern-iau-star-names/). The notice is in `src/data/LICENSE-STAR-HISTORY.txt`.

Constellation legends are short original retellings of a Western tradition, with [Ian Ridpath's Star Tales](https://www.ianridpath.com/startales/contents.html) as a reference. They do not represent every culture's interpretation of the sky.

## Software and typefaces

- Astronomy Engine and [satellite.js](https://github.com/shashwatak/satellite-js) are MIT-licensed. Their notices are in `THIRD_PARTY_LICENSES.txt`.
- Cormorant Garamond and Manrope are embedded under the SIL Open Font License. Notices are in `src/data/LICENSE-cormorantgaramond.txt` and `src/data/LICENSE-manrope.txt`.
- D3 Celestial's notice is in `src/data/LICENSE-d3-celestial.txt`.

Third-party notices are retained in the standalone build. Publishing this repository does not change the licenses of its data, photographs, fonts or adapted texts.
