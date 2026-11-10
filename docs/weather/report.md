# Richmond Hill weather, daylight, the name and the vegetation (10 November 2026)

What was built on `feature/richmond-hill-weather` (base `3e4933f`), how it
was checked, what's still open, and which tools were actually used.

## What it does

- **The display.** A chip by the corner controls: "Richmond Hill,
  Ontario", the local time with AM/PM, the temperature in °C, an icon and
  the condition. On phones it is a row of its own under the bar. Its
  details (a popover) give the observation and update times, sunrise and
  sunset, a stale note when the reading is old, and the Open-Meteo credit
  (CC BY 4.0). Everything is always for Richmond Hill, in
  `America/Toronto`; no geolocation is asked for.
  `components/weather/WeatherClock.tsx`, `WeatherIcon.tsx`, `clockText.ts`.
- **The data.** `GET /api/weather` asks Open-Meteo for the configured
  coordinates (verified once, `data/weather.ts`): the current temperature,
  WMO code, cloud cover and `is_day`, and each day's sunrise and sunset,
  as Unix seconds. It is cached on the server for 15 minutes and shared by
  every page and visitor (`"use cache"`, revalidate 900 s). A failed
  refresh keeps serving the last good reading; a timeout (4.5 s) or a
  malformed answer is never stored. `lib/weather.ts`, `api/weather/route.ts`.
- **The clock.** One timer at each minute boundary, separate from the
  weather: a tick never fetches and never draws the world. Toronto's
  midnight recomputes the day's sun (and fetches only if the reading
  doesn't cover the new date); daylight saving is the platform's
  (`Intl`), never a hand-written offset. `lib/time.ts`,
  `components/weather/useRichmondHill.ts`.
- **States.** Loading (blanks the size of what's coming, no numbers),
  fresh, stale (after 45 minutes: shown with an "as of" tag), and
  "Weather unavailable" (no reading, or one over 3 hours old). Nothing is
  ever made up.
- **The world.** `world3d/atmosphere/`: four weather looks (clear, cloudy
  and fog, rain, snow) plus a neutral fallback, chosen by WMO code
  (drizzle, rain, freezing rain and thunderstorms look like rain and keep
  their own labels; snow codes look like snow; never from temperature),
  and four times of day (dawn, day, dusk, night) from the clock and the
  day's sun, combined independently. They adjust the existing lights, sky,
  fog and materials (wet, snow on upward faces, lit windows and lamps at
  night) over 3 s, without remounting the world or touching navigation;
  the first state after load is applied at once. Rain and snow are
  instanced strokes in a box around the camera, thinned on phones, kept
  off the introduction and the controls; no lightning. "Clear" at night,
  "Sunny" by day, by the same sun the scene uses.
- **Still view and reduced motion.** The weather and the light stay; the
  blends are instant, and rain and snow hold still at half density.
- **The name.** Indigo Shippori Mincho on a soft cream backing, with a
  hand-drawn sky-blue brushstroke (brushed in once, 0.7 s; no pulsing, no
  animated letter-spacing). Still selectable text and the page's h1. Under
  dark skies the introduction sits on a contained sheet of the site's
  paper instead of the daytime haze.
- **The vegetation.** Remodelled as procedural meshes in
  `world3d/vegetation/` and `geometry.ts`: canopies of cohesive rounded
  clusters with outward-bent normals and a three-band light / mid /
  deep-teal shading from the scene's real light, believable tapered
  branches, a clustered far tree belt; grass as tapered, curved blades in
  overlapping clumps and coherent patches, roots blending into the ground,
  per-clump wind on the world's wind clock. They respond to the weather
  (wet, snow, overcast and rain mute the colour) and to night. The
  autumn identity stays: the red maples and the ginkgo keep their hues
  with the reference's value structure.
- **Development only.** A preview panel (bottom-left in `next dev`) and
  `?sky=<preset>-<phase>[-progress]` for every combination; neither is in
  the production build (checked in the built chunks).

## Validation (final build, `a2de40a` plus this report)

| Check | Result |
|---|---|
| `npm run lint`, `npx tsc --noEmit` | clean |
| `npm test` | 64 passed (16 smoke checks skipped offline) |
| `SMOKE_URL=… npm test` (production build) | 80/80 |
| `npm run build` | succeeds; every page static, `/api/weather` revalidating every 15 min |
| `npm run perf:budget` | within budget: world chunk 301,542 / 316,000 gzip, page JS 200,005 / 210,000, CSS 17,043 / 18,000 |
| `docs/audit/scripts/matrix.mjs` | 261/261: every route at 320–1920, landscape, 200% and 400% zoom; keyboard; focus never hidden; reduced motion; no WebGL; slow load; blocked clipboard; failed audio and images; rapid navigation |
| `docs/audit/scripts/motion.mjs` | 29/29 (still view, interrupted journeys) |
| `docs/weather/scripts/chip-layout.mjs` | 100/100: the chip doesn't move as any kind of reading arrives (5 sizes × 4 readings × 2 pages); the controls stay in the corner on phones |
| `docs/weather/scripts/sky-sheet.mjs` | all 16 combinations on `/` (desktop and phone) and `/experience`, no page errors: `screenshots/sheet-*.jpg` |

Checked by the independent QA agent on the production build with
Playwright's fake clock and request routing: midnight rollover (11:59 PM
→ 12:00 AM, the next day's sun, a fetch only when needed); the fall-back
(1:59 → 1:00 AM) and spring-forward (1:59 → 3:00 AM) changes; a page left
open overnight; minute ticks making no weather requests and no WebGL draws
in still view; 503, HTML error pages, malformed and truncated JSON and
aborted requests all showing "Weather unavailable"; a stale reading
labelled; no WebGL, blocked fonts and music, reduced motion; the server
cache (same `fetchedAt`, `x-nextjs-cache: HIT`); composited contrast at
8 skies × 4 sizes (the name 8.88:1 at worst, intro text 7.54:1, the
chip's condition 5.97:1). It also did one pass in a real Chrome window
through Claude in Chrome. Its four should-fix findings were fixed and
re-verified: the controls drifting from the corner on phones, "Sunny"
following `is_day` instead of the sun, no timeout on the browser's
request, and the chip shifting when a long condition arrived.

Open-Meteo answered slowly now and then during testing (one probe hung
for 10 s); the uncached development server then showed "Weather
unavailable", which is the intended behaviour. In production the
15-minute cache keeps serving the last reading through that.

## Performance

Measured on production builds with the audit's scripts (`trace.mjs`,
3 runs, 1× and 4× CPU, desktop and the phone tier; `lighthouse.mjs`).

- **Vegetation** (before → after): park build 380 → 151 ms (desktop 1×),
  1,149 → 489 ms (phone tier 4×); first frame 1,069 → 868 ms; longest
  walk-in frame 233 → 167 ms (950 → 433 ms at 4×); Lighthouse TBT mobile
  1,917 → 1,459 ms, desktop 643 → 265 ms; rest 60 fps on both tiers. More
  triangles (733k → 849k desktop) in fewer draw calls (387 → 359), with
  uncapped frame times unchanged within noise. Edge stability in a camera
  dolly: canopy pixel change 10.7 → 2.3 (mean), large changes 7.5% → 1.5%.
- **Weather and daylight:** rest 59.6–59.9 fps in default, rain-night and
  snow-day skies on desktop and the phone tier at 1× and 4× CPU; first
  frame and journeys within the earlier range. Snow cover was made cheaper
  after it cost frames at 4× (40.5 → 59.5 fps).
- **Bundle:** the world chunk grew 288.6 → 301.5 KB gzip; the budgets
  were reset from measured sizes with ~5% headroom. Loading rain and snow
  on demand was measured and rejected (it saved 2.5 KB for the rare rainy
  visit and cost every visit 1.8 KB).

## Screenshots (`screenshots/`)

- Before: `before-desktop-home.jpg`, `before-phone-home.jpg`.
- After: `after-desktop-home-{clear-day,clear-dusk,cloudy-dawn,rain-night,snow-day}.jpg`,
  `after-phone-home-{rain-day,snow-night}.jpg`.
- Every combination: `sheet-desktop-home.jpg`, `sheet-phone-home.jpg`,
  `sheet-desktop-experience.jpg` (weather down, time of day across).
- Vegetation, same camera poses before and after:
  `vegetation-{before,after}-{desktop-trees,desktop-grass,mobile-home}.jpg`.
  The reference image was the user's attachment; it isn't copied here.
- The display with a long condition: `display-{desktop,phone}-long-condition.jpg`.

## Open

- Not tested on real phones, in Safari or Firefox, or with VoiceOver or
  NVDA (Chrome on an M2 with emulated phones; announcements checked as
  roles, names and states).
- Vercel's ISR wasn't exercised: if Open-Meteo is down while a build runs,
  `/api/weather` becomes dynamic until the next deploy, with only a
  per-instance memory cache. The one-hour expiry path wasn't waited out.
- The chip's accessible name changes each minute; some screen readers may
  re-read a focused button when its name changes.
- Vegetation, compared with the reference: silhouettes are rounder and
  more regular than the painted ones; mid-distance grass on the phone
  tier still shows ground between tufts; phone-tier triangles are up 27%.
- Precipitation is drawn after the brushwork without a depth test, so a
  drop can cross a nearer object (hard to see at its alpha).
- The introduction has two treatments: the haze by day, a paper sheet
  under dark skies.

## Who did what, and the tools actually used

Four specialist agents worked in parallel in their own git worktrees
against shared contracts (`lib/sky.ts`, `data/weather.ts`, the world
store's `sky`, `world3d/environment.ts`), then an independent QA agent
reviewed the integrated branch; the coordinator integrated, resolved
conflicts and fixed the QA findings.

| Workstream | Agent | Tools and skills used |
|---|---|---|
| Weather data, caching, time zones | W | Next.js docs in `node_modules/next/dist/docs`; Open-Meteo geocoding (once) and forecast APIs; a mock upstream counting requests; Playwright (own headless Chrome) |
| Display, name, accessibility | U | `frontend-design` skill (direction for the chip and the name's brush, critique from screenshots); `design:accessibility-review` skill (contrast, focus over dark skies, targets, reflow); hand-authored SVG icons on a 24-unit grid; Playwright screenshots and composited-contrast measurements |
| Weather presets, daylight, precipitation | S | `design:design-critique` on the 4×4 sheets (found milky rain, dawn ≈ dusk, washed-out snow); procedural shaders and geometry in the existing renderer; Playwright sheets, pixel probes and `trace.mjs` |
| Vegetation | V | `design:design-critique` against the reference over 8 iterations; procedural meshes and GLSL in `world3d/vegetation/`; Playwright with fixed camera poses and a frozen wind clock; `trace.mjs`, `lighthouse.mjs`, a GPU draw-call probe |
| Browser testing and visual review | QA | Playwright (fake clock, request routing, no WebGL, reduced motion); Claude in Chrome (one real-browser pass); `design:design-critique`; `design:accessibility-review` |

Not available, and so not used: Blender or any 3D-modelling integration
(not installed, no MCP), so the vegetation is procedural source rather
than modelling files; Figma (needs the owner's login); claude.ai's design
sync (only through a session the owner starts); any raster image
generator. The Playwright MCP browser was held by other sessions, so
every agent drove its own headless Chrome through
`docs/audit/scripts/pw.mjs`.
