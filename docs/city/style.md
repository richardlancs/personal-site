# The city's style

The one description the site is tuned to: one continuous panorama of
Shanghai, by day and by night, that the visitor travels along
(`CLAUDE.md`, "The journey"). Every prompt used is in
`docs/city/prompts.md`; the originals are in
`docs/city/concepts/panorama-real/`.

History. The first city was six gouache plates, one per section, painted
as bands over a vertical page (frames accepted by Richard, 19 November
2026; `docs/city/concepts/*.webp`). The horizontal city (22 November
2026) joined the sections into one journey, first over a gouache
panorama (`docs/city/concepts/panorama/`, superseded), then, at Richard's
word on 23 November 2026, over a hyperrealistic one: "tell chatgpt to
build directly off a hyperrealistic model of the city and find real city
skyline photos to use as reference". The panorama is hyperrealistic; "no
photorealism" no longer holds for it.

Palette changed by Richard, 20 November 2026: black is the main colour
(soft black, a trace of blue), magenta is gone and the warm secondary is
the lantern. The interface keeps that palette over the photograph.

## The panorama

**What it is.** Six segments, one per stop, side by side along one walk,
each continuing the one before (no hard cuts in the picture):

1. Home: the riverside skyline across the river, side-on (the Oriental
   Pearl, Jin Mao, the World Financial Center and the Shanghai Tower in
   their real left-to-right order).
2. About: the old brick lanes (shikumen houses, stone gate arches).
3. Projects: the towers at street level, the circular walkway, screens.
4. Experience: the elevated metro and an open-air station.
5. Interests: the bright shopping street, a sightseeing tram.
6. Contact: the riverfront's stone buildings and the clock tower, then
   the river and the towers across it, so the journey ends where it began.

No place is named anywhere a visitor reads or hears; the stops are named
as sections.

**How it was painted** (`docs/city/prompts.md`, last section). In
ChatGPT: first a web search for real reference photos of each place and a
spatial model of the six along one walk; then segment 1 "hyperrealistic,
like a high-end architectural photograph or a photoreal 3D render of the
real city", built from them; each later segment from a canvas whose left
third is the previous segment's right third; each night an edit of its
own day ("change only the light").

**The rules every segment keeps:**

- A level, nearly orthographic side-on camera at first-floor height, no
  vanishing point in the middle; the horizon at 45% of the height.
- Light from the upper left by day.
- A plain, dark, empty ground (a promenade or street) across the bottom
  third, where the panels sit.
- Today's real city only: no future additions, no flying cars, no lens
  flare or glitch.
- Night lights in white, warm amber and cyan; no magenta, no purple.
- No legible writing or characters anywhere. A segment with garbled
  characters is regenerated or has them painted out.
- No people in the foreground.
- Day and night of a segment share one composition (the join script
  registers each night onto its day, so the dusk cross-fade doesn't
  double the buildings).

**How it is joined and served.** `scripts/city-panorama.mjs` registers
each night onto its day, aligns each segment onto the one before over
their overlap, matches their colours across it, and cuts along the path
of least difference (day and night alike), feathered over a few pixels.
The strip is 941px tall and 7,196px wide; it is cut into six tiles at
the segments' edges, so the first tile is the home stop's first view
(`app/assets/city/panorama/{day,night}-01..06.webp`, each at most
600 KB), and it writes `app/components/city2d/panorama.ts` (the tiles,
each stop's stretch, the joins). Run it again rather than edit that file.
`tests/city-panorama.test.mjs` checks the tiles, the stretches and the
seams.

**How it is drawn** (`DistrictBand.tsx`, `city-track.css`). As tall as
the stage on wide screens, its top melting into the sky behind it
(`mask-image`, the top 15%); on phones and tall screens, a strip about
30% of the screen under the bar. Day, night, or the one fading into the
other at dusk and dawn with a warm or cyan grade (`lib/cityLook.ts`);
the night's lit windows come on first at twilight. The panorama moves by
its own measure: each stop's start shows its own stretch. Read top to
bottom, each station shows its own tile as a band over it, its foot
fading into the ground (below, "The seam").

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

**Over the photograph.** On the journey the words sit on see-through
dark glass (the city reads through it); a darker, feathered scrim behind
the words themselves, not the blur, carries their contrast, at least
4.5:1 over every sky (`docs/ui/scripts/city-contrast.mjs`). The sky
behind the panorama is sampled from it: `#7aa6e0` by day, `#0a1d3c` by
night.

## The seam

Read top to bottom, each band's last 42% fades: transparent at 58% of
the band, then `--seam` at 14% opacity (20% of the way), 40% (38%), 72%
(52%), solid `--seam` (62%) and the section's ground (76%). The weather's
haze is mixed from the paintings' navy (`#0e1d31`), not the black ground.

## Type

Display: Rajdhani (OFL), weights 500 to 700, for headings and section
names. Text: Nunito, as before.
