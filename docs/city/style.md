# The site's style: paper

The one description the site is tuned to. At Richard's word on 24
November 2026 the Shanghai city (its paintings, its sky, its day and
night, the weather drawn over it, the panorama) is gone: "change it to
something very simple such as a crumpled paper background and colour
match my current icons and sections and overal architecture to the new
designed background". The sideways journey stays (six stops, the metro
map, the keys); what it travels over is now one sheet of crumpled paper.

History: the city's palette, panorama and seam are in this file's git
history (before `paper`) and `docs/city/concepts/`.

## The papers

Three, each with its own colours, chosen by the visitor with the Paper
picker in the bar (in the Sections menu on phones). The choice is kept
in `localStorage["paper"]` and set as `<html data-paper="…">` by a head
script before the first paint (`app/lib/paper.ts`), so there is no flash;
cream is the default. Nothing is keyed on the system's appearance: a
paper is chosen, not inferred. The tokens are in `app/city.css`, one
block per paper (`:root[data-paper=…]`, cream also plain `:root`), and
components use their names only, never a hex.

- **Cream**: warm ivory, blue-black ink. A light page.
- **Charcoal**: a cool grey-black sheet, chalk-white words. A dark page.
- **Kraft**: brown packing paper, near-black words. A light, mid-toned
  page.

The colour analysis behind each (the wheel, the swatches, every ratio):
`.superpowers/sdd/2026-11-22-horizontal-city/task-12/P/paper-palettes.md`.

## Palette

`docs/ui/scripts/palette-contrast.mjs` reads these tables and checks
every pair below; `tests/city-theme.test.mjs` checks that `city.css`
defines the same hexes.

### Cream

Ivory paper (hue 41). Claret (355, analogous on the warm side of the
wheel: book cloth, a wax seal, an editor's red ink) for the one primary
action, chosen at Richard's word on 25 November 2026 over the navy that
read as corporate; deep teal (184, the near arm of the split complement
and the mark's cyan) for links, chosen states and the metro line. The
reasoning: `.superpowers/sdd/2026-11-22-horizontal-city/task-13/A/accents.md`.

| Token | Hex | Use |
|---|---|---|
| `--paper` | `#efe7d6` | The page: the sheet the crumple is laid over |
| `--paper-2` | `#e7dcc6` | The alternate ground |
| `--panel` | `#f7f1e5` | Cards: a lighter sheet laid on the page |
| `--line` | `#c9bca3` | Hairlines and card edges (decoration, not a boundary that must read) |
| `--text` | `#1d2330` | Body text and headings: blue-black ink |
| `--muted` | `#50545c` | Secondary text |
| `--accent` | `#7a2a30` | The primary action's fill (under its textured face) |
| `--accent-hover` | `#8c353c` | Its hover |
| `--on-accent` | `#f7f1e5` | The label on the accent |
| `--accent-2` | `#0a6168` | Links, chosen states, the metro line, marks |
| `--focus` | `#1f4f8a` | The focus ring |
| `--shadow` | `#4a3b22` | A card's shadow (mixed toward transparent) |
| `--ink` | `#1d2330` | The darkest ink on this paper |

### Charcoal

Black paper, as near true black as still reads as a sheet (Richard, 24
November 2026: "make the black as close to true black as visually
possible while still maintaining the shadowy look and incorporating
crumpled paper"). A shadow vanishes on black, so its crumple is carried
by light on the ridges (below, "The texture"), and the cards are sheets a
step above the paper, with a deep black shadow. Gold (40, the complement
of a cool black) for the primary action, as gold leaf: deeper and warmer
than the flat yellow it replaced (25 November 2026), a foil's light band
across it; cyan (the mark's own) for links, chosen states and the line.

| Token | Hex | Use |
|---|---|---|
| `--paper` | `#080809` | The page: near-black |
| `--paper-2` | `#050506` | The alternate ground, darker still |
| `--panel` | `#141416` | Cards: a sheet a step above the black |
| `--line` | `#2a2b2f` | Hairlines and card edges |
| `--text` | `#ece6da` | Body text and headings: chalk (warm, not white) |
| `--muted` | `#b5afa4` | Secondary text |
| `--accent` | `#c99a3e` | The primary action's fill (under its textured face) |
| `--accent-hover` | `#d9ad55` | Its hover |
| `--on-accent` | `#0b0b0c` | The label on the accent |
| `--accent-2` | `#7fd4df` | Links, chosen states, the metro line, marks |
| `--focus` | `#9fe6ef` | The focus ring |
| `--shadow` | `#000000` | A card's shadow: true black, under a sheet on near-black |
| `--ink` | `#050506` | The darkest ink on this paper |

### Kraft

Brown packing paper (hue 34). Navy, its complement (214), for the
primary action, like a blue stamp; oxblood (6, analogous: the red of a
parcel stamp) for links, chosen states and the line. Kraft is mid-toned,
so its text colours are the darkest of the three papers'.

| Token | Hex | Use |
|---|---|---|
| `--paper` | `#c9a77c` | The page |
| `--paper-2` | `#bf9c70` | The alternate ground |
| `--panel` | `#d6b98f` | Cards: a lighter sheet |
| `--line` | `#9b7c55` | Hairlines and card edges |
| `--text` | `#22180f` | Body text and headings |
| `--muted` | `#3a2a1d` | Secondary text |
| `--accent` | `#1e3a5f` | The primary action's fill |
| `--accent-hover` | `#284b78` | Its hover |
| `--on-accent` | `#f4e8d4` | The label on the accent |
| `--accent-2` | `#561710` | Links, chosen states, the metro line, marks |
| `--focus` | `#1e3a5f` | The focus ring |
| `--shadow` | `#3b2814` | A card's shadow |
| `--ink` | `#22180f` | The darkest ink on this paper |

### The rules

- `--text`, `--muted` and `--accent-2` are 4.5:1 or better on
  `--paper`, `--paper-2` and `--panel`, and on the two grounds still at
  the texture's darkest crease and lightest ridge (cards are opaque
  sheets over it) as measured on each paper (cream 3% darker to 4%
  lighter, kraft 7% darker to 4% lighter; on charcoal the sheet only
  adds light, its brightest ridge `#3c3c3c`).
- `--accent` and `--focus` are 3:1 or better on every ground (the
  texture's too); `--on-accent` is 4.5:1 or better on `--accent` and
  `--accent-hover`, and on the darkest and lightest grain of the primary
  key's textured face at rest and on hover (sampled in the browser; the
  values are in `palette-contrast.mjs`, `FILLS`).
- Accents are for edges, marks, chosen states, links and the one
  primary action; body text is `--text`.
- No pure white and no pure black text; no magenta.
- These names only: the city's (`--cyan`, `--ink-2`, `--seam*`,
  `--glow-cyan`, `--focus-halo`, the `--glass-*` colours) are gone
  (`tests/glass.test.mjs`). A key's own `--glass-in`, `--glass-out`,
  `--glass-lift` and `--glass-ink` are its states' plumbing, not colours.

## The texture

`app/paper.css` (imported by `city.css`): one crumpled sheet, drawn in
code. An inline SVG: two noises of creases (`feTurbulence`, type
turbulence, a large and a middle scale) inverted so their seams fold up
into ridges, a fine grain added, all lit from the upper left as a surface
(`feDiffuseLighting`). The result is a grey relief, laid over the paper's
own colour in `soft-light` (on `body::before`, inside the body's own
stacking context), serving cream and kraft. Charcoal is near-black, where
a shadow has nowhere to go: its sheet is the same relief lit for shine
(`feSpecularLighting`, a tight highlight on each ridge) with a little
light grain, added in `screen`, so the creases show as light on black. Its seeds are
fixed, it holds no photograph, the two are about 1.3 KB gzipped, and it is crisp at any
pixel ratio (the filter is drawn at the screen's resolution). It never
moves: fixed to the viewport behind the journey, so the stops travel over
one still sheet. How strongly it shows is per paper (`--crumple`: cream
1, charcoal 0.25, kraft 0.42), inside the margins above. Under
`prefers-contrast: more` and in forced colours it is removed and the
paper is flat.

## The primary key's face

The one primary action in each paper (`.glass-primary`) is not a flat
fill: a gradient per paper (`--accent-fill`, in its token block) under
one shared grain (`--key-grain` on `:root`: a fractal noise in code,
fixed seed, drawn out sideways into brushed streaks, grey at half
strength, laid in `soft-light`). The family is the same on every paper;
on charcoal the gradient is gold leaf (`#ad7f30` to `#e6c477` and back,
a light band at 46% and a thin highlight along the top edge), on cream
and kraft a quiet fall of the accent from top left to bottom right, so
the grain reads as book cloth. Hover lays a wash of `--accent-hover`
over the face, keeping the grain; chosen and disabled drop the face.
Under `prefers-contrast: more` and in forced colours the face is flat
`--accent`. Nothing on it moves.

## Type

Printed matter, in ink: an old-style serif for what you'd set in a
heading, a plain warm sans for reading. Both through `next/font/google`
in `app/layout.tsx` (self-hosted at build, Latin only, `display: swap`,
no request to Google at run time), behind the tokens `--font-display`
and `--font-text` (Tailwind `font-display`, `font-sans`).

- **Fraunces** (OFL, variable weight and optical size, `axes: ["opsz"]`)
  for the name, headings, section names, the metro map's names and the
  bar's name. Optical size does the work: the name gets the
  high-contrast display cut, small labels the sturdy text cut. Weights:
  700 the name and a station's title, 600 headings, 500 the quiet labels
  (a station's number, the bar's "03 / 06 · Projects", the menu's rows),
  400 the hero's programme line.
- **Figtree** (OFL, variable weight) for everything you read: points,
  links, keys, the weather.
- No extra tracking: Fraunces is spaced for print. No all-caps labels.
  The name alone is set a touch tight (-0.01em).
- Body copy 16px, line-height 1.6; headings 1.1; nothing under 12px.
- The share card (`scripts/identity/make-identity.mjs`) is set in the
  same two faces, read from a running copy of the site.
