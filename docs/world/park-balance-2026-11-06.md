# The park composed across the view, and a lighter load (6 November 2026)

Branch `park-balance`, from `main` at f38a2dc: the composition
(f5e7c07), the loading work (6d076cc), a tag tweak (77b0743), plus
this note; landed on `main` through the `integration` branch with the
other session's mobile-3d work, then the follow-up below.
Not merged, not deployed. Screenshots and the measurement scripts are in
`.playwright-mcp/park-balance/` in the worktree (not in git): `before/`
(the live site before), `after/` (this branch), `scripts/`.

## 1. The composition

Seen from the steps, four of the six places stood in the right third of
the view: the workshop, the arcade, the phone booth and the notice board.
The left had only the pavilion, and the arcade's and the booth's name
tags lay over each other at 1440px.

Now the arcade stands to the left, past the pavilion, turned a little
toward the fountain so its sign reads from the steps and clears the
pavilion's roof; the pavilion steps back a touch so it is whole in a
1440px view. Left to right the view is: the pavilion (near) and the
arcade (far), the fountain and the station's tower (middle), the notice
board, the workshop (far) and the phone booth (near).

Everything that keys off the positions moved together: the arcade's
path from the plaza, its footprint (grass and bushes keep out), the
lamp that stood on the new path, the signpost's arms, the camera's
route to its door (`scenes.ts`), the hit boxes and name-tag anchors,
and the notice board's map (`registry.ts`, `glyphs.ts`, `map/page.tsx`:
the arcade's pin, glyph and path are on the left of the sheet). The
ginkgo that stood in the sightline to the arcade moved beside the
pavilion; a zelkova fills the gap past the workshop. The painting (the
phone layout's picture) keeps its own composition.

Name tags across a 1440px view (centre x in px):

| | pavilion | arcade | station | board | workshop | booth |
|---|---|---|---|---|---|---|
| before | 325 | 1319 | 786 | 905 | 1098 | 1292 |
| after | 333 | 529 | 786 | 904 | 1098 | 1292 |

Screenshots: `before/live-home-{1280,1440,1920}.jpg` and
`after/final-home-{1280,1440,1920,2560}.jpg`, `after/final-home-1024x768-touch.jpg`
(every tag up at once, as on a touch screen), `after/final-map-1440.jpg`,
`after/draft2-arrive-arcade.jpg` (the journey's end),
`after/draft2-back-from-arcade.jpg`.

## 2. Clutter removed, and what was kept

Removed (references checked with grep and by running every route):

- `app/components/world/ShowPlaces.tsx`: a "show places" button nothing
  rendered.
- The `labels` field in `world3d/store.ts`, the `data-all` branch in the
  name tags and its CSS rule: only ShowPlaces drove them.
- `public/file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg`:
  create-next-app's samples, referenced nowhere.

Looked at and kept, with the reason:

- `/greenhouse`: the unlisted starter section (docs/adding-a-section.md).
  It costs nothing at runtime.
- The Places menu, the notice board's map and the signpost all point at
  the same places: the menu is the plain, keyboard way; the map and the
  signpost are the park's. None is decoration.
- `ui/Notice.tsx` and `ui/Points.tsx` are used (not-found, error, about,
  greenhouse).
- The music button and the hero's haze: one control, one readable sky.

## 3. Tools and plugins

The stack first: Next 16.4 on Turbopack, React 19, three 0.186 with
React Three Fiber 9, Tailwind 4, hosted on Vercel. No downloaded 3D
assets: every model and texture is generated in code, so model and
texture optimisers (gltf-transform, Basis/KTX2, Draco) have nothing to
work on.

| Candidate | Bottleneck it addresses | Already covered? | Decision |
|---|---|---|---|
| `next analyze` (built into Next 16, Turbopack) | what the 445 KB of JS is | yes, built in | run once as an audit (`npx next analyze`; output in `.next/diagnostics/analyze`, not committed). The park page's client code, minified and before gzip: Next and React 295 KB, three.js 182 KB, React Three Fiber 51 KB, the world's own code about 45 KB, the stylesheet 11 KB, a 38 KB legacy polyfill that only `nomodule` browsers fetch. Nothing unexpected and nothing to drop without dropping a feature (screenshot `after/analyze-home.jpg`) |
| knip (unused files/exports) | dead code | no | blocked by this session's permissions; the audit was done by hand with grep and by running every route |
| `@next/bundle-analyzer` (webpack) | same as above | superseded | not for Turbopack builds; not adopted |
| next/image AVIF/WebP, `qualities` | screenshot and painting bytes | yes, in `next.config.ts` | nothing to add |
| `next/font/local` | fonts (102 KB) | yes, five Latin files and a 9 KB sign subset | nothing to add |
| Brotli and immutable caching of `/_next/static` | transfer, repeat visits | yes, both: the live chunks (`/_next/static/immutable/chunks/…` in Next 16) come back `content-encoding: br` and `cache-control: public,max-age=31536000,immutable` | nothing to add. (An earlier probe that said `max-age=0` had fetched the wrong URL, a 404 page; a `vercel.json` rule added on that reading was removed again) |
| Lighthouse CI / Unlighthouse | regression checks | partly: the Playwright scripts in `.playwright-mcp/*/scripts` | not adopted; no CI pipeline to put it in, and the lab scripts measure what matters here (first frame, words, draws) |
| `@react-three/drei` / `postprocessing` | convenience | no | not adopted; the two custom passes are 150 lines and would cost more bytes than they save |

Conclusion: nothing worth installing. The gains were in the site's own
code.

## 4. Loading: what was measured, and what changed

Measured on this machine (production builds, Chromium headless with
software GL, 1440×900, nothing else running; both builds served locally
and measured in the same session). Headless software rendering makes
frame rates meaningless here, so the per-frame numbers are draw calls,
not fps. The "before" is `main` at f38a2dc; for the per-stage build
times a copy of the composition commit with the same timing marks was
built and measured alongside.

Where the time went: 524 draw calls a frame in the park (every bush two
meshes, every window its own plane), a park build of 0.7–1.5 s on the
main thread, of which the first text sign alone cost about 0.28 s
(painted before the fonts had loaded, the browser hunted its own fonts
for every Chinese character, then painted it again), and the other five
scenes prebuilt in idle time from the first moment, which stalled the
walk-in and, on a deep link, built the park before the page's own scene.

Changes (commit 6d076cc):

- Bushes merged by palette; the buildings' windows, frames, roof teeth
  and clock faces one mesh each.
- Leaf cards written straight into one buffer instead of hundreds of
  plane geometries merged per tree; the grass loop stops allocating.
- Text textures wait for the fonts, then paint once.
- The other scenes are built only once the camera has arrived, park
  first.
- Under `prefers-reduced-motion` the frame loop runs on demand: no
  frames while nothing changes, a few when the address, the choice, the
  pointer or the fountain changes.
- A `world:first-frame` mark, `world:<scene>`, `park:<stage>` and
  `tex:<name>` measures on the performance timeline, for the next person.

Results, the park page (`/`):

| | before | after |
|---|---|---|
| transferred | 608 KB, 37 requests | 609 KB, 38 requests |
| JavaScript (gzipped) | 445 KB | 445 KB |
| words visible | 93 ms | 95 ms |
| name tags usable (camera arrived) | 3.61 s | 3.17 s |
| script time, first 5 s after load | 2.30 s | 1.92 s |
| JS heap after load | 34 MB | 23 MB |
| draw calls a frame | 524 | 403 |
| park build (best of three) | 707 ms | 475 ms |
| of which the buildings and their textures | 198 ms | 65 ms |
| of which the trees | 240 ms | 174 ms |
| of which the bushes | 53 ms | 33 ms |

A deep link to `/projects`: before, the park (0.7–1.1 s) was built
before the workshop, so the first picture came after both; after, the
workshop is drawn first (first frame at 0.79 s) and the park follows
once the camera has arrived. Under reduced motion: 0 draw calls over
2 s at rest (before: continuous rendering), and hover, journeys and the
fountain still draw their frames.

Unchanged, honestly: the bytes. three.js is the bulk of the 445 KB and
is the feature. The 1.6 s walk-in before the name tags appear is the
park's arrival (the primary pass's design) and was left alone; the
words are readable from 95 ms.

## 5. Verified

- Every route by direct visit (`/`, `/about`, `/projects`, `/experience`,
  `/interests`, `/contact`, `/map`, `/greenhouse`, a 404), then back,
  back, forward.
- The park at 1280×720, 1440×900, 1920×1080, 2560×1440 and 1024×768
  with touch (every tag up at once; no two tags overlap, measured).
- Hover lights the arcade and raises its tag; a click on the building
  reaches `/interests`; Escape walks back; the pavilion the same to
  `/about`; a tap on a touch screen reaches `/interests`.
- Keyboard: Tab reaches the six name tags after the controls; Enter on
  the arcade's goes to `/interests`.
- Reduced motion: zero frames at rest, navigation and hover intact.
- `npm run lint`, `npm test` (14), `tsc --noEmit`, `next build`; no
  console errors on any route (the 404 page's own 404 aside).
- The phone layout was not re-measured: the other session's branch
  (mobile-3d) replaces it.

## Follow-up (the two items left open)

- Far grass (28% of the blades, the taller ones beyond 22 units) is now
  built with the far scenery in the idle step after the first frame
  instead of before it. The grass stage of the build drops from about
  127–150 ms to 109–120 ms; screenshots through the walk-in (0.3, 0.9,
  1.6 and 2.6 s after the first frame, `polish/walkin-*.jpg`) show no
  visible pop-in.
- "The arcade's interior shows the station's tower": not so. A dev-mode
  screenshot taken mid-journey (StrictMode runs the camera planner twice
  there) was read as the arrival. In the production build the journey
  is: the park at 1 s, the swap behind the threshold at 2 s, inside the
  arcade facing the cabinets from 3.5 s (`integration/arcade-journey-*.jpg`).
  Nothing to change.

## Open

- The per-stage build numbers vary by ±30% run to run on this machine;
  the direction is consistent, the exact figures are not.
