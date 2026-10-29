# The Park: Art Production Plan

Status: **draft for Richard's review.** No frontend code has changed.
Companion to `docs/superpowers/specs/2026-10-29-world-we-left-behind-design.md`
(the art bible lives in §5 there). Route A is approved: painted environment
layers, with SVG/CSS/React for interaction and atmosphere.

> **Update (ChatGPT Images chosen):** the desktop master is now **3:2**
> (ChatGPT's 1536×1024 landscape size, upscaled to 3072×2048), not 2:1, and
> the phone master is **2:3** (1024×1536, upscaled to 2048×3072). The
> block-in was redrawn at 3:2. Where sizes, the 2:1 canvas or the portrait
> block-in below conflict with `chatgpt-desktop.md`, that file wins. §5's
> generic prompts are superseded by it for ChatGPT.

Files next to this document:

| File | What it is |
|---|---|
| `layout-desktop.png` | Annotated composition plan, desktop master (2:1) |
| `blockin-desktop.png` | The same block-in without labels: **use this as the image/structure reference when generating** |
| `layout-portrait.png` / `blockin-portrait.png` | The phone composition, same spot |
| `blockin-*.svg` | Sources for the above; edit and re-render if the composition changes |

---

## 1. The final park scene

It's about half past four on an afternoon in late September. The heat has gone
out of the day, but the light hasn't: it comes low and gold from over your left
shoulder and lies along the park in long bands.

You're standing at the top of three worn granite steps at the south entrance
of a small city park. The steps are chipped at the corners and moss fills the
joints. Ahead, the main path runs away from you, laid in old square
flagstones that have heaved and tilted; susuki grass and clover grow in every
seam, and leaves from the big zelkova on the right have collected in drifts
against the edges.

Halfway up the path is the fountain: a low round basin of grey stone, dry
except for a skin of rainwater in the bottom that reflects the sky. Moss has
climbed the central column and a tuft of grass grows from the spout. Someone
once stuck a tiny paper boat on the rim; it's still there, faded white.

Past the fountain, the path walks into the brightest light in the scene, a
gap in the canopy where the sun falls straight onto the stones. Standing in
that light is the **notice board**: a roofed wooden frame, its cedar silvered
and its little tiled roof missing a few tiles. Paper notices are pinned
behind a scratched acrylic cover, curled and sun-faded. One of them, a map of
the district, is newer than the rest. Beside the board, a weathered
**fingerpost** leans at the fork where the path splits three ways.

To the left, beyond a playground whose swing set is wrapped in morning-glory
vines (one swing still hangs; the other's chain lies coiled in the grass),
is the **library pavilion**: a low wooden building with a dark tiled roof,
deep eaves and shoji-style windows. One window glows warm: a lamp is on
inside. Next to it a ginkgo is halfway through turning yellow.

To the right, an enormous old **zelkova** leans over the path. Its trunk is
grey and scaled, roots lifting the paving, and its canopy fills the top-right
of the view; sunlight comes through it in a few hard shafts that dapple the
path. Under it, a bench with peeling green paint and rusted cast-iron ends.
A navy school bag sits on the bench, as if its owner stepped away.

Further right, at the park's side gate, stands the **phone booth**: a green
public phone box with glass panels, one cracked, a light still on inside.
Beside it a vending machine, its display faded to pastels; one can sits in
the tray, never collected.

In the left foreground, under a blanket of kudzu, two bicycles lean against
each other, one rusted to a uniform brown and one not rusted at all (the
recent visitor's). In the near corners, susuki plumes and goldenrod catch the
light against the dark shade of shrubs.

Beyond the park, the city. Above the canopy a hazy blue skyline of mid-rise
buildings, some with their top floors broken open and trees growing out of
them, vines hanging down their faces. Sagging overhead wires cross the view on
leaning concrete poles. On the line of the main path rises the **railway
station's clock tower**, its hands stopped at 4:17. To the left, through a
gap in the trees, the **sawtooth roof of an old workshop** with skylights,
ivy over the gable. To the right, behind the zelkova, a **glass-roofed
arcade** with a faded tube sign, its colours bleached almost to nothing.

Nothing moves except leaves, dust in the light, and once in a while a bird.

---

## 2. Composition and camera plan

### Camera

| Property | Desktop master | Phone master |
|---|---|---|
| Position | Top of the south steps, eye height 1.6 m | ~6 m further up the path, same height |
| Direction | Due north along the main path, yawed slightly right | Due north, straight up the path |
| Lens | ~35mm equivalent (moderate wide, no distortion) | ~28mm equivalent, vertical |
| Horizon | 42% down the 16:9 frame (y≈430 of 1024) | 38% down (y≈840 of 2218) |
| Vanishing point | x≈1140 of 2048: right of centre, under the clock tower | x≈580 of 1024 |
| Perspective | One-point, gentle; verticals stay vertical | Same |

### Canvas and safe areas

- **Desktop master: 2:1, final 4096×2048.** Wider than any screen, so
  widescreen monitors and parallax overscan never run out of picture.
  - 16:9 frame (1920×1080, most monitors) = central 3641×2048.
  - 16:10 frame (1440×900, MacBooks) = central 3277×2048.
  - Everything important sits inside the 16:10 frame.
- **Phone master: ~9:19.5, final 1536×3328.** For portrait phones and
  portrait tablets. A separate painting, not a crop.
- **Text zone** (dashed box on the layout files): quiet sky and low-contrast
  haze only, no dark shapes, no high detail.

### Depth planes and what's in each

| Plane | Depth | Contents |
|---|---|---|
| Sky | infinite | Warm haze, thin high cloud, no sun disc (it's behind the camera) |
| Far city | 300 m+ | Mid-rises with broken tops, vines, sagging wires, station clock tower |
| Landmarks / back canopy | 80–200 m | Workshop sawtooth roof, arcade glass roof and sign, the park's back tree line |
| Midground | 8–60 m | Path, fountain, notice board, fingerpost, playground, pavilion, zelkova trunk, bench, booth, vending machine |
| Foreground | 1–5 m | Susuki and goldenrod, dark shrubs, kudzu and bicycles, near leaves top-right, the steps |

### Scale ruler (check every generation against this)

At the notice board's distance (~20 m): a 2.0 m door ≈ 150 px tall on the
4096 master. The notice board is about 2.2 m tall including its roof, so it
spans ~165 px; the booth (2.3 m, but nearer) is ~470 px; the bench seat
(0.45 m at ~12 m) ≈ 55 px above the ground. Generators get scale wrong often;
this is the commonest reason to reject a candidate.

### Eye path

1. Light pool and notice board (brightest value, strongest warm).
2. Name and intro in the text zone (highest contrast text on quiet sky).
3. Up the path line to the clock tower on the horizon.
4. Outward to the pavilion's lit window (left) and the booth's light (right).
5. Rewards for lingering: bicycles, school bag, paper boat, the can in the
   vending machine.

---

## 3. Can separate layers be generated reliably?

**No, not as independent generations.** If the sky, city, trees and props
are generated separately, today's image models will give each a slightly
different camera height, vanishing point, light direction and colour
temperature. Composited, they read as a collage, which is the outcome you
asked me to avoid. Automatic cutouts of independently generated foliage are
also unreliable; leaf edges come out haloed or chewed.

**So the pipeline is master-first:**

1. Generate **one complete painting** of the whole scene, from the block-in.
2. Refine it until it is right: composition, scale, detail.
3. **Derive every layer from that one painting**: mask each depth band,
   then use generative fill (inpainting) to paint in what each band hides,
   so that when layers shift for parallax there's picture behind them.

Every layer shares one camera, one light and one palette, because they come
from one painting. Generative fill is only asked to invent small hidden areas
(a strip of sky behind a building, a patch of grass behind a shrub), which
current tools do well.

Two consequences:

- **Props stay in the painting.** The notice board, booth, pavilion and so on
  are not cut out and floated; they live on the midground layer. Interaction
  is drawn on top in register: masks for glow and focus, HTML for text.
- **Parallax stays small** (±12 px foreground, ±2–6 px for the rest at 1440
  width). That keeps the hidden areas small enough to fill convincingly. This
  matches the motion language in the art bible.

Close-up shots (the notice board when opened, the booth interior) are
**separate paintings** shown full-screen on their own, so they don't need to
composite into the master. They use the master as their style and content
reference.

---

## 4. Asset manifest

IDs: `PK` = park key art, `PL` = park layer derived from it, `PM` = mask,
`PS` = state overlay, `PI` = insert (close-up shot), `PA` = atmosphere.

### 4.1 Key art (generated)

| ID | Asset | Final size | Ratio | Alpha | Role |
|---|---|---|---|---|---|
| PK-D | Desktop key art | 4096×2048 | 2:1 | no | The source of every desktop layer |
| PK-P | Phone key art | 1536×3328 | ~9:19.5 | no | The source of every phone layer |

### 4.2 Layers (derived from the key art, not generated separately)

Each layer exists for desktop (`-d`) and phone (`-p`).

| ID | Layer | Alpha | Parallax (desktop, 1440 wide) | How it's made | Integration |
|---|---|---|---|---|---|
| PL-0 | Sky | no | 0 | Remove everything below the skyline with generative fill, extend the sky upward ~5% | Bottom of the stack |
| PL-1 | Far city + clock tower + wires | yes | ±2 px | Mask the skyline; fill the bit of city the back canopy hides | Over PL-0 |
| PL-2 | Back canopy + workshop + arcade | yes | ±4 px | Mask the tree line and landmark roofs; fill the strip the midground hides | Over PL-1 |
| PL-3 | Midground (ground, path, fountain, all props, zelkova trunk and canopy) | yes (top edge only) | ±6 px | Everything from the canopy line down, minus the foreground; fill what the foreground hides plus ~2% beyond the frame edges | The LCP image; loads first |
| PL-4L | Foreground left (susuki, shrubs, bicycles under kudzu) | yes | ±12 px | Mask from the master | Over PL-3 |
| PL-4R | Foreground right (shrub, near leaves at top-right) | yes | ±12 px | Mask from the master | Over PL-3 |
| PL-4B | Steps (bottom edge) | yes | ±10 px | Mask from the master | Over PL-3 |

Masking rule: cut along **natural edges** (silhouettes against lighter
background), with a soft 2–4 px edge on foliage. Where an edge is ambiguous,
put the cut where the layer above will cover it.

### 4.3 Interaction masks and states

| ID | Object | What's needed | Made by | Used for |
|---|---|---|---|---|
| PM-01 | Notice board | Alpha mask in master coordinates | Hand mask from PK | Hover/focus rim light, hit area |
| PM-02 | Phone booth | Mask | Hand mask | Same |
| PM-03 | Pavilion window + door | Mask | Hand mask | Same |
| PM-04 | Fingerpost | Mask | Hand mask | Swing on hover (needs its own cutout + PL-3 fill behind it: the one prop that moves) |
| PM-05 | Clock tower | Mask | Hand mask | Rim glow |
| PM-06 | Workshop roof | Mask | Hand mask | Rim glow |
| PM-07 | Arcade sign | Mask | Hand mask | Rim glow |
| PS-01 | Notice board, lit | Same crop, light raised and paper lifted at one corner | Generative fill on the crop, in register | Hover state, crossfaded |
| PS-02 | Booth, light brighter | Same crop, interior light stronger and spilling on the ground | Generative fill on the crop | Hover state |
| PS-03 | Pavilion, second window lit | Same crop | Generative fill | Hover state |
| PS-04 | Arcade sign, faintly lit | Same crop | Generative fill | Hover state |

The glow on hover is made in code from the mask: a soft warm gradient on
`mix-blend-mode: soft-light`, clipped to the object, plus a light pool on the
ground. PS state overlays are optional upgrades where code light isn't
convincing enough.

### 4.4 Inserts (separate shots, generated with the master as reference)

| ID | Shot | Size | Ratio | Alpha | Role |
|---|---|---|---|---|---|
| PI-01 | Notice board close-up, papers **blank** | 3072×2048 desktop, 1536×2730 phone | 3:2 / 9:16 | no | The opened map view; real text and links overlaid on the blank papers |
| PI-02 | Phone booth interior close-up, directory card **blank** | 3072×2048, 1536×2730 | 3:2 / 9:16 | no | The Contact location (the Phase 3 secondary location) |

### 4.5 Atmosphere (built in code)

| ID | Effect | How | Notes |
|---|---|---|---|
| PA-01 | Light shafts through the zelkova | SVG polygons, blurred, `mix-blend-mode: screen`, very low opacity | Angles match the key light; positions come from the master |
| PA-02 | Dust/pollen in the light | ~20 CSS particles, only inside the shafts and the light pool | Paused under reduced motion and when the tab is hidden |
| PA-03 | Foreground sway | PL-4 layers rotate ±0.4° around their base, 7–9 s | Off under reduced motion |
| PA-04 | Falling ginkgo leaf, now and then | 3–4 leaf sprites (small generated PNGs, or SVG) | One leaf every ~20 s at most |
| PA-05 | Bird crossing | One small silhouette sprite | Every 30–60 s |
| PA-06 | Paper-grain overlay | 512 px tile at 4–6% | Unifies the painting and the HTML layers |

### 4.6 Content assets

| Asset | Status |
|---|---|
| Résumé PDF | **You'll supply it.** Until then the booth and nav show no résumé link (not a dead one) |
| MarketLab screenshots | **Captured** from the live demo: `public/projects/marketlab/` (dashboard, AAPL stock page, screener, backtest with results, phone dashboard) |
| Scrollganizer screenshots | **Copied** from the project repo's own `docs/screenshots/`: `public/projects/scrollganizer/` (results light/dark, result grid). These are the repo's screenshots from a Chromium test with sample data, so they're real UI but not a live account |

---

## 5. Prompts

### How to use them

- **Don't name studios, films, shows or artists** in prompts. It's the
  surest way to get imitation instead of an original world, and it muddies
  licensing. The style core below describes the qualities instead.
- **Attach `blockin-desktop.png`** (or `-portrait`) as the image or
  structure reference. Keep its influence moderate: you want its layout, not
  its flat colours.
- **Ask for blank signs and papers.** Image models garble text. All readable
  text in the scene is real HTML laid over the art.
- Generate **many candidates (12–20)**, pick with the checklist in §6, then
  iterate on the best one. Don't try to fix a weak composition with edits.
- Once a key art is approved, **use it as the style reference** for every
  other generation (portrait, inserts, fills).
- Log every keeper in `docs/art/park/provenance.md`: tool, model version,
  prompt, seed or job ID, date, edits made. This is the licensing record.

The prompts are written in plain language so they work in any capable tool.
Midjourney-style parameters are given as optional suffixes. Check your tool's
current docs for exact parameter names; they change often.

### 5.1 Style core (append to every prompt)

> Hand-painted animated feature film background art. Gouache and transparent
> watercolour look with visible, controlled brushwork; soft edges in the
> distance, crisp confident edges on objects in the midground. Rich,
> observed environmental detail: individual leaf clusters with lit tops and
> cool undersides, cracked and heaved paving, moss in joints, rust blooming
> at metal joints, chipped and sun-faded paint. Early autumn, about 4:30 pm:
> warm low golden sunlight from the upper left, behind the viewer, raking
> across the scene; long soft shadows falling toward the lower right and away;
> shadows cool blue-green, never black; backlit leaves glowing yellow-green;
> warm ambient bounce light on stone. Atmospheric perspective: distant
> buildings pale, bluish and low contrast. Quiet, nostalgic, gently
> melancholy, peaceful. No people anywhere. Original design.

### 5.2 Negative (paste as "avoid" / `--no`)

> people, figures, faces, characters, animals in the foreground, text,
> letters, numbers, writing, logos, signage text, watermark, signature,
> frame, border, photorealistic, photograph, 3D render, CGI, octane,
> unreal engine, glossy, plastic, neon, cyberpunk, sci-fi, horror, gore,
> blood, skulls, graffiti tags, trash heaps, dark gritty grunge, heavy
> vignette, lens flare, bokeh, chromatic aberration, fisheye, tilted horizon,
> oversaturated, high contrast HDR, anime characters

### 5.3 PK-D: desktop key art

Reference: `blockin-desktop.png` (structure/layout), moderate influence.

> A wide view of a small abandoned Japanese neighbourhood park reclaimed by
> nature, seen from the top of three worn granite steps at eye height,
> looking straight up the main path. One-point perspective, vanishing point
> slightly right of centre, horizon a little above the middle of the image,
> verticals perfectly vertical.
>
> The main path of old square flagstones, heaved and tilted, with grass and
> clover in every seam and drifts of fallen leaves along its edges, leads to a
> low round dry stone fountain with moss on its central column and a little
> rainwater in the basin reflecting the sky. Beyond the fountain the path
> enters a bright patch of direct sunlight falling through a gap in the
> trees; standing in that light is a small roofed wooden community notice
> board, silvered cedar with a tiny tiled roof missing a few tiles, faded
> blank paper notices pinned behind a scratched clear cover. Beside it a
> leaning wooden fingerpost with three blank arms at a fork where the path
> splits left, right and straight ahead.
>
> Left midground: a low traditional wooden pavilion with a dark tiled roof,
> deep eaves and paper-screen windows, one window glowing with warm lamplight;
> a ginkgo tree beside it half turned golden yellow; in front of it a small
> old playground, a swing frame wrapped in morning-glory vines with one swing
> hanging and one chain lying in the grass.
>
> Right: a huge old zelkova tree with a grey scaled trunk leaning over the
> path, roots lifting the paving, its dense canopy filling the top-right
> corner, hard shafts of sun breaking through and dappling the path. Under it
> a park bench with peeling green paint and rusted cast-iron ends, a navy
> school bag left on the seat. At the far right edge, by the park's side gate,
> a green public telephone booth with glass panels, one cracked, a warm light
> on inside, and a vending machine beside it with a sun-faded pastel front.
>
> Left foreground: two bicycles leaning together under a blanket of kudzu
> vines, one rusted brown, one clean. Near corners: tall silver susuki grass
> plumes and goldenrod catching the light against deep shade.
>
> Beyond the trees, a hazy pale blue city skyline of abandoned mid-rise
> buildings, some with upper floors broken open and small trees growing from
> them, vines hanging down their faces; sagging overhead power lines on
> leaning concrete poles crossing the sky. On the line of the main path, the
> tall clock tower of a railway station with a pale clock face. Left, through
> a gap in the trees, the sawtooth roof of an old workshop with skylights and
> ivy. Right, behind the big tree, the glass roof of an old arcade with a
> blank, faded sign. The upper-left sky is open, calm and uncluttered,
> warm cream fading to soft blue.
>
> [style core]

Optional suffix: `--ar 2:1 --style raw --stylize 100`

### 5.4 PK-P: phone key art

Reference: `blockin-portrait.png` (layout) and the approved PK-D (style and
content), both moderate influence.

> The same abandoned Japanese neighbourhood park as the reference painting,
> same afternoon light, same objects, painted as a tall vertical composition
> from a few metres further up the path. The flagstone path climbs the frame
> from bottom centre. The roofed wooden notice board stands in a bright patch
> of sunlight in the upper third, the leaning fingerpost beside it. The dry
> mossy fountain in the middle of the frame. The huge zelkova on the right
> edge, its canopy framing the top right, its trunk running down the right
> side. The edge of the wooden pavilion with its warm lit window at the left.
> The green telephone booth with its light on at the right edge, below the
> notice board. The bench with the school bag lower right; bicycles under
> kudzu lower left; susuki and dark shrubs in the bottom corners. The top
> third is open calm sky, warm cream to soft blue, with the hazy city skyline
> and the station clock tower low on the horizon.
>
> [style core]

Optional suffix: `--ar 9:19 --style raw` with the approved PK-D as style
reference.

### 5.5 Detail passes (on crops of the approved master)

Upscaled images go soft at the focal objects. For each focal crop (notice
board, fountain, booth, pavilion, bench, bicycles, fingerpost), take a
1024–1536 px crop, run image-to-image at **low strength (20–35%)** with this
prompt, and blend the result back with a soft-edged mask.

> Add fine hand-painted detail to this exact image without changing its
> composition, shapes, perspective, colours or lighting: wood grain and
> weathering, chips in paint, rust at joints, moss in cracks, individual
> leaves and grass blades, small stones. Keep it painterly, not
> photographic. [style core]

### 5.6 Clean-plate fills (for layer derivation)

Use generative fill on the master with the region masked. Short prompts work
best; the surrounding image carries the style.

| For | Mask | Prompt |
|---|---|---|
| PL-0 sky | Everything below the skyline | "Continue the soft warm afternoon sky and thin high clouds, nothing else." |
| PL-1 city | The tree line strip | "Continue the hazy distant city buildings down to the ground, pale blue, low contrast." |
| PL-2 canopy | The strip under the tree line | "Continue the park's distant tree line and grass in shade." |
| PL-3 midground | Each foreground shape + 2% margins at the frame edges | "Continue the park ground, grass and paving exactly as around it." |
| PL-3 under fingerpost | The fingerpost | "Continue the flagstone path and grass in sunlight." |
| Frame extension | Outpaint 5% up and to both sides | "Extend the painting naturally, same light and detail." |

### 5.7 PS state overlays

On a crop of the approved master, in register, with the object masked:

- **PS-01:** "The same notice board, slightly more brightly lit by the sun,
  one paper notice lifting at its corner in a breeze." (Strength low; check
  that nothing else moved.)
- **PS-02:** "The same telephone booth with its interior light a little
  brighter and warm light spilling onto the ground in front of it."
- **PS-03:** "The same pavilion with a second window glowing with warm
  lamplight."
- **PS-04:** "The same faded sign, its glass tubes very faintly lit warm
  white."

### 5.8 PI-01: notice board close-up

Reference: the approved master (style and the board's design).

> Close-up, eye level, of the small roofed wooden community notice board from
> the reference painting, filling most of the frame, in warm late-afternoon
> sunlight from the upper left. Silvered cedar frame with deep grain, a tiny
> dark tiled roof with two tiles missing and moss in the gaps, rusted hinges
> on a scratched, slightly clouded clear cover. Behind the cover, a cork
> backing with six to eight completely blank paper notices of different
> sizes, curled and sun-faded, held with rusted pins and yellowed tape: one
> large blank sheet in the centre (for a map), a torn tab strip, a faded
> coloured flyer with no writing. A dried leaf caught in the frame corner,
> ivy climbing the left post. Background softly out of focus: the path,
> dappled light, greenery.
>
> [style core]

Optional suffix: `--ar 3:2 --style raw` (and `--ar 9:16` for phones).

### 5.9 PI-02: phone booth interior

> Inside a green public telephone booth in an abandoned Japanese park in
> warm late-afternoon light, eye level, looking at the phone. An old
> pastel-green public payphone on a small shelf, its receiver hanging on
> the hook, coiled cord. Beside it a blank laminated directory card in a
> metal frame, and a small shelf with an old blank notepad and a pencil.
> Glass panels with dust, one cracked; through them, soft-focus park
> greenery and the zelkova's trunk. A small vine has grown in through a gap
> at the bottom of the door. A dim warm light fitting on the ceiling. Sun
> coming through the glass from the upper left, leaving bright patches on the
> shelf.
>
> [style core]

Optional suffix: `--ar 3:2 --style raw`.

### 5.10 PA-04 / PA-05 sprites (optional)

> A single fallen ginkgo leaf, golden yellow with a green edge, hand-painted
> gouache, isolated on a flat pure white background, no shadow.

> A small songbird in flight seen from below at a distance, simple
> dark-olive silhouette with soft painted edges, isolated on a flat pure
> white background.

Ask for a transparent background if the tool supports it; otherwise I'll key
out the white, which is reliable for small, simple shapes like these.

---

## 6. Acceptance checklist for the key art

Reject a candidate if any of these fail:

- [ ] One-point perspective holds: path edges, paving lines and roof lines
      converge to one vanishing point near x≈56% of the width.
- [ ] Light comes from the upper left on **every** object; shadows fall
      lower-right and away.
- [ ] Scale ruler (§2) roughly holds: notice board smaller than the booth;
      bench sized for people; buildings recede.
- [ ] The light pool around the notice board is the brightest area.
- [ ] Upper-left sky is quiet enough for the name and intro.
- [ ] Notice board, fingerpost, pavilion, booth, clock tower, workshop roof
      and arcade are all present and readable as silhouettes.
- [ ] No people, no readable text, no logos.
- [ ] Vegetation varies (zelkova, ginkgo, susuki, kudzu, goldenrod,
      morning glory), not one repeated shape.
- [ ] Abandonment reads but stays gentle: no horror, no rubbish heaps.
- [ ] It looks painted, not rendered or photographed.

Nice to have: story details (paper boat, school bag, clean bicycle, can in
the vending machine). These can be added later with fill.

---

## 7. What can be done automatically, and what can't

| Work | Who | Notes |
|---|---|---|
| Composition block-ins, art bible, prompts, checklist | **Me, done** | This folder |
| Project screenshots | **Me, done** | `public/projects/` |
| Generating key art and inserts | **You, in an image tool** | I can't generate raster images in this environment. I'll review every candidate you send against §6 and say which to take forward and what to fix |
| Inpainting, clean plates, detail passes | **You** (Photoshop Generative Fill, Midjourney's editor, Krita with an AI plugin, or similar) | I'll specify each mask and prompt; you run them |
| Upscaling to 4096 | **You** | Use a faithful upscaler first; "creative" upscalers invent detail that can drift off-style |
| Layer masks (PL, PM) | **You**, with a mask tool (Photoshop, Krita, or free Photopea) | Automatic foliage cutouts aren't reliable enough. I can make first-pass masks for hard-edged objects (booth, board, building roofs) in code, but foliage masks need a hand |
| Keying out sprites on white | **Me** | Reliable for small simple shapes |
| Export to AVIF/WebP at 1× and 2× | **Me** | `sharp` is already installed with Next.js; no new dependency |
| Registration check | **Me** | I'll stack the exported layers with zero parallax in the browser and pixel-diff them against the master; any mismatch shows up immediately |
| Hotspot coordinates | **Me** | Measured from the final art. The code adapts to the painting, not the other way round |
| Atmosphere, interaction, transitions, text, accessibility | **Me** | Code |
| Contrast checks on real pixels | **Me** | Playwright screenshots + sampling |
| Night versions | **You + me, later** | Repaint the approved day master with an image-to-image "same scene at night" pass, then derive layers the same way |

---

## 8. Integration into the Next.js app

### Files and folders

```
art/                         (gitignored: source PSD/KRA, candidates, masters)
docs/art/park/               (committed: plans, block-ins, provenance log)
public/world/park/
  d/  pl-0.avif pl-1.avif … pl-4l.avif  pm-01.png …   desktop layers + masks
  p/  …                                               phone layers + masks
  pi-01-d.avif pi-01-p.avif pi-02-…                   inserts
app/components/world/
  Scene.tsx        server: the stage + layers for one location
  Hotspot.tsx      server: an accessible link/button placed on the art
  SceneMotion.tsx  client: pointer parallax (from today's HubStage.tsx)
  Atmosphere.tsx   server: light shafts, dust, grain (CSS/SVG)
  ParkMap.tsx      client: the notice board's map, opened in a <dialog>
app/data/world.ts            layer list, hotspot positions (desktop + phone)
```

Masters are 10–40 MB each, so they live in `art/` (gitignored) or in
git LFS if you want them versioned. Only web exports are committed.

### The stage

All layers and hotspots share one coordinate system: the master's. A stage
element is sized to cover the viewport at the master's aspect ratio (2:1 on
landscape screens, the phone ratio on portrait), centred, and every layer
fills it. Hotspots are positioned as percentages of the master, so they stay
glued to the painted objects at any size. (Today's `paths.ts` does a version
of this with its wide/mid/narrow layouts; this replaces those three layouts
with two art-directed ones.)

Landscape vs portrait art is chosen with `<picture>` and media queries via
Next's `getImageProps`, so phones never download desktop layers. PL-3 (the
midground, the largest visible image) gets high fetch priority as the LCP
element.

### Hotspots

Each interactive object is a real `<Link>` (or `<button>` for the map) with:

- an accessible name ("Library pavilion: About me")
- a small hand-lettered label tag that appears on hover and focus, and is
  **always visible on touch screens**
- focus and hover drawn as light: the object's mask (PM) drives a warm rim and
  a light pool on the ground
- a hit area matching the object's mask, at least 44 px

A quiet **"Show places"** text control in the scene reveals every label at
once, for anyone who doesn't want to hunt. The navbar keeps plain links
(About, Projects, Experience, Skills, Contact; Résumé when you supply it).

### Routes and transitions

- `/` is the park. Each location gets its own route (`/contact` is the first,
  Phase 3), so locations are linkable, load on demand, and work with
  back/forward.
- **Interim:** until each location is painted, its route shows the existing
  section content on a plain paper page with a "Back to the park" link. No
  content or links are lost while the world is being built.
- Travel uses the View Transitions API through React/Next where supported
  (I'll confirm the current Next 16 API with Context7 before building), with
  a crossfade fallback and an instant cut under reduced motion. Target: under
  900 ms.
- Retired once the park ships: `ParkWalk` (sideways scroll), `Sky.tsx`,
  `park/scenery.tsx` and the hub SVG scene. `HubStage`'s parallax logic is
  kept, slimmed into `SceneMotion`.

### Typography

You've lifted the system-font restriction. Proposal, both from Google Fonts
through `next/font` (self-hosted at build time, no new npm dependency):

- **Display: Shippori Mincho B1.** A Japanese Mincho typeface with a refined
  Latin. The "B1" cut has a subtle ink-spread, like letterpress on old paper,
  which suits faded notices and station signage without being decorative.
  Used for your name, location titles and sign lettering, at weight 500–600.
- **Text and signage: Zen Kaku Gothic New.** A Japanese gothic whose Latin
  is open and calm, the kind of face found on real Japanese wayfinding.
  Used for body text (17 px, 1.6 line height), labels, timetables (with
  tabular figures).

Both come from Japanese type traditions, so the world's lettering feels
native to it rather than borrowed. Fallback pairing if they don't read well at
small sizes: Shippori Mincho B1 + Source Sans 3. I'll check Latin-only
subsetting and file size with Context7 and the real build; budget ≤80 KB of
font for first load.

`CLAUDE.md`'s typography and design-direction sections will be updated to
match when implementation starts.

---

## 9. Staged workflow

| Stage | What happens | Who | Gate |
|---|---|---|---|
| 0 | Art bible, block-ins, prompts, checklist, screenshots | Me | **This review** |
| 1 | Generate 12–20 desktop key art candidates from §5.3 + block-in | You | You send the best 3–5; I critique against §6 |
| 2 | Iterate on the chosen candidate: fix perspective/scale/composition with fills; detail passes; upscale to 4096 | You, with my notes | **Lock PK-D** (we both sign off) |
| 3 | Phone key art from §5.4, using PK-D as reference | You | Lock PK-P |
| 4 | Derive layers: masks, clean plates, frame extension (§4.2, §5.6) | You | I run the registration check |
| 5 | Inserts PI-01, PI-02; masks PM-01…07; optional PS states and sprites | You (+ me for sprites) | I review each |
| 6 | Integrate: exports, stage, layers, parallax, atmosphere, typography | Me | Screenshots at 1440/1920/768/390 |
| 7 | Interactions: hotspots, labels, notice board map, booth → `/contact`, interim routes, keyboard, reduced motion | Me | `npm run lint`, screenshots, your review |
| 8 | Phase 4 QA loop: critique, fix top five, re-shoot | Me | Your approval of the park |
| 9 | Night versions, then the next location | Both | |

**Realistic expectations:** Stage 1 usually takes several rounds of prompting
before a candidate passes the checklist. Stage 2 is where most of the quality
comes from; budget more time there than for generation. If after two rounds
no candidate holds perspective and scale, the fallback is to paint over the
block-in with image-to-image at higher structure influence, trading some
spontaneity for control.

---

## 10. Open items

- **Impeccable** isn't loaded in this session. I'm documenting that here and
  using `design:design-critique`; I'll retry it when Phase 4 starts.
- **Scrollganizer naming:** the extension's own UI header says "Scroganize"
  (see `public/projects/scrollganizer/panel-results-light.png`), while the
  portfolio says "Scrollganizer". The repo's README also still links to
  its old name, `richardlancs/save_stack` (the portfolio's link to
  `richardlancs/Scrollganize` is correct). Nothing changed; flagging in case
  you want to align them.
- **Which image tool** you'll use decides the exact parameters; tell me and
  I'll tailor §5 to it.
