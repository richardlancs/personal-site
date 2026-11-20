# Shanghai cyberpunk redesign: design

19 November 2026. Branch `shanghai`, worktree `.claude/worktrees/shanghai`.
Nothing here touches `main` until Richard approves the finished result.

Lines marked **(call)** are choices Claude made that Richard has not
explicitly agreed to. Everything else is what he asked for.

## Intent

The overgrown park feels unrelated to Richard's interests and to the
software jobs he is applying for. The site becomes a near-future Shanghai:
a city that reads as technical, current and his. It must still do the
portfolio's job first: a recruiter finds the name, the projects and the
contact links in seconds.

## Goals

1. A **2D version, on by default**, for every visitor and every screen:
   fast, accessible, web-friendly. Each section is set against a different
   part of Shanghai, painted, without the art overpowering the words.
   Projects sit inside these sections.
2. A **3D version, opt-in by a toggle**: a detailed, interactive city of
   the same districts, with each section's text in panels over the scene
   the way the park's pages work today.
3. **Time of day and weather stay live** in both versions (Richmond Hill's
   clock and reading, as now): the scenes change with them.
4. Built in a separate folder; `main` is only updated on approval.
5. ChatGPT is used for the visual design (concept frames and the 2D
   paintings), as it was for the intro film's start frame.

## Non-goals

- New content. Every word still comes from `app/data/portfolio.ts`;
  nothing about Richard is invented.
- A new intro film. The park film is removed with the park. **(call)**
- A light theme or a theme switch. **(call)**: one dark interface; the
  scenes carry day and night.
- Remembering the 2D/3D choice between visits. **(call)**: 2D is always
  the default, as asked; 3D is one click away.

## Anti-goals (a failure even if it works)

- Art, glow or motion that makes the text harder to read or the page slow.
- A generic "hacker" look: green terminal text, glitch effects, scanlines
  over content.
- 3D code or weight reaching visitors who never ask for 3D.
- The two versions looking like two different sites.
- Orientalist cliché. The city is modern Shanghai drawn with care (real
  landmarks, real street furniture), not lanterns and dragons.

## Constraints

- Stack unchanged: Next.js 16.4 App Router, React 19.3, TypeScript,
  Tailwind 4, three r186 + React Three Fiber 9.8, npm.
- New dependencies, 3D chunk only **(call)**: `postprocessing` 6.39 and
  `@react-three/postprocessing` 3.2 for bloom. No drei unless a specific
  helper earns it. No dependency is added to the 2D version.
- 3D models and textures stay generated in code from fixed seeds. No
  downloaded or AI-generated 3D models (licence terms are unclear).
- Text contrast 4.5:1 or better everywhere. Glow never counts toward
  contrast and is dropped under `prefers-contrast: more`.
- `prefers-reduced-motion`: no parallax, no rain animation, no camera
  travel; still images and instant cuts.
- The responsive guarantees in `CLAUDE.md` (44px targets, no sideways
  scroll, safe-area insets, 200% text) carry over and are re-audited.

## Approaches considered

1. **One city defined in code, drawn twice** (SVG for 2D, meshes for 3D).
   Lightest, cannot drift, live weather is cheap; but the 2D look is flat
   and graphic.
2. **Painted 2D, separately built 3D.** ChatGPT paints each section's
   scene; the 3D city is built to match by eye. Richest 2D look; costs
   heavier pages, a risk of the two versions drifting, and weather/time
   that must be layered over paintings.
3. **3D first, 2D as stills rendered from it.** Perfect match; but the
   default version waits on the whole 3D build and needs ~100 images.

**Richard picked 2.** Its costs are handled below: an image budget, a
shared style sheet both versions are tuned to, and day/night plates with
weather drawn over them.

He also pointed at `https://ryansaini.vercel.app/match` as a feature to
borrow: one long 2D page holding every section, a themed index of the
sections under the hero, a small scroll-progress widget in the corner, and
a "3D tour" button in the top bar. That is the model for the 2D version.

## The city: one district per section **(call)**

The same six districts appear in both versions. Final framing is settled
by the concept frames (phase 0), which Richard reviews.

| Section | District | What it shows |
|---|---|---|
| Home | Lujiazui from the Bund | The full skyline across the Huangpu: Oriental Pearl, Shanghai Tower, Jin Mao, the World Financial Center |
| About | A longtang lane | Shikumen houses, one lit upstairs window, laundry poles, the towers behind |
| Projects, Skills | Lujiazui, street level | The three towers from below; each project a lit screen on a building |
| Experience | An elevated metro station | Platform, departure board (the timetable carries over), a train passing |
| Interests | Nanjing Road | The neon shopping street; the arcade machine carries over |
| Contact | The Bund promenade | The Customs House clock, the river, a kiosk with the phone line |

Wayfinding motif **(call)**: a metro line. Each section is a station;
the corner progress widget is a line diagram showing where you are, and
the section index under the hero is the list of stops. This replaces the
park's notice-board map (`/map` is removed).

Chinese appears only on signs inside the art and the 3D scene, never as
content. Real content stays English HTML.

## The 2D version (default)

**Routes.** `/` is one long page with every section in order: hero,
About, Projects (with Skills), Experience, Interests, Contact. Each has an
anchor (`/#projects`). The old addresses (`/about`, `/projects`,
`/experience`, `/interests`, `/contact`) redirect to their anchors so
existing links keep working. **(call)**

**Layout.** Each section opens with its district as a wide band of art,
fading into the page's dark ground; the content sits below or beside it on
solid dark panels. No text is ever set on the painting itself, except the
hero's name, which gets its own measured backing. Projects stay the most
prominent content: full-width cards with screenshot, summary, features,
technologies, links.

**The art.** For each district ChatGPT paints one composition twice: a
**day plate** and a **night plate** (the night one made as an edit of the
day one so buildings line up). All twelve share one written style
description and palette, kept in `docs/city/style.md`, so the set is
consistent.

- Format: AVIF with WebP fallback, widths 800/1600/2400, each plate about
  120 KB at 1600. Only the hero's plate is loaded eagerly; the rest load as
  their section nears the screen.
- A visitor normally downloads one plate per section (day or night). Both
  are fetched only during the dawn and dusk blends.

**Time of day.** The existing sun calculation picks the blend: day plate,
night plate, or a cross-fade of the two through dawn and dusk, with a
colour grade over it (warm at golden hour, blue at blue hour) from the
same 16 "looks" the atmosphere code already defines.

**Weather.** Drawn over the plates, in CSS and one small canvas:
- cloudy: a haze layer, lower contrast, the tower tops fading out;
- rain: streaks, a wet sheen and smeared reflections of the lights along
  the bottom of the band;
- snow: slow flakes and a pale wash;
- no reading: the neutral look, as today.
Reduced motion gets the tints and haze but nothing moving.

**Interface.** Dark ink-navy ground, off-white text, and three restrained
neon accents (a cyan, a magenta, an amber) used for edges, chosen states
and large display type only, never body text. Exact values come from the
concept frames and are checked for contrast. The glass buttons and their
states carry over, restyled dark. The time-and-weather readout and the
Sections menu stay in the top bar, joined by the **3D city** button.

**Type** **(call)**: a squared technical display face (Rajdhani or
similar, OFL) for headings; Nunito stays for body text. Decided against
the concept frames.

**Accessibility.** Semantic landmarks and one `h1`, headings in order,
skip link, visible focus, all art `alt=""` (decorative) with the district
named in text, keyboard reachable everything, no information by colour
alone.

## The 3D version (opt-in)

**Routes** **(call)**: the 3D city lives under `/city` (`/city`,
`/city/projects`, …), one address per district, so 3D pages are real,
deep-linkable URLs and none of their code is in the 2D bundle. The
**3D city** button on `/` goes to the district matching the section in
view; **2D view** in the city goes back to that section's anchor. The
button is hidden when WebGL is missing; `/city` then shows the 2D page.

**What carries over from `world3d/`:** the canvas shell and renderer tiers
(desktop / mobile), camera travel between places, the page-to-scene store,
the atmosphere driver (time and weather), still view, the arcade machine
and its logic, the weather readout.

**What is replaced:** the painted material, vegetation, oak signs and
torches, and all six scenes. In their place:
- towers as instanced blocks with shader-drawn windows that light up by
  hour, the four landmarks built by hand from primitives;
- neon signs and screens as emissive surfaces with bloom (desktop tiers
  only; phones get a cheaper glow sprite);
- wet streets with a low-resolution planar reflection, fog that thickens
  with the weather, rain and snow from the existing precipitation code;
- moving detail that holds still in still view: a metro train, river
  traffic, blinking aircraft lights.

**Interaction:** click a district's sign to travel there, drag to look
(desktop), click a project's screen to open it, play the arcade machine.
Each district's text appears in panels over the scene, using the existing
location components (workbench, timetable, cabinets, notebook, payphone)
restyled.

**Matching the 2D.** Each scene's default camera is framed like its
painting, and its palette is tuned to `docs/city/style.md`. A script
(the film-compare one, repointed) measures colour distance between each
3D view and its plate.

## What happens to the rest

| Today | After |
|---|---|
| Park, workshop, station, arcade, pavilion, booth scenes | Replaced by the six districts |
| Intro film and `public/intro/` | Removed |
| `/map` and the notice board | Removed; the metro line replaces it |
| Weather and time readout, Open-Meteo credit | Kept, restyled |
| Music toggle | Kept |
| Résumé viewer | Kept, restyled |
| Section registry | Kept; gains each section's district and anchor |
| Tests that enforce the old rules (no dark theme, no CJK, palette) | Rewritten to enforce the new ones |
| `CLAUDE.md` design sections | Rewritten when the work is merged |

## How it gets built

Phases, each ending in something Richard can look at:

0. **Concept.** Style description, palette, and one concept frame per
   district from ChatGPT. Richard reviews before anything is built on it.
1. **2D foundation.** Tokens, type, top bar, hero with its plates and
   live time/weather. Review.
2. **2D complete.** All sections, plates, weather overlays, redirects,
   audits (contrast, mobile, keyboard, performance budget). Review.
3. **3D city.** Shell reuse, city kit, six scenes, panels, bloom tiers.
4. **Checks.** Lint, tests, build, mobile audit, contrast, a UI review and
   a 2D-vs-3D colour comparison.
5. **Hand-over.** Richard looks at the worktree's site. Only on his yes is
   `shanghai` merged into `main` and `CLAUDE.md` updated.

Subagents do scoped pieces (art direction, 2D sections, 3D kit, each
scene, review), each owning its own files. Shared files (`globals.css`,
the registry, `package.json`, `layout.tsx`) are edited by the lead session
only.

ChatGPT is driven in Richard's Chrome under his account. He will be asked
before images are downloaded.

## Settled after the builder's review (all **(call)**)

1. **2D content is written out.** Every section shows all its content in
   the page, as today's phone layout does: no bench tabs, page turns or
   cabinets to operate. The location components are rebuilt as plain 2D
   ones. The arcade game is not playable in 2D; Interests are cards, with
   a link to play in the 3D city.
2. **Six stations, not seven.** Skills is part of Projects (as in the
   registry): one band, one plate, `/#skills` an anchor inside it, and no
   `/city/skills`.
3. **The 3D city is one compressed riverside.** Home looks across the
   river at all six districts, squeezed together so each one's sign is
   visible and clickable, as the park's places are from its steps. Each
   district is still its own scene the camera travels into. The
   visibility script is kept and repointed.
4. **Chinese on signs.** The 3D scene uses a fixed, short list of real
   place names and plain shop words, checked before use, drawn from one
   OFL Chinese face subset to just those glyphs (a few tens of KB, in the
   3D chunk only). The paintings are prompted for signage without legible
   writing; a plate with garbled characters is regenerated or has them
   painted out. No Chinese font is loaded in 2D.
5. **If the plates fall short.** Upscaling and cropping are fine. If a
   night plate won't line up with its day plate, night is made in code
   instead: the day plate graded dark, plus a painted mask of lights.
6. **Performance budget for 2D** (mid-range phone, 4G): largest paint
   within 2.5 s, no layout shift, first view under 600 KB in all, and no
   more client JavaScript than today's flat layout ships before the world
   loads. No three.js request on `/`.
7. **3D on phones.** The button is offered wherever WebGL works. Phones
   get the mobile tier (no bloom, no drag-to-look) with the page as a dark
   sheet over the lower part of the screen, replacing the cream one.

## Left to the builder

- Exact palette values, display typeface and plate compositions (settled
  in phase 0 against the frames).
- Component and file structure inside `app/components/city2d/` and
  `city3d/`.
- How the weather canvas is implemented.
- Camera positions, tower counts and per-tier quality settings.
