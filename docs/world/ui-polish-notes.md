# UI polish pass (second Claude): ownership note and issue log

Branch `worktree-ui-polish`, worktree `.claude/worktrees/ui-polish`,
cut from `main` at 03b7d0d on 6 November 2026. Nothing here touches the
primary checkout. Commits are small and meant to be cherry-picked or
merged independently.

## What this pass owns

The quality of what the pages show inside the existing system:

- `app/globals.css`: the interface sections only (`.points`, the
  location header and column, notebook, bench tabs and project notes,
  tool wall, timetable, cabinets, directory, map sheet, Places menu, the
  flat layout block). Not the colour tokens in `:root` /
  `[data-theme="dark"]`, not `.world3d*`, `.world-iris`, `.world-label*`,
  `.park-intro` haze, or the two layout media queries.
- `app/components/locations/*` (Notebook, Workbench, Timetable, Cabinets,
  Payphone): markup, semantics, states. Their calls into
  `world3d/store.ts` stay as they are.
- `app/components/world/Location.tsx`, `WorldControls.tsx` (menu markup
  and labels only), `Plate.tsx` is read, not changed.
- `app/*/page.tsx` markup; `app/data/portfolio.ts` wording only (no new
  facts).
- `tests/` for anything that protects the above.

## Not touched (primary Claude)

`app/components/world3d/**`, `app/data/world.ts` (section registry),
`app/components/world/flat.ts`, `app/layout.tsx`, theme tokens and the
theme toggle, `Plate.tsx` views, loading/arrival timing
(`--arrive-delay`), camera and transition behaviour.

## Requests for the primary Claude

1. **Map pins (`app/map/page.tsx` → the registry-driven map).** On
   phones the Interests label ran off the drawing. The fix is CSS keyed
   on `data-label="right"` (arcade) and, for want of an attribute, on
   `.map-pin[href="/projects"]` (workshop label goes under its roof).
   Proposed: a `label: "below"` value for the workshop pin, so the CSS
   can read `[data-label="below"]` instead of the href.
2. **Experience intro (`app/experience/page.tsx`).** At 1440 the intro
   plus hint wraps with a lone "it." on the second line. One word
   shorter ("Choose a line, or scroll, to read it.") fixes it.
3. **Colour values in the chosen states.** The new rules use only
   `--accent`, `--foreground`, `--border`, `currentColor` and
   `color-mix`, so the Soaring Skies palette should carry over without
   edits. `.timetable-line:focus-visible` no longer names `#e5a57c`.

## Issue log

Page · state · viewport → problem → change → how verified.

1. Projects · tabs · all widths → the chosen project was marked only by
   an 8px lamp; the row was toggle buttons with no arrow keys → tablist /
   tab / tabpanel, one tab stop, arrows + Home/End, chosen tab ringed in
   `--accent` and lifted → keyboard script (ArrowRight → Scrollganizer
   chosen, focused, `#scrollganizer`; End → Codebase Puzzles),
   screenshots at 1440, 768, 390.
2. Interests · cabinets · 1440 / 1024 → same as above; focus ring was
   leaf green on dark purple → tablist, chosen cabinet lifted with a lit
   edge, ring in currentColor inside the cabinet → keyboard script,
   focus crop screenshot.
3. Experience · timetable · 1440 / 1024 → dates broke across two lines;
   the notice's live region was re-mounted (`key`) so changes weren't
   reliably announced; focus ring low-contrast → dates nowrap from
   1200px (narrower columns keep the wrap, or Service/To go a word a
   line); stable live region with the notice replaced inside it; the
   arrows move down the lines; chosen line loses its underline →
   screenshots at 1440 and 1024, ArrowDown script, focus crop.
4. Contact · directory · 1440 → Copy was 27×18 px of underlined text and
   nothing was announced → pill button 33px tall, "Copied" state in
   `--accent`, hidden `role="status"` line; `break-all` → `overflow-wrap:
   anywhere`; web links say "(opens in a new tab)" → click script
   (button text, status text, height), screenshots 1440 / 320.
5. About · notebook controls · 1440 → Previous/Next were 21px tall →
   36px, padded, soft hover → measured.
6. Map · 320 and 390 → the Interests label ran past the drawing (at 320,
   past the sheet) → label ends at the dome's right edge; the workshop's
   goes under its roof → script checks all five labels inside the
   drawing at both widths; screenshots.
7. Projects · screenshots · both layouts → no visible caption: the 3D
   monitor shows the picture with no words → caption line under the
   thumbnails (wide) and a figure with figcaption on phones; the phone
   link carries the action, the image's alt moves to the caption →
   screenshots 1440 and 390.
8. All pages · 320 → no horizontal overflow (measured 0 on every route).

## Verified

- Viewports: 320×568, 390×844, 768×1024, 1024×640, 1440×900.
- Keyboard: tab order on /projects; arrow keys on the three rows; focus
  stays on the row when the content changes; reduced motion emulated
  while checking focus rings.
- `npm run lint`, `npm test` (13 tests), `tsc --noEmit` clean. No
  console errors on any route.
- Screenshots (not in git): `.playwright-mcp/ui-polish/before/` and
  `after/` in this worktree.

## Not done, and why

- Home, the Places menu, the location header and the "Other sections"
  foot are the primary's (page.tsx, WorldControls.tsx, Location.tsx);
  looked at, nothing blocking found.
- Night theme not re-checked: it's being removed.
- Real devices and Safari: only Chromium's emulation available.
