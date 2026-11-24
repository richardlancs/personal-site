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
nothing new may reach the page. Prefer built-in Next.js, React, CSS and
Tailwind functionality.

Deployed by Vercel from `main` on every push: never push `main` without my
explicit yes.

---

## Project Structure

- `app/page.tsx`: the site, one page (`/`): six stations in order inside
  `CityTrack`
- `app/layout.tsx`: root layout (fonts, the head scripts: paper, still
  view, the journey; top bar, résumé host, glass press)
- `app/city.css` (the paper tokens, the bar, the map, the keys, the page
  read top to bottom), `app/paper.css` (the crumpled texture),
  `app/city-track.css` (the journey: stage, panels, arrivals),
  `app/motion.css`, `app/reveal.css`
- `app/data/portfolio.ts`: all content. `app/data/weather.ts`: the place
  the clock and weather follow
- `app/sections/registry.ts`: the sections (id, anchor, title);
  `app/sections/metadata.ts`: their words and page metadata, server only
- `app/components/city2d/`: the page: `CityTrack` (the journey's engine)
  and `trackMath.ts` (its pure arithmetic), `Station`, `TopBar`,
  `ProgressLine` (the metro map), `SectionsMenu`, `Tilt` (the covers'
  tilt), and `sections/` with one component per section
- `app/components/ui/`: `PaperPicker`, `GlassPress`, `Arrivals`,
  `Colophon`, `Notice`; also `components/weather/`, `components/resume/`,
  `components/MusicToggle.tsx`
- `app/lib/`: pure logic (time, weather and its types in `sky.ts`, the
  paper's head script `paper.ts`, the journey's `track.ts`, still view and
  `stillStore.ts`, the map's progress)
- `public/`: résumé, project screenshots, interest photos, music, share card
- `tests/`: `npm test` (node's test runner, offline; `smoke.test.mjs` runs
  only with `SMOKE_URL`)

Prefer reusable components over growing `page.tsx`. Keep content in
`app/data/`, separate from components.

---

## Design Direction

Crumpled paper, simple and printed-looking, that does the portfolio's job
first: a recruiter finds the name, the projects and the contact links in
seconds. My words of 24 November 2026: "overhaul the entire shanghai
design, change it to something very simple such as a crumpled paper
background and colour match my current icons and sections and overal
architecture to the new designed background"; three papers, each with its
own colours, and a picker; "Keep the sideways journey". The style sheet is
`docs/city/style.md` (papers, palette, texture, type); the colour analysis
`.superpowers/sdd/2026-11-22-horizontal-city/task-12/P/paper-palettes.md`.

What changed from the Shanghai city: no panorama, no paintings, no sky,
no day and night, no dusk grades, no weather drawn over the page, no
parallax, motion blur, haze or lit windows. What stayed: the journey, the
six stops, the metro map, the sections and their content, the bar (the
weather pill, Sections, music) and the résumé viewer. The city's history:
`docs/city/concepts/`, `docs/city/3d-log.md`, the earlier specs and plans
in `docs/superpowers/`, and `docs/world/` (the retired park); none of it is
current instruction.

The old addresses (`/about`, `/projects`, `/experience`, `/interests`,
`/contact`) redirect to their anchors, `/map` to `/`, and the retired 3D
city's (`/city`, `/city/<section>`) to `/` and the anchors, all temporary
(`next.config.ts`).

### The papers

`<html data-paper="cream|charcoal|kraft">`, set before the first paint by
`lib/paper.ts: PAPER_SCRIPT` from `localStorage["paper"]` (cream when
missing, unknown or blocked), so no flash. Chosen by the visitor, never
by the system's appearance (no `prefers-color-scheme`). The Paper picker
(`PaperPicker.tsx`): three keys, each a dot of its paper and its name,
`aria-pressed`, in a group labelled "Paper"; in the bar from 80rem, in the
Sections menu below (never both); hidden without scripts. A choice saves,
sets `data-paper` and the `theme-color` at once, with a cross-fade (a view
transition over `--t-slow`; instant in still view).

The texture (`app/paper.css`): one inline SVG drawn in code (crease noise
lit as a surface, a fine grain, fixed seeds, about 1.3 KB gzip), on a
fixed `body::before` (body is `isolation: isolate`), never moving: the
stops travel over one still sheet. Cream and kraft take it in `soft-light`;
charcoal its own specular sheet in `screen` (light on the ridges). Its
strength per paper is `--crumple`. Gone under `prefers-contrast: more` and
forced colours.

### The journey

`/` is one long sheet you travel along: Home, About, Projects (with Skills
at `/#skills`), Experience, Interests, Contact, numbered 01 to 06, six
stops side by side. The page still scrolls down as any page does (wheel,
trackpad, keys, the scrollbar, touch); a tall runway holds a full-screen
stage that stays put (sticky) while the track of stops in it moves left
by exactly as much as the page has scrolled (`CityTrack.tsx`,
`city-track.css`). No scroll-jacking: no wheel or touch listener prevents
anything, nothing smooths the wheel, nothing traps.

- On: `<html data-track="on">`, set before the first paint by the head
  script (`lib/track.ts`) on `/` with scripts and a screen of at least
  320 × 320 and 22em tall in the root's text size (`trackMath.ts:
  TRACK_MIN`, `trackFits`), and where a panel gets at least 20em of room
  (`trackRoom`). `CityTrack` sets the runway's height (`--travel`) and
  `data-track-ready`; if it never does within 3 s of load, the head script
  falls back to the stacked page (`data-track="fallback"`).
- The move is a CSS scroll-driven animation on the runway's view
  timeline where supported; elsewhere `CityTrack`'s one passive scroll
  listener writes the transforms each frame.
- Stops are a screen wide less the peek of the next (`--peek`, 10% of the
  width, at least 1.5rem; on phones a whole screen); Projects is a row of
  panels, a screen per panel.
- Snap: one 1px snap mark per panel (`.snap-mark`); wide screens `y
  proximity`, the narrow layout `y mandatory` + `scroll-snap-stop:
  always`. ArrowLeft/Right, PageDown/Space and the bar's place label
  ("03 / 06 · Projects · 1 of 5 MarketLab", from `trackplace`) use the
  same list.
- Every jump (map, menu, anchors, Next links, keys) glides to its place:
  eased, 0.6 s for a hop to 1.6 s at most (`trackMath.ts: glideMs`),
  snapping let go meanwhile (`data-free`), giving way at once to your own
  scroll; it cuts in still view. A resize or a turn keeps the place.
- A panel taller than the stage scrolls inside, only once the journey
  has stopped with all of it on the screen (`data-open`); at its end the
  scroll chains on. Each panel has a "More ↓" fade and a "Next: … →" link
  (`Station.tsx: NextStop`).
- Without scripts, under the sizes above, in print, or after the
  fallback, the page reads top to bottom.

### Budgets (`docs/audit/scripts/budget.mjs`)

Bundles (gzip bytes; limits only go down): `homeInitialJs` ≤ 203,000;
`totalJs` ≤ 214,000; `totalCss` ≤ 12,700; `resumeJs` ≤ 470,000;
`resumeCss` ≤ 2,500. It also fails on three.js in any chunk and on any
stylesheet `/` doesn't link (besides the résumé's). Fonts are not in
these: Fraunces and Figtree are about 87.6 KB of woff2, both preloaded
(Rajdhani and Nunito were 66.8 KB). The paper redesign removed the
panorama (6.3 MB of images) and its code; no build reading yet.

### Standing rules

- Content only from `app/data/portfolio.ts` and `public/`, through the
  section components in `city2d/sections/`. Section names come from the
  registry's `title`, never retyped.
- Colours only from the paper tokens (below), never a hex or `rgb()` in a
  component or rule; every paper must read.
- No place names in anything a visitor reads or hears (text, tags,
  `aria-label`, titles, `alt`) beyond the weather's "Waterloo", and no
  Chinese or Japanese characters anywhere in `app/`; no CJK font
  (`tests/city-routes.test.mjs`, `tests/city-theme.test.mjs`).
- No three.js, React Three Fiber or `postprocessing` anywhere.
- No scroll-jacking: never `preventDefault` on a wheel, touch or key
  that scrolls (`tests/city-track.test.mjs`).
- A client component in a first load never imports values from
  `app/data/portfolio.ts` (types are fine): pass them as props from a
  server component (as `TopBar` passes the song to `MusicToggle`).
- The "unslop" list (`docs/ui/reels.md`): one primary action, matched
  nested radii, no glow shadows, no identical cards, balanced wrapping,
  not every block arriving the same way, no all-caps labels.

---

## Color Palette

Per paper, in `app/city.css` (`:root, :root[data-paper="cream"]`,
`:root[data-paper="charcoal"]`, `:root[data-paper="kraft"]`), verbatim
from `docs/city/style.md`, each chosen on the colour wheel from its
paper's hue:

| Token | Cream (ivory, hue 41) | Charcoal (near-black) | Kraft (brown, hue 34) |
|---|---|---|---|
| `--paper` | `#efe7d6` | `#080809` | `#c9a77c` |
| `--paper-2` | `#e7dcc6` | `#050506` | `#bf9c70` |
| `--panel` | `#f7f1e5` | `#141416` | `#d6b98f` |
| `--line` | `#c9bca3` | `#2a2b2f` | `#9b7c55` |
| `--text` | `#1d2330` blue-black ink | `#ece6da` chalk | `#22180f` |
| `--muted` | `#50545c` | `#b5afa4` | `#3a2a1d` |
| `--accent` | `#1f4f8a` Prussian blue (complement) | `#e3b55b` gold (complement) | `#1e3a5f` navy (complement) |
| `--accent-hover` | `#2b62a6` | `#edc679` | `#284b78` |
| `--on-accent` | `#f7f1e5` | `#0b0b0c` | `#f4e8d4` |
| `--accent-2` | `#0a6168` teal (split) | `#7fd4df` cyan (the mark's) | `#561710` oxblood (analogous) |
| `--focus` | `#1f4f8a` | `#9fe6ef` | `#1e3a5f` |
| `--shadow` | `#4a3b22` | `#000000` | `#3b2814` |

`--ink` is each paper's darkest ink. `--accent` is the one primary
action's fill; `--accent-2` links, chosen states, the metro line and
marks; body text is always `--text`. `--swatch-*` are the picker's dots.

Contrast floors (`docs/ui/scripts/palette-contrast.mjs`, live
`city-contrast.mjs`): `--text`, `--muted` and `--accent-2` 4.5:1 or
better on every ground, the texture's darkest crease and brightest ridge
included; `--accent` and `--focus` 3:1 on every ground; `--on-accent`
4.5:1 on the accent. Avoid: pure white text, magenta, glow, the city's
old token names (`--cyan`, `--ink-2`, `--seam*`, `--glow-cyan`,
`--focus-halo`, the `--glass-*` colours: `tests/glass.test.mjs`).

---

## Typography

Set in `app/layout.tsx` with `next/font/google` (self-hosted at build,
Latin only, `display: swap`): **Fraunces** (variable weight and optical
size) for the name, headings, section names, the map and the bar's name
(`font-display`, `--font-display`); **Figtree** (variable) for text
(`font-sans`, `--font-text`). No extra tracking and no all-caps labels;
weights 700 for the name and a station's title, 600 headings, 500 quiet
labels, 400 the hero's programme line. Details: `docs/city/style.md`,
"Type".

Body copy is short points, not paragraphs: `.points`, each marked with a
small `--accent-2` diamond. Figures in the text are bold through
`<Figures>` (`lib/figures.ts`). A section's headings go through
`Heading.tsx` (levels 3 to 5, under the station's `h2`).

Prefer large, confident hero type, a clear heading hierarchy, restrained
weights and generous line-height. Avoid decorative fonts.

---

## Layout

- Generous whitespace, strong vertical rhythm, a few strong elements per
  section rather than many small cards. On the journey each stop's panel
  is centred in its stop and substantial, inside the central 80% (`--peek`
  10% clear each side from 768px; phones keep their 16px gutters).
- Wide screens: each stop's words on a paper card (`.panel`): opaque
  `--panel`, a `--line` hairline, a faint `--text` highlight along its top
  and a two-part shadow from `--shadow`, no blur; centred between the bar
  and the map, hanging from one top line (`--hang`), as wide as `--w`;
  wide panels lay their words in columns. Projects: a row of cards, each
  in its own screen. Experience: one stop, the three entries on a simple
  timeline.
- Phones and tall screens (`max-aspect-ratio: 1/1`): each stop a screen
  wide, its words a paper sheet from just under the bar to the map
  (`--stop-band`), edge to edge, rounded at the top, scrolling inside.
- Images match their text: as tall as the words beside them, or as wide
  when stacked; covers never cropped awkwardly.
- Sections lay out by their own column width, never the viewport: one
  `@container` on a wrapper, then `@min-[…]:` variants
  (`tests/city-sections-fit.test.mjs`).
- Read top to bottom, grounds alternate: About, Experience and Contact
  sit on `--paper-2` at 70%, the crumple showing through.
- Corners from `--radius` (10px) and `--radius-lg` (16px); what sits
  inside a panel takes `--radius-in`, the outer radius less the padding.

---

## Navigation

- The top bar (`TopBar.tsx`): the name (home), the section you're at in
  words from 53rem ("03 / 06 · Projects"), Waterloo's time and weather,
  the Paper picker (from 80rem), Sections and the music, all 44px pills.
  It floats over the stage on the journey. It never gains a row it
  doesn't have today, at any width (`docs/city/scripts/bar-fit.mjs`). Tab
  goes through its keys first, then the map.
- The metro map (`ProgressLine.tsx`, fixed along the foot on the journey
  only): the six stops as stations on one `--accent-2` line, each a link
  (44px, 8px apart), the current one a larger filled dot
  (`aria-current="location"`, not colour alone). On phones only the
  current name shows; on short screens and with a very tall bar the dots
  alone. It is the page's one source of where you are (`useSection.ts`).
- The Sections menu (`SectionsMenu.tsx`, a popover) grows from its key,
  the page dims behind it; it jumps along the journey and moves focus
  there; on phones it also holds the Paper picker and the weather.
- The hero's one primary action, "View projects", "Résumé" beside it, and
  its text links (GitHub, LinkedIn, Email).
- The time and weather (`components/weather/WeatherClock.tsx`) is
  something to read, not a control: plain text with a `<time>`, blanks
  while loading, an "as of" tag on an old reading, "Weather unavailable"
  with the time kept, no live region. Open-Meteo's credit is in the
  colophon at the end of Contact (`components/ui/Colophon.tsx`).

Every section is one entry in `app/sections/registry.ts`; the menu, the
map, the bar's words and the numbers are generated from it. Never keep a
second list. To add one: `docs/adding-a-section.md` (starter
`docs/development/section-template/Greenhouse.tsx`, not served).

### Buttons

Every button-like control is a key (`.glass` in `city.css`, the class name
kept from the city): 44px tall, as wide as its words, opaque `--panel`
with an ink edge (`--text` 40% into the panel) and a faint shadow, the
label in `--text`. Tertiary actions stay text links (`.text-link`; on
their own they take 44px). States, the same everywhere:
- `.glass-primary`: the `--accent` fill, an `--on-accent` label
- `.glass-icon`: a square icon key
- hover: under `@media (hover: hover)` only, a wash of `--accent-2`
- chosen (`aria-pressed`, `aria-selected`, `aria-current`, an open
  popover, copied): an `--accent-2` edge doubled inside, pressed in
- disabled: dashed edge, muted label still 4.5:1, no hover or pointer
- focus: the `--focus` ring on a halo of the paper

The press is `components/ui/GlassPress.tsx`, mounted once in the layout:
it answers in `pointerdown`, never delays the action, never stacks, and
settles within `--t-slow`; still view gets a brief tint instead. New
buttons only need the class.

---

## Hero Section

The home stop's panel (`city2d/sections/Hero.tsx`): the name (the page's
one `h1`, `#home-title`), the school and programme (from the education
entry, one line on a desktop card), "View projects" (the accent) with a
"Résumé" key beside it, then GitHub, LinkedIn and Email as text links
(`ProfileLinks.tsx`). `/` always opens on Home. No paragraph, no caption,
no list of sections. Keep it simple; no decorative graphics to fill space.

---

## Project Section

Projects are the most important content (`city2d/sections/Projects.tsx`):
an index of every project, then one `article` per project with a level-3
heading, cover screenshot (never cropped), summary, features (or "My
part" when it lists contributions), the stack as one muted line, GitHub
and an optional live demo, the rest in a native `<details>` whose summary
is a full-width "Show more" / "Show less" key with a turning chevron. On
the journey: the index as the row's first panel, then one panel per
project, each centred in its own screen, Skills after, inside Projects.

Do not invent projects. Keep them polished but restrained: soft surfaces,
hairlines, gentle hover; no huge shadows, heavy animation or badge
clutter.

Interests (`sections/Interests.tsx`) are native `<details>` rows (each
summary a full-width "Show" / "Hide" key) with optional photos read from
`public/interests/<scene>/` at build time. To add photos:
`docs/adding-interest-photos.md` (no code; captions in `portfolio.ts`).

---

## Motion

Lively, by my amendment of 2026-11-23, and never in the way of reading
(`docs/ui/ux-motion-principles.md`: apply its principles to interface
work). Every stop has its own choreographed arrival as the journey reaches
it (the panel, then its heading, pictures, points and links in sequence,
`--stagger` apart), on the runway's timeline (`--at`, `city-track.css`),
so scrolling back plays it in reverse; live hover and press feedback on
every control; the map animating between stations; the papers'
cross-fade. Transform and opacity only. Where there's no scroll timeline,
the stops simply show (`ui/arrive.ts`). The paper itself never moves.

The tokens are in `city.css` (`--ease-out`, `--ease-in-out`,
`--ease-spring`, `--t-fast` 120ms, `--t-base` 200ms, `--t-slow` 280ms,
`--stagger` 60ms); no transition writes its own duration or curve.
Nothing loops (`tests/city-motion.test.mjs`).

Still view is `html[data-still="on"]`, set before first paint by
`lib/still.ts: STILL_SCRIPT` from `prefers-reduced-motion` alone:
fully readable and motionless. No arrivals, jumps cut, the paper changes
at once. `lib/stillStore.ts` keeps it in step with the system's setting
while the page is open. Every animation sits behind that guard and the
reduced-motion query. No scroll hijacking.

---

## Responsive Design

Every change must work on mobile, tablet, laptop and large desktop, in
all three papers. Checked by `docs/ui/scripts/mobile-audit.mjs` (`/` and
each anchor as the journey's stop it lands on, the open menu, the weather
display, the metro map and the résumé dialog, at 320, 390, 430, 768, 1024
portrait and landscape, 1440, 1600, 844×390 and 667×375, plus 200% text
at 320, 390 and 844×390; headless Chrome with touch and emulated notch
insets, not a real device):

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
visible focus, keyboard access to everything (the picker included), no
information by colour alone, decorative images `alt=""`. The journey
reads in order for a keyboard and a screen reader (focus brings its stop
on); the page reads top to bottom without scripts. Under
`prefers-contrast: more` the texture goes, the cards and keys are edged
in `--text` with no shadow. Do not sacrifice accessibility for visual
styling.

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
`app/city.css`, `app/city-track.css`, `app/paper.css`, `app/layout.tsx`,
`app/sections/registry.ts`, `TopBar.tsx`, `CityTrack.tsx`, `budget.mjs`)
are edited by one session at a time, never by parallel agents.

The icons and share card are drawn in code:
`scripts/identity/make-identity.mjs` (from `mark.svg`, in cream's colours;
the card a sheet of crumpled cream paper with the name in Fraunces and
Figtree, read from a running copy of the site: pass its address) writes
`app/icon.svg`, `app/favicon.ico`, `app/apple-icon.png` and
`public/share-card.jpg`. Rerun it after changing the mark, cream's
colours or the fonts.

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

The scripts and what they measure:
- `docs/audit/scripts/budget.mjs`: bundle budgets; no three.js in the
  build. `lighthouse.mjs`: cold runs, LCP and CLS per URL.
  `shots.mjs`: screenshots of every route.
- `docs/ui/scripts/track-journey.mjs`: the journey's guarantees (wheel,
  keys, scrollbar and swipes reach Contact and back; anchors cold and
  Back/Forward; a resize keeps the stop; long panels scroll inside and
  hand on; no scripts reads top to bottom). `NO_TIMELINE=1` runs it as a
  browser without scroll timelines would.
- `docs/ui/scripts/mobile-audit.mjs`: the guarantees above.
  `responsive-shots.mjs`: the pages at every width.
  `city-contrast.mjs`: every word at every stop on each paper, at
  1440×900 and 390×844. `glass-contrast.mjs`: the keys' labels on each
  paper. `glass-states.mjs <base> <out> <paper>`, `glass-press.mjs`: the
  keys' states and press. `palette-contrast.mjs`: every paper's pairs,
  the texture's extremes included. `resume-viewer.mjs`: the résumé
  dialog. `weather-display.mjs`: the time and weather display.
- `docs/city/scripts/bar-fit.mjs`: the bar's height at every width against
  a baseline (`docs/city/bar-baseline.json`, or a newer run's output).

### Open

- No production build or budget reading since the paper redesign.
- Simulated-phone largest paint was 2.8 to 3.0 s against the 2.5 s target
  with the panorama; not re-measured on paper.
- The weather capsule shifts the layout slightly when its reading arrives
  (CLS up to 0.01).
- `bar-fit.mjs` depends on the live weather's words, so it can fail at a
  width without any change to the bar.
- Browsers without scroll timelines (Firefox, older Safari) get the
  journey but no arrivals.
