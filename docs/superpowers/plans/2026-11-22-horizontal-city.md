# The horizontal city: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan
> task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the vertical page and the 3D city with one horizontal journey along a continuous painted Shanghai,
the six sections living in its streets.

**Architecture:** A sticky full-screen stage; its track (the panorama tiles plus the six stops) moves sideways with
the page's own vertical scroll (CSS scroll-driven animation, rAF fallback). The page height equals the track's width.
Content panels sit on the street in dark glass. A metro-line map at the foot is the selector.

**Tech Stack:** Next.js 16.4 App Router, React 19.3, TypeScript, Tailwind 4, `next/image`, sharp (scripts only).

**Spec:** `docs/superpowers/specs/2026-11-22-horizontal-city-design.md`. Reel notes:
`.superpowers/sdd/2026-11-22-horizontal-city/insta-report.md`.

## Global Constraints

- No `three`, `@react-three/*`, `postprocessing` anywhere; `/city` and `/city/:path*` redirect (temporary) to `/` or
  the section's anchor.
- No new runtime dependencies. Content only from `app/data/portfolio.ts`; section names from the registry's `title`.
- No scroll-jacking: never `preventDefault` on wheel/touch/keys that scroll; no smoothing of wheel input.
- Contrast ≥ 4.5:1 for every word over every sky (`docs/ui/scripts/city-contrast.mjs`, `glass-contrast.mjs`).
- Still view and `prefers-reduced-motion`: no parallax, no animated jumps (jumps cut), nothing moving on its own.
- Touch targets ≥ 44×44 px, 8 px apart; no text under 12 px; body 16 px on phones; no sideways overflow of the page
  outside the track; safe-area insets cleared.
- `homeInitialJs` ≤ today's reading + 3,072 bytes gzip and never above 200,848; the first panorama tile ≤ today's
  home plate bytes at `HOME_QUALITY`.
- The owner's "unslop" list (spec, Sources 6) holds on every screen.
- Never push `main`; merge only on Richard's explicit yes.

## Review Focus

1. A mouse wheel, a trackpad, Space/PageDown/arrow keys, the scrollbar and a touch swipe all travel the city, and
   none ever gets stuck inside a stop (test: scripted wheel and key travel reaches Contact and back to Home).
2. `/#projects` (and every anchor) loaded cold lands on that stop, and Back/Forward restore the position.
3. Resizing or rotating mid-journey keeps you at the same stop (page height and position recomputed).
4. A panel taller than the screen (200% text, a phone on its side, an opened project's details) scrolls inside
   itself and its scrolling never moves the city.
5. With JavaScript off, or no scroll-driven support plus script failure, the page reads top to bottom.

---

### Task 1: remove the 3D city (in progress; brief `remove-3d-brief.md`)

Done when: no 3D code, deps or tests; `/city*` redirects; the vertical page unchanged; gate green.

### Task 2: the track engine with today's plates as a stand-in

**Files:** Create `app/components/city2d/CityTrack.tsx` (client: sets page height from the track's width with a
ResizeObserver, rAF fallback when `CSS.supports("animation-timeline: scroll()")` is false, anchor and key handling),
`app/components/city2d/trackMath.ts` (pure), `app/city-track.css` (imported by `city.css` or the layout). Modify
`app/page.tsx`, `Station.tsx`, `DistrictBand.tsx` (becomes a stretch of the panorama), `useSection.ts`.
Test: `tests/city-track.test.mjs`.

**Interfaces — produces:**
- `trackMath.ts`: `stopOffsets(widths: number[]): number[]`, `scrollYForStop(i: number, offsets: number[],
  viewportW: number): number`, `stopAt(scrollY: number, offsets: number[]): number`, `parallax(x: number, depth:
  number): number` (depth 0 = moves with the street, 1 = fixed).
- `<CityTrack>` wraps the six `<Station>`s; `data-track="on"` on `<html>` when the horizontal mode is live (set
  before first paint by a head script when JS runs and the viewport is ≥ 320×400; otherwise the vertical fallback).

- [ ] Tests for `trackMath` (offsets add up; `stopAt(scrollYForStop(i)) === i` for every stop and viewport; parallax
  bounds) and a source test that `CityTrack` adds no `wheel`/`touchmove` listener that calls `preventDefault`.
- [ ] Implement; stops are one viewport wide except Projects and Experience (content decides).
- [ ] `ArrowLeft`/`ArrowRight` (when focus is not in a field or a scrolling panel) and `Home`/`End` go to the
  previous/next/first/last stop via `scrollTo` (instant in still view).
- [ ] Anchors: on load and `hashchange`, scroll to the stop; the Sections menu and the progress use `stopAt`.
- [ ] Look at 1440×900, 390×844, 844×390 with the six plates side by side; commit.

### Task 3: the continuous panorama (art; needs Richard's OK to download from ChatGPT)

**Files:** `docs/city/concepts/panorama/*` (originals), `app/assets/city/panorama/{day,night}-{01..NN}.webp`,
`scripts/city-panorama.mjs` (join with feathered overlap, colour-match the seams, cut tiles, write
`app/components/city2d/panorama.ts` with tile sizes and each stop's x range), prompts in `docs/city/prompts.md`.
Test: `tests/city-panorama.test.mjs` (tiles exist for day and night, same count and sizes, stop ranges ordered and
covering the whole width, seam check: mean ΔE across each joint below the image's own neighbouring-column ΔE × 2).

- [ ] Paint six segments day (16:9 each, one horizon line and eye level across all, a dark street/river walk across
  the lower third), each prompt given the previous segment's right third to continue; then each night version from
  its day image. Look at the joined strip before going on.
- [ ] The script and the tiles; swap them into `DistrictBand`'s replacement; the first tile is the home stop.

### Task 4: the stops' layouts

**Files:** `sections/{Hero,About,Projects,Experience,Interests,Contact}.tsx`, `city.css` (panel styles), `Station.tsx`.

- [ ] Panels: dark glass on the street, `--radius-lg` outside, inner radius = outer − padding, max ~42rem, left in
  the stop with the next stop's city visible to the right (closure). Panels taller than the stage scroll inside.
- [ ] Hero: the name on its own backing, school and programme from `profile`, ONE primary action ("View projects"),
  GitHub / LinkedIn / Résumé / Email as text links.
- [ ] Projects: one panel per project in a row along the towers (not identical: the cover leads, alternating
  cover side or size), the index as the stop's first panel, Skills after; `<details>` expands inside the panel.
- [ ] Experience: a timeline drawn along the metro line, one station per role.
- [ ] Interests and About: points, photos where present. Contact: the best-lit stop, copy-email success moment.
- [ ] Arrivals: content settles once per stop as it comes into view (sideways), different per stop; none in still view.

### Task 5: the metro-line map and navigation

**Files:** `ProgressLine.tsx` → the map at the foot (six stations, the current lit, a link each), `SectionsMenu.tsx`
(jumps along; the city dims behind it; grows from its key), `TopBar.tsx` (no 3D key).

- [ ] The map's stations are links (44 px targets), `aria-current="location"` on the current; on phones dots with
  the current name beside.

### Task 6: sky, weather and depth over the whole panorama

**Files:** `citySky.ts`, `WeatherOverlay.tsx`, `lib/cityLook.ts` (unchanged maths), the stage CSS.

- [ ] Day/night/dusk blend across all tiles (only tiles near the screen loaded); one weather layer over the stage
  (not one per stop); a sky layer behind the panorama moving at parallax depth ~0.7; the faint ground texture.

### Task 7: gate, docs and review

- [ ] `npm run lint && npm test && npx tsc --noEmit`; build; smoke; `budget.mjs`; `mobile-audit.mjs` (updated for the
  track: the journey's stops instead of a page scroll); `city-contrast.mjs`; `glass-contrast.mjs`; `lighthouse.mjs`
  (`/` LCP, CLS); the Review Focus scripts.
- [ ] `CLAUDE.md` rewritten for the horizontal city; `docs/city/style.md` gains the panorama.
- [ ] A read-only UX review against the spec and the reels' list; fixes; screenshots for Richard. Merge on his yes.
