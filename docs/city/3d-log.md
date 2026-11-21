# The 3D city: measurements and decisions

The plan: `docs/superpowers/plans/2026-11-19-shanghai-3d.md`. The task
ledger (dispatches, cuts, checkpoints):
`.superpowers/sdd/2026-11-19-shanghai-3d/progress.md`.

## $PARK

`$PARK = de8564004684c90cb88b2da03fae98c88ab13dd9` (`de85640`, "fix: the two
halves of the motion work, fitted and within budget"), the last tree with
the park's code. Later tasks read park files from it with
`git show $PARK:<path>`.

## Task 1: the park retired (20 November 2026)

Budgets before the moves (`node docs/audit/scripts/budget.mjs` after
`rm -rf .next && npm run build`, at $PARK):

| budget | gzip bytes | limit |
|---|---|---|
| homeInitialJs | 199,485 | 200,848 |
| totalJs | 205,120 | 214,000 |
| totalCss | 10,485 | 10,760 |
| resumeJs | 447,951 | 470,000 |
| resumeCss | 1,853 | 2,500 |

After the moves: homeInitialJs **199,389** (96 B less), totalJs 205,024,
totalCss 10,485, resumeJs 447,951, resumeCss 1,853; no three.js on `/`
(0 of 17 chunks). Task 2's gate: homeInitialJs at most 199,389 + 1,000 =
**200,389**.

Moved as they were (`git mv`, imports fixed): `world3d/still.ts` →
`app/lib/still.ts`; `world3d/atmosphere/param.ts` → `app/lib/skyParam.ts`;
`world/StillViewToggle.tsx` → `city2d/`; `world3d/{store,anchors,idle,rng,environment}.ts`
and `world/flat.ts` → `city3d/`; `locations/selector.ts` → `city3d/panels/`;
`world3d/scenes/{arcadeLogic,arcadeMachine}.ts` → `city3d/arcade/`;
`world3d/{textures,glow}.ts` → `city3d/kit/`;
`world3d/atmosphere/{looks,state}.ts`, `DevSkyPanel.tsx` → `city3d/atmosphere/`.
Everything else under `world3d/`, `world/`, `locations/` and `app/globals.css`
deleted. The registry lost its `scene` field. `tiers.ts` imports
`FLAT_QUERY` from `./flat.ts` (its stand-in constant is gone).

Tailwind: `app/city.css` has `@source not "./components/city3d"`, so the
3D code's class names never grow `/`'s stylesheet. The other side of that:
Tailwind utilities written in `city3d/` files are not generated at all.
The city's own interface needs plain classes in a stylesheet the
`/city` layout imports (or classes the 2D code already uses).

## Task 8: the landmarks (noted from its report)

Weakest: Jin Mao, from far. Its identity in the plates is the fine rhythm of the stepped tiers, the fluted corners and a crown of pinnacles; at 1.2 k triangles the far level keeps only a straight shaft with small eave ledges and a stepped gold crown, so its silhouette reads "tiered pagoda-like tower" but not as clearly as the other three. The Shanghai Tower's 120° twist is also subtle in silhouette (the outline is a slightly convex taper); the twist shows through the notch's spiral line and the bands, so it depends on shading and the window shader. The Pearl and the opener are unmistakable even in flat grey.

## Task 2: the /city addresses and the switch (20 November 2026)

- Five static page files plus `app/city/page.tsx`, each `<CityPage id>`:
  the section's plate (DistrictBand) where the scene will be, and one
  panel with its h1, its 2D content, the link back and the credit. Wide
  landscape: the plate fixed behind, the panel on the left; phones and
  portrait: the plate a 46svh band, the panel a sheet. `/city/skills` is a
  404. `noindex, follow`, canonical `/`.
- The switch: "3D city" (only with WebGL2, `html[data-webgl2]`, never
  prefetched, to the section you're reading) / "2D view" (always). In the
  bar from **80rem**; below that, the first entry of the Sections menu.
  `bar-fit.mjs` against `bar-baseline.json` (320–1920 every 16px, plus 390,
  830, 1440, and 200% text at 320×900, 390×844, 844×390): the bar is as
  tall as before at every width, and the same on `/city/projects`.
- Budgets after: homeInitialJs **199,679** (Task 1's 199,389 + 290; gate
  200,389), totalJs 205,750, totalCss (what `/` links) 10,521, cityCss
  (only `/city/*`) 572 / 2,000, resumeJs 447,951, resumeCss 1,853; no
  three.js on `/`. `budget.mjs` now measures `/`'s linked CSS as totalCss
  and the city's own stylesheet (`app/city/city-pages.css`) as cityCss.
- The `linear()` spring was cut (the cubic-bezier stays): the 2D page's
  CSS budget had no room for the switch otherwise.
- Known until Task 3: on `/city/<section>` the h1 is followed by the
  sections' h3s (no h2); the sections use viewport breakpoints, so a
  half-width panel at 1440 gets their wide layouts in about 720px.

## Task 12: Home, the riverside (20 November 2026)

- Built from the kit (Riverside.tsx); the composition is data in
  `districts/lujiazui.def.ts: RIVERSIDE`. Production build, `?perf`, the
  Home pose at night, headless Chrome uncapped (relative figures):
  high 127 draws, 155k tris, 38 programs, ~10.4 MB textures, p50/p95
  4.1/6.6 ms (1440×900, planar river); low 95 draws, 80k tris, 38
  programs, 9.9 MB, 2.9/4.8 ms; mobile (390×844, DPR 1.25) 75 draws, 44k
  tris, 35 programs, 3.0 MB, 2.6/3.0 ms. All inside the tier table; no
  cut (the planar reflection, the ferry, the train and the warning lights
  all stay).
- Windows light by floors (lib/cityWindows.ts: windowScore); the evening's
  share peaks at 0.5, not 0.75; about one lit window in eight is cool.
- visibility.mjs: 0 problems over 10 views × 6 skies. Boards' words on the
  rendered picture, bloom on: 14.0–14.1:1 at 1440 (high), 12.5–13.4:1 at
  390 (mobile). Home panel's text over the lit skyline: 6.18:1 at least
  (the colophon's muted text).
- Sizes: homeInitialJs 199,820; cityInitialJs 200,848 (at its limit: the
  pickers' data now comes from the server, which took /'s first load back
  from 203,829); city3dChunk 298,767; city3dJs 310,914; Save-Data figure
  0.4 MB.

## Task 12, second pass: Home composed as the painting (20 November 2026)

- Layout (lead's call): the boards move off the skyline onto the near
  landing, low in the frame, each word backed by the water; the camera
  rises to 60 m and looks a little up (home pos [0, 6, 14]), the waterline
  at about 69% of the height; the landmarks spread as in the paintings
  (bearings -5°, +6°, +11°, +16.5°); the skyline is three layers of
  instanced towers across the whole far bank (450 asked for). The section
  vignettes (lane houses, viaduct and train, facades, clock tower, walkway
  ring) are gone from Home. Portrait screens widen the lens until the band
  holds the skyline and the boards (`portrait.cover`, `lift`).
- Production, `?perf`, night, every frame drawn (headless, relative):
  high 117 draws, 199k tris, 40 programs, 10.9 MB, p50/p95 4.0/6.4 ms;
  low 80, 102k, 40, 10.3 MB, 2.8/4.2 ms; mobile (390×844) 63, 66k, 36,
  3.5 MB, 2.2/2.8 ms. No cut.
- The ferry is the only mover; the warning lights stand steady (their
  blink is cut: it would keep the canvas drawing every frame at Home).
  The loop draws only while the ferry is in view (common.tsx: useMovers).
- Windows: FLOOR_WEIGHT 0.86, the evening's share peaks at 0.4, 1 in 14
  cool. Landmarks' lit parts are `litSurface` (shaded by day, a soft glow
  after dark).
- Sizes: homeInitialJs 199,429; cityInitialJs 199,820 (1,028 B of room):
  the panel's behaviour and pickers moved into the chunk loaded after the
  page is up (CityAfter.tsx), and the sections' summaries and metadata
  moved out of the registry into server-only app/sections/metadata.ts.
- visibility.mjs: 0 problems, 10 views × 6 skies; board words 14.1:1
  (1440, bloom on) and 13.0–13.5:1 (390); panel text ≥ 6.18:1.

## Task 19: audits and fallbacks (20 November 2026)

Scripts (all in the repo; raw output in `.superpowers/sdd/2026-11-19-shanghai-3d/task19/`):
`docs/city/scripts/{city3d-perf,city3d-fallback,city3d-keyboard,city3d-contrast,plate-compare}.mjs` (new);
`budget.mjs` scans the routes `/` links to; `lighthouse.mjs` takes several URLs and holds `/city*` to
LCP ≤ 2.5 s and CLS 0; `mobile-audit.mjs` and `responsive-shots.mjs` take the six `/city` pages. The
park's scripts are gone (lighting-shots, lighting-perf, lighting-blend, film-compare, world visibility,
intro-contrast, panel-contrast, ui-shots, trace, motion, matrix).

- **Rendering** (production, `?perf`, clear night, each place's resting pose, 5 s every frame forced,
  headless, relative). Draws / triangles / texture MB showing / programs / p50 / p95 ms:

  | Place | high | low | mobile (390×844, DPR 2) |
  |---|---|---|---|
  | Home | 185 / 692k / 10.3 / 100 / 4.0 / 7.5 | 120 / 350k / 10.3 / 99 / 2.7 / 5.0 | 100 / 243k / 3.5 / 40 / 2.1 / 3.2 |
  | Projects | 64 / 151k / 10.9 / 96 / 3.8 / 6.5 | 64 / 151k / 7.7 / 95 / 3.0 / 4.5 | 50 / 99k / 3.0 / 33 / 2.5 / 2.8 |
  | Experience | 68 / 132k / 4.6 / 97 / 4.1 / 6.5 | 68 / 132k / 4.6 / 96 / 3.8 / 6.4 | 57 / 69k / 2.2 / 37 / 2.5 / 3.0 |
  | Interests | 67 / 166k / 1.7 / 97 / 4.1 / 6.6 | 66 / 166k / 1.7 / 95 / 2.9 / 5.9 | 57 / 105k / 1.7 / 34 / 2.5 / 3.0 |
  | About | 60 / 107k / 0.3 / 92 / 4.1 / 6.7 | 60 / 107k / 0.3 / 91 / 2.9 / 5.4 | 47 / 70k / 0.4 / 24 / 2.5 / 2.8 |
  | Contact | 105 / 402k / 0.7 / 100 / 4.2 / 7.8 | 75 / 248k / 0.7 / 99 / 2.9 / 6.4 | 64 / 171k / 0.7 / 40 / 2.5 / 3.2 |

  All inside every tier's budget (300/220/150 draws, 1.2M/700k/350k triangles, 128/96/48 MB, p95
  12/9/8 ms). `/`: no response holds WebGLRenderer and no WebGL context is made, wide and on a phone,
  after scrolling to the foot and hovering and focusing "3D city".
- **Blends compiled shaders (fixed).** The first rain of a visit compiled the drops' program, and in
  Interests (high) and Home (mobile) a window and a glow program compiled at the first rain or night:
  the warm-up compiled each place in a scene with no sun or sky light, so the programs' light counts
  didn't match the frame's. `Warm` (City3D.tsx) now compiles against the scene itself, every other
  place hidden, with the weather's drops (`Precipitation.tsx: precipWarmers`). After: 0 shaders over
  clear day, rain at night, snow by day, clear dusk and clear night, every place, high and mobile.
  Still view: 0 frames in 6 s, every place, high and mobile, but for the one frame a turning minute
  draws (the store's hour carries the minutes; the lit windows and Contact's clock follow it). Fewer
  programs too: high 100 → 85, mobile 40 → 13–22 (the old warm-up's unmatched variants are gone).
- **Layout shift on the drawing path (fixed).** The pickers' slot kept one row's height, but the row
  takes two or three on phones and two on wide screens for Projects and Experience; and a phone's Home
  gained its row of keys once the canvas chose it. CLS 0.009–0.053 per page, on every visit. Now the
  slot holds an unseen, inert copy of the row (`panels/PickerGhost.tsx`) and the narrow layout keeps
  the keys' room from the start: 0 on the drawing path, wide and phone.
- **Bundles** (`budget.mjs`): homeInitialJs 199,421 / 200,848; cityInitialJs 199,811 / 200,848;
  city3dChunk 308,943 / 330,000; districtChunk 10,756 / 32,000; city3dJs 369,398 / 480,000; totalJs
  205,056 / 214,000; totalCss 10,607 / 10,760; cityCss 1,605 / 2,000. No three.js in what `/` loads
  (17 chunks) or in what a prefetch of its two linked routes could fetch (12 chunks).
- **Save-Data figure**: 1.1 MB (`SAVE_DATA_MB`): city3dJs 369,398 plus Projects' five cover
  screenshots, 729,031 as served from `public/projects/`; every other texture is drawn in code.
- **Keyboard** (`city3d-keyboard.mjs`, 1440×900 and 1024×768): a fresh load focuses nothing; from
  /city 14–19 Tabs reach each place's sign tag, Enter lands on its page with focus on its h1, Escape
  returns with focus on Home's h1. All pass.
- **Contrast** (`city3d-contrast.mjs`, next dev, 6 pages × 20 skies × 2 sizes): lowest top bar 6.02:1,
  panel 6.09:1, foot 6.21:1, keys 14.72:1. The sign tags carry no visible words (the boards' painted
  names are their labels), so none are measured. Palette: 23/23 pass.
- **Visibility** (next dev): 0 sign problems, 0 page errors.
- **Bar** (`bar-fit.mjs` against `docs/city/bar-baseline.json`): as tall as before at every width,
  and the same on /city.
- **Plates** (`plate-compare.mjs`, next dev, ΔE76 over a 6×3 grid; a measure, not a gate): mean 15.2
  over twelve renders; Home 10.0 night / 9.4 day; Projects 16.2 / 18.7; Experience 11.3 / 16.2;
  Interests 14.6 / 15.2; About 18.3 / 17.2; Contact 16.0 / 19.5. Every place but Experience at night
  is darker than its painting (ΔL −2.9 to −9.8).
- **Largest paint on /city (improved, still over).** Lighthouse mobile: 5.2 s median, the band's
  painting waiting for hydration. Each /city page now paints its band's plate before the scripts (an
  inline script after the band, `lib/platePreload.ts: cityPlateScript`, the very file the band's
  `<img>` asks for, set on that band alone): /city 2.83 s, /city/projects 3.28 s (target 2.5 s);
  desktop 0.72 / 0.73 s. What's left is the simulated 4× CPU working through /city's first load and
  the 3D chunk (TBT 0.5–2.8 s); `/` is 2.93 s in the same run (the round-2 open item).
- **Layout shift left** (Lighthouse and `city3d-fallback.mjs`): the top bar's time-and-weather capsule
  moves when its reading arrives (0.0002–0.02; the same component on `/`); where the city falls back
  after the page has painted (no WebGL2, a lost context, Save-Data on Home), the pickers' room or
  Home's row of keys changes once: 0.010–0.075 per page. Not fixed: it needs the decision before
  first paint.
- **Mobile audit** (every width, 200% text, `/` and the six `/city` pages): one failure found, fixed:
  "Experience" at 320px with 200% text ran 50px past the screen; section titles now cap at 13vw as the
  2D titles do. Then 0 failures, 0 warnings.
- **Fallbacks** (`city3d-fallback.mjs`): every page, every case (no WebGL, lost twice, Save-Data,
  no JavaScript), wide and phone, shows its h1, content and band with no console errors; three.js is
  not fetched under Save-Data before the press; JavaScript off: CLS 0 on all twelve.
- **Cuts**: none in this task (the aircraft lights' blink and Projects' fisheye remain as before).
