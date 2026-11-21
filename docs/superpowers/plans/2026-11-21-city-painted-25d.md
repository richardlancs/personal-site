# The 3D city as painted 2.5D — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the code-built 3D scenes under `/city` with painted 2.5D places, a rooftop Home, plane flights over a painted aerial map, a still camera, glass panels, a place dock and a simple title card.

**Architecture:** Keep the lazy three.js/R3F city chunk and everything around it (CityShell, tiers, store, routes, atmosphere, still view, fallbacks, budgets). A new kit module draws a place as its day and night paintings on depth-displaced or layered planes with light masks, all as uniforms of one shared shader. Each place is a data file (`districts/<id>.def.ts`) plus a thin component. The Director flies between places over one aerial painting.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, three ^0.186, @react-three/fiber ^9.8, `sharp` (already installed) for build-time masks, node:test.

**Spec:** `docs/superpowers/specs/2026-11-21-city-painted-25d-design.md`

## Global Constraints

- Work only in the `shanghai` worktree; never push, never touch `main`; merge only on Richard's yes.
- No new npm dependencies. No `three` reachable from `/`. `/` must not change (render and first-load size).
- First-load JS for `/` and `/city` within `docs/audit/scripts/budget.mjs` limits (about 1 KB headroom): client components never import values from `app/data/portfolio.ts`.
- Images: only ChatGPT paintings saved under `app/assets/city/` (prompts in `docs/city/prompts.md`), masks generated from them by code, and the existing project screenshots. No text painted in or drawn in the scene except the five section names and content from `app/data/portfolio.ts`; no place names; no Chinese or Japanese characters in `app/`.
- Materials only through kit factories with `materialKey()`; fixed seeds; no `Math.random`; uniforms for day/night/weather so nothing recompiles; light counts constant.
- Still view (`html[data-still="on"]`) and `prefers-reduced-motion`: nothing moves, flights cut. Glow off under `prefers-contrast: more`. Content readable without JS and without WebGL.
- The mouse never moves the camera; no drag-to-look. Rest drift only on desktop tiers, under 1% of the view per 10 s.
- Text 4.5:1 or better over every sky (`docs/city/scripts/city3d-contrast.mjs`); targets 44×44 with 8 px apart; no sideways scroll from 320 px; 200% text works.
- Tier budgets in `app/components/city3d/tiers.ts: TIERS` (high 300 draws / 1.2M tris / 128 MB / 12 ms; low 220 / 700k / 96 MB / 9 ms; mobile 150 / 350k / 48 MB / 8 ms).
- Every subagent runs on Opus 5.5; briefs passed as files; commits by path ending `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`; nobody kills the dev server on 3101; production builds on 3100 without deleting `.next`.

## Review Focus

1. A flight interrupted by another choice (click a dock key mid-flight): it turns toward the new place from wherever it is, never jumps back, never stacks.
2. Weather and time changing while a place shows: the day/night blend and rain cross-fade with no shader compile and no flash.
3. Phones in portrait: the painting framed on its subject above the sheet, the dock reachable with a thumb, nothing under 44 px.
4. Glass panels over the brightest day sky and the busiest night neon: words stay 4.5:1 with their halo.
5. Lost WebGL context or no WebGL2 mid-flight: the painting stands in, the panel and dock still work, no layout shift.

---

### Task 0: The art (lead, in ChatGPT via Chrome; runs beside Tasks 1–2)

**Files:** create `app/assets/city/rooftop-{day,night}.webp`, `app/assets/city/aerial-{day,night}.webp`, `app/assets/city/depth/<id>-{day,night}.webp` for every place; modify `docs/city/prompts.md`.

- [ ] Paint the rooftop Home: from a high rooftop over the city at night, looking out and down over the whole lit skyline, river and streets below, the five section places readable as landmarks; then the same view by day, matching composition. Style per `docs/city/style.md`, 16:9, no text, no place names.
- [ ] Paint the aerial map: straight down / steep oblique over the whole city with the river and the six places spread across it, night and day, matching.
- [ ] Depth maps: for each painting (six places × day/night), a grayscale depth map of that exact image (near light, far dark). Check each against its painting; record any that are poor so Task 4–9 cut layers by polygons instead.
- [ ] Convert to webp (`sharp`, long edge 2560 for paintings, 1024 for depth), record prompts, commit.

### Task 1: The plate engine and a still camera (subagent)

**Files:** create `app/components/city3d/kit/plate.ts`, `app/components/city3d/PlatePlace.tsx`, `scripts/city/make-masks.mjs`, `app/assets/city/masks/` (generated), `tests/city3d-plate.test.mjs`; modify `app/components/city3d/City3D.tsx` (remove pointer parallax and drag-look; add rest drift), `app/components/city3d/scenes.ts` (the `PlaceDef` type), `package.json` (`"city:masks"` script only).

**Interfaces:**
- Produces, in `scenes.ts` (no three.js):
  ```ts
  export type Quad = [V3, V3, V3, V3]; // in the painting's plane, metres
  export type PlaceDef = SceneDef & {
    plate: {
      painting: string;               // asset id, e.g. "lujiazui" -> <id>-{day,night}.webp
      aspect: number;                 // width / height
      depth: { kind: "map"; strength: number } | { kind: "layers"; layers: { mask: [number, number][]; z: number }[] };
      regions: { kind: "water" | "wet" | "sky" | "glass"; poly: [number, number][] }[]; // uv polygons
      spots: Record<string, Quad>;    // interactive quads: "screen-0", "board", "machine", sign ids
      drift: { amplitude: number; period: number }; // rest drift, desktop tiers only
    };
  };
  ```
- Produces, in `kit/plate.ts`: `plateMaterial(opts: { painting: string; quality: Quality; depth: PlaceDef["plate"]["depth"] }): THREE.ShaderMaterial` through `materialKey()`, uniforms `uDay`, `uGlow`, `uRain`, `uWet`, `uTime`, `uHour`; `buildPlate(def: PlaceDef, quality: Quality): { group: THREE.Group; dispose(): void }`.
- Produces `PlatePlace` (`SceneComponent`): renders a `PlaceDef` with its Hitboxes on `spots`.
- Consumes: `SceneProps`, `useLive`, `Hitbox`, `anchors`, the atmosphere's uniforms (`kit/uniforms.ts`).

- [ ] Write failing tests: `PlaceDef` shape validated for a fixture; `make-masks.mjs` pure threshold function returns the expected mask for a 4×4 fixture; source-level checks that `City3D.tsx` has no `pointermove` camera code and no `s.yaw` drag, that drift is skipped when `holdingStill()` or `quality === "mobile"`, and that `plateMaterial` goes through `materialKey()`.
- [ ] Implement; prove it on the existing `lujiazui` painting with a gradient depth placeholder at `/city` (dev), day and night, high and mobile tiers; measure draws/tris/texture MB/p95 with `?perf`.
- [ ] `npm run lint && npm test && npx tsc --noEmit`; commit.

### Task 2: Glass panels, the title card, the dock and the selector (subagent; parallel with Task 1)

**Files:** modify `app/components/city3d/CityPage.tsx`, `app/city/city-pages.css`, `app/components/city2d/sections/Hero.tsx` (the `where="3d"` branch only), `app/components/city2d/SectionsMenu.tsx`, `app/city.css` (glass tokens block only); create `app/components/city3d/panels/PlaceDock.tsx`; tests `tests/city3d-glass.test.mjs`.

**Interfaces:**
- Produces CSS tokens `--glass-panel`, `--glass-blur`, `--glass-edge`, `--glass-halo` and class `.city-panel` as glass; `.place-dock` with six `Link`s (registry order, `aria-current` on the current one), previous/next links, ← → keys (not while typing, not with modifiers).
- Title card (3D Home): `profile.name` as `h1`; "University of Waterloo" and "Honours Computer Science (Co-op)" from the education entry in `portfolio.ts`; GitHub, LinkedIn (`ProfileLinks`); Résumé via `ResumeLink`; "Email me" mailto to `profile.emails[0]`. Nothing else.
- SectionsMenu on `/city/*`: heading "Places in 3D", each entry that place's `/city` page, current marked; on `/` unchanged.

- [ ] Failing tests: the 3D Home card renders exactly those six things from data (no literal strings for the facts); dock order equals the registry; menu on `/` renders identically to HEAD (snapshot of the server HTML of the menu); glass tokens exist and `.city-panel` uses `backdrop-filter`.
- [ ] Implement; run `node docs/city/scripts/city3d-contrast.mjs http://localhost:3101` (240 combinations, ≥ 4.5:1) and `node docs/ui/scripts/mobile-audit.mjs` on `/city/*`.
- [ ] Gate; commit.

### Task 3: The flight (subagent; after Tasks 0 aerial art and 1)

**Files:** create `app/components/city3d/flight.def.ts` (aerial painting, the six places' map coordinates), `app/components/city3d/Flight.tsx`; modify `City3D.tsx` (the Director's travel segments only); tests `tests/city3d-flight.test.mjs`.

**Interfaces:** `flightPlan(from: SceneId, to: SceneId): { lift: number; cruise: number; descend: number; path: [number, number][]; bank: number }` (pure, seconds and map uv); total 2–3 s; interruptible from any point.

- [ ] Failing tests: `flightPlan` durations sum within [2, 3]; path starts at `from`'s map point and ends at `to`'s; still view and reduced motion produce a cut; an interruption mid-cruise starts the new plan at the current point.
- [ ] Implement lift (scale/blur out), cruise over the aerial plate with cloud layers and a bank, descend into the next place; content arrives within 0.1 s as now.
- [ ] Gate; commit.

### Tasks 4–9: The six places (one subagent each, in parallel; after Tasks 0 and 1)

One task per place: Home (`lujiazui` → rooftop painting; its sign spots are the five sections), Projects (`towers`: screenshots on the painted billboards' quads), Experience (`metro`: the departure board quad), Interests (`nanjing-road`: the arcade machine's screen quad, live), About (`longtang`), Contact (`bund`: the clock face quad).

**Files (each):** rewrite `app/components/city3d/districts/<id>.tsx` (or `Riverside.tsx` for Home) as a thin `PlatePlace` wrapper; rewrite `districts/<id>.def.ts` to `PlaceDef`; update `tests/city3d-<id>.test.mjs`. Nothing else.

- [ ] Failing test: the def validates; every focus key the panel writes has a spot; spots lie inside the painting.
- [ ] Build the depth (map or layers), regions, spots, light (living light per the spec: steady windows, moving reflections on water/wet regions, rain, traffic trails, boats or aircraft lights where the painting has them).
- [ ] LOOK: `?frame=plate` beside its painting, day and night, at 1440×900 and 390×844, panel showing; iterate.
- [ ] Gate (lint, tsc, the place's tests); per-tier `?perf` figures inside budget; commit.

### Task 10: Retire, measure, document (subagent; after 3–9)

**Files:** delete the unused code-built kit modules and their tests (list each, after a search proves nothing imports them); modify `docs/audit/scripts/budget.mjs` (new texture figures), `docs/city/scripts/*` (visibility for painted spots), `docs/city/3d-log.md`, `CLAUDE.md` (the 3D section).

- [ ] Full Task 19 gate of the old plan on a fresh production build: lint, test, tsc, smoke, budget, city3d-perf, city3d-fallback, city3d-keyboard, mobile-audit, lighthouse (`/city` LCP), contrast. Fix failures at their cause.
- [ ] Commit.

### Task 11: Review and checkpoint (lead)

- [ ] Dispatch read-only UI/UX and accessibility reviewers (Opus); fix Important findings.
- [ ] **CHECKPOINT:** Richard sees every place beside its painting, day and night, at 1440 and 390, and a flight recording; merge to `main` and deploy only on his yes.
