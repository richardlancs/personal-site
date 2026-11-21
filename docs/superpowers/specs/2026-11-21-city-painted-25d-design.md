# The 3D city as a painted 2.5D flight over Shanghai — design

Date: 2026-11-21. Owner: Richard. Branch: `shanghai` (worktree `.claude/worktrees/shanghai`).
Supersedes the scene-building parts of `2026-11-19-shanghai-cyberpunk-design.md` and the 3D plan; the 2D page, the
content rules and the interface tokens are unchanged.

## Why

The opt-in 3D city (`/city`) is live, but its scenes are built from code-generated boxes and still look plainer and
darker than the paintings they copy (mean ΔE about 15 after three tuning rounds). The camera also shakes: it follows
every mouse movement and swings on click-drag. Richard wants the 3D section to look as good as the paintings, to feel
calm, and to be impressive to a recruiter: a rooftop view over the whole cyberpunk skyline at Home, a plane flight
between places, see-through glass panels, and quick, obvious ways to move between sections.

## Goals

1. **Painted 2.5D places.** Each of the six places is its own painting, day and night, given depth so the camera can
   drift, dolly and tilt a little and the layers move against each other. It must read as rich as the paintings.
2. **Living light** over the paintings, by night and in weather: lit windows that hold steady, reflections that move
   on water and wet paving, rain and snow in front of and behind the layers, light trails of traffic, a few boats and
   aircraft lights. Calm, slow, never flickering.
3. **Home: the rooftop view.** A new painting from a rooftop high over the city, looking out and down over the whole
   skyline and the streets below, with every section's place readable in it as a sign or landmark.
4. **Plane flights between places.** Going from one place to another plays a flight: the camera lifts out of the
   place, flies over a painted aerial view of the city, banks toward the next place and comes down into it.
5. **No shake.** The mouse never moves the camera; there is no drag-to-look. At rest the camera only drifts very
   slowly by itself (desktop tiers), and not at all in still view or with reduced motion.
6. **Glass panels.** Every section's panel over the scene, and the title card, is see-through glass over the painting:
   a light tint of the soft-black panel colour over a backdrop blur, a thin bright edge, and words that carry their
   own contrast with a halo, at 4.5:1 or better over every sky.
7. **A selector that follows the view, and easy switching.** In 2D the Sections menu jumps to the 2D page's sections;
   in 3D it lists the 3D places and travels there (it already navigates within `/city`; make that unmistakable: the
   places named as places, the current one marked). Add a place dock on the 3D pages: the six places in a row along
   the bottom (wide) or a compact row (phones), plus previous/next keys and the ← → keys.
8. **A simple title card** on 3D Home: name; University of Waterloo; Honours Computer Science (Co-op); GitHub and
   LinkedIn links; Résumé that opens over the page (the existing résumé viewer); an "Email me" button (the existing
   mailto to the first address, as on the 2D page). Nothing else on the card. Clear glass, as above.

## Non-goals

- The 2D page `/` does not change (apart from the Sections menu's shared code, which must render the same there).
- No free camera, no walking, no physics. No new content; everything comes from `app/data/portfolio.ts`.
- No sound beyond the existing music button.

## Anti-goals (a failure even if it works)

- Anything that shakes, flickers, strobes or keeps moving fast; motion sickness from the flight.
- Text over busy painting without its glass and halo; text under 4.5:1.
- A slow site: `/`'s first load and budgets must not get worse; `/city` must stay within its budgets.
- Place names, Chinese or Japanese characters, invented facts.

## Constraints (carried over)

- Next.js 16 App Router, React 19, TypeScript, Tailwind 4, three ^0.186 / R3F ^9.8 already in the project. No new npm
  dependencies. No `three` reachable from `/`. First-load JavaScript for `/` and `/city` has about 1 KB of headroom:
  client components never import values from `app/data/portfolio.ts`.
- Art: painted in ChatGPT in Richard's Chrome (he asked for it again on 2026-11-21) and downloaded into the project;
  the same style as the existing plates (`docs/city/style.md`, prompts in `docs/city/prompts.md`). No other images.
- Light and weather follow Richmond Hill's clock and readings, blending day and night, as now.
- Still view (`html[data-still="on"]`) and `prefers-reduced-motion`: nothing moves, flights are cuts. Glow off under
  `prefers-contrast: more`. Everything readable without JavaScript and without WebGL (the painting stands in).
- Touch targets 44×44, no sideways scroll from 320 px, 200% text works. Same tiers (high / low / mobile) with budgets.

## Approaches considered

- **A. Painted 2.5D (chosen by Richard).** Paintings with depth; light effects in shaders; flights over a painted
  aerial map. As rich as the paintings, lighter on phones; the camera can't roam freely.
- B. Keep the code-built 3D and add detail: free camera, but stays blockier than the paintings.
- C. Hybrid: painted places with a true-3D flight between them; most impressive flights, most work, a visible change
  of style mid-journey.

## How it works (decided)

- **Renderer.** Keep three.js and R3F in the lazy city chunk (the loader, tiers, the clock/weather atmosphere, the
  store, the routes, still view, fallbacks and budgets all stay). Each place becomes a stack of textured planes or one
  depth-displaced plane per painting, rendered by a small shared "plate" shader: the painting, its depth, its light
  mask, the day/night blend, weather and glow as uniforms. The code-built scenes and kit are retired once each place
  is replaced (kept in git history only).
- **Depth.** Per painting, a grayscale depth map (near = light), painted in ChatGPT from the plate and checked by eye,
  or, where that is poor, layers cut by masks drawn as polygons in the place's data file. Which one per place is the
  builder's call, recorded.
- **Light masks** are made in code at build time from the night painting (brightness and colour thresholds, `sharp`
  is already installed) plus hand-placed regions in the place's data (water, wet paving, sky, window fields).
- **Flight.** One painted aerial view of the city (day and night), with the six places marked by coordinates in data.
  A flight is 2–3 s: lift (scale and blur out of the place), cruise over the map with a slight bank and passing cloud
  layers, descend (into the next painting). Content arrives within 0.1 s, as now; the flight plays behind it. Cuts in
  still view and reduced motion.
- **Interactive spots** (project screens, the departure board, the arcade machine, the boards at Home) are quads
  placed on the paintings in data, with the existing Hitboxes and panels: project screenshots shown on the painted
  billboards, the arcade screen live.
- **Glass** is a set of tokens beside the existing soft-black ones (`--glass-panel` tint, blur, edge, halo), measured
  by `docs/city/scripts/city3d-contrast.mjs` over every sky.

## New art (ChatGPT)

At least: the rooftop Home (day, night), the aerial flight map (day, night), and depth maps for the six places' day and
night paintings where the layered approach needs them. About 10–18 images. Each saved under `app/assets/city/` with
its prompt recorded in `docs/city/prompts.md`.

## Left to the builder

The exact layer counts, shader details, drift amplitude (small: under 1% of the view per 10 s), flight curves, the
dock's look within the glass rules, texture sizes per tier, and the order of work. Every such choice is written into
`docs/city/3d-log.md`.

## Done when

All six places and the flight are painted 2.5D on all tiers within budget; the title card, panels, selector and dock
work as above; the audits (`city3d-perf`, `city3d-contrast`, `city3d-fallback`, `city3d-keyboard`, `mobile-audit`,
`budget`, `visibility` successor) pass; `npm run lint && npm test` pass; Richard has seen each place beside its
painting at 1440 and 390, day and night, before anything is merged to `main`.
