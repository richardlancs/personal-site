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
- `pdfjs-dist` (pinned, loaded on demand) for the résumé viewer

Do not replace the stack unless I explicitly ask. Avoid new dependencies;
nothing new may reach the 2D page. Prefer built-in Next.js, React, CSS and
Tailwind functionality.

Deployed by Vercel from `main` on every push: never push `main` without my
explicit yes.

---

## Project Structure

- `app/page.tsx`: the site, one page (`/`): six stations in order inside
  `CityTrack`, the panorama behind them
- `app/layout.tsx`: root layout (fonts, the head scripts, top bar,
  résumé host, sky driver, glass press)
- `app/city.css` (tokens, the bar, the map, glass, the page read top to
  bottom), `app/city-track.css` (the journey: stage, panels, sky, the
  living city, its arrivals), `app/motion.css`, `app/reveal.css`
- `app/data/portfolio.ts`: all content. `app/data/weather.ts`: the place
  the clock and weather follow
- `app/sections/registry.ts`: the sections (id, anchor, title, their
  stretch of the city); `app/sections/metadata.ts`: their words and page
  metadata, server only
- `app/components/city2d/`: the page: `CityTrack` (the journey's engine)
  and `trackMath.ts` (its pure arithmetic), `Station`, `DistrictBand` (the
  panorama's tiles), `panorama.ts` and `panoramaImages.ts` (written by
  `scripts/city-panorama.mjs`), `TopBar`, `ProgressLine` (the metro map),
  `SectionsMenu`, `StillViewToggle`, `WeatherOverlay`, `CityDriver`, and
  `sections/` with one component per section
- `app/components/weather/`, `components/resume/`, `components/ui/`
  (`GlassPress`, `Arrivals`, `Colophon`), `components/MusicToggle.tsx`
- `app/lib/`: pure logic (time, sun, sky, weather, the journey's head
  script `track.ts`, still view and its small store `stillStore.ts`, the
  home tile's preload, the map's progress)
- `app/assets/city/panorama/`: the panorama's tiles,
  `{day,night}-01..06.webp`
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
`docs/superpowers/specs/2026-11-22-horizontal-city-design.md` (and its
"Amendment, 2026-11-23", my words), the reels I saved
(`docs/ui/reels.md`: the design language), the style sheet `docs/city/style.md` (palette, type,
the panorama) and the prompts in `docs/city/prompts.md`. Where a spec and
later rulings differ (no magenta, no Chinese signs), the code and
`style.md` win. `docs/world/` (the retired park) and the earlier city
specs and plans in `docs/superpowers/` are history, not current
instructions.

The 3D city (`/city`, three.js) was removed on 2026-11-22 at my request;
`/city` and `/city/:path*` redirect (temporarily) to `/`, a section's
page to its anchor (`next.config.ts`). `docs/city/3d-log.md` is its
history.

### The journey

`/` is one city you travel along: Home, About, Projects (with Skills at
`/#skills`), Experience, Interests, Contact, numbered 01 to 06, are six
stops side by side on one street. The page still scrolls down as any page
does (wheel, trackpad, keys, the scrollbar, touch); a tall runway holds a
full-screen stage that stays put (sticky) while the track of stops in it
moves left by exactly as much as the page has scrolled (`CityTrack.tsx`,
`city-track.css`). No scroll-jacking: no wheel or touch listener prevents
anything, nothing smooths the wheel, nothing snaps or traps.

- On: `<html data-track="on">`, set before the first paint by the head
  script (`lib/track.ts`) on `/` with scripts and a screen of at least
  320 × 320 and 22em tall in the root's text size (`trackMath.ts:
  TRACK_MIN`, `trackFits`; `CityTrack`'s measure applies the same rule):
  so 200% text on a short screen (844 × 390, 320 × 640) reads stacked
  rather than leaving each panel a slit under the tall bar. `CityTrack` sets the runway's
  height from the track's width (`--travel`) and sets `data-track-ready`;
  if it never does within 3 s of load, the head script falls back to the
  stacked page (`data-track="fallback"`) for the visit.
- The move is a CSS scroll-driven animation on the runway's view
  timeline where supported; elsewhere `CityTrack`'s one passive scroll
  listener writes the transforms each frame.
- Stops are a screen wide less the peek of the next (`--peek`, 10% of the
  width at every width, at least 1.5rem; on phones a whole screen, the next stretch showing in the
  painting's strip); Projects is a row of panels, a screen per panel. Every stop leaves a slice of the next stretch of city
  in view, so the way on needs no arrow.
- `ArrowLeft`/`ArrowRight` go to the previous or next stop; an anchor (on
  load, a link, Back/Forward) lands on its stop or its panel (`#skills`, a
  project); focus moved into a stop off the screen brings it on; a
  sideways swipe travels (the page itself only scrolls down). Jumps glide,
  and cut in still view. A resize or a turn keeps you at the same place
  in the same stop.
- A panel taller than the stage scrolls inside, only once the journey
  has stopped with all of it on the screen (`data-open`); at its end the
  scroll chains on along the city. While the city moves, no panel
  catches the scroll.
- Without scripts, under 320 × 320 or 22em tall, in print, or after the fallback,
  the page reads top to bottom: each station with its own stretch of the
  panorama as a band over it.

### The panorama

One continuous, hyperrealistic panorama of Shanghai, by day and by night,
painted in ChatGPT from real reference photos (my ruling of 2026-11-23:
hyperrealistic replaces "no photorealism" for the panorama). Six
segments, one per stop, in order: the riverside skyline (Home), the old
brick lanes (About), the towers with screens (Projects), the elevated
metro (Experience), the bright shopping street (Interests), the riverfront
with the clock tower (Contact). `scripts/city-panorama.mjs` joins them
(registered, colour-matched, cut along the seam of least difference) and
cuts the tiles into `app/assets/city/panorama/`, writing `panorama.ts`
(run it again rather than edit that). Originals:
`docs/city/concepts/panorama-real/`; how it was painted:
`docs/city/prompts.md`, last section, and `docs/city/style.md`.

- On the journey the whole panorama stands behind every stop
  (`DistrictBand.tsx`, one row of tiles), moved by its own measure
  (`trackMath.ts: panoKeys`): each stop's start shows that stop's stretch,
  and in between it moves straight from one to the next.
- Only the home tile loads early: the head script
  (`lib/platePreload.ts`) paints it as a background before hydration at
  `HOME_QUALITY` (60 by day, 40 by night, `homePlate.ts`); the rest load
  as they near the screen (`useNear.ts`). Not on a deep link.
- Words never sit on the painting bare: they sit on glass panels, the
  hero's name on its own dark backing. Places are never named anywhere a
  visitor reads or hears.

Light and weather follow Richmond Hill: the hour and that day's sunrise
and sunset pick the day plate, the night plate, or a cross-fade with a
warm or cyan grade at dawn and dusk (`lib/cityLook.ts`), over the whole
panorama; cloudy, rain and snow are drawn once over the stage in CSS and
one small canvas (`WeatherOverlay.tsx`, at most 30 frames a second,
nothing moving in still view). No reading means the neutral look. In
`next dev` only, `?sky=` (e.g. `?sky=clear-dusk-0.5`, `lib/skyParam.ts`)
previews a sky.

### The living city (`city-track.css`)

All of it driven by the journey's progress (the runway's timeline), so
scrolling back plays it in reverse and nothing moves at rest; transform,
opacity and filter only; none of it in still view or with reduced motion.

- While the city travels, a slight sideways motion blur on the panorama
  (`CityTrack.tsx`: an SVG Gaussian, horizontal only, its deviation the
  scroll's smoothed speed × `BLUR_PER_SPEED`, at most `BLUR_MAX` 3px),
  gone (no filter at all) at rest, in still view, with reduced motion and
  in a hidden tab; the words stay sharp (my words of 2026-11-23).
- The sky (`.track-sky`) behind the panorama moves at 30% of the street's
  pace (`SKY_DEPTH` 0.7), in the hour's colours; in still view, with the
  street.
- Haze drifts across the towers' middles (a screen per third of the
  journey) and a soft beam crosses once per sixth (`.track-weather`).
- At dusk and dawn each tile's lit windows come on with a flicker as the
  journey reaches it (`.band-lights`: a copy of the night plate,
  lightening only).
- Contact is the best-lit stop: a warm and a cyan light come up over the
  last fifth of the journey.
- One quiet texture: a faint plan of dots on the street.

The old addresses (`/about`, `/projects`, `/experience`, `/interests`,
`/contact`) redirect to their anchors, `/map` to `/`, and the 3D city's
(`/city`, `/city/<section>`) to `/` and the anchors, all temporary
(`next.config.ts`).

### The UX panel's fixes (23 November 2026)

Built from `docs/ui/ux-review-2026-11-23.md` (four reviewers, debated;
the reports per part in `.superpowers/sdd/2026-11-22-horizontal-city/task-9-{A,B,C,D}-report.md`):
- Snap: one 1px snap mark per panel (`.snap-mark` in `.track-runway`) at
  its centred position; wide screens `y proximity`, the narrow layout `y
  mandatory` + `scroll-snap-stop: always`. ArrowLeft/Right, PageDown/Space
  and the bar's place label ("03 / 06 · Projects · 1 of 5 MarketLab",
  from CityTrack's `trackplace` event) all use the same list.
- Jumps longer than about 1.5 screens dissolve (fade, cut, fade) and fire
  `trackjump` so the target's tiles load first; motion blur only on your
  own scrolling. Sideways trackpad and tilt-wheel scroll the journey, with
  `overscroll-behavior-x: none` on `html`.
- Panels: centred under one top line, sized by content, Projects and
  Experience about 80vw, ending above the map; one even glass tint (it is
  darker than "very transparent" to keep 4.5:1 by day); a "More ↓" fade
  and a "Next: … →" link (`Station.tsx: NextStop`).
- The journey runs only where a panel gets at least 20em of room
  (`trackMath.ts: trackRoom`); phones held sideways at 100% text and 200%
  text on short screens read the stacked page.
- Phones: a one-row bar (the weather moves into the menu), the painting
  strip 20% of the screen below the bar, `svh` sizing.
- Home leads with the role ("Looking for a software engineering
  internship or co-op."), Résumé a glass key beside View projects; project
  panels read title, keys, summary, cover; Experience without boxed
  badges; a clear "Copied" moment; the bar's place reads "Weather in
  Richmond Hill"; the Sections menu as plain rows; "Still view" labelled;
  the résumé readable on phones with "Open in your viewer" and an offline
  note.

### Budgets (`docs/audit/scripts/budget.mjs`)

Bundles (gzip bytes; limits only go down): `homeInitialJs` ≤ 203,000,
raised at my ruling on 23 November 2026 for the UX panel's fixes;
`totalJs` ≤ 214,000; `totalCss` ≤ 12,300, raised at my rulings on
23 November 2026 for the highly animated horizontal city and then the
UX panel's fixes (it only goes down from here); `resumeJs` ≤ 470,000;
`resumeCss` ≤ 2,500. The panorama's first tile at most the bytes of the
painted home plate it replaced, at `HOME_QUALITY`. It also fails on
three.js (`WebGLRenderer`) in any chunk of the build, and on any
stylesheet `/` doesn't link (besides the résumé's).
Readings 2026-11-23 (Task 8): 199,850; 205,485; 11,932; 447,950; 1,853.

### Standing rules

- Content only from `app/data/portfolio.ts` and `public/`, through the
  section components in `city2d/sections/`. Section names come from the
  registry's `title`, never retyped.
- No place names in anything a visitor reads or hears (text, signs, tags,
  `aria-label`, titles, `alt`), and no Chinese or Japanese characters
  anywhere in `app/`; no CJK font (`tests/city-routes.test.mjs`,
  `tests/city-theme.test.mjs`).
- No three.js, React Three Fiber or `postprocessing` anywhere
  (`budget.mjs`, `tests/city-sections-fit.test.mjs`).
- No scroll-jacking: never `preventDefault` on a wheel, touch or key
  that scrolls (`tests/city-track.test.mjs`).
- A client component in a first load never imports values from
  `app/data/portfolio.ts` (types are fine): pass them as props from a
  server component (as `TopBar` passes the song to `MusicToggle`). One
  such import pulls the whole data file into every page's first load.
- The panorama's pictures reach the page only as props from server
  components (`panoramaImages.ts: bandTiles`), never imported by client
  code.
- No lanterns, dragons or red-and-gold kitsch.
- The "unslop" list from the reels (spec, "Sources" 6): one primary
  action, matched nested radii, no glow shadows, no identical cards,
  balanced wrapping, not every block arriving the same way, restrained
  all-caps.

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
goes under `prefers-contrast: more`.

Avoid (tests enforce most): a light theme, a toggle, anything keyed on
`prefers-color-scheme` or `light-dark()`; magenta or amber interface
tokens or names; pure white; text under 4.5:1 on any ground or sky.

---

## Typography

Set in `app/layout.tsx` with `next/font/local` from `app/fonts/` (Latin
only, OFL texts alongside): Rajdhani 500, 600 and 700 (three files) for
headings and section names (`font-display`, `--font-display`), a squared
signage sans; Nunito variable 400 to 700 for text (`font-sans`).

Body copy is short points, not paragraphs: `.points`, each marked with a
6px cyan square turned 45°. Figures in the text are bold through
`<Figures>` (`lib/figures.ts`). A section's headings go through
`Heading.tsx` (levels 3 to 5, under the station's `h2`).

Prefer large, confident hero type, a clear heading hierarchy, restrained
weights and generous line-height. Avoid decorative fonts.

---

## Layout

- Generous whitespace, strong vertical rhythm, a few strong elements per
  section rather than many small cards. On the journey each stop's
  panel is centred in its stop and substantial (my words of 2026-11-23,
  Task 8), inside the central 80%.
- The central 80%: bulky content (panels, images, cards, the timeline)
  sits within the middle 80% of the screen's width, 10% clear on each
  side at every width from 768px (`--peek`, `max(1.5rem, 10vw)`, uncapped;
  `--side` on the sheets); phones keep their
  16px gutters. The edges are the city.
- Wide screens: the panorama fills the stage; each stop's words on clear
  glass (`.panel`: "very very transparent with a very subtle hint", my
  words: a barest ink and cyan tint, a blur, a fine light edge, the city
  reading through it), centred in the stop between the bar and the map,
  as wide as `--w` (the central 80%, 68rem, or 64% of a very wide
  screen) and at least 72% of the room's height, its content in its
  middle; wide panels lay their words in columns. The words' 4.5:1 comes
  from the glass's smooth blur (which dims the city a little) and a
  faint shade behind each block of words (`--shade`, 0.46, as wide as the
  words and blurred into the glass, so it has no edge), with a dark halo
  (text-shadow) for the eye; on the glass secondary words are a step
  lighter (`--muted` `#c9ced8` inside `.panel`, the coordinator's ruling
  of fix round 1). Projects: a row of panels, each centred in
  its own screen, city between them. Experience: one stop, all three
  entries at once on a simple timeline (three columns on a wide panel, a
  line down the side on a narrow one).
- Phones and tall screens (`max-aspect-ratio: 1/1`): the painting in a
  strip at the top (about 30% under the bar), each stop a screen wide,
  its words a sheet of tinted glass below (no per-block shade) scrolling
  inside; a row is one sheet a screen wide after another.
- Images match their text: as tall as the words beside them, or as wide
  when stacked; covers never cropped awkwardly (a chosen focal point).
- Sections lay out by their own column width, never the viewport: one
  `@container` on a wrapper, then `@min-[…]:` variants
  (`tests/city-sections-fit.test.mjs`), so a section fits any panel it is
  put in.
- Read top to bottom, grounds alternate: About, Experience and Contact
  sit on `--ink-2`.
- Corners from `--radius` (10px) and `--radius-lg` (16px); what sits
  inside a panel takes `--radius-in`, the outer radius less the padding.

---

## Navigation

- The top bar (`TopBar.tsx`): the name (home), the section you're at in
  words from 53rem ("03 / 06 · Projects"), Richmond Hill's time and
  weather, Sections, Still view and the music. It floats over the stage
  on the journey. It never gains a row it doesn't have today, at any
  width (`docs/city/scripts/bar-fit.mjs`). Tab goes through its keys
  first, then the map.
- The metro map (`ProgressLine.tsx`, fixed along the foot of the screen
  on the journey only): the six stops as stations on one line, each a
  link (44px, 8px apart), the current one lit (`aria-current="location"`:
  a larger, filled dot, not colour alone). A fill follows the scroll
  continuously and locks onto a station as it arrives (a pulse); on
  phones only the current name shows, on short screens the dots alone,
  and with a very tall bar (large text, `data-bar-tall`) the dots alone,
  with no map at all if the screen is also under 700px tall. (At 200%
  text a screen under 22em, 704px, reads stacked, with no map.) It is the page's
  one source of where you are (`useSection.ts`).
- The Sections menu (`SectionsMenu.tsx`, a popover) grows from its key,
  the city dims behind it, and it jumps along the journey and moves focus
  there.
- The hero's one primary action, "View projects", and its text links
  (Contact, GitHub, LinkedIn, Résumé, Email).
- The time and weather (`components/weather/WeatherClock.tsx`) is
  something to read, not a control: plain text with a `<time>`, blanks
  while loading, an "as of" tag on an old reading, "Weather unavailable"
  with the time kept, no live region. Open-Meteo's credit is in the
  colophon at the end of Contact (`components/ui/Colophon.tsx`).

Every section is one entry in `app/sections/registry.ts`; the menu, the
map, the bar's words and the numbers are generated from it.
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

The home stop's panel (`city2d/sections/Hero.tsx`): the name (the page's
one `h1`, `#home-title`, on its own dark backing), the headline from
`profile`, the school and programme (from the education entry), ONE
primary action, "View projects" (glass, the lantern), then Contact,
GitHub, LinkedIn, Résumé and Email as text links (`ProfileLinks.tsx`).
No paragraph, no caption, no list of sections. Keep it simple; no
decorative graphics to fill space.

---

## Project Section

Projects are the most important content (`city2d/sections/Projects.tsx`):
an index of every project, then one `article` per project with a level-3
heading, cover screenshot (never cropped), summary, features (or "My
part" when it lists contributions), the stack as one muted line, GitHub and an
optional live demo, the rest in a native `<details>` (it opens inside its
panel, which then scrolls). On the journey: the index as the row's first
panel, then one panel per project along the towers, each centred in
its own screen (on a wide panel, the title and a wide cover in one
column and what I did in the other; a tall cover beside them), Skills
after, inside Projects.

Do not invent projects. Keep them polished but restrained: soft surfaces,
hairlines, gentle hover; no huge shadows, heavy animation or badge
clutter.

Interests (`sections/Interests.tsx`) are native `<details>` rows with
optional photos read from `public/interests/<scene>/` at build time. To
add photos: `docs/adding-interest-photos.md` (no code; captions in
`portfolio.ts`).

---

## Motion

Highly animated, by my amendment of 2026-11-23, and never in the way of
reading (`docs/ui/ux-motion-principles.md`: apply its principles to
interface work). Every stop has its own choreographed arrival as the
journey reaches it (the panel from its stop's own direction, then its
heading, pictures, points and links in sequence, `--stagger` apart), on
the runway's timeline from the panel's place (`--at`, `city-track.css`,
"Arrivals"), so scrolling back plays it in reverse; live hover and press
feedback on every control; the living city (above); the map animating
between stations. Transform, opacity and filter only. Where there's no
scroll timeline, the stops simply show (`ui/arrive.ts` arrives the page
read top to bottom).

The tokens are in `city.css` (`--ease-out`, `--ease-in-out`,
`--ease-spring`, `--t-fast` 120ms, `--t-base` 200ms, `--t-slow` 280ms,
`--stagger` 60ms; `--t-sky` 3s for the day/night fade); no transition
writes its own duration or curve. Nothing loops (`tests/city-motion.test.mjs`):
the city's drift is the journey's, not the clock's.

Still view is `html[data-still="on"]`, set before first paint by
`lib/still.ts: STILL_SCRIPT` from the visitor's choice or
`prefers-reduced-motion`: fully readable and motionless. No arrivals,
no parallax (the sky and the panorama move with the street, pixel for
pixel, cutting between stops), no drift, beam or flicker, no moving
weather, jumps cut. The top bar's key changes it through
`lib/stillStore.ts`. Every animation sits behind that guard and the
reduced-motion query. No scroll hijacking.

---

## Responsive Design

Every change must work on mobile, tablet, laptop and large desktop.
Checked by `docs/ui/scripts/mobile-audit.mjs` (`/` and each anchor as
the journey's stop it lands on, the open menu, the weather display, the
metro map and the résumé dialog, at 320, 390, 430, 768, 1024 portrait and
landscape, 1440, 1600, 844×390 and 667×375, plus 200% text at 320, 390
and 844×390; headless Chrome with touch and emulated notch insets, not a
real device):

- no sideways scroll of the page, nothing past the screen (the track
  moves inside its clipped stage); each anchor lands on its stop
- a stop's panel fits between the bar and the map, and one with more
  than fits scrolls inside without the scroll running on
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
alone, all painting `alt=""`. The journey reads in order for a keyboard
and a screen reader (focus brings its stop on); the page reads top to
bottom without scripts. Under `prefers-contrast: more` the panels are
opaque (`city-track.css`: solid `--ink`, no blur), with no glow.
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
`app/city.css`, `app/city-track.css`, `app/layout.tsx`,
`app/sections/registry.ts`, `TopBar.tsx`, `CityTrack.tsx`, `budget.mjs`)
are edited by one session at a time, never by parallel agents.

The icons and share card are drawn in code:
`scripts/identity/make-identity.mjs` (from `mark.svg` and the
panorama's night home tile, `panorama/night-01.webp`) writes
`app/icon.svg`, `app/favicon.ico`, `app/apple-icon.png` and
`public/share-card.jpg`. Rerun it after changing the mark or that tile.

---

## Validation

After significant code changes:

```bash
npm run lint
npm test
npx tsc --noEmit
```

For builds and audits:
- Build: `npm run build` (in a git worktree whose `node_modules` is a
  symlink, Turbopack needs `turbopack.root` pointed at the main checkout
  for the build: add it, build, revert it; never commit it), then
  `npx next start -p 3100` (any port but the dev server's 3101). Then
  `SMOKE_URL=http://localhost:3100 npm test` and
  `node docs/audit/scripts/budget.mjs` (`npm run perf:budget`).
- Never delete `.next` under a running `next dev`. If `next dev` serves a
  stale stylesheet, stop it, `rm -rf .next`, start it again.
- The browser scripts need Playwright from outside the project
  (`PLAYWRIGHT=…/playwright/index.mjs`, `docs/audit/scripts/pw.mjs`).

The scripts and what they measure (production build unless marked `next
dev`, for the `?sky=` preview):
- `docs/audit/scripts/budget.mjs`: bundle budgets; no three.js in the
  build. `lighthouse.mjs`: cold runs, LCP and CLS per URL.
  `shots.mjs`: screenshots of every route.
- `docs/ui/scripts/track-journey.mjs`: the journey's guarantees (wheel,
  keys, scrollbar and swipes reach Contact and back; anchors cold and
  Back/Forward; a resize keeps the stop; long panels scroll inside and
  hand on; no scripts reads top to bottom; still view's panorama).
  `NO_TIMELINE=1` runs it as a browser without scroll timelines would.
- `docs/ui/scripts/mobile-audit.mjs`: the guarantees above.
  `responsive-shots.mjs`: the pages at every width.
  `city-contrast.mjs` (`next dev`): every word at every stop over 20
  skies, the open menu included.
  `glass-contrast.mjs` (`next dev`): glass labels over every sky.
  `glass-states.mjs`, `glass-press.mjs`: the buttons' states and press.
  `palette-contrast.mjs`: the palette's pairs. `resume-viewer.mjs`: the
  résumé dialog. `weather-display.mjs`: the time and weather display.
- `docs/city/scripts/bar-fit.mjs`: the bar's height at every width against
  `docs/city/bar-baseline.json`.

### Open

- Simulated-phone largest paint is 2.8 to 3.0 s against the 2.5 s target
  (`/`; desktop about 0.25 s).
- The weather capsule shifts the layout slightly when its reading arrives
  (CLS up to 0.01).
- `totalCss` is over the 10,760 limit (above): my ruling.
- `bar-fit.mjs` depends on the live weather's words, so it can fail at a
  width without any change to the bar.
- The journey on a real phone (the painting strip's framing, the
  panorama's sharpness on 2× screens: its tiles are 941px tall) is not yet
  checked by hand.
- Browsers without scroll timelines (Firefox, older Safari) get the
  journey and the sky's parallax, but no arrivals, drift, beam or
  flicker.
