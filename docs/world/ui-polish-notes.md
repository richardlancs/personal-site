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

(Filled in as they come up; each names the component and the proposed
interface.)

## Issue log

Page · state · viewport → problem → change → how verified.

