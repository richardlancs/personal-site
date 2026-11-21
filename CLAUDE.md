# Personal Portfolio — Claude Code Instructions

## Project Purpose

This is Richard's personal portfolio website.

The site is intended to:
- present my background professionally
- showcase software projects
- support software engineering internship/co-op applications
- link to my GitHub, LinkedIn, resume, and contact information
- evolve over time as I build more projects and gain experience

Do not invent personal information, projects, work experience, skills,
achievements, contact details, or education details.

If information is missing, use a clearly labeled placeholder or ask me.

---

## Tech Stack

- Next.js 16.4 with the App Router (read `AGENTS.md`: this Next.js
  differs from older versions; its docs are in `node_modules/next/dist/docs/`)
- React 19.3, TypeScript, Tailwind CSS 4, npm
- three r186, React Three Fiber 9.8 and `postprocessing` 6.39, for the 3D
  city only
- `pdfjs-dist` (pinned, loaded on demand) for the résumé viewer

Do not replace the stack unless I explicitly ask. Avoid new dependencies;
nothing new may reach the 2D page. Prefer built-in Next.js, React, CSS and
Tailwind functionality.

Deployed by Vercel from `main` on every push: never push `main` without my
explicit yes.

---

## Project Structure

- `app/page.tsx`: the 2D site, one page (`/`), six stations in order
- `app/layout.tsx`: root layout (fonts, the head scripts, top bar,
  résumé host, sky driver, glass press)
- `app/city.css` (tokens and the 2D page), `app/motion.css`,
  `app/reveal.css`; the 3D city's own rules in `app/city/city-pages.css`
- `app/data/portfolio.ts`: all content. `app/data/weather.ts`: the place
  the clock and weather follow
- `app/sections/registry.ts`: the sections (id, anchor, title, district,
  `/city` address); `app/sections/metadata.ts`: their words and page
  metadata, server only
- `app/components/city2d/`: the 2D page (`Station`, `DistrictBand`,
  `TopBar`, `ProgressLine`, `SectionsMenu`, `ViewSwitch`, `WeatherOverlay`,
  `CityDriver`, and `sections/` with one component per section)
- `app/components/city3d/`: the 3D city (below)
- `app/components/weather/`, `components/resume/`, `components/ui/`
  (`GlassPress`, `Arrivals`, `Colophon`), `components/MusicToggle.tsx`
- `app/lib/`: pure logic (time, sun, sky, weather, still view, plate
  preload, city routes, the `CITY3D_LIVE` switch)
- `app/assets/city/`: the twelve plates, `<district>-{day,night}.webp`
- `public/`: résumé, project screenshots, interest photos, music, share card
- `tests/`: `npm test` (node's test runner, offline; `smoke.test.mjs` runs
  only with `SMOKE_URL`)

Prefer reusable components over growing `page.tsx`. Keep content in
`app/data/`, separate from components.

---

## Design Direction

A near-future Shanghai, technical, current and calm, that still does the
portfolio's job first: a recruiter finds the name, the projects and the
contact links in seconds. Source documents: the spec
`docs/superpowers/specs/2026-11-19-shanghai-cyberpunk-design.md`, the
style sheet `docs/city/style.md` (palette, type, how the plates are
painted; the prompts in `docs/city/prompts.md`), and for the 3D city the
plan `docs/superpowers/plans/2026-11-19-shanghai-3d.md` and the log
`docs/city/3d-log.md`. Where the spec and later rulings differ (no
magenta, no Chinese signs), the code and `style.md` win. `docs/world/` is
the retired park's history, not current instructions.

### The 2D page (default, live)

`/` is one long page: Home, About, Projects (with Skills at `/#skills`),
Experience, Interests, Contact, numbered 01 to 06. Each section is a
station under a band painted with a different part of the Shanghai
skyline (`DistrictBand.tsx`, plates in `app/assets/city/`, made from
ChatGPT paintings with `scripts/city-plates.mjs`). The band is 21:9 wide
and a 4:3 crop under 768px; its foot fades into the ground through
`--seam`. Only the home band's plate loads early (`HOME_QUALITY` 60, a
head script paints it before hydration: `lib/platePreload.ts`); the rest
load as they near the screen.

Words never sit on the paintings, except the hero's name on its own dark
backing. Districts are never named anywhere a visitor reads or hears.

Light and weather follow Richmond Hill: the hour and that day's sunrise
and sunset pick the day plate, the night plate, or a cross-fade with a
warm or cyan grade at dawn and dusk (`lib/cityLook.ts`); cloudy, rain and
snow are drawn over the band in CSS and one small canvas
(`WeatherOverlay.tsx`, at most 30 frames a second, nothing moving in
still view). No reading means the neutral look. In `next dev` only,
`?sky=` (e.g. `?sky=clear-dusk-0.5`, `lib/skyParam.ts`) previews a sky.

The old addresses (`/about`, `/projects`, `/experience`, `/interests`,
`/contact`) redirect to their anchors, `/map` to `/`, all temporary
(`next.config.ts`).

### The 3D city (`/city`, open on the live site)

`/city` and `/city/{projects,experience,interests,about,contact}`
(`app/city/`, `app/components/city3d/`). Home is a riverside looking over
the water at five signs; each section is its own scene the camera travels
into (`districts/<id>.tsx` with its data in `districts/<id>.def.ts`; the
riverside is `Riverside.tsx`). Each page is real HTML first: the band,
one `.city-panel` with its `h1`, the section component with `where="3d"`,
a link to the same section on the 2D page, and the credit; readable without JavaScript or WebGL.
Pages are `noindex`, canonical to the 2D page.

Open to visitors (since 2026-11-21, at my request) through
`app/lib/city3dLive.ts: CITY3D_LIVE` and the same test in
`next.config.ts`. **To close it again without a code change**: set
`NEXT_PUBLIC_CITY3D=off` for Production in the Vercel project and
redeploy; then there is no "3D city" key or link and `/city*` redirects
to `/` (`tests/city-panel-fit.test.mjs` pins the switch's code).

The pieces:
- `CityShell.tsx` probes WebGL2, handles a lost context ("Restart the 3D
  city", the fallback after a second loss), waits under Save-Data ("Load
  the 3D city (about N MB)", `tiers.ts: SAVE_DATA_MB`), and lazy-loads
  `City3D.tsx` (canvas, Director, warm-up, frame loop) only while a
  `/city` route shows. Fallback everywhere is the band's plate.
- `tiers.ts` picks the renderer tier (`TIERS`; `?tier=high|low|mobile`
  works in production) and steps high down to low once if slow.
- `kit/`: the shared building kit (towers, windows, surfaces, neon,
  signs, glass, water, reflection, street, trees, movers, landmarks, sky,
  precipitation); `kit/uniforms.ts` is the only shared shader state;
  `kit/materials.ts: shared()` the one material cache.
- `atmosphere/`: time and weather into uniforms, bloom and rain/snow.
- `panels/`: the pickers over the scene (Projects' screens, Experience's
  lines, Interests' arcade machine: `arcade/arcadeMachine.ts`, rules in
  `arcade/arcadeLogic.ts`; untouched it moves to the next interest every
  10 s, never in still view, and only the machine, not the panel).
- `store.ts`: state shared by the panels and the scene (the only city3d
  module `/` may import).

### Renderer tiers and budgets (`tiers.ts`, `docs/audit/scripts/budget.mjs`)

| | high | low | mobile |
|---|---|---|---|
| Who | desktop, discrete or Apple GPU | integrated GPU, ≤ 4 cores or memory, Save-Data, software | coarse pointer or the narrow layout (`flat.ts: FLAT_QUERY`) |
| DPR cap | 1.75 | 1.5 | 1.25 |
| Bloom | 0.5 scale, 5 levels, MSAA 4 | 0.25 scale, 5 levels, MSAA 2 | none (glow sprites) |
| Draw calls | ≤ 300 | ≤ 220 | ≤ 150 |
| Triangles | ≤ 1.2 M | ≤ 700 k | ≤ 350 k |
| Texture memory | ≤ 128 MB | ≤ 96 MB | ≤ 48 MB |
| Frame p95 at the home pose | ≤ 12 ms | ≤ 9 ms | ≤ 8 ms |

Bundles (gzip bytes, `budget.mjs`; limits only go down): `homeInitialJs`
and `cityInitialJs` ≤ 200,848; `totalJs` ≤ 214,000; `totalCss` ≤ 10,760;
`cityCss` ≤ 2,000; `city3dChunk` ≤ 330,000; `districtChunk` ≤ 32,000;
`city3dJs` ≤ 480,000; `resumeJs` ≤ 470,000; `resumeCss` ≤ 2,500. First
load has about 1 KB of headroom. Latest readings: `docs/city/3d-log.md`,
"Task 19, the reviews' fixes".

### Standing rules

- Content only from `app/data/portfolio.ts` and `public/`, through the
  section components in `city2d/sections/`. Section names come from the
  registry's `title`, never retyped.
- No place names in anything a visitor reads or hears (text, signs, tags,
  `aria-label`, titles, `alt`), and no Chinese or Japanese characters
  anywhere in `app/`; no CJK font (`tests/city-routes.test.mjs`,
  `tests/city-theme.test.mjs`).
- Nothing 3D on `/`: no import reachable from `app/page.tsx` or
  `app/layout.tsx` reaches `three`, `@react-three/*`, `postprocessing` or
  `components/city3d/`, except `city3d/store.ts`
  (`tests/city3d-bundle.test.mjs`, `budget.mjs`). The "3D city" link
  never prefetches.
- A client component in a first load never imports values from
  `app/data/portfolio.ts` (types are fine): pass them as props from a
  server component (as `TopBar` passes the song to `MusicToggle`). One
  such import pulls the whole data file into every page's first load.
- The kit: every material through the kit's factories
  (`shared(materialKey(…))`; no file under `city3d/` outside `kit/` makes
  a three.js material, `tests/city3d-contract.test.mjs`); all geometry and
  textures generated in code from fixed seeds (`rng.ts`), no `Math.random`,
  no downloaded or AI-made models; each scene's light count is fixed
  (`scenes.ts: DISTRICT_LIGHTS`, through `SceneLights`) and the same by day
  and night, so day, night and weather change uniforms only and a 3 s
  blend compiles no shader; no new shader variants per sky.
- Motion in the scene only through `common.tsx` (`useLive`, `useMovers`):
  in still view nothing moves on its own, the camera cuts, the frame loop
  is `demand`. `Post.tsx` is a composer, bloom and tone mapping only: no
  glitch, scanlines, noise or chromatic aberration. No lanterns, dragons
  or red-and-gold kitsch.
- After moving a sign or a board on the riverside, run
  `docs/city/scripts/visibility.mjs`.

---

## Color Palette

One dark theme, soft black with a trace of blue (`app/city.css`, `:root`,
verbatim from `docs/city/style.md`):

- `--ink` `#08090c` the ground; `--ink-2` `#101217` the alternate ground
- `--panel` `#181b23` panels; `--line` `#2d323d` hairlines
- `--text` `#e6e9ee` body and headings; `--muted` `#9ea5b1` secondary
- `--cyan` `#4fd8ee` the accent; `--focus` `#8fe9ff` the focus ring
- `--lantern` `#f4b860` the one warm accent: the primary action's fill
  (hover `--glass-primary-hover` `#f8c97f`, label `--ink`)
- `--seam` `#070c15`, `--seam-2` `#0c121d`: the band's fade

Accents only on edges, marks, chosen states and display type of 24px or
larger, never body text. Glow (`--glow-cyan`) never provides contrast and
goes under `prefers-contrast: more`. The scene's neon tones are named
`cyan`, `rose`, `gold` in `kit/neon.ts` only.

Avoid (tests enforce most): a light theme, a toggle, anything keyed on
`prefers-color-scheme` or `light-dark()`; magenta or amber interface
tokens or names; pure white; text under 4.5:1 on any ground or sky.

---

## Typography

Set in `app/layout.tsx` with `next/font/local` from `app/fonts/` (Latin
only, OFL texts alongside): Rajdhani 500, 600 and 700 (three files) for
headings and section names (`font-display`, `--font-display`), a squared
signage sans; Nunito variable 400 to 700 for text (`font-sans`). Every
word in the 3D scene uses these same fonts (the kit loads no font file of
its own).

Body copy is short points, not paragraphs: `.points`, each marked with a
6px cyan square turned 45°. Figures in the text are bold through
`<Figures>` (`lib/figures.ts`). `Heading.tsx` sets a section's heading
levels: its 2D level on `/`, one higher in the 3D city.

Prefer large, confident hero type, a clear heading hierarchy, restrained
weights and generous line-height. Avoid decorative fonts.

---

## Layout

- Generous whitespace, strong vertical rhythm, centred containers, a few
  strong elements per section rather than many small cards.
- Sections lay out by their own column width, never the viewport: one
  `@container` on a wrapper, then `@min-[…]:` variants
  (`tests/city-panel-fit.test.mjs`), so the same components fit the 2D
  page and the 3D city's panel.
- Grounds alternate: About, Experience and Contact sit on `--ink-2`.
- Corners from `--radius` (10px) and `--radius-lg` (16px).
- The 3D city: wide screens put the canvas fixed under the bar and the
  panel in the left half; the narrow layout (`FLAT_QUERY`, mirrored in
  `city-pages.css`) keeps the scene in the top `--hero` (46svh, 64svh on
  a phone on its side) with the panel as a dark sheet over the rest.

---

## Navigation

- The top bar (`TopBar.tsx`): the name (home), the progress line and the
  section you're at (`ProgressLine.tsx`: along the bar's foot, in the
  right margin from 97rem), Richmond Hill's time and weather, the "3D
  city" switch (in the bar from 80rem, the Sections menu's first entry
  below; only where WebGL2 exists, and hidden if the city is closed), Sections, Still view and the
  music. It never gains a row it doesn't have today, at any width
  (`docs/city/scripts/bar-fit.mjs`).
- The Sections menu (`SectionsMenu.tsx`, a popover) jumps within the page
  and moves focus there; on `/city/*` it points at the city and offers the
  way back.
- The hero's "View projects" and "Contact".
- In the 3D city: the riverside's sign tags (`.city-tag` links over the
  boards, or the panel's row of keys `.city-keys` where they can't fit),
  Escape back to Home, "Back to Home" and "This section on the 2D page"
  on every section page; the bar's switch reads "2D view" there.
- The time and weather (`components/weather/WeatherClock.tsx`) is
  something to read, not a control: plain text with a `<time>`, blanks
  while loading, an "as of" tag on an old reading, "Weather unavailable"
  with the time kept, no live region. Open-Meteo's credit is in every
  page's footer (`components/ui/Colophon.tsx`).

Every section is one entry in `app/sections/registry.ts`; the menu, the
progress line, the numbers and the city's keys are generated from it.
Never keep a second list. To add one: `docs/adding-a-section.md`
(starter `docs/development/section-template/Greenhouse.tsx`, not served).

### Buttons

Every button-like control is glass (`.glass` in `city.css`): 44px tall,
as wide as its words, `--glass-tint` over a backdrop blur
(`--glass-fallback` without one), a thin cyan-tinted edge, the label in
opaque `--text`. Tertiary actions stay text links (`.text-link`; on their
own they take 44px). States, the same everywhere:
- `.glass-primary`: the lantern fill, an `--ink` label
- `.glass-icon`: a square icon key
- hover: under `@media (hover: hover)` only
- chosen (`aria-pressed`, `aria-selected`, `aria-current`, an open
  popover): `--glass-chosen`, a cyan inner edge, pressed in
- disabled: dashed edge, muted label still 4.5:1, no hover or pointer
- focus: the `--focus` ring on a dark halo (`--focus-halo`)

The press is `components/ui/GlassPress.tsx`, mounted once in the layout:
it answers in `pointerdown`, never delays the action, never stacks, and
settles within `--t-slow`; still view gets a brief tint instead. New
buttons only need the class.

---

## Hero Section

The home station's opening (`city2d/sections/Hero.tsx`): the name (the
page's one `h1`, `#home-title`, on its own dark backing, rising onto the
band's foot from 1024px, capped at 13vw), the headline from `profile`,
"View projects" and "Contact" (glass), and the GitHub / LinkedIn / Résumé
links (`ProfileLinks.tsx`). No paragraph, no caption, no list of
sections. Keep it simple; no decorative graphics to fill space.

---

## Project Section

Projects are the most important content (`city2d/sections/Projects.tsx`):
an index of every project, then one `article` per project with a level-3
heading, cover screenshot (never cropped), summary, features (or "My
part" when it lists contributions), the stack as one muted line, GitHub and an
optional live demo, the rest in a native `<details>`. Skills follow,
inside Projects. In the 3D city each project is a screen in the towers;
choosing one there marks it current in the panel's index.

Do not invent projects. Keep them polished but restrained: soft surfaces,
hairlines, gentle hover; no huge shadows, heavy animation or badge
clutter.

Interests (`sections/Interests.tsx`) are native `<details>` rows with
optional photos read from `public/interests/<scene>/` at build time. To
add photos: `docs/adding-interest-photos.md` (no code; captions in
`portfolio.ts`).

---

## Motion

Subtle, and never in the way of reading (`docs/ui/ux-motion-principles.md`:
apply its principles to interface work). The tokens are in `city.css`
(`--ease-out`, `--ease-in-out`, `--ease-spring`, `--t-fast` 120ms,
`--t-base` 200ms, `--t-slow` 280ms, `--stagger` 60ms; `--t-sky` 3s for
the day/night fade); no transition writes its own duration or curve.
Items arrive once as they scroll in (`reveal.css`, `ui/Arrivals.tsx`),
visible at rest, transforms and opacity only; nothing loops.

Still view is `html[data-still="on"]`, set before first paint by
`lib/still.ts: STILL_SCRIPT` from the visitor's choice or
`prefers-reduced-motion`: no animation, no parallax or tilt, no moving
weather, camera cuts instead of travel, nothing in the scene moving on
its own. Every animation sits behind that guard and the reduced-motion
query. No scroll hijacking: the canvas never takes wheel or touch-scroll.
The 3D frame loop stops when the tab is hidden, when the sheet covers the
canvas, and under the résumé.

---

## Responsive Design

Every change must work on mobile, tablet, laptop and large desktop.
Checked by `docs/ui/scripts/mobile-audit.mjs` (`/`, its anchors and the
six `/city` pages, the open menu, the weather display, the progress line
and the résumé dialog, at 320, 390, 430, 768, 1024 portrait and
landscape, 1440, 1600, 844×390 and 667×375, plus 200% text at 320, 390
and 844×390; headless Chrome with touch and emulated notch insets, not a
real device):

- no sideways scroll, nothing past the screen
- every target at least 44×44 CSS px on touch, none overlapping or closer
  than 8px (links inside a sentence are exempt)
- no text under 12px; body copy on phones at 16px
- the bar, menus and dialogs clear every `env(safe-area-inset-*)`
- menus and dialogs fit the screen, scroll inside, and don't scroll the
  page behind (`overscroll-behavior: contain`)
- labels wrap or the bar wraps; nothing clips; a tall top bar stops being
  sticky
- hover only adds: `:hover` under `@media (hover: hover)`

---

## Accessibility

Semantic landmarks, one `h1` per page, headings in order, a skip link,
visible focus, keyboard access to everything, no information by colour
alone, all painting `alt=""`. In the 3D city focus moves to the panel's
heading on each journey (never on first load), and under
`prefers-contrast: more` panels are opaque, with no bloom and no glow.
Do not sacrifice accessibility for visual styling.

---

## Content Rules

Never invent: projects, employers, jobs, internships, awards, grades,
technologies I know, years of experience, GitHub usernames, LinkedIn
URLs, email addresses, statistics.

If something is unknown, either ask me or leave an obvious placeholder.

Do not use generic AI-written statements such as "Passionate developer
creating innovative digital experiences." Prefer concise, natural
language.

---

## Coding Style

Use TypeScript. Prefer simple components, meaningful names, clear props,
readable code, straightforward solutions. Avoid premature abstraction,
giant components, unnecessary state, unnecessary client components and
dependencies, overly clever code.

Use Server Components by default; `"use client"` only when client-side
behaviour requires it.

---

## Editing Rules

Before a large change: inspect the relevant files, understand the current
implementation, preserve unrelated functionality, make the smallest
reasonable set of changes. Don't rewrite unrelated sections. For major
redesigns, explain the plan first.

Shared files (`package.json`, the lockfile, `next.config.ts`,
`app/city.css`, `app/layout.tsx`, `app/sections/registry.ts`, `TopBar.tsx`,
`city3d/{store,scenes,sceneChunks}.ts`, `kit/uniforms.ts`, `budget.mjs`)
are edited by one session at a time, never by parallel agents.

The icons and share card are drawn in code:
`scripts/identity/make-identity.mjs` (from `mark.svg` and the riverside's
night plate) writes `app/icon.svg`, `app/favicon.ico`,
`app/apple-icon.png` and `public/share-card.jpg`. Rerun it after changing
the mark or that plate.

---

## Validation

After significant code changes:

```bash
npm run lint
npm test
npx tsc --noEmit
```

For builds and audits:
- Build: `npm run build` (the city is on unless `NEXT_PUBLIC_CITY3D=off`), then
  `npx next start -p 3100` (any port but the dev server's 3101). Then
  `SMOKE_URL=http://localhost:3100 npm test` and
  `node docs/audit/scripts/budget.mjs` (`npm run perf:budget`).
- Never delete `.next` under a running `next dev`. If `next dev` serves a
  stale stylesheet, stop it, `rm -rf .next`, start it again.
- The browser scripts need Playwright from outside the project
  (`PLAYWRIGHT=…/playwright/index.mjs`, `docs/audit/scripts/pw.mjs`).

The scripts and what they measure (production build unless marked `next
dev`, for the `?sky=` preview):
- `docs/audit/scripts/budget.mjs`: bundle budgets; no three.js on `/` or
  its linked routes. `lighthouse.mjs`: cold runs, LCP and CLS per URL.
  `shots.mjs`: screenshots of every route.
- `docs/ui/scripts/mobile-audit.mjs`: the guarantees above.
  `responsive-shots.mjs`: the pages at every width.
  `city-contrast.mjs` (`next dev`): every word on `/` over 20 skies.
  `glass-contrast.mjs` (`next dev`): glass labels over every sky.
  `glass-states.mjs`, `glass-press.mjs`: the buttons' states and press.
  `palette-contrast.mjs`: the palette's pairs. `resume-viewer.mjs`: the
  résumé dialog. `weather-display.mjs`: the time and weather display.
- `docs/city/scripts/city3d-perf.mjs`: draws, triangles, memory and frame
  times per tier and place against `TIERS`; shaders compiled by blends;
  still view's frames. `city3d-fallback.mjs`: every fallback reads and
  doesn't shift. `city3d-keyboard.mjs`: the city by keyboard.
  `city3d-contrast.mjs` (`next dev`): panels, tags, keys and bar over 20
  skies. `visibility.mjs` (`next dev`): each sign on screen, uncovered,
  out of fog, its link 44px and apart. `plate-compare.mjs` (`next dev`):
  ΔE between each place and its painting (a measure, not a gate).
  `bar-fit.mjs`: the bar's height at every width against
  `docs/city/bar-baseline.json`.

### Open

- Simulated-phone largest paint is about 3.0 s against the 2.5 s target
  (`/` and `/city`; desktop about 0.7 s).
- The weather capsule shifts the layout slightly when its reading arrives
  (CLS up to 0.02, `/` and `/city`).
- The 3D city still differs from its paintings (mean ΔE about 15, most
  places darker), and it opened before my review on a real phone.
- `bar-fit.mjs` depends on the live weather's words, so it can fail at a
  width without any change to the bar.
