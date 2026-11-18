# Handoff: where the work stands (updated 17 November 2026)

For whoever picks this up, human or Claude. Read this first, then
`docs/world/park-balance-2026-11-06.md` for the measurements.

## Latest: the home page's intro, now a film (branch `intro-video`)
- `components/intro/`: a 9.2 s painted film into the park on full loads of `/`, wide layout only (`public/intro/`, made in ChatGPT + Google Flow: `docs/world/intro-prompts.md`, encoded by `scripts/intro-video.sh`). `?intro=<seconds>` on `next dev` holds it at a moment.

## Earlier: oak signs, one arcade machine (merged)
- Every carved sign is brown oak with burned-in dark letters (`textures.ts: carvedPanel`, `torch.ts: carvedSign`, drawn at 2x); after dark the oak catches the torchlight faintly.
- The arcade has one machine (`scenes/arcadeMachine.ts`, rules in `arcadeLogic.ts`, tested by `tests/arcade.test.mjs`): tabs, its ◀/▶ buttons and idle cycling (10 s, stops once touched, never in still view) switch modes; a click on the screen or the card's play button (`arcadePress` in the store) plays.

## Earlier: clear glass, carved small signs, booth email
- Panels and buttons over the world are clear glass with haloed words; panel-contrast.mjs measures buttons too. Restart `next dev` (rm -rf .next) before measuring: it serves stale CSS.

## Branches

- `main` at f38a2dc: deployed at https://personal-site-flame-eight-52.vercel.app
- `park-balance` (this work, worktree `.claude/worktrees/ui-polish`):
  the park composed across the view, lighter loading, dead code gone,
  immutable caching header. Commits f5e7c07 (composition), 6d076cc
  (loading), 77b0743 (caching, tag tweak), plus docs. Pushed; not
  merged; production not deployed (Vercel makes a preview deployment of
  any pushed branch by itself).
- `mobile-3d` (the other Claude session, ebf0dfc, pushed): the 3D world on
  phones, replacing the painting layout. Not merged.

- `integration` (pushed): `park-balance` with `mobile-3d` merged in,
  the two conflicts resolved as agreed (both sets of World3D edits kept;
  the mounting effect skips prebuilds on the mobile tier; the registry
  loses `plate`/`tag` and keeps the arcade's new `map` entry) and one
  lint error from mobile-3d fixed (a synchronous setState in
  WorldShell's effect). Lint, type check, 14 tests and the production
  build pass; verified in the browser on desktop (composition and tags
  intact, all six scenes prebuilt after arrival) and on a 390×844 phone
  (3D hero, sheet below, only the target scene built, no overflow, no
  console errors). Screenshots: `.playwright-mcp/park-balance/integration/`.
  Merging `integration` into `main` lands both pieces of work at once.

## How to resume

```bash
cd /Users/richardlan/personal-site/.claude/worktrees/ui-polish   # or check out park-balance
npm install && npm run lint && npm test && npx tsc --noEmit
npm run build && npx next start -p 3100                           # production, for measuring
```

Measurement scripts (Playwright MCP, run with `browser_run_code_unsafe`;
ports are literals inside): `.playwright-mcp/park-balance/scripts/`.
Screenshots: `.playwright-mcp/park-balance/{before,after}/`. Neither is in
git. Timing marks are on the performance timeline in production:
`world:first-frame`, `world:<scene>`, `park:<stage>`, `tex:<name>`.

## Done

- Composition, clutter, loading, reduced-motion rendering, verification:
  see `park-balance-2026-11-06.md`.

## Landed (6 November 2026, late)

- `integration` was fast-forwarded onto `main` (07e7100) and Vercel
  deployed it: the live page has the new markup, and its chunks under
  `/_next/static/immutable/chunks/` are served Brotli-compressed with
  `cache-control: public,max-age=31536000,immutable`. The `vercel.json`
  added earlier on a misread probe was removed again.
- The two optional items are done or closed: far grass builds in the
  idle step after the first frame (no visible pop-in); the arcade
  "backdrop" was a dev-mode artifact, the production journey is right.
  Branch `park-polish`, landed on `main` as d9e1069; Vercel reports the
  deployment of that commit complete (GitHub commit status).
- 7 November 2026: GaragePoker added as the fourth project (branch
  `garagepoker-project`, merged into `main` locally, not pushed). The
  workshop now has four monitors, two on the right bench; a test checks
  every project has a monitor and a camera spot. Its "Not yet released"
  point and two of its screenshots cover GaragePoker work that isn't on
  its GitHub yet: update them once that's pushed. `garage-poker/` in this
  folder is a separate, untracked repo; whole-folder lint picks it up.

## Phase: richer places and a lighter load (17 November 2026)

Plan: `~/.claude/plans/plan-a-new-phase-sparkling-piglet.md`. Branch
`phase-places` (local, not pushed, not merged), on top of `main` 54593da:

- 155ea3b measure (world chunk, far signs' words)
- 653a1a3 each place but the park its own chunk (`world3d/sceneChunks.ts`)
- bebd279 hosting caches (`next.config.ts`)
- 368e5ae station timetable slate, indigo test covers world3d
- 3e510f7 paper band behind the corner controls, bluer corner glass,
  glass skip link, colours to tokens
- d2eeb3a rain fades behind nearer things; far signs' words larger

Slices 0–5 were merged to `main` and pushed (13fcf25). Then, approved by
the owner: b43aa29 the booth's street corner and handset; e6f4b35 the
arcade's mini-games moved out; the arcade's dressing (next commit). Also
open: `app/icon.svg`
(the favicon) is still indigo, as `apple-icon.png` probably is.

Next.js is 16.4.6 (was 16.4.2, in the range of GHSA-mfr8-8qww-v76h,
which needs `unstable_cache()` and root params; the site uses neither).
`next build` no longer stops with its security notice. `npm audit` still
lists one moderate advisory, minimatch inside the ESLint toolchain
(dev-only, never shipped).

## Glass, new type, torch-lit signs (17 November 2026)

Branch `glass-torches`: Fraunces and Nunito (8be1975); glass and stained
glass panels (c26e304) tuned to 4.5:1 by `docs/ui/scripts/panel-contrast.mjs`
(2ed9796); carved, torch-lit signs (`world3d/torch.ts`, next commit).
Notes in `docs/world/3d-progress-log.md`, "Glass, Fraunces and Nunito,
torch-lit signs". To measure the glass, run panel-contrast against a
`next dev` you've just started (an old one can serve a stale stylesheet).

## Remaining

Nothing queued. If something comes up: the measurement scripts and
timing marks above are the way to check it; grep a fresh token in the
live CSS before trusting a live screenshot (Turbopack's cache once
shipped a stale stylesheet).
