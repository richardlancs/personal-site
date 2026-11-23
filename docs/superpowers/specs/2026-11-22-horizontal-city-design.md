# The horizontal city: design

Date: 2026-11-22. Owner's words: "remove the 3d version entirely, make the 2d version horizontally focused and make it
so that the areas go from one to another all forming the city instead of just using the city as a header … refer to my
instagrams ui ux … saved videos and use those".

## Intent

Today `/` is a vertical page; each section has its own painting as a header band, and the painting stops where the
words begin. The owner wants one city you travel *along*: the six sections are six stretches of one continuous
skyline, and the words live in that city, not under it. The 3D city goes away.

The portfolio's job still comes first: a recruiter finds the name, the projects and the contact links in seconds.

## Sources: the owner's saved "Design" reels (`docs/ui/reels.md`)

Taken into this design:
1. **Closure:** every stop leaves a slice of the next stretch of city in view, so going sideways needs no arrow.
2. **Motion:** slow in and out, interruptible, responding in under ~300 ms, rubber-banding at both ends
   (the 19 principles, already `docs/ui/ux-motion-principles.md`).
3. **One connected line** joins the six stops (a metro line along the foot of the screen), the current one lit.
4. **One warm accent on a cool city:** the lantern colour only on the primary action.
5. **Glass only where it has a reason:** over the painting. Never as decoration on flat ground.
6. **The "unslop" audit (20 points):** one primary hero action, matched nested radii, no glow shadows, no
   identical cards, balanced wrapping, not every section fading in the same way, restrained all-caps.
7. **Depth:** the sky and the far skyline move slower than the street (parallax); nothing moves in still view.
8. **Peak-end:** Contact is the best-lit stop with a clear success moment (email copied).
9. **Figure-ground:** the city dims behind the menu and the résumé dialog; menus grow from their key.
10. **One quiet texture** ties the stops into one plan (a faint blueprint grid or grain in the ground).

## Goals

- One continuous painted panorama, day and night, of the six stretches in order: the riverside skyline (Home), the
  old brick lanes (About), the towers with screens (Projects), the elevated metro (Experience), the bright shopping
  street (Interests), the riverfront with the clock tower (Contact). Each stretch blends into the next in the
  painting itself (no hard cuts).
- Scrolling as usual (wheel, trackpad, keys, scrollbar, touch) moves you sideways along the city. Native scroll:
  no hijacking, no smoothing of the wheel. Snapping to stops only as CSS scroll snap does, and never trapping.
- Each section's content sits in the lower part of its stretch on dark glass, sized to the screen's height; long
  content runs sideways (Projects: one stop per project; Experience: a timeline along the metro line).
- A metro-line map at the foot is the section selector and progress; the Sections menu and `/#anchors` jump along.
- Light and weather still follow Richmond Hill (day, night, dusk blend, rain, snow) over the whole panorama.
- Works on phones (the same journey sideways, by swipe or vertical scroll), tablets, laptops, large screens;
  keyboard and screen readers read it in order; 200% text works.

## Non-goals

- Any 3D, WebGL or three.js. `/city*` redirects to `/`.
- New content. Everything still comes from `app/data/portfolio.ts`.
- A light theme.

## Anti-goals (a failure even if it works)

- Scroll-jacking: the page decides how far a wheel tick goes, or you can't get out of a section.
- Words over busy painting with poor contrast; anything under 4.5:1.
- A slow first paint: the home stretch must paint as fast as today's band (only it loads early).
- "AI slop": glow everywhere, identical cards, a fade on every block.

## Approaches considered

**Scroll mechanics.**
- (Chosen) A sticky full-screen stage whose track moves sideways as the page scrolls down: `position: sticky`
  stage, page height = track width, `translateX` from scroll progress (CSS scroll-driven animation where supported,
  a small rAF listener elsewhere). Every input that scrolls a page works; anchors and keys work; no wheel capture.
- Native `overflow-x` with scroll snap. Touch and trackpads swipe well, but a mouse wheel does nothing without
  remapping the wheel, which is scroll-jacking. Rejected for the main path.
- Vertical page with the painting continuing down the side. Not "horizontally focused". Rejected.

**The continuous city.**
- (Recommended) A new panorama painted in ChatGPT in segments, each continuing the previous one's right edge, day
  and a matching night version; joined in code with feathered overlaps and cut into tiles that load as they near
  the screen. Composed with a calm dark street or river walk across the lower third for the content.
- Reuse today's six plates with transitions made in code (haze, fades). No new art, but the six were painted from
  different viewpoints and horizons, so seams show. Used only as the stand-in while the panorama is painted.

## Layout

- Wide screens: the panorama fills the stage; the sky and far skyline in the top ~55%; content panels (dark glass,
  `--radius-lg`, matched inner radii) on the street in the lower part, left-aligned in each stop, at most ~42rem
  wide, with the next stop's city visible to the right. The bar stays on top; the metro map along the foot.
- Phones (portrait): the same track; each stop is one screen wide; the painting takes the top ~40% and the panel a
  dark sheet below, scrolling inside itself if its content is taller (never the page sideways by accident).
- Short screens (phone on its side, ≤ 500px tall) and 200% text: panels scroll inside; the map shrinks to dots.
- Without JavaScript or without scroll-driven support *and* script: a vertical stacked page (today's layout,
  simplified), so nothing is ever unreachable.

## Left to the builder

Exact panel widths per stop, the parallax ratios, the map's look, how Projects' `<details>` expands inside a panel
(in place, panel scrolls), the tile size and format, and the CSS/JS split of the scroll engine, within the
standing rules in `CLAUDE.md` (glass, motion tokens, still view, contrast, budgets: `homeInitialJs` must not grow by
more than 3 KB gzip; the panorama's first tile at most the size of today's home plate).

## Amendment, 2026-11-23 (owner's words)

"tell chatgpt to build directly off a hyperrealistic model of the city and find real city skyline photos to use as
reference" (and, asked, the final look is hyperrealistic: this replaces "no photorealism" for the panorama).

"make sure each aspect is highly animated … make each section transparent and user friendly with images that match
the dimensions of the text make sure most of the bulky content is contained within the central 80% of the page and
continue to refer to my instagram for ui design language".

What that means here (builder's reading; overrides "Motion: subtle" in CLAUDE.md for this page):
- **Highly animated:** every stop has its own choreographed arrival as the journey reaches it (panels, headings,
  images, points, links entering in sequence with the reels' easing and stagger), live hover/press feedback on every
  control, the city itself alive (parallax layers, drifting haze and light, lit windows flickering on at dusk), and the
  metro map animating between stations. All of it transform/opacity/filter only, driven by the journey's progress so
  scrolling back reverses it; still view and `prefers-reduced-motion` keep the page fully readable with no motion.
- **Transparent, user-friendly sections:** panels are see-through glass over the painting (the city readable through
  them), still ≥ 4.5:1 for every word (the blur and a dark tint carry the contrast), plain labels, obvious next steps.
- **Images match the text:** a section's images take the same height as its text block beside them (or the same width
  when stacked), never a tall picture beside a short paragraph; covers are never cropped awkwardly (object-fit with
  a chosen focal point).
- **The central 80%:** bulky content (panels, images, cards, timelines) sits within the middle 80% of the screen's
  width (10% clear on each side at every width ≥ 768px; phones keep their 16px gutters); the edges are the city.
- **The reels:** keep using `docs/ui/reels.md` for the design language.
