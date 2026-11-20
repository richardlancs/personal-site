# The city's style

The one description both versions of the site are tuned to: the 2D
paintings (made in ChatGPT) and, later, the 3D city. Concept frames are in
`docs/city/concepts/`; every prompt used is in `docs/city/prompts.md`.

Status: frames accepted by Richard, 19 November 2026. Palette changed by
Richard, 20 November 2026: black is the main colour (soft black, a trace of
blue), magenta is gone and the warm secondary is the lantern. The paintings
still end in navy; the band's fade carries them into the black through a
very dark navy (`--seam`), so they sink into shadow without a line or a
grey band (see "The seam", below, and
`.superpowers/sdd/2d-round2/palette-black.md`).

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
| `--ink` | `#08090c` | The page's ground: soft black, a trace of blue |
| `--ink-2` | `#101217` | Alternate ground for a section |
| `--panel` | `#181b23` | Cards and panels that hold text |
| `--line` | `#2d323d` | Hairlines and panel edges |
| `--text` | `#e6e9ee` | Body text and headings (soft white, not #fff) |
| `--muted` | `#9ea5b1` | Secondary text |
| `--cyan` | `#4fd8ee` | Accent: edges, links' underline, chosen state, where you are |
| `--lantern` | `#f4b860` | The one warm accent: primary action (hover `#f8c97f`, label `--ink`), the points' dashes, the dusk grade |
| `--focus` | `#8fe9ff` | Focus ring |
| `--seam` | `#070c15` | The fade's dark navy, under a band on `--ink` |
| `--seam-2` | `#0c121d` | The fade's dark navy, under a band on `--ink-2` |

Lowest text contrast: `--muted` on `--panel`, 6.94:1.

Accents are for edges, chosen states and display type of 24px or larger,
never body text. `docs/ui/scripts/palette-contrast.mjs` checks the pairs.

## The seam

Each band's last 42% fades: transparent at 58% of the band, then `--seam`
at 14% opacity (20% of the way), 40% (38%), 72% (52%), solid `--seam` (62%)
and the section's ground (76%). The weather's haze is mixed from the plates'
navy (`#0e1d31`), not the black ground. Every band but the first starts
under a 20px shade of the ground above it.

## Type

Display: Rajdhani (OFL), weights 500 to 700, for headings and section
names. Text: Nunito, as before.

## Composition rules

- Band aspect 21:9 on wide screens; a 4:3 crop centred on the subject
  under 768px. Every frame must keep its subject inside the middle 60% of
  the width so the phone crop holds.
- Horizon or street vanishing point between 45% and 60% of the height.
- The bottom 42% of the band fades to the ground in CSS, through `--seam`;
  the paintings already darken there.
- Day and night plates of a district share one composition exactly.
- No legible writing in any painting. A plate with garbled characters is
  regenerated or has them painted out.
- Saturation: the Bund, the lane and the skyline are the reference. The
  shopping street may be brighter but not louder than its concept frame.
