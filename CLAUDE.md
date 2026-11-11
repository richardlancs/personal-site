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

This project uses:

- Next.js with the App Router
- React
- TypeScript
- Tailwind CSS
- npm

Do not replace the existing stack unless I explicitly ask.

Avoid adding new dependencies unless they provide a meaningful benefit.
Prefer built-in Next.js, React, CSS, and Tailwind functionality.

---

## Project Structure

The main application lives under:

- `app/`
- `app/components/`
- `app/data/`
- `public/`

Important files include:

- `app/page.tsx` — homepage
- `app/layout.tsx` — root layout
- `app/globals.css` — global styling
- `app/data/portfolio.ts` — portfolio content/data

Prefer reusable components over putting everything into `page.tsx`.

Keep content/data separate from visual components where practical.

---

## Design Direction

The site is a small real-time 3D world: an abandoned, overgrown Japanese
park and the places around it, in autumn. Its light and weather follow
Richmond Hill's: the time of day from the local clock and that day's
sunrise and sunset, and clear, cloudy, rain or snow from the current
reading (`world3d/atmosphere/`, driven by `components/weather/`; the
neutral look, close to late-afternoon light, when there's no reading).
It is built with three.js and React Three Fiber in
`app/components/world3d/`, and every model and texture there is generated
in code from fixed seeds (no downloaded models, no Blender). The painting
`app/assets/park/park-v04.png` is the art reference, and the fallback when
WebGL isn't available. What was built and how it was checked:
`docs/weather/report.md`.

Six places, each its own 3D scene: the park (home; its notice board opens
the map at `/map`), the workshop (Projects, Skills), the station
(Experience), the arcade (Interests), the pavilion reading room (About) and
the phone booth (Contact). The URL picks the place; `World3D.tsx` moves the
camera there. Each page's HTML panel and its 3D objects share state through
`world3d/store.ts`. Progress, decisions and limits:
`docs/world/3d-progress-log.md`.

Every section is one entry in `app/sections/registry.ts` (address, names,
glyph, scene, where it is in the painting and on the map, metadata) plus
one page file. The menu, the home page's tags and list, the map, the park's
name tags and the links at the foot of each page are generated from the
registry: never keep a second list of sections anywhere. To add one, follow
`docs/adding-a-section.md`; the starter page is
`docs/development/section-template/page.tsx` (not served).

Phones, portrait tablets and short windows get the same world, at the
mobile renderer tier (`World3D.tsx`: pixel ratio capped at 1.25, 2x
antialiasing, 512px shadow maps, no brushwork, no drag-to-look), framed
in the upper part of the screen; the page is a cream sheet that comes up
over the lower part (`globals.css`, the narrow-layout block, `--hero`),
with everything written out in one column. The world stops drawing once
the sheet has been scrolled over all of it. Where WebGL is missing the
painting `app/assets/park/park-v04.png` stands in on every layout. Both
layouts render the same content from `app/data/`. The two media queries
that decide which layout a screen gets are in `components/world/flat.ts`
and, identically, in `globals.css` (`npm test` checks they match). Use
`.only-flat` / `.only-world` for anything that belongs to one layout.
Buttons are glass (see "Buttons" below); panels are cream paper.

The overall feeling should be:

- warm
- calm
- nostalgic, quietly lonely, never frightening
- polished
- recruiter-friendly: content stays readable and easy to skim

Build scenery as 3D in `world3d/`, through the shared painted material
(`paint.ts`), not as CSS or SVG. Keep text on paper or open sky, never over
busy scenery. Real content stays in HTML.

---

## Color Palette

One fixed theme: warm cream paper under a baby-blue interface. Cream
`#fff9f2`, sky `#55c6f0`, sand `#e5ddd4`, ink `#1d1e1e`, error `#fb5745`
(from Monkeytype's "Soaring Skies"), and the interface's blues: baby blue
`#b8dcfa`, hover `#9bcbf1`, pale `#eaf5ff`, light `#f7fbff`, line
`#c6dff0`, slate text `#203245`, focus `#326e9f`. They are named once at
the top of `app/globals.css`; every component uses the semantic tokens
derived from them (`--background`, `--paper`, `--surface-2`,
`--surface-deep`, `--foreground`, `--muted`, `--accent`, `--mark`,
`--highlight`, `--focus`, `--shadow`, `--glass-*`, …). Baby blue is for
surfaces, chosen states, washes and strokes, never text: text and links
use slate, `--accent` (`#23527c`, a deep baby blue) or `--mark`. Cream
stays for paper, which suits the scenery. The enamel objects (timetable, the
cabinets' screens, the notebook's cover) are a deep slate blue
(`--surface-deep`); the contact page's phone line is a pale-blue slip
(interface, not part of the green booth). Indigo is gone from the interface (`npm test` checks).
There is no dark theme and no toggle; `npm test` checks that none comes
back. The 3D scenes' skies, fog and thresholds are tuned to the same
family; the landscape stays natural.

Avoid:
- large areas of pure black or pure white
- neon or highly saturated colors
- rainbow gradients
- excessive glassmorphism
- a second theme, or anything keyed on `prefers-color-scheme`

Keep text contrast at 4.5:1 or better on paper and on every sky.

---

## Typography

Two typefaces, set in `app/layout.tsx`: Shippori Mincho B1 for headings and
place names (`font-display`), Zen Kaku Gothic New for text (`font-sans`).
Only their Latin is used, so they load with `next/font/local` from the five
Latin files in `app/fonts/`. Don't move them back to `next/font/google`:
for these Japanese families it ships every Unicode slice (about 200 KB of
CSS, and 8 MB of preloaded files). Noto Serif SC, for the Chinese on the
world's signs, is a 9 KB local subset of just the characters the signs
use (`app/fonts/signs.txt`; `npm test` checks nothing is missing, and
says how to regenerate the file).

Body copy is written as short points, not paragraphs: `.points` (a rust
dash in the margin) on paper, `.notebook-points` in the notebook.

Prefer:

- large, confident hero typography
- clear heading hierarchy
- comfortable body text
- restrained use of font weights
- generous line-height
- strong readability

Avoid excessive font sizes and decorative fonts.

---

## Layout

Use:

- generous whitespace
- strong vertical rhythm
- centered content containers
- responsive layouts
- large editorial sections
- clean alignment

Prefer a few strong elements per section rather than many small cards.

The site should feel spacious rather than dense.

---

## Navigation

There is no row of tabs. Visitors get around by going to places in the
park; the camera moves there. The plain alternatives, always one step away:

- the **Sections** menu in the top-right corner, labelled the same on both
  layouts (every section, including Skills, with its place in the park
  beside it on wide screens)
- on the home page, the introduction with "View projects" and "Contact"
- the notice board's map (`/map`)
- "Back to the park" and Escape on every place's page
- on the flat layout: the bar along the top (the way back, Sections), tags on
  the painting, and "Elsewhere in the park" at the foot of each page

Every place is a real URL, so browser history, deep links and the keyboard
work. Keep the corner controls few and small (44px glass keys).

Beside Sections is Richmond Hill's time and weather
(`components/weather/WeatherClock.tsx`): not a control but something to
read, a small capsule of clear glass (a few percent of tint, a 6px blur,
a thin bright edge) as wide as its words, plain selectable text with a
`<time>`. No button, focus, hover, press or details. Its words carry
their own contrast: slate with a cream halo by day, cream with a dark
halo at night. On narrow screens it takes a row of its own under the bar
and wraps if it must. It never shows a value it doesn't have: blanks
while loading, an "as of" tag on an old reading, "Weather unavailable"
(with the time kept) when there is none. No live region: the minute tick
isn't announced. Open-Meteo's credit (its licence asks for one) is in
every page's footer (`components/ui/Colophon.tsx`).

On wide screens a page's column takes one half of the screen and its place
the other, and sits in the middle of its half (`.location` in
`globals.css`), so wide monitors stay balanced. Corners come from the
`--radius*` tokens: one family of soft edges everywhere.

### Buttons

Every button and button-like control is glass (`.glass` at the end of
`globals.css`), including the bench tabs, the cabinets, the timetable's
lines, the notebook's page turns, the screenshot thumbnails and the
Sections slip's entries: a 10px-cornered rectangle as wide as its words,
44px tall, a little baby blue over a backdrop blur, a thin baby-blue
edge, a light line along its top; the label is opaque slate. The base
rule is in `:where()`, so a control's own class sets its size, type and
layout (and keeps a small sign of its own: the bench tab's power light,
the cabinet's screen). Tertiary actions stay text links (`.text-link`);
the scene's name tags and map pins are scenery, not buttons.

The states, the same on every control:
- secondary `.glass`; primary `.glass-primary`, a stronger blue and a
  heavier label; `.glass-icon`, a square icon key
- hover: a little more blue
- chosen (`aria-pressed`, `aria-selected`, `aria-current`,
  `data-copied`, an open popover): baby blue, a double focus-blue edge,
  pressed in (a shade inside, no lift), so not colour alone
- disabled (`:disabled`, `aria-disabled="true"`): no glass, a dashed
  edge, a muted label (still 4.5:1); no hover, press or pointer
- focus: the focus-blue ring on a cream halo (`--focus-halo`)

Where something dark can sit behind it (the corner controls, bench tabs
and cabinets over the world, the timetable's enamel) the glass is
thicker (`--tint`), near-opaque under a dark sky, so words keep 4.5:1
(`docs/ui/scripts/glass-contrast.mjs` measures it over every sky;
`glass-states.mjs` checks and photographs every state).

The press is `components/ui/GlassPress.tsx`, mounted once in the layout:
one listener sets `data-pressed` and the press point on whichever `.glass`
is pressed (the middle for the keyboard), and CSS does the rest: a 98%
give, a ripple of light from the press point, a curved sheen, settled in
0.42 s; only scale, translate and opacity, under the label. It never
delays the action and never stacks. Still view and reduced motion get a
brief tint instead. New buttons only need the class.

---

## Hero Section

The hero should prioritize:

1. My name
2. My professional/academic headline
3. A concise introduction
4. Primary call to action
5. GitHub / LinkedIn links where appropriate

Keep the hero simple.

The introduction is the name, the subtitle `cs@uwaterloo`, View
projects and Contact, and the GitHub / LinkedIn / Résumé links: no
paragraph. The name is its one bold element (`.park-name`): slate-blue
Shippori Mincho with a baby-blue brushstroke under it, brushed in once on
arrival. Over the park there is no card behind the introduction: by day
the name, the subtitle and the links each sit on their own soft, blurred
cream backing; at night (`.world3d`'s `data-sky-daylight`) the backings
fade and the words turn cream with a faint dark halo, so nothing glows
like a lamp. `docs/ui/scripts/intro-contrast.mjs` measures every line
over all 16 skies.

Do not add unnecessary decorative graphics just to fill space.

---

## Project Section

Projects should be the most important portfolio content.

Project components should support:

- title
- description
- technologies
- GitHub link
- optional live demo
- optional image
- optional longer project page in the future

Do not invent projects.

Keep project cards visually polished but restrained.

Prefer:
- soft surfaces
- subtle borders
- rounded corners
- gentle hover behavior

Avoid:
- huge shadows
- excessive animation
- cluttered technology badges

---

## Motion

Animations should be subtle. Words never wait for the world: a page's
content comes in within about 0.1 s of arriving (`--arrive-delay`) while
the camera's journey, a second or so, plays behind it. Interface
transitions are 150–300 ms; a glass button's press settles in 0.42 s. The
world stops drawing when the tab is hidden.

Preferred:
- opacity transitions
- small translate transitions
- gentle hover effects
- approximately 200–400ms durations

Respect `prefers-reduced-motion`.

Do not add:
- excessive parallax
- animated cursors
- distracting background animations
- unnecessary page loaders
- constant movement

---

## Responsive Design

Every change must work on:

- mobile
- tablet
- laptop
- large desktop

Do not optimize only for my current browser size.

What's guaranteed, and checked by `docs/ui/scripts/mobile-audit.mjs`
(every route, the open Sections menu, the weather display and the résumé dialog, at
320, 390, 430, 768, 1024 portrait and landscape, 1440, 844×390 and
667×375, plus 200% text at 320, 390 and 844×390; headless Chrome with
touch and emulated notch insets, not a real device):

- no sideways scroll, and nothing reaching past the screen
- every target at least 44×44 CSS px on touch, and none overlapping or
  closer than 8px. Links inside a sentence are exempt; links that stand
  on their own (the home page's GitHub / LinkedIn / Résumé, "Home",
  "Open the map", the directory's lines) stay text links but take 44px
  (`.text-link` sizing near the top of `globals.css`)
- no text under 12px; body copy on phones at 16px
- the corner controls, menus, the weather display and the résumé's bar clear every
  `env(safe-area-inset-*)` (top, sides in landscape, the home bar)
- menus and dialogs fit the screen, scroll inside, and don't scroll the
  page behind (`overscroll-behavior: contain`)
- labels wrap or the bar wraps; nothing clips. The bar is a size
  container: when it's narrow for its words (under 22.2em of its own
  text, a 379px phone or larger text on any phone) the way back is its
  arrow alone, and the time and weather may take two lines. With very
  large text on a phone (under 18em) Sections is its map alone too and
  the display drops the place visually (it's still read out), so the
  fixed bar doesn't cover the page
- words longer than a line break rather than push the page sideways
  (`overflow-wrap: anywhere` on the sheet), since a phone otherwise
  widens its layout viewport and the fixed bar and dialogs spill with it.
  Glass labels and the map's labels use `break-word` instead, so a key
  never shrinks round one letter; a place's title and the name are
  capped at 13vw so they stay whole
- glass on the sheet has no backdrop blur on phones (it sits on opaque
  cream); only the bar's keys blur, over the world
- hover only adds: put `:hover` styles under `@media (hover: hover)` so
  a tap doesn't leave them stuck (the audit lists any that aren't)
- on a touch screen under 480px the map's drawing is a picture (its pins
  can't be 44px apart there); the list under it takes the taps

Check especially:

- navigation
- hero typography
- project cards
- spacing
- overflow
- buttons
- contact links

---

## Accessibility

Maintain good accessibility.

Use:
- semantic HTML
- appropriate headings
- keyboard-accessible controls
- visible focus states
- useful alt text
- sufficient color contrast

Do not sacrifice accessibility for visual styling.

---

## Content Rules

Never invent:

- projects
- employers
- jobs
- internships
- awards
- grades
- technologies I know
- years of experience
- GitHub usernames
- LinkedIn URLs
- email addresses
- statistics

If something is unknown, either:
1. ask me, or
2. leave an obvious placeholder.

Do not use generic AI-written statements such as:

"Passionate developer creating innovative digital experiences."

Prefer concise, natural language.

---

## Coding Style

Use TypeScript.

Prefer:
- simple components
- meaningful names
- reusable components
- clear props
- readable code
- straightforward solutions

Avoid:
- premature abstraction
- giant components
- unnecessary state
- unnecessary client components
- unnecessary dependencies
- overly clever code

Use Server Components by default when possible.

Only use `"use client"` when client-side behavior actually requires it.

---

## Editing Rules

Before making a large change:

1. inspect the relevant existing files
2. understand the current implementation
3. preserve functionality that is unrelated to the request
4. make the smallest reasonable set of changes

Do not rewrite unrelated sections of the site unless necessary.

For major redesigns, explain the plan before implementing it.

---

## Validation

After significant code changes, run:

```bash
npm run lint
npm test
```
