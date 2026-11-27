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
- `app/fonts/`: Fredoka and Nunito, Latin woff2, with their OFL texts
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
- `app/components/ui/`: `DayNight`, `GlassPress`, `Arrivals`,
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
architecture to the new designed background"; "Keep the sideways journey".
Round 8 (25 November 2026) cut the papers to two, day and night, with one
day/night key: "get rid of the kraft theme and change the theme shifter
into a night and day button". The style sheet is
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

Two: day is cream, night is charcoal. `<html data-paper="cream|charcoal">`,
set before the first paint by `lib/paper.ts: PAPER_SCRIPT` from
`localStorage["paper"]` (cream when missing, unknown, an old `kraft`, or
blocked), so no flash. Chosen by the visitor, never by the system's
appearance (no `prefers-color-scheme`). The day/night key (`ui/DayNight.tsx`):
one square glass icon key (`.glass-icon`, 44px) in the bar at every width,
before Sections; "Night mode", `aria-pressed` at night; hidden without
scripts. Its icon is an outline sun that turns into an outline crescent
moon (the rays draw in and turn away, the disc grows, a carving circle
slides over it: an SVG mask cuts the disc's edge, the same circle's edge
clipped to the disc draws the inner curve), over `--t-morph` (460ms) on
`--ease-in-out`, and back. It is drawn from `data-paper`, so it is right
from the first paint and nothing turns on load. Hover (`hover: hover`
only) plays a small part of the turn (the rays in a little, the circle
peeking over the sun; at night the circle backing off) over `--t-base`
and takes it back. Still view: an instant swap, nothing on hover. A press
saves, sets `data-paper` and the `theme-color` at once, with a cross-fade
(a view transition over `--t-slow`; instant in still view).

The texture (`app/paper.css`): one inline SVG drawn in code (crease noise
lit as a surface, a fine grain, fixed seeds, about 1.3 KB gzip), on a
fixed `body::before` (body is `isolation: isolate`), never moving: the
stops travel over one still sheet. Cream takes it in `soft-light`;
charcoal its own specular sheet in `screen` (light on the ridges). Its
strength per paper is `--crumple`. Gone under `prefers-contrast: more` and
forced colours.

### The doodles

Round 10 (27 November 2026), my words: "add some things onto the paper to
give it some more personality that change with light and dark theme".
Line drawings in one hand (`city2d/Decor.tsx`, a server component; rules
at the end of `city-track.css`), each a day drawing (`.d`: pencil and ink
on cream) and a night one (`.n`: chalk and gold leaf on charcoal), the
paper showing its own: at Home a margin note, paper stars (night: gold),
a coffee ring (night: a moon in a halo), a sun (night: a constellation;
only where it can be 5rem or more) and a crop mark at the hero's top-left;
an arrow in the left margin of every later stop (an arc, a loop or a
wave, each its own height and turn); at Projects a note and a paper clip
on the index (steel, then gold); at Contact a note, a paper plane, a crop
mark at its top-right, and, where its margins are 12rem or more, a
postage stamp and a pencil (night: a worn stick of chalk).
Round 11 (27 November 2026), my words: "add some mathematics and computer
science themed stuff to fill the page with … through out all pages": a
small neural network (Home), a sigmoid and a linked list (About), O(n log n)
and a git branch and merge (Projects), a binary tree and the sum of the
first n numbers (Background), P(win | hand) and a bell curve (Interests),
"Hi" in binary (Contact); by night in chalk, the nodes in `--accent-2`.
The paper clip sits on the projects' index card itself (`PaperClip`), so
it goes where the card goes. A doodle in a stop's left margin sits wholly
inside its first 10% (the peek the stop before shows) or wholly past it.
Round 12: two equations in every gap between the project cards, one in
each half, so each project's screen has one at either side (`ProjectGaps`);
"my work" sits on the index card beside its heading (`IndexNote`).
They ride on the track beside their stop's panel (`decor` on `Station`),
never under its words, placed and sized inline (`--x`, `--y`, `--s`,
`--r`) so the CSS is a few rules. Only on the journey; on phones only the
ring (smaller, to one side, `--xp`/`--sp`); the notes from 1200px wide (words in `portfolio.ts: marginNotes`);
none under more contrast or forced colours. `aria-hidden`, no pointer,
nothing moves (`tests/city-decor.test.mjs`).

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
  768px wide (phones read top to bottom: round 11), 320px and 22em tall in the root's text size (`trackMath.ts:
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
  always`. ArrowLeft/Right and PageDown/Space use the same list, and
  CityTrack's `trackplace` event tells the map and the menu which
  section you're at (the bar names no place: round 8).
- Every jump (map, menu, anchors, Next links, keys) glides to its place:
  eased, 0.6 s for a hop to 1.6 s at most (`trackMath.ts: glideMs`),
  snapping let go meanwhile (`data-free`), giving way at once to your own
  scroll; it cuts in still view. A resize or a turn keeps the place.
- A panel taller than the stage scrolls inside, only once the journey
  has stopped with all of it on the screen (`data-open`); at its end the
  scroll chains on. While it has more below, its words fade into the
  paper at its foot (`::before`) and a small "More ↓" pill sits on the
  solid part of that fade (`::after`), its place kept at the foot so it
  never covers a word. Each panel ends with a "Next: … →" link
  (`Station.tsx: NextStop`).
- The panels and the phone sheets are clear glass over the crumple
  (round 7): a whisper of `--panel` (6%), no blur, fine vertical reeds,
  one corner sheen, a crisp inner top highlight and a second inner edge
  in the paper's own light (`--hi`), a rim (`--rim`: darker on cream,
  light on charcoal) and the soft two-part `--shadow`. Solid
  `--panel` under `prefers-contrast: more`; no texture under forced
  colours. Nothing in it moves.
- Without scripts, under the sizes above, in print, or after the
  fallback, the page reads top to bottom.

### Budgets (`docs/audit/scripts/budget.mjs`)

Bundles (gzip bytes; limits only go down): `homeInitialJs` ≤ 203,000;
`totalJs` ≤ 214,000; `totalCss` ≤ 13,300; `resumeJs` ≤ 470,000;
`resumeCss` ≤ 2,500. It also fails on three.js in any chunk and on any
stylesheet `/` doesn't link (besides the résumé's). Fonts are not in
these: Fredoka and Nunito are about 68.9 KB of woff2, both preloaded
(Newsreader, its italic and Hanken Grotesk were 118.5 KB). Latest reading
(round 13, 27 November 2026): `totalCss` 13,248 (the scrapbook's rules
folded into `city.css`: one stylesheet compresses smaller),
`homeInitialJs` 198,608, `totalJs` 204,243.

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

Per paper, in `app/city.css` (`:root, :root[data-paper="cream"]` for day,
`:root[data-paper="charcoal"]` for night), verbatim from
`docs/city/style.md`, each chosen on the colour wheel from its paper's
hue:

| Token | Cream, day (ivory, hue 41) | Charcoal, night (near-black) |
|---|---|---|
| `--paper` | `#efe7d6` | `#080809` |
| `--paper-2` | `#e7dcc6` | `#050506` |
| `--panel` | `#f7f1e5` | `#141416` |
| `--line` | `#c9bca3` | `#2a2b2f` |
| `--text` | `#1d2330` blue-black ink | `#ece6da` chalk |
| `--muted` | `#50545c` | `#b5afa4` |
| `--accent` | `#6b4d18` antique bronze (night's hue, deepened) | `#c99a3e` gold leaf (complement) |
| `--accent-hover` | `#735520` | `#d9ad55` |
| `--accent-fill` | brushed bronze: `#523a10` to `#694d1b`, a top-edge highlight | foil: `#ad7f30` to `#e6c477`, a top-edge highlight |
| `--on-accent` | `#f7f1e5` | `#0b0b0c` |
| `--accent-2` | `#0a6168` teal (split) | `#7fd4df` cyan (the mark's) |
| `--focus` | `#0f7c86` bright teal | `#9fe6ef` |
| `--shadow` | `#4a3b22` | `#000000` |

`--ink` is each paper's darkest ink. `--accent` is the one primary
action's fill; `--accent-2` links, chosen states, the metro line and
marks; body text is always `--text`.
`--focus` is each paper's own ring, a brighter cousin of its `--accent-2`
and never the accent fill's colour, so a focused primary key shows its
ring apart from its face (round 7: cream's was the old navy accent). Reasoning for the round 7 accents:
`.superpowers/sdd/2026-11-22-horizontal-city/task-13/A/accents.md`.

Contrast floors (`docs/ui/scripts/palette-contrast.mjs`, live
`city-contrast.mjs`): `--text`, `--muted` and `--accent-2` 4.5:1 or
better on every ground, the texture's darkest crease and brightest ridge
included; `--accent` and `--focus` 3:1 on every ground; `--on-accent`
4.5:1 on the accent. Avoid: pure white text, magenta, glow, the city's
old token names (`--cyan`, `--ink-2`, `--seam*`, `--glow-cyan`,
`--focus-halo`, the `--glass-*` colours: `tests/glass.test.mjs`).

---

## Typography

Set in `app/layout.tsx` with `next/font/local` from `app/fonts/` (OFL
texts alongside; the Latin subsets as Google Fonts cuts them, so the
stylesheet carries one `@font-face` per face, not one per script:
`display: swap`; copyright lines exactly as in google/fonts). Round 8,
my words: "use a font that shows a lot of personality almost like a
childlike happiness". **Oleo Script** at its bold (OFL, a rounded brush script; round 13, 27
November 2026: "use the one that is most professional" of the free fonts
close to Tentsurfer, whose free file is for personal use only and doesn't
cover a webfont) for the headings: the name, each station's title and
the headings in every section (`h3`; "implement the font into each of the
sections"), as `--font-heading`; **Fredoka** (variable weight, round and
bouncy) for the quiet `h4` labels, the keys, the map and the bar's name
(`font-display`, `--font-display`); **Nunito** (variable, a soft rounded
sans) for text (`font-sans`, `--font-text`). The name is upright, never
italic. No extra tracking and no all-caps labels; weights 700 for a
station's title, the name and the bar's name, 600 headings, 500 quiet
labels, 400 the hero's programme line.
Details: `docs/city/style.md`, "Type".

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
- Wide screens (laptop and up): every card centred between the bar and
  the map (round 11, "make the first home page block vertically centered
  … through out all pages").
- Wide screens: each stop's words on a pane of clear glass (`.panel`,
  "The journey" above: the crumple shows through, reeds, a corner sheen,
  a `--rim` and a two-part shadow from `--shadow`, no blur); centred between the bar
  and the map, hanging from one top line (`--hang`), as wide as `--w`;
  wide panels lay their words in columns. Projects: a row of cards, each
  in its own screen. Experience: one stop, the three entries on a simple
  timeline.
- Phones and tall screens (`max-aspect-ratio: 1/1`): each stop a screen
  wide, its words a sheet of the same glass from just under the bar to the map
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

- The top bar (`TopBar.tsx`): the name (home), Waterloo's time and
  weather (from 820px; in the Sections menu below), the day/night key,
  Sections and the music, all 44px pills. No place label (round 8). Under
  368px the name steps down and Sections drops its icon (its name stays
  in words), so the bar keeps one row.
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
  there; under 820px it also holds the weather.
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
kept from the city): 44px tall, as wide as its words, clear glass (no
fill: the paper shows through) with a crisp ink edge (`--text` 40% into
the panel) and a faint shadow, the label in `--text`. Tertiary actions
stay text links (`.text-link`; on their own they take 44px). States, the
same everywhere:
- `.glass-primary`: the textured accent face, an `--on-accent` label
  (4.5:1 over every grain of it): one brushed grain (`--key-grain`, an
  inline SVG noise, fixed seed, in `soft-light`) over `--accent-fill`
  (charcoal's gold-leaf foil) over the flat `--accent`; hover lays a
  wash of `--accent-hover` over it, the grain kept; chosen, still view's
  tint, more contrast and forced colours are flat
- `.glass-icon`: a square icon key
- hover: under `@media (hover: hover)` only, a translucent wash of
  `--accent-2` (10%; chosen 12%)
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

Interests (`sections/Interests.tsx`) are a picker (round 12, my words:
"a vertical selection box on the left side with a large portion given to
place photos"): a column of keys on the left, each the label of a hidden
native radio button (no script needed, arrow keys move the choice), and
the chosen interest's scrapbook page taking the rest, most of it a large
stack of polaroids (`Scrapbook.tsx`) whose flips animate (the top one
tossed off to the left and under the stack; back, pulled out onto the
top; none in still view). Narrower than 40rem, each page under its key.
Photos read from `public/interests/<scene>/` at build time. To add photos:
`docs/adding-interest-photos.md` (no code; captions in `portfolio.ts`).

---

## Motion

Lively, by my amendment of 2026-11-23, and never in the way of reading
(`docs/ui/ux-motion-principles.md`: apply its principles to interface
work). Every stop has its own choreographed arrival as the journey reaches
it (the panel, then its heading, pictures, points and links in sequence,
`--stagger` apart), on the runway's timeline (`--at`, `city-track.css`),
so scrolling back plays it in reverse; live hover and press feedback on
every control; the map animating between stations; the day/night
key's sun turning into the moon and the papers' cross-fade. Transform and opacity only. Where there's no scroll timeline,
the stops simply show (`ui/arrive.ts`). The paper itself never moves.

The tokens are in `city.css` (`--ease-out`, `--ease-in-out`,
`--ease-spring`, `--t-fast` 120ms, `--t-base` 200ms, `--t-slow` 280ms,
`--stagger` 60ms, `--t-morph` 460ms for the day/night key's turn); no
transition writes its own duration or curve.
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
both papers. Checked by `docs/ui/scripts/mobile-audit.mjs` (`/` and
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
visible focus, keyboard access to everything (the day/night key included), no
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
the card a sheet of crumpled cream paper with the name upright in
Fredoka and the rest in Fredoka and Nunito, read from a
running copy of the site: pass its address; cream's colours read from
its tokens in `city.css`) writes
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
