# Desktop Park Painting: ChatGPT Images Guide

Tool: **ChatGPT Images.** Goal: one locked desktop master painting of the
park. No layers, no phone version and no website work until it's approved.

Reference to attach: **`blockin-desktop.png`** (unlabelled). The annotated
`layout-desktop.png` is for you, not for ChatGPT, because it contains text
that ChatGPT would try to paint.

---

## 1. Format and composition

- **Aspect ratio: landscape 3:2 (1536×1024).** This is ChatGPT's landscape
  size, and the block-in has been redrawn to match it exactly, so positions
  carry over one-to-one.
- **How screens will crop it:** 16:9 monitors see the band from 8% to 92%
  down; 16:10 laptops see 3% to 97%. Everything important sits inside the
  8%–92% band.
- **Composition:** one-point perspective from the top of the park's south
  steps, eye height, horizon at 42% down, vanishing point at 58% across.
  Strong frame on the right (the zelkova), open sky upper left, light pool
  slightly right of centre.

### Fixed positions (percent of width across, percent of height down)

| Element | Across | Down |
|---|---|---|
| Horizon line | full width | 42% |
| Vanishing point | 58% | 42% |
| Text zone (open sky only) | 4%–38% | 14%–38% |
| Station clock tower | 55%–59% | top at 18%, base at 43% |
| Workshop sawtooth roof | 25%–41% | 40%–46% |
| Arcade glass roof + sign | 80%–95% (partly behind the tree) | sign at 34%–38% |
| Notice board | 63%–72% | 44%–60% |
| Fingerpost | 56%–64% | 49%–58% |
| Light pool (brightest area) | centred 62% | centred 60% |
| Fountain | 41%–76% | 67%–81% |
| Library pavilion | 3%–26% | 45%–62% |
| Ginkgo | 24%–35% | crown top at 40% |
| Playground swing | 30%–38% | 57%–68% |
| Vending machine | 80%–84% | 58%–72% |
| Phone booth | 85%–91% | 50%–73% |
| Zelkova trunk | 94%–98% | 52%–100% |
| Zelkova canopy | from 71% to the right edge | top edge down to ~53% |
| Bench + school bag | 74%–85% | 79%–87% |
| Bicycles under kudzu | 12%–25% | 74%–87% |
| Stone steps | 29%–88% | 90%–100% |

Tolerance: about ±3% of the width. Anything further off is a rejection, or
a region edit (§5).

---

## 2. The prompt

Open a **new chat**, attach `blockin-desktop.png`, and paste everything in the
box below as one message.

```text
Create a landscape 3:2 image (1536×1024): a finished, richly detailed
hand-painted background painting for an animated film, in the style
described below.

REFERENCE IMAGE
The attached image is a flat-colour layout sketch. Use it as a strict
composition guide: keep every object in the same place, at the same size,
with the same perspective, horizon and vanishing point. Do not copy its flat
colours or simple shapes. Repaint everything as fully detailed, believable
scenery. The sketch's colours only indicate rough hue and how light or dark
each area is.

THE SCENE
A small neighbourhood park in an abandoned Japanese city, about fifteen
years after everyone left. Nature has gently reclaimed it. It is early
autumn, about 4:30 pm. The mood is warm, peaceful, nostalgic and quietly
lonely, never frightening. There are no people anywhere.

CAMERA (fixed)
We stand at the top of three worn granite steps at the park's south
entrance, at eye height, looking straight up the main path. One-point
perspective. The horizon is 42% down from the top. The vanishing point is
58% across from the left, directly beneath the station clock tower. Vertical
lines stay perfectly vertical. A natural, moderate lens: no fisheye, no
tilt.

LIGHT (fixed)
Low, warm golden sunlight from the upper left, coming from behind the viewer
at a low angle. Every object is lit on its left and upper faces. Long, soft
shadows fall toward the lower right and away from us. Shadows are cool
blue-green and violet-grey, never black. Backlit leaves glow yellow-green
where light comes through them. Warm light bounces up from the paving onto
the undersides of things. A gap in the trees lets a patch of direct sunlight
fall on the path just beyond the fountain: this pool of light around the
notice board is the brightest area in the whole image. Distant buildings are
pale, bluish and soft from atmospheric haze.

LAYOUT, LEFT TO RIGHT AND FAR TO NEAR (fixed positions, follow the sketch)
- Upper left (from the left edge to about 38% across, from 14% to 38% down):
  open, calm sky only, warm cream fading toward soft blue, with at most a
  few very faint high clouds. Nothing dark or detailed here; text will be
  placed over it.
- Skyline along the horizon: a hazy pale blue-grey city of abandoned
  mid-rise buildings, low on the left and taller in the centre-right. Some
  have their top floors broken open, with small trees growing out of them
  and vines hanging down their faces. Two sagging overhead power lines on a
  leaning concrete pole cross the sky from the centre toward the right.
- The railway station's clock tower rises from the skyline exactly on the
  line of the main path, slightly right of centre, with a pale round clock
  face (no numbers needed).
- Left of centre, just above the park's tree line, the sawtooth roof of an
  old brick and timber workshop with angled skylights, ivy covering its
  gable.
- Right, partly hidden behind the big tree, the glass roof of an old arcade
  and its faded, blank rectangular sign.
- Left midground: a low traditional Japanese wooden pavilion with a dark
  grey tiled roof, deep eaves and paper-screen windows. One window glows with
  warm lamplight; there is a dark wooden door. Beside it, a ginkgo tree
  halfway through turning golden yellow. In front of them, a small old
  playground: a metal swing frame wrapped in morning-glory vines, one swing
  still hanging, the other's chain lying coiled in the grass.
- The main path runs from the steps at the bottom centre up to the horizon.
  It is made of old square stone flagstones, heaved and tilted by roots,
  with grass, clover and moss in every seam and drifts of fallen leaves
  along the edges. Two narrower side paths branch off near the notice board:
  one curving left toward the workshop, one curving right toward the arcade.
- Centre: a low round stone fountain, dry, with moss climbing its central
  column, a tuft of grass growing from the spout and a shallow skin of
  rainwater in the basin reflecting the sky. A tiny faded paper boat sits
  on its rim.
- Just beyond the fountain, standing in the pool of sunlight: a small
  roofed wooden community notice board. Silvered, weathered cedar posts, a
  tiny dark tiled roof with a couple of tiles missing, a scratched and
  slightly clouded clear cover over a cork board with several blank,
  curled, sun-faded paper notices held by rusted pins. Left of it, a
  leaning wooden fingerpost with three blank arms pointing left, right and
  ahead.
- Right: a huge old zelkova tree with a grey, scaly trunk near the right
  edge, roots lifting the paving. Its dense canopy fills the top-right
  corner, made of many distinct leaf clusters. A few hard shafts of sunlight
  break through it and dapple the path with leaf shadows.
- Under the zelkova: a green public telephone booth with glass panels, one
  cracked, a warm light on inside; just left of it, a vending machine with a
  sun-faded pastel front.
- Lower right, beside the path: a park bench with peeling green paint and
  rusted cast-iron ends. A navy school bag sits on the seat as if its owner
  just stepped away.
- Lower left: two bicycles leaning against each other under a blanket of
  kudzu vines, one rusted to a uniform brown, one surprisingly clean.
- Near corners (foreground, darkest values): bottom left, tall silver
  susuki grass plumes and goldenrod against deep shade; bottom right, a dark
  rounded shrub. Very top right, a few near leaves of the zelkova hanging
  into frame.
- Bottom centre: the top of the worn granite steps, chipped at the corners,
  moss in the joints.

ENVIRONMENTAL DETAIL (paint with care)
- Vegetation must vary: broad zelkova leaf clusters, fan-shaped ginkgo
  leaves, feathery susuki plumes, heart-shaped kudzu, small goldenrod
  sprays, morning-glory vines, clover, moss. No repeated generic blobs.
- Every foliage mass has a sunlit top, a mid tone and a cool shadowed
  underside, with a few individual leaves separating at its edges.
- Stone: cracked and heaved flagstones, chipped edges, moss in joints, water
  stains, lichen.
- Metal: rust blooming at joints and bolts first, then edges; never
  uniformly rusted except the old bicycle.
- Paint: chipped on edges and where hands touched; faded on the sunny side.
- Wood: silvered grain, split ends, moss on the shaded side.
- Vines climb from the ground and the shaded side of things, and hang from
  ledges, following believable growth.
- Small story details that reward a close look: the paper boat, the school
  bag, the clean bicycle, one can left in the vending machine's tray, a
  single sneaker under the bench.

PAINTING STYLE
Hand-painted gouache and transparent watercolour look with visible,
controlled brushwork. Soft edges in the far distance; crisp, confident
edges on objects in the midground. No outlines: shapes are defined by
changes in value and colour. Rich and observed, like a background painter
spent days on it. Sharp and clear overall: no blur, bloom, glow haze, film
grain, vignette, lens flare or depth-of-field effects.

COLOUR
Forest and moss greens, warm muted golds and ochres, weathered grey stone
and concrete, rust browns, soft atmospheric blues. Saturation moderate and
natural. Whites in clouds and paper stay clean and neutral; shadows stay
cool. Do not apply an overall yellow, sepia or orange tint to the whole
image.

DO NOT INCLUDE
People, figures, faces, characters, animals, any readable text, letters,
numbers, logos, brand names, watermarks or signatures, neon, futuristic or
sci-fi elements, horror, gore, graffiti, rubbish heaps, a photographic or
3D-rendered look, anime characters, a frame or border.
```

---

## 3. What's fixed and what ChatGPT may invent

**Fixed (from the sketch, never changes):**

- Camera height and direction, horizon at 42%, vanishing point at 58%.
- Light from the upper left behind the camera; shadows to the lower right.
- Positions and sizes of: text zone, clock tower, workshop roof, arcade
  sign, pavilion, ginkgo, playground, path and side paths, fountain, notice
  board, fingerpost, light pool, zelkova, booth, vending machine, bench,
  bicycles, steps, foreground corners.
- The light pool at the notice board is the brightest area.
- The upper-left text zone is quiet sky.
- No people, no readable text.

**Free for ChatGPT to elaborate:**

- Building facades, window patterns, how each building is broken and
  overgrown.
- The exact shapes of tree canopies, flowers, grass clumps, leaf drifts.
- Crack patterns, moss, rust, peeling paint, stains.
- Cloud shapes (thin, high, faint).
- The design details of the pavilion, booth, bench, notice board,
  fingerpost and vending machine, as long as their size and position hold.
- Extra small story objects, as long as they're quiet and not in the text
  zone.

---

## 4. Checklist for each result

Download the full-size image and look at it at 100%, not just the chat
preview. Overlay it on `layout-desktop.png` at 50% opacity in any image
editor (Photopea is free in the browser) to check positions.

**Reject and regenerate if any of these fail:**

- [ ] Positions match the sketch within ~3% of the width (overlay check).
- [ ] One-point perspective: path edges and paving lines converge to one
      point near 58% across, 42% down. Verticals are vertical.
- [ ] Light comes from the upper left on every object; shadows fall lower
      right.
- [ ] The light pool around the notice board is the brightest area.
- [ ] The upper-left text zone is calm sky.
- [ ] All key objects are present and read clearly: notice board,
      fingerpost, clock tower, workshop roof, arcade, pavilion (lit window),
      booth (light on), fountain, zelkova.
- [ ] Scale is believable: the notice board is smaller than the booth (it's
      further away); the bench is sized for people; the buildings recede.
- [ ] No people, readable text, logos or watermark.
- [ ] It looks hand-painted, not photographic, 3D-rendered or airbrushed.

**Fix with region edits (§5) if these fail:**

- [ ] Vegetation varies by species; no repeated blobs.
- [ ] Weathering reads on stone, wood, metal and paint, and stays gentle.
- [ ] Story details are present (paper boat, school bag, clean bicycle,
      can, sneaker).
- [ ] No overall yellow/sepia cast; whites stay clean, shadows stay cool.
- [ ] No blur, bloom, grain, vignette or lens flare.
- [ ] Edges are crisp in the midground and soft only in the distance.

**How many to try:** generate 4–6 candidates (each one in a new chat with
the same prompt and sketch). Send me the best 2–3 with any notes; I'll
check each against this list and pick which to take into editing.

---

## 5. Editing without losing the composition

ChatGPT's region editing (open the image, choose the select/brush tool,
paint over an area, describe the change) is the right tool for fixes. Even
so, an edit can re-render the rest of the image slightly: colours shift,
small details change. Protect the master like this:

1. **Lock a master.** Save the chosen image as `pk-d-v01.png`. Never edit
   anything except the current master.
2. **One region, one change per edit.** Select only the area that needs
   fixing, with a little margin. Describe the change and say what must stay
   the same.
3. **Composite back, don't replace.** Download the edited image, place it
   over the master in an image editor (Photopea, Photoshop, Krita), and
   reveal **only the edited region** through a soft-edged mask. Everything
   else stays the original pixels, so nothing drifts.
4. **Save the next version** (`pk-d-v02.png`) and note the edit in
   `provenance.md`.
5. **Start a new chat for each editing session**, attaching the current
   master. Long chats drift.
6. If an edit changes the composition (something moved or resized), throw
   it away; don't try to fix the fix.

Colour cast and overall brightness are corrected in the image editor with
levels/curves, **not** in ChatGPT. Asking ChatGPT to regrade the whole
image regenerates the whole image.

### Edit prompts

Select the region named in each, then paste the prompt.

**E1. Quiet the text zone** (select the upper-left sky area)
```text
In the selected area only, simplify the sky to a calm, smooth gradient from
warm cream to soft pale blue with at most one very faint, thin high cloud.
Remove any dark shapes, birds, wires or detail from this area. Keep the
painterly brush texture. Do not change anything outside the selection.
```

**E2. Notice board detail** (select the notice board and fingerpost)
```text
In the selected area only, repaint the small roofed wooden notice board and
the fingerpost with more hand-painted detail, at exactly the same position,
size, shape and perspective. Silvered cedar grain, a tiny dark tiled roof
with two tiles missing and moss in the gaps, rusted hinges, a scratched
slightly clouded clear cover over cork, several blank curled sun-faded paper
notices with rusted pins and yellowed tape, ivy climbing the left post. The
fingerpost's three arms are blank, weathered and leaning. Keep the warm
sunlight from the upper left. No writing anywhere.
```

**E3. Fountain detail** (select the fountain)
```text
In the selected area only, add hand-painted detail to the dry stone
fountain without changing its position, size, shape or perspective: chipped
and cracked stone rim, moss and lichen on the central column, a tuft of
grass from the spout, a thin skin of rainwater in the basin reflecting the
sky, a few fallen leaves floating, a tiny faded white paper boat on the
rim. Same lighting from the upper left.
```

**E4. Foliage variety** (select one canopy or plant mass at a time)
```text
In the selected area only, repaint the foliage with more variety and
structure while keeping its overall silhouette, size and position: distinct
leaf clusters with sunlit tops, mid tones and cool blue-green shadowed
undersides, individual leaves separating at the edges, backlit leaves
glowing yellow-green where sun comes through. Painterly gouache brushwork,
not blobs or noise. Do not change anything outside the selection.
```

**E5. Paving and abandonment** (select a section of the main path)
```text
In the selected area only, add detail to the flagstone path without
changing its edges, width or perspective: heaved and slightly tilted square
stones, cracks, chipped edges, grass, clover and moss in every seam, small
drifts of fallen zelkova and ginkgo leaves along the edges, dappled leaf
shadows. Keep the light pool's brightness where it falls.
```

**E6. Booth and vending machine** (select both)
```text
In the selected area only, add detail to the green telephone booth and the
vending machine without changing their size, position or perspective: chipped
green paint with rust at the hinges, one cracked glass panel, dust on the
glass, a warm light glowing inside the booth; the vending machine's front
sun-faded to soft pastels with blank panels, rust streaks below its seams,
one can left in the tray, a vine climbing its side. No text or logos.
```

**E7. Pavilion** (select the pavilion)
```text
In the selected area only, add detail to the wooden pavilion without
changing its position, size, shape or perspective: dark grey roof tiles with
a few missing and moss along the ridge, deep eaves, weathered silvered
wood, torn paper-screen windows, one window glowing with warm lamplight, a
dark wooden door slightly ajar, a potted plant gone wild by the step.
```

**E8. Story details** (select the bench, or the bicycles)
```text
In the selected area only, without changing the object's position or size:
[bench] peeling green paint, rusted cast-iron ends, a navy school bag on the
seat, one small sneaker under the bench.
[bicycles] two bicycles leaning together under heart-shaped kudzu leaves,
one rusted uniform brown with a flat tyre, one clean and recently used, a
basket of dried cosmos flowers on the clean one.
```

**E9. Strengthen the light pool** (select the area around the notice board)
```text
In the selected area only, make the patch of direct sunlight on the path
and around the notice board brighter and warmer so it is clearly the
brightest area in the image, with crisp dappled leaf shadows at its edges.
Keep it painted, with no glow, bloom or haze effect. Do not move or resize
anything.
```

**E10. Remove intrusions** (select any person, text, logo, watermark or odd object)
```text
In the selected area only, remove the [person / text / logo / object] and
paint in what would naturally be behind it, matching the surrounding
painting, perspective and light exactly.
```

---

## 6. After the master is locked (later, for reference)

Not part of this step; here so the plan is visible.

1. **Resolution.** ChatGPT's 1536×1024 is too small for large screens. The
   master is raised to **3072×2048** with a faithful (non-creative)
   upscaler, then focal areas get a detail pass: crop a region, ask ChatGPT
   to redraw it at higher detail with the same composition, and composite it
   back with a soft mask (same method as §5).
2. **Phone painting.** I'll draw `blockin-phone.png` at ChatGPT's portrait
   size (2:3, 1024×1536), keeping the important content inside the central
   69% of the width, the part a 390×844 phone shows. You generate it with
   the locked desktop master attached as the style and content reference.
3. **Layers.** Made from the master, never generated separately (production
   plan §3 and §4.2).

### Delivery specs

| File | Size | Format | Notes |
|---|---|---|---|
| `art/park/pk-d-vNN.png` | 1536×1024 (then 3072×2048) | PNG, lossless | The desktop master and its versions. `art/` is gitignored |
| `art/park/pk-p-vNN.png` | 1024×1536 (then 2048×3072) | PNG | Phone master |
| `art/park/layers/d/pl-0.png` … `pl-4r.png` | Same size as the master | PNG with alpha | Every layer the full canvas size, so they stack with no offsets |
| `art/park/masks/d/pm-01.png` … | Same size as the master | PNG, greyscale | White = object |
| `public/world/park/d/*.avif`, `*.webp` | 1600, 2400, 3072 wide | AVIF + WebP | **I** export these with `sharp` |

**Coordinate system:** every layer, mask and hotspot uses the master's own
coordinates, stored as fractions (0–1) of its width and height. The
browser stage covers the viewport at the master's aspect ratio, so
fractions map straight to screen positions at any size. Hotspot positions
are measured from the final painting.

**Provenance:** for each kept image, record in `docs/art/park/provenance.md`
the date, "ChatGPT Images", the prompt (or a link to this file's section),
the chat link, and the edits applied. Check OpenAI's current terms of use for
generated images before publishing.
