# Review: desktop candidate c01

File: `art/park/candidates/pk-d-c01.png` (1536×1024, ChatGPT Images).
Checked against `blockin-desktop.png` / `layout-desktop.png` by overlay at
50%, 2× crops of every key object, and pixel measurements (luminance,
contrast against the text colour `#2B2F27`, colour balance). Review files:
`.playwright-mcp/review/` (overlay, crops, grade preview).

## Verdict: NEEDS MINOR EDITS

The structure is right: camera, layout, every landmark and the overall
quality are good enough to build on. Nothing needs regenerating. Four
contained region edits and a colour correction stand between this and a
locked master.

## Composition validation

| Check | Block-in | c01 | Result |
|---|---|---|---|
| Vanishing point | 58% across, 42% down | ~62% across, ~49% down (from the path edges) | Lower and slightly right. Internally consistent, so **accept**; the art bible follows the painting |
| Horizon / tree line | 42% | Skyline base ~34%, park tree line ~38–55% | Accept |
| Clock tower | 55–59%, top 18% | 54.5–58.5%, top 12% | ✅ Taller, on the path line |
| Workshop | 25–41%, 40–46% down | 22–38.5%, 26–36% down | ✅ Higher than planned (affects the text zone, below) |
| Arcade / greenhouse | 80–95% | 77.5–90.5%, 29–43% down | ✅ Glass dome + blank billboard; reads well |
| Pavilion | 3–26% | 1–26.5%, 38–59% down | ✅ But its window isn't lit |
| Notice board | 63–72%, 44–60% | 61.5–71.7%, 40.5–54.5% | ✅ Position and size |
| Fingerpost | 56–64% | 54.7–60.7% | ✅ |
| Fountain | 41–76%, 67–81% | 41.5–76%, 60–75% | ✅ Same width, slightly higher |
| Phone booth | 85–91%, 50–73% | 84.5–93%, 42.5–67.5% | ⚠️ Right place, wrong object (see 3) |
| Vending machine | 80–84% | Replaced by a stone gate post | Accept; it's a good object |
| Zelkova | from 71%, top right | from ~50% along the top, trunk 92–100% | ✅ Bigger than planned; frames well |
| Bench + bag | 74–85% | 75.5–94%, 71–83% | ✅ Bag present |
| Bicycles | 12–25% | One bicycle, 9–27%, behind a new railing | ✅ Railing is a strong foreground addition |
| Steps | 29–88% bottom | 23–91% bottom | ✅ |
| Side paths at the fork | Left and right | Not painted; plaza ends in grass at the board | ⚠️ Optional edit |
| Light | From behind the camera, upper left | **Sun in frame**, low at the upper-left edge, backlighting the scene | Different but coherent and beautiful. **Accept and update the art bible.** Causes issues 1–2 |

**Scale:** coherent. Notice board ≈ 2 m wide at ~77 px/m; fountain ≈ 4.8 m
across, a plausible plaza fountain; bench and bicycle agree with each other.
The fountain is large, but it sits where the block-in put it, and the path
leads around it to the board rather than being blocked by it. **No change.**

**16:9 and 16:10:** 16:10 (1440×900, 1280×800) loses 3% top and bottom;
16:9 (1920×1080) loses 8% top and bottom (the top of the sky and the lowest
step). Every landmark, including the clock tower's spire (12% down),
survives both. Ultrawide 21:9 would cut the spire. That's a later fix
(extend the painting upward), not a blocker.

## Issues

### 1. The notice board isn't the focal point (edit)

- **What's wrong:** the brightest areas in the image are all sun glare in
  the upper-left corner (luminance 0.76–0.82). The board's face measures 0.34
  and its surroundings 0.33, the same as the rest of the sunlit midground.
  It stands against mid-green trees of a similar value, so its silhouette
  doesn't separate.
- **Why it matters:** the art bible's main idea is that light marks what
  you can use. Right now the eye goes sun → clock tower → fountain, and the
  board is found only by looking for it.
- **Image edit:** yes, E2 (light pool + separation).
- **Frontend:** the hover/focus light helps on interaction, but it can't
  make the board read as the focal point at rest. That has to be in the
  painting.

### 2. The text zone is shallower than planned (edit, small)

- **What's wrong:** with dark ink text, the sky from x 120–560 px, y 60–280
  px measures 6.5:1 to 11:1 contrast everywhere (passes AA comfortably). Below
  y≈280 it drops to 2:1 where the workshop, the left skyline and dark pines
  begin. That leaves about 170 CSS px of height for name, headline and intro
  at 1440×900, and ~140 px at 1280×800. Clouds add some texture but stay low
  contrast.
- **Why it matters:** name + headline + a two-line intro just fits
  (~164 px at 1440×900); at 1280×800 it only fits if the intro runs
  wider, to ~x 760 px, which is still open sky. There's no slack.
- **Image edit:** yes, E1. Push the distant left skyline and mountains
  further into haze (paler, lower contrast) and soften the clouds in that
  area. Distant objects should be hazier anyway (atmospheric perspective),
  so it improves the painting as well as the layout. The workshop keeps its
  shape and position, only lighter.
- **Frontend:** the layout above uses the space that exists: links move to
  the navbar and the intro runs wide. No scrim or overlay behind the text.

### 3. The phone booth doesn't read as a phone booth (edit)

- **What's wrong:** at 2× it's a narrow green display case with peeling
  posters behind glass: no door, no phone, no interior light. It reads as a
  notice kiosk, which competes with the real notice board.
- **Why it matters:** it's the Contact destination and the first location
  we'll build. Visitors need to recognise "telephone = contact" instantly.
- **Image edit:** yes, E3. Same place, same height, repainted as a glass
  phone booth with a payphone and a warm light inside.
- **Frontend:** no. A label can name it, but the object itself has to be
  right.

### 4. The pavilion's window isn't lit (edit, small)

- **What's wrong:** the window is dark.
- **Why it matters:** a lit window marks the pavilion as a place someone
  still uses, gives About a warm affordance, and repeats the "light = come
  here" language.
- **Image edit:** yes, E4.

### 5. Strong yellow-orange cast (colour correction, not ChatGPT)

- **What's wrong:** average colour is RGB 130/115/79; shadows under the
  bench measure 109/89/38. Shadows are warm brown-yellow, not the cool
  blue-green the bible asks for, and clouds are peach. This is ChatGPT's
  known warm cast.
- **Why it matters:** with no cool shadows, everything sits in one warm
  middle value, which flattens depth and is part of why the board doesn't
  stand out.
- **Image edit:** yes, but with curves, **after** the ChatGPT edits so
  they're all graded together. I tested a correction on a copy (cooler
  shadows, −10% saturation, cleaner whites):
  `.playwright-mcp/review/grade-preview.png` and the side-by-side
  `grade-compare.png`. It fixes the cast without losing the warmth. I can
  apply it as a documented script on the master, or you can do it in
  Photopea; your call.
- **Frontend:** no CSS filters on the painting.

### 6. Side paths at the fork are missing (optional edit)

- **What's wrong:** the block-in had paths curving left and right from the
  board. The painting's plaza ends in grass.
- **Why it matters:** less than planned. Navigation is through objects,
  and the fingerpost and the path to the pavilion already suggest routes. It
  would deepen the "paths lead somewhere" feeling.
- **Image edit:** optional E5. It's the riskiest edit (new perspective
  geometry), so try it last and drop it if it bends.

### 7. Resolution (later step, not an edit)

- 1536×1024 is enough for 1280–1536 px wide screens at 1×. A 1440 MacBook
  (2880 device px) and 1920 monitors need ~2×. Crops at 2× are painterly and
  coherent, with slight AI softness in foliage, no broken objects and no
  readable text (the board's papers are illegible scribbles, which is
  correct).
- **Plan:** after locking, upscale to 3072×2048 with a faithful upscaler
  (Upscayl is free and local; Photoshop Super Resolution also works), then
  detail-pass the focal areas (board, booth, pavilion) if they look soft.

### What's working (keep all of this)

- The light: low sun through the left trees, the gold rim on every leaf,
  dappled shade on the plaza. It's the emotional core of the image.
- The zelkova canopy: varied, layered, backlit leaves; a real frame.
- The left foreground: a railing, a bicycle and tall grass give real depth.
- Weathering everywhere: heaved flagstones with grass in the seams, the rust
  on the swing frame and railing, moss on the fountain, the peeled notices.
- The skyline: a broken concrete sawtooth workshop, a clock tower with vines,
  a greenhouse dome under a rusted blank billboard. All three landmarks read
  instantly.
- Story details: the school bag on the bench, the leaning fingerpost.

---

## Edit prompts (ChatGPT Images)

Use the method in `chatgpt-desktop.md` §5: open the current master in a new
chat, select only the named region, paste the prompt, download, composite
**only that region** back with a soft mask, save the next version.
Order: E3, E2, E4, E1, then optional E5. Then the colour correction, then
upscale.

Regions are in pixels on the 1536×1024 image (left, top → right, bottom).

**E1. Haze the distant left skyline** (select 90, 120 → 760, 400: the sky
and distant buildings left of the electricity pole; do not include the
pavilion roof or the near yellow trees)
```text
In the selected area only: make the distant city buildings, the sawtooth
workshop roof and the mountains paler, softer and lower in contrast, as if
seen through warm late-afternoon haze, closer in value to the sky behind
them. Keep every building's shape, size and position exactly as it is. Make
the clouds in this area softer and fewer, as gentle thin streaks. Keep the
warm sunlight and painterly brushwork. Do not change anything outside the
selection.
```

**E2. Light the notice board** (select 820, 380 → 1210, 640: the board,
fingerpost and the ground and trees around them)
```text
In the selected area only: a shaft of low golden sunlight falls through a
gap in the trees directly onto the wooden notice board and the stone path in
front of it. Make the board's face, roof edge and posts and the paving
around its base the brightest, warmest area in this part of the image, with
crisp leaf shadows at the edges of the patch of light. Make the trees and
bushes directly behind the board slightly darker and cooler so the board's
silhouette stands out clearly. Keep the board, fingerpost and paths in
exactly the same position, size, shape and perspective, keep the faded paper
notices unreadable, and keep the painterly style. No glow, bloom or haze
effect. Do not change anything outside the selection.
```

**E3. Make the booth a telephone booth** (select 1280, 410 → 1450, 710: the
green booth only, not the stone post)
```text
In the selected area only: repaint the green structure as an old Japanese
public telephone booth, at the same position and height and a little wider:
a tall green metal frame with glass panels on all sides and a glass door
with a vertical handle, one panel cracked, dust and leaf litter on the
glass. Inside, clearly visible through the glass, an old pastel-green
payphone on a small shelf with its receiver on the hook, and a warm small
ceiling light glowing inside the booth. Rust at the hinges, chipped green
paint, a vine climbing one corner. Same sunlight from the upper left, same
painterly style. No text or logos. Do not change anything outside the
selection.
```

**E4. Light the pavilion window** (select 110, 480 → 360, 600: the front
wall of the pavilion)
```text
In the selected area only: warm lamplight glows from inside the pavilion's
left window, softly lighting the window frame and spilling a little onto
the wall and the bench below it, as if a lamp had been left on. Keep the
pavilion, window, door and bench exactly the same in position, size and
shape, keep the painterly style and the afternoon sunlight. Do not change
anything outside the selection.
```

**E5. Optional: side paths at the fork** (select 700, 520 → 1260, 620: the
grass between the plaza, the board and the trees)
```text
In the selected area only: add two narrow, worn, partly overgrown paths of
old flagstones and trodden earth branching from the plaza beside the notice
board: one curving away to the left behind the swings toward the distant
trees, one curving away to the right toward the glass greenhouse, both
narrowing into the distance in the same perspective as the main path. Grass
and fallen leaves partly cover them. Do not move or change the notice board,
fingerpost, fountain or trees. Same light and painterly style. Do not
change anything outside the selection.
```

**Acceptance after edits:** rerun the checks: overlay positions unchanged
(±1%), board area brightest in the midground, text-zone contrast ≥4.5:1 from
y 100 to y ≥330, booth recognisable as a phone booth at 1× and 2×, no new
text or people. I'll run the measurements again when you send the edited
version.

---

## Implementation plan (after the master is locked)

### Destinations on this painting

Measured from c01; re-measured on the locked master. Fractions of the
master's width and height.

| Object | Leads to | Box (x, y) | Size at 1440×900 | Clickable as is? |
|---|---|---|---|---|
| Notice board | Map (hub) | 0.615–0.717, 0.405–0.545 | ~147×135 px | Yes |
| Pavilion | About | 0.010–0.265, 0.380–0.590 | ~367×202 px | Yes |
| Workshop (sawtooth roof) | Projects + Skills | 0.220–0.385, 0.260–0.360 | ~238×96 px | Yes |
| Station clock tower | Experience & Education | 0.545–0.585, 0.120–0.340 | ~58×211 px | Yes (narrow but ≥44 px) |
| Greenhouse + billboard | Interests | 0.775–0.905, 0.290–0.430 | ~187×134 px | Yes |
| Phone booth | Contact | 0.845–0.930, 0.425–0.675 | ~122×240 px | **After E3** |
| Bench + bag, bicycle, fountain | Small discoveries (no navigation) | | | Optional, phase 6 |

No object is too small on desktop. On phones the tower and workshop will be
too small to tap reliably; there the visible label tag is the tap target
(below).

### Scene architecture

```
<Scene> (server)                      app/components/world/Scene.tsx
  stage: covers the viewport at 3:2, centred (object-fit: cover maths)
  ├─ L0 sky            <img>  parallax 0
  ├─ L1 far            <img>  ±2 px     mountains, city, clock tower
  ├─ L2 mid band       <img>  ±4 px     workshop, tree band, greenhouse, pole + wires
  ├─ L3 ground         <img>  ±6 px     plaza, fountain, steps, pavilion, swings,
  │                                      board, fingerpost, booth, post, bench
  ├─ hotspot SVG per layer, viewBox 0 0 1536 1024, same transform as its layer
  ├─ L4 foreground     <img>  ±12 px    railing + bicycle + grass (left);
  │                                      zelkova trunk, canopy, wall (right)
  ├─ L4 leaf sprites   <img>  ±12 px + sway: 2–3 leaf clusters hanging into the sky
  ├─ atmosphere        CSS/SVG          dust in the light, falling leaves
  └─ HTML              name, intro, labels, navbar, "Show places"
<SceneMotion> (client, small)         pointer parallax + pause when hidden
```

**Coordinate system:** the master's own pixels (1536×1024 viewBox; the
3072×2048 export maps 1:2). Every layer is the full canvas, so layers,
hotspots and labels share one system. Hotspots are **SVG paths traced
around each painted object** inside a `<svg viewBox="0 0 1536 1024"
preserveAspectRatio="xMidYMid slice">`, wrapped in `<a href>` with an
accessible name. The same path is the clip for the hover light, so the
light falls exactly on the painted object. No floating buttons, no PNG
masks needed for the hotspots.

### Deriving the layers from this painting

Cut along natural silhouettes, then fill what each cut uncovers. With the
parallax above, a layer moves at most ~13 px (1536 scale) relative to the
one behind it, so the **fill only has to be convincing in a ~30 px band
along each silhouette**, not across the whole hidden area.

| Layer | Cut along | Uncovered area to fill | Fill method |
|---|---|---|---|
| L4 left | Railing, bicycle, grass tops | Plaza and grass behind the railing | ChatGPT region edit ("continue the grass and paving"), composited back |
| L4 right | Zelkova trunk, canopy, wall, bushes | Sky, greenhouse and trees behind the leaf edges | Sky: automatic edge extension (smooth gradient). Greenhouse and trees: ChatGPT region edit |
| L4 sprites | 2–3 hanging leaf clusters (≈770–1150, 0–130) | Sky behind them | Automatic (sky) |
| L3 | Top edge of the park ground (tree bases, pavilion roof, board roof, booth top) | Lower edge of the mid tree band | ChatGPT region edit |
| L2 | Tree band, greenhouse, workshop, pole + wires | City and mountains behind the treetops | ChatGPT region edit |
| L1 | Skyline silhouette, tower spire | Sky behind | Automatic edge extension |

Who does what: I make the cut paths (SVG, hand-traced from the master)
and first-pass masks, run the automatic fills, and stack the layers with
zero parallax in the browser to pixel-diff against the master. You run the
ChatGPT region fills I list, using the same composite-back method. Pole and
wires stay on one layer so they never separate.

### Motion

| Element | Behaviour | Budget |
|---|---|---|
| Pointer parallax | L1 ±2, L2 ±4, L3 ±6, L4 ±12 px; eased, 1 transform per layer per frame | One rAF loop, transforms only |
| Leaf sway | The 2–3 hanging clusters rotate ±0.6° around their stems, 7–9 s, out of phase | CSS keyframes |
| Falling leaves | One leaf sprite every 15–25 s from the canopy, drifting down-left through the light | At most 2 on screen |
| Dust | ~15 motes drifting slowly in the sun near the left edge and in the board's light | CSS only |
| Hover / focus on an object | The object's traced shape takes warm light (gradient, `soft-light`, ~25%) over 250 ms; its label tag fades in on a short string | No blur, no bloom |
| Travel to a location | Click → label confirms → a 450 ms dolly-in toward the object (L4 scales most, L0 least) → 300 ms crossfade into the next scene (View Transitions where supported) | Under 900 ms total |
| Board → map | Dolly toward the board, then the map opens as a `<dialog>` | Esc / Back closes it |
| Reduced motion | No parallax, sway, leaves or dust; travel is an instant cut | |
| Hidden tab | All animation paused | |

### Text placement (desktop)

Name, headline and a two-line intro sit in the measured clear sky, x ≈ 120
to 760 px, from the navbar down to y ≈ 280 (y ≈ 330 after E1), left
aligned. GitHub and LinkedIn move to the navbar (they're also at the booth).
Text is the ink colour, already measured at 6.5:1 or better there. No card,
scrim or blur behind it.

### Responsive

- **3:2 desktop master** for landscape screens from 4:3 to 16:9: at 4:3 the
  sides crop to 5.5–94.5%, and the booth and pavilion stay in frame. Wider
  than 16:9: later, extend the painting upward.
- **Phone master** (2:3, generated after the desktop is locked, using the
  approved painting as reference) for portrait screens. I'll draw
  `blockin-phone.png` from **this painting's** actual layout: path climbing
  the frame, board in its light in the upper middle, fountain mid-frame,
  booth on the right edge, pavilion at the left edge, tower, workshop and
  greenhouse small on the skyline, name in the sky above. A 390×844 phone
  shows the middle 69% of a 2:3 painting's width, so everything important
  goes there.
- **Phone interaction:** label tags always visible; each tag is a ≥44 px
  tap target tied to its object by a short painted-style string, because
  the tower and workshop are too small to tap directly. A "Map" button opens
  the board's map.
- **Fallback navigation everywhere:** the navbar's plain links, the map
  dialog, and every location's own URL.

### Routes, content and existing functionality

- Only `/` exists today; sections are anchors (`#about` … `#contact`).
- New: `/` = park; `/about`, `/projects`, `/experience`, `/interests`,
  `/contact` = locations. Old `/#projects`-style links redirect to the new
  routes, so links on a résumé keep working.
- Until a location is painted, its route renders the **existing** section
  component (unchanged content from `app/data/portfolio.ts`) on a plain
  paper page with "Back to the park". `/contact` is the first location to
  get its own painting (the booth interior), as planned for Phase 3.
- Kept: `portfolio.ts` content, the theme toggle and its no-flash script,
  the music toggle, reduced-motion handling, page metadata.
- Retired once the park ships: `ParkWalk`, `Sky`, `park/scenery.tsx`,
  `park/hub/*` (the current SVG park). The pointer logic from `HubStage`
  carries over into `SceneMotion`.
- **Uncommitted changes** to `ParkWalk.tsx` and `globals.css`: I won't
  touch them. I suggest committing them as they are before implementation
  starts, so they stay in history even though `ParkWalk` will be retired.
- **Assets:** sources stay in `art/` (gitignored); web exports go to
  `public/world/park/` (not ignored; I checked that `public/` paths aren't
  caught by `.gitignore`). Exports are made with a small script using
  `sharp` (already installed by Next.js; I'd add it as an explicit
  devDependency so the script doesn't rely on a transitive package). AVIF
  with a WebP fallback at 1600, 2400 and 3072 wide, served with `srcset`.
  Target ≤1 MB for the whole park at 2×.

### QA (after implementation)

Playwright at 1920×1080, 1440×900, 1280×800 and 390×844: overlay
screenshots on the master to check alignment, trace every hotspot, keyboard
through all of them, hover and click each, measure text contrast on real
pixels, check reduced motion, check image loading on a throttled network,
and run the design-critique skill (Impeccable is still not loaded).

### Decisions for you at implementation time

1. **Dark theme:** the park has no night painting yet. Proposal: the day
   painting in both themes until the night version is made; the theme still
   switches the UI and the paper pages.
2. **The intro animation** (the rolling ball through the desert) doesn't
   belong in this world. Proposal: retire it.
3. **Colour correction:** I apply the script and document it, or you grade
   in Photopea.
