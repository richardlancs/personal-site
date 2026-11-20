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
