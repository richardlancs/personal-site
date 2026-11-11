# The 3D world: progress log

Branch `world-3d`. The previous version (the park painting cut into moving
layers) is commit `4acaddd`.

## Decisions

- **Renderer:** three 0.186 and @react-three/fiber 9.8 (React 19.3 is inside its
  supported range). No drei and no postprocessing: what's needed is small and
  written here. three is about 270 KB gzipped and loads after the page's HTML.
- **Assets:** Blender isn't installed and no image-generation tool is connected
  in this environment, so every model and texture is generated in code from
  fixed seeds. That makes it reproducible, with nothing to download and no
  third-party licences. The only images loaded are the project screenshots in
  `public/projects/` and, without WebGL, the park painting.
- **Look:** one shared material (`paint.ts`): Lambert lighting with world-space
  brush variation, moss on surfaces that face up, grime rising from the ground,
  rust blooms, cool shadows and warm light, slightly stepped shading, and wind
  that bends geometry in world space (branches, leaves, grass, ivy). Fog in each
  place's own colour gives atmospheric depth.
- **Navigation:** the URL picks the place. The Director in `World3D.tsx` plans
  the camera's journey: in the park it flies the path to the place's door while
  a threshold closes in the colour of that doorway, then the destination's
  geometry is swapped in, the camera walks in and settles. Leaving a place
  backs out of its door into the park. Journeys can be interrupted (a new
  address replans from wherever the camera is). Reduced motion cuts straight
  to the place.
- **Content:** every page's content is real HTML, server-rendered. The 3D
  objects show the same content (monitors, timetable flaps, cabinet screens,
  notebook pages) and share the selection through `store.ts`.

## Files

| File | What it makes |
|---|---|
| `world3d/rng.ts` | seeded random numbers |
| `world3d/paint.ts` | the painted material, its shadow twin, the wind uniforms |
| `world3d/textures.ts` | canvas textures: flagstones, planks, plaster, building facades, roof tiles, enamel, ground, leaf clusters (5 palettes), fallen leaves, window panes, text panels, clock face, notices |
| `world3d/geometry.ts` | tubes with tapering radius, sagging wires, lumpy blobs, recursive trees (zelkova, ginkgo, maple, pine), leaf cards (ivy), bushes, ivy, grass, path ribbons |
| `world3d/vegetation/` | `shader.ts`: the lit three-band foliage and grass material (weather uniforms, wind per cluster/tuft); `foliage.ts`: crowns as lobed cluster masses, colour ramps; `grass.ts`: instanced tufts in coherent patches |
| `world3d/props.ts` | bench (one with a school bag), lamp, utility pole and wires, vending machine, phone booth (door, receiver, cord, light), bicycle with basket, swing, fountain with water shader, notice board with notices, signpost, dust, sunbeams, sky dome with clouds, falling and fallen leaves |
| `world3d/buildings.ts` | pavilion, sawtooth-roof workshop, station with clock tower, arcade, the empty city, hills, railings |
| `world3d/glow.ts` | light after dark: the lamps' beams in the air, lit sign faces, neon tube and frames, the wash of a sign's light on its wall, halos round neon letters, and the uniforms the atmosphere drives them with |
| `world3d/scenes/*.tsx` | the six places, each with its own lights, animation and hit areas |
| `world3d/scenes.ts` | where each place is, its camera poses, the routes from the park |
| `world3d/World3D.tsx` | canvas, the camera Director, wind and gusts, the park's name tags |
| `world3d/WorldShell.tsx` | loads the world after the page; the painting if WebGL fails |

## What moves

- Wind: everything with foliage sways with phases taken from its position;
  gusts arrive every 5–16 s, travel across the world as a wave, build, hold and
  die away (measured: 0 → 0.78 → 0 over about 6 s, then still).
- Park: the swing (pushed harder in gusts, or when clicked), the signpost's
  arms, falling leaves that rock down and lie on the ground before being
  reused, water ripples, dust in the sun, the notice board's map lifting
  when you look. (The booth's light and the arcade's sign used to flicker;
  since "Lamps and signs" below, no light in the world does.)
- Workshop: monitors switch on (a bright line opening into the picture) with
  the real screenshots; dust in the window light.
- Station: timetable flaps turn over when a line is chosen; the broken name
  sign swings on its last chain; tapping the clock makes its hand try to move.
- Arcade: each cabinet plays a small game about its interest while it's on; the
  neon on the wall is steady.
- Pavilion: the notebook's page bends over the spine as it turns.
- Phone booth: the door swings open on arrival; the receiver lifts off its hook.
- Camera: walks in on arrival, breathes slightly at rest, parallax with the
  mouse, drag to look around.

## Tested (Playwright, dev and production)

Every place by direct link; park → place by clicking a building, by keyboard
(Tab to a name tag, Enter), and from the Places menu; place → place; browser
back and forward; the notice board map; workshop project switch and
`#scrollganizer` deep link; timetable lines; arcade cabinets; notebook page
turns; picking up the phone; reduced motion (camera cuts); 390 × 844 phone
layout; no WebGL (painting fallback, content intact). 60 fps on this machine at
1440 × 900 and 390 × 844. No console errors.

## Limits

- Models are procedural and fairly simple up close (the receiver and keyboard
  are blocky, the neon sign is a few strokes). Hand-modelled or licensed assets
  would raise the detail; none could be made or fetched here.
- Phones don't run the world at all any more (see "The flat layout" below),
  so its low-quality settings now only matter for touch laptops and small
  landscape tablets. Still not tested on real low-end GPUs.

## The flat layout (6 November 2026)

Phones, portrait tablets and windows under 481px tall don't get the world.
`WorldShell.tsx` decides from one media query (`world/flat.ts`, the same
query as in `globals.css`) and only imports `World3D` on wide screens, so
three.js is never downloaded on a phone. Each page opens with the painting
moved in on its place (`world/Plate.tsx`: one image file for every page) and
the content follows on paper, with everything written out: all three
timetable lines, all four interests, the whole notebook on one sheet.
Rotating a tablet swaps between the two.

Also changed that day: the two typefaces load from five local Latin files
(`app/fonts/`) instead of Google's 240 slices; Escape goes back to the park;
a page's words show 0.15 s after a direct visit instead of 1.5 s (journeys
inside the site keep the camera's timing); the monitors' screenshots come
through the image optimizer. Numbers and the full list:
`docs/world/overnight-2026-11-06.md`.

## Evening of 6 November 2026: balance, corners, labels, weight

- Wide screens: a page's column sits in the middle of its half of the
  screen instead of against the edge (`--column`, `.location` padding), and
  grows to 42vw / 36rem. On a 1920px monitor the content no longer piles
  up on one side.
- Corners: `--radius-lg/--radius/--radius-sm` (18/14/9px) replace the
  scattered 2–7px values on the notebook, timetable, tool wall, map sheet,
  thumbnails, labels and the flat layout's picture.
- The flat layout is labelled by section only: no "The pavilion" kicker,
  the home list is "Sections", the menu button "Sections", the way back
  "Home", the foot of each page "Other sections", the notebook's links
  "Contact" and "Projects".
- Noto Serif SC is a 9 KB local subset of the 39 sign characters
  (`app/fonts/signs.txt`); `npm test` checks every character used is in
  it. The painting on phones is served at 1920px / quality 65 (118 KB,
  was 159) and the 3D monitors' screenshots at 1200px (was 3840).

## The overhaul (6 November 2026, evening)

- **One theme.** Monkeytype's Soaring Skies palette, as six named colours
  and a set of semantic tokens at the top of `globals.css`; the dark theme,
  its toggle, the inline theme script and the `theme` storage key are
  gone (the key is cleared on the next visit). The scenes' skies are the
  palette's blue, fog and thresholds are tinted to match, the station's
  board is indigo, and the grade pass shades toward sky instead of
  blue-green.
- **Section registry.** `app/sections/registry.ts` is the one list of
  sections; `data/world.ts`, the hard-coded tag/pin tables and the Park's
  name-tag list are gone. `/greenhouse` is an unlisted starter that proves
  a section can be added without touching navigation, the Director or the
  renderer (`docs/adding-a-section.md`).
- **Seamless arrival.** The words never wait: `--arrive-delay` is 0.08 s
  (was 1.5 s after the first page), `.arrive` is 0.28 s, the map unfolds in
  0.3 s. Camera journeys are about half as long (park → place 1.7 s, was
  2.7 s; first arrival 1.6/1.1 s, was 3.2/2 s). The painting of the park
  stands in while the world loads instead of a flat haze, and the canvas
  fades in over it. The other scenes are built in idle time
  (`requestIdleCallback`) rather than on a 3.5 s timer; the frame loop
  stops when the tab is hidden as well as when the world is off screen;
  the workshop's screenshots load on demand (the chosen project first, the
  rest when idle) and are disposed if the scene goes.
- **Trees.** The composer now renders into a 4x multisampled target
  (2x on low-power devices): before, the canvas's antialiasing never
  reached the screen because every frame went through a plain render
  target, which was the main cause of jagged silhouettes. Leaf cards use
  alpha-to-coverage with a low cut, and the leaf-cluster texture has a
  soft mass behind more, smaller leaves that fade at the rim, so a crown
  reads as a rounded painted shape. The wind shader gained a slow shared
  breath, a flutter made of two beats that never align (the 4.3 Hz sine
  looked mechanical), and gusts that lean the crown more than the trunk.
  On phones the painting drifts very slowly on its own layer, still under
  reduced motion.
- **Still to do.** Real-device checks (only Chromium emulation here);
  the three.js chunk (281 KB gz) is now the largest single asset on wide
  screens; the Noto subset must be regenerated if a sign gains a
  character (`npm test` says so).

## The world on phones (6 November 2026, night)

- The painting "plate" layout is gone: phones, portrait tablets and short
  windows draw the same 3D world as desktop, at a mobile tier
  (`detectQuality` → "mobile": dpr ≤ 1.25, MSAA 2x, 512px shadow maps, no
  brushwork, `antialias: false` on the canvas since the composer's target
  does the antialiasing, `powerPreference: "default"`). The scenes build
  at their "low" tier there. `WorldShell` no longer has a "flat" branch;
  the painting is only the no-WebGL fallback.
- Framing: on narrow screens the Director offsets the view down by 16%
  of its height (`NARROW_LIFT`), so the place sits in the upper part; the
  fov is 62 in portrait. The horizontal ±0.17 framing is for wide screens
  only. Drag-to-look is off on coarse pointers: a drag is a scroll.
- The page is a sheet (`.location-column` / `.park-sheet`): cream, with a
  grip, starting `--hero` (46svh; 38svh on short screens) down the page,
  over the world. The frame loop stops once `scrollY` passes a screen's
  height on the narrow layout, and when the tab is hidden.
- Controls: `.control-tag`, `.control-round`, the notebook's controls and
  the "read all" button are cream at 58% with a 10px blur (small shapes
  only), 80% on hover, the sky wash when pressed; bench tabs 62%, cabinets
  74%. Buttons on the sheet are outlined (indigo at 25%) over cream at
  50%. Chosen states are the ring/lamp from the UI pass; disabled keeps
  `aria-disabled` at 55%; focus is the indigo ring.
- Registry: `plate` and `tag` are gone (no painting to crop or tag); the
  home page's "Sections" list and the world's name tags (always up on
  touch screens) are the ways in.

## Vegetation remodel (10 November 2026)

Against a painterly reference (layered crowns of rounded clusters in
three value groups; grass in tufts and coherent patches). No modelling
tool was available (no Blender, no Figma), so everything is procedural
source in `world3d/vegetation/` and `geometry.ts`.

- Causes of the choppy look, measured before changing anything: crowns
  were hundreds of leaf cards each painted with ~64 small leaves of
  random colour, so they read as speckle, and the brushwork pass turned
  that speckle into unstable blotches (a 4 cm dolly changed 7.5% of a
  canopy crop's pixels by a lot); the dark inner blobs showed as smooth
  balls through the gaps; branches ended in cut stubs; the far tree belt
  was single lumpy blobs, faceted under the stepped shading; grass was
  single flat blades, each a random colour, normals forced up. Frame
  rate was not the cause (60 fps at rest on both tiers).
- Trees, bushes, the belt: lobed cluster masses with eye-facing rim
  cards, normals bent between cluster and crown, per-vertex openness to
  the sky, three colour bands chosen by the light that reaches them
  (`vegetation/shader.ts`), glow through leaves against the sun. The
  bands follow the scene's lights, and `envUniforms` (wet, snow, night).
- Grass: tufts of curved, tapered blades; noise fields for height,
  density, direction and tone; bases blend into the ground colour.
- Wind: whole clusters and tufts move on the shared clock (still view
  stops it).
- Cost (production build, same machine, back to back): park build
  380 → 151 ms (desktop 1x), trees 172 → 56 ms; Lighthouse TBT median
  1,917 → 1,459 ms mobile, 643 → 265 ms desktop; triangles per frame
  733k → 849k desktop, 347k → 442k phone, draw calls 387 → 359 and 296
  → 279; uncapped frame time unchanged within noise.
- Open: mid-distance grass still shows ground between tufts on the phone
  tier; real phones not tried; alpha-to-coverage is on only at the high
  tier (with 2x MSAA it dithered).

## Lamps and signs (11 November 2026)

Scene lighting and building signage only; layout, vegetation, interface,
content and the weather system are as they were. No modelling tool was
available (no Blender, no MCP for one), so the fixtures and signs are
procedural, in `glow.ts`, `props.ts` and `buildings.ts`, inspected in
code and from fixed-pose screenshots (`window.__pose` in `next dev`).

- **Street lamps** (`props.ts: buildLamp`). The shade is now open
  underneath: green enamel outside, a pale reflector inside, the bulb up
  in it behind a frosted lens, so the light visibly comes from inside the
  fixture. Each lamp is a `SpotLight` at the bulb aimed straight down
  (half-angle 0.62 rad, penumbra 0.85, decay 1.6, warm `#ffc98a`): a soft
  pool on paving and grass, nothing lit above the lamp. The two lamps in
  the main park view and the one by the booth cast shadows on the desktop
  tiers (512 px maps, near plane past the shade, drawn only while lit);
  the other two park lamps and every lamp on the phone tier light without
  shadows. They replace the park's two lamp point lights and the booth's.
  The additive halo sprite is gone.
- **The beam** (`glow.ts: lampBeam`). A cone mesh around the light, front
  faces only, whose shader intersects each view ray with the cone and
  sums the light the air throws back along it (8 samples, 5 on phones): a
  Gaussian across the beam, strongest just under the lens, thinning with
  distance, faded into the fog. Its edge is where the ray's path through
  the light goes to nothing, so no outline or hard circle. No time term:
  it can't pulse.
- **Signs.** Every building sign, by what it's made of:

  | Sign | Where | Treatment |
  |---|---|---|
  | 工坊  WORKSHOP | park, workshop front | lit box: the painted face glows, letters stay dark; baby-blue neon frame; blue wash on the wall |
  | 光明公园站 | park, station tower | lit box, baby-blue frame; wash on the tower and on the hall wall behind its ends |
  | 游戏厅 | park, arcade front | neon letters (emissive mask of the same text, `textures.ts: textMask`), soft pink halo, baby-blue frame, pink wash; the hum is gone |
  | 公用电话 (×4) | park and contact scene, booth roof | lit boxes |
  | 光明公园 / GUĀNGMÍNG GŌNGYUÁN | station scene, hanging sign | lit face on its own plane (the box face had cropped the texture to a mirrored corner); a warm light by it onto the canopy and platform |
  | GAME (neon tube) | arcade scene, left wall | steady (it used to drop out), its glow on the wall, its pink light stronger after dark |

  The pavilion and the workshop and pavilion interiors have no signs, so
  none were added. The vending machine, signpost, notice board and
  timetable aren't building signs and are unchanged.
- **Day, dusk, night, weather** (`Atmosphere.tsx`). Lamps follow the
  existing lamps-on curve of the night; signs come up a little earlier
  (`smoothstep(0.05, 0.8, night)`), so dusk brightens smoothly over the
  3 s blends. By day the neon is a trace (0.28 of night), lit faces 0.12,
  washes and beams off: the sun isn't overpowered. Rain, snow and mist
  (`uHaze`) make the beams a little stronger in the air, the lamps 15%
  dimmer on the ground and the washes and halos a little wider. Light
  counts are fixed per tier; only intensities change.
- **The painted bands** (`paint.ts`). The material's three light bands
  had a hard step between them, which drew rings round every local light
  (the arcade's pink wall light had one before this work too). They turn
  softly now; daylight looks unchanged.
- **Bloom.** No bloom pass was added: the grade's existing glow of bright
  pixels plus halos drawn in the signs' own shape give the glow where
  it's wanted and nowhere else, at the cost of a few small quads.

Measured (production builds, before `30e2a07` and after, alternated, 3
runs each, Chrome on an M2 with other sessions busy, so noisy; clear night):

| | before | after |
|---|---|---|
| Lights in the park's shaders | 11 point, 1 sun | 9 point, 4 spot (2 shadowed on desktop), 1 sun |
| Draw calls per frame, park | 369 desktop, 280 phone | 395, 296 |
| Uncapped frame p50, park | 20.4 ms desktop, 3.4 ms phone tier | 21.2 ms, 4.2 ms |
| Uncapped frame p50, booth | 11.1 ms, 2.9 ms | 11.0 ms, 2.9 ms |
| Capped rest fps (`trace.mjs`) | desktop 44–50 (noisy), phone 59.7–59.8 | desktop 59.8–59.9, phone 59.7–59.9 |
| First frame, desktop 1× / 4× | 898 / 2104 ms | 919 / 1911 ms |
| Longest walk-in frame, phone 1× / 4× | 150 / 283 ms | 67 / 283 ms |
| Longest frame, park → workshop, phone 1× (6 more runs each) | 67–83 ms | 67 ms (two 333/483 ms outliers in the first 3 runs didn't recur) |
| Shader compiles in a day↔night, rain, snow blend | 0 (2 for rain's first fall) | 0 (2 for rain's first fall) |
| World chunk (gzip) | 301,557 | 304,203 (budget 316,000) |

The real cost is about 0.8 ms a frame at the park on both tiers (the
four spotlights on every pixel, and the beams); everything stays at 60 fps
capped, at 1× and 4× CPU.

Open: from the main park camera the workshop and station signs are 30 to
47 m away and their letters 8 px tall, so they read as lit signs rather
than as words (the arcade's, larger, reads); the words read on the way
in and close up. Not tried on real phones or in Safari (the canvas blur
for halos falls back to shrink-and-grow where `ctx.filter` is missing).
Shots: `screenshots/lighting-{before,after}-*.jpg`; scripts:
`scripts/lighting-shots.mjs`, `lighting-perf.mjs`, `lighting-blend.mjs`.

## Neon lettering (11 November 2026)

Only the signs' words changed; faces, frames, washes, buildings, lamps and
everything else are as they were. Each building sign's words now glow as
neon (`glow.ts: neonLetters`): an additive quad the size of the face,
just in front of it, reading one mask texture made from the sign's own
text options (`textures.ts: neonMask`: red the letters, sharp; green the
letters lightly blurred, so the middle of each stroke is the hot core;
blue the letters well blurred, for a tight halo). The colour is the ink's
own hue brought up bright (`neonOf`), so the text, font, size, place and
colour identity stay. A trace by day (0.06), full at night through
`uSigns`, a little wider halo in rain and mist; no time term, so no
flicker or pulse.

| Sign | Neon | Notes |
|---|---|---|
| 工坊  WORKSHOP | amber (its brown ink) | over the lit face |
| 光明公园站 | green | over the lit face |
| 游戏厅 | pink | the board already lit the letters; this adds the core and replaces the old halo (no extra quad) |
| 公用电话 (×4) | green | one shared material and mask |
| 光明公园 / GUĀNGMÍNG GŌNGYUÁN | green, gentle (body 0.1, core 0.12, no halo) | its face is lit almost white, and stronger neon washed the small second line out |

On the lit-box faces the letters can't be much brighter than the face, so
they read by colour more than by brightness; white-hot letters (tried
first) washed into the face and were dropped.

Measured (production builds, before and after, 3 runs each, clear night,
uncapped p50; sequential, not alternated, so about ±0.8 ms of drift):
draws 395 → 401 desktop park, 296 → 297 phone, 114 → 118 / 101 → 105 at
the booth; p50 10.8 → 11.0 ms desktop park, 3.2 → 3.3 ms phone park, phone
arcade and booth unchanged (the desktop arcade interior moved 6.9 → 7.6
ms with nothing changed in it, which is the drift). World chunk 304,203
→ 305,168 gzip. No shader compiles at rest.

Shots: `screenshots/neon-{before,after}-{desktop,phone}-{workshop,station,arcade,booth,platform}-clear-{day,night}.jpg`
(fixed poses from `scripts/lighting-shots.mjs`); every sign was also
checked at dusk and in rain on both layouts.
