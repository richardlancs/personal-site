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
| `world3d/geometry.ts` | tubes with tapering radius, sagging wires, lumpy blobs, recursive trees (zelkova, ginkgo, maple, pine), leaf cards, bushes, ivy, instanced grass, path ribbons |
| `world3d/props.ts` | bench (one with a school bag), lamp, utility pole and wires, vending machine, phone booth (door, receiver, cord, light), bicycle with basket, swing, fountain with water shader, notice board with notices, signpost, dust, sunbeams, sky dome with clouds, falling and fallen leaves |
| `world3d/buildings.ts` | pavilion, sawtooth-roof workshop, station with clock tower, arcade, the empty city, hills, railings |
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
  reused, water ripples, dust in the sun, the booth's light catching now and
  then, the arcade sign's hum, the notice board's map lifting when you look.
- Workshop: monitors switch on (a bright line opening into the picture) with
  the real screenshots; dust in the window light.
- Station: timetable flaps turn over when a line is chosen; the broken name
  sign swings on its last chain; tapping the clock makes its hand try to move.
- Arcade: each cabinet plays a small game about its interest while it's on; the
  neon buzzes and drops out.
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
