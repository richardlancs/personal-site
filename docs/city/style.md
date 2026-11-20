# The city's style

The one description both versions of the site are tuned to: the 2D
paintings (made in ChatGPT) and, later, the 3D city. Concept frames are in
`docs/city/concepts/`; every prompt used is in `docs/city/prompts.md`.

Status: frames and palette accepted by Richard, 19 November 2026. The grounds
(`--ink`, `--ink-2`, `--panel`, `--line`) were sampled from the bottom edge of
the six frames (mean `#111c2e`), so a painting fades into the page without a seam.

## Style paragraph

Reuse this text verbatim at the start of every image prompt.

> Hand-painted digital gouache illustration, the look of a background
> painting from an animated film. Shanghai a few decades from now: the real
> city, recognisably itself, with restrained neon in cyan, magenta and
> amber against deep ink-navy. Clean confident shapes, soft atmospheric
> haze, visible brushwork. No photorealism, no lens flare, no glitch
> effects, no flying cars. Signs are glowing abstract shapes and bars with
> no legible writing or characters anywhere. No people in the foreground.
> Very wide 21:9 landscape format. The lower fifth of the image falls into
> deep ink-navy shadow so it can fade into a dark web page.

## Palette

| Token | Hex | Use |
|---|---|---|
| `--ink` | `#0c1526` | The page's ground; what every painting fades into |
| `--ink-2` | `#111c30` | Alternate ground for a section |
| `--panel` | `#17253f` | Cards and panels that hold text |
| `--line` | `#2b3d5e` | Hairlines and panel edges |
| `--text` | `#eef2fb` | Body text and headings |
| `--muted` | `#a9b4d0` | Secondary text |
| `--cyan` | `#4fd8ee` | Accent: edges, links' underline, chosen state |
| `--magenta` | `#f062b4` | Accent: sparing, display type and marks |
| `--amber` | `#ffb454` | Accent: warm lights, the dusk grade, primary action |
| `--focus` | `#8fe9ff` | Focus ring |

Accents are for edges, chosen states and display type of 24px or larger,
never body text. `docs/ui/scripts/palette-contrast.mjs` checks the pairs.

## Type

Display: Rajdhani (OFL), weights 500 to 700, for headings and station
names. Text: Nunito, as before.

## Composition rules

- Band aspect 21:9 on wide screens; a 4:3 crop centred on the subject
  under 768px. Every frame must keep its subject inside the middle 60% of
  the width so the phone crop holds.
- Horizon or street vanishing point between 45% and 60% of the height.
- The bottom 30% of the band fades to `--ink` in CSS; the paintings
  already darken there.
- Day and night plates of a district share one composition exactly.
- No legible writing in any painting. A plate with garbled characters is
  regenerated or has them painted out.
- Saturation: the Bund, the lane and the skyline are the reference. The
  shopping street may be brighter but not louder than its concept frame.
