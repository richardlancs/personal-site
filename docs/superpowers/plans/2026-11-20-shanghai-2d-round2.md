# Shanghai 2D, Round 2: Richard's Changes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the changes Richard asked for after seeing the 2D site live: a tuned palette, section names in place of district names, an animated progress line, a reworked Projects section, expandable Interests with photos, and a Contact section built around one "Email me" button.

**Architecture:** Same one-page site. The registry loses its district naming (`station`, `districtLine`), and one new client component, `ProgressLine`, replaces the metro line, the top-bar stop and the list of stops under the hero. Projects, Interests and Contact are rebuilt in place as server components that still read `app/data/portfolio.ts`; Interests gains photos read at build time from `public/interests/<scene>/`.

**Tech Stack:** Next.js 16.4 App Router, React 19.3, TypeScript, Tailwind 4, `node --test`. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-11-19-shanghai-cyberpunk-design.md`, as amended by "What Richard asked for" below (his words win where they differ). Research behind the choices: `.superpowers/sdd/2d-round2/` (three palette papers, `palette-judgement.md`, `palettes-day.png`, `palettes-night.png`) and the three layout reports summarised in the ledger.

## What Richard asked for (20 November 2026)

1. Remove the home caption ("01 LUJIAZUI / The skyline across the Huangpu, from the Bund.") and the district names on the line of stops. Name the stops after the sections instead.
2. Make that line animated: it flows continuously as a line while scrolling and snaps when it reaches a section.
3. Have agents argue the primary palette around the light-blue accent, which stays. (Done: navy recommended; Richard picks.)
4. Have agents research project layouts and rework the Projects section. (Done: recommendation in Task 4.)
5. Interests: each interest an expandable tab that pictures can be added to easily.
6. Contact: more intuitive, with a button to email him quickly.

## Global Constraints

- Work only in the worktree `.claude/worktrees/shanghai`, branch `shanghai`. Never touch `main`, never push.
- Every subagent runs on Opus 5.5 (`model: "opus"`). One agent at a time edits shared files (`app/city.css`, `app/page.tsx`, `app/layout.tsx`, `app/sections/registry.ts`, `app/data/portfolio.ts`); commit by path.
- No new npm dependencies. No `three` import reachable from `/`.
- `--cyan #4fd8ee` and `--focus #8fe9ff` do not change.
- Text contrast 4.5:1 or better; glow never counts and is removed under `prefers-contrast: more`. Accents only on edges, marks, chosen states and display type of 24px or larger.
- Still view (`html[data-still="on"]`) and `prefers-reduced-motion`: nothing animates; the progress line moves in steps; expanding panels open instantly. No scroll hijacking: the page's own scrolling is never snapped, slowed or redirected.
- All content stays in the server HTML and works with JavaScript off (`<details>` for anything expandable).
- Content only from `app/data/portfolio.ts` and files under `public/`. Invent nothing about Richard.
- Touch targets 44×44 CSS px; no sideways scroll from 320px; body text 16px on phones.
- After each task: `npm run lint`, `npm test`, `npx tsc --noEmit`; after the last: the full audit set from Plan A, Task 13.
- `rm -rf .next` before judging CSS in dev. The dev server on port 3101 is Richard's: restart it after each task so he sees the change.

## Review Focus

1. **Scroll performance.** The progress line updates on every scroll frame: it must not cause layout or long tasks. (Task 2: no layout reads in the scroll path; a 5 s scroll trace with no long task.)
2. **No motion when asked.** Still view and reduced motion: the line does not animate and panels do not slide. (Tasks 2, 5 tests.)
3. **An interest with no photos, or a broken photo.** The panel shows its text and no empty gallery or broken-image icon. (Task 5 test.)
4. **No mail app.** "Email me" does nothing visible on a machine with no mail handler, so the address and Copy sit right beside it. (Task 6 test.)
5. **Old links.** `/#about` and the other anchors still land correctly after the header changes, with the heading not hidden under the bar. (Task 1 smoke test.)

---

## Task 1: Palette, and section names in place of district names (one subagent)

**Decision pending from Richard:** the palette. This task is written for the judge's recommendation, **refined navy**; if he picks another, swap the token table for that paper's and add its fade changes.

| Token | Now | Refined navy |
|---|---|---|
| `--ink` | `#0c1526` | `#0e1729` |
| `--ink-2` | `#111c30` | `#142036` |
| `--panel` | `#17253f` | `#1b2a44` |
| `--line` | `#2b3d5e` | `#33476a` |
| `--text` | `#eef2fb` | `#e8edf5` |
| `--muted` | `#a9b4d0` | `#a3afc4` |
| `--amber` → `--lantern` | `#ffb454` | `#f4b860` (primary fill, label `--ink`) |
| `--magenta` | `#f062b4` | removed |

**Files:**
- Modify: `docs/city/style.md` (palette table, status line), `app/city.css` (tokens, every hard-coded rgb literal derived from the old grounds, the band fade shortened to the last 24% of the band), `app/layout.tsx` (`themeColor`), `app/lib/cityLook.ts` (`AMBER` constant), `app/sections/registry.ts`, `app/components/city2d/Station.tsx`, every component using `amber`/`magenta` utilities, `tests/city-theme.test.mjs`, `tests/city-routes.test.mjs`, `tests/smoke.test.mjs`
- Delete: `app/components/city2d/StationIndex.tsx`, `StationHere.tsx`, `MetroLine.tsx` and their CSS (Task 2 replaces them); remove the hero's list of stops

**Interfaces — Produces:**
- Registry: `Section` loses `station` and `districtLine`. `stations` is renamed `pageSections` (keep `sections` as the same array); each keeps `id`, `hash`, `href`, `title`, `district`, `summary`, `scene`.
- `<Station>`: renders band, then (not for home) a small section number ("02") and the `h2` title; no stop name, no caption. Home renders band then hero, nothing between.
- Tailwind utilities `bg-lantern`, `text-lantern`, `border-lantern` exist; `amber` and `magenta` utilities do not.

- [ ] **Step 1: Failing tests.** In `tests/city-theme.test.mjs`: every token in `style.md` matches `city.css`; `city.css` and `app/**/*.tsx` contain no `magenta` and no `amber`. In `tests/city-routes.test.mjs`: the registry source has no `station:` and no `districtLine:`; the page source renders no "Lujiazui", "Longtang", "Century Avenue", "Line 2", "Nanjing Road" or "The Bund" outside comments. In `tests/smoke.test.mjs`: `/` HTML does not contain "The skyline across the Huangpu".
- [ ] **Step 2:** Run `npm test`; the new tests fail.
- [ ] **Step 3:** Change the tokens and everything derived from them; rename the secondary; give the Interests edges a cyan / lantern alternation in one place; remove the district fields and every reader of them; delete the three components and the hero's list.
- [ ] **Step 4:** `node docs/ui/scripts/palette-contrast.mjs` (update its token names) exits 0; lint, tests, `tsc` pass. In the browser at day and night, the seam under each of the six bands is invisible.
- [ ] **Step 5:** Commit `feat: the refined palette; sections named as sections`.

## Task 2: The progress line (one subagent)

**Files:**
- Create: `app/components/city2d/ProgressLine.tsx` (client), `app/lib/progress.ts` (pure), `tests/city-progress.test.mjs`
- Modify: `app/components/city2d/TopBar.tsx` (mount it), `app/page.tsx`, `app/city.css`, `app/components/city2d/useStation.ts` (rename to `useSection.ts`; same behaviour)

**What it is.** One line with six marked points, one per section, labelled Home, About, Projects, Experience, Interests, Contact. A bright fill runs along the line and follows the scroll position continuously, so it is partway between two points when the page is partway between two sections. When the fill reaches a point, that point "snaps": it locks on with a short ring pulse (180 ms, scale 1 → 1.35 → 1, plus the label turning bold), and stays lit. The page's scrolling itself is never snapped.

**Where it is.**
- 97rem and wider: vertical, in the right margin (where the metro line was), labels beside the points, each a 44px link.
- Below 97rem, including phones: horizontal, a 3px line along the bottom edge of the sticky top bar across the full width, six small ticks, no labels; the current section's name shows in the top bar as "03 / 06 · Projects" from 53rem up. Ticks are not links at this size (too small to tap); the Sections menu serves.

**Interfaces:**
- `app/lib/progress.ts`:

```ts
/** Section tops in page pixels, in order; first is 0. */
export type Marks = number[];
/** 0..(n-1): the index of the section reached, plus the fraction of the way to the next. */
export function progressAt(scrollY: number, marks: Marks, viewport: number, pageHeight: number): number;
/** The section that counts as "reached" for a progress value, with a small dead zone so a point does not flicker at its threshold. */
export function reached(progress: number, previous: number): number;
```

- `ProgressLine` sets one CSS variable, `--progress` (0 to 5), on its own element from a single passive scroll listener throttled to animation frames; marks are measured once and on resize (`ResizeObserver` on `<main>`), never inside the scroll handler. CSS turns `--progress` into the fill's length (`transform: scaleX/scaleY`, no layout properties). `aria-current="location"` on the reached point; the nav is labelled "Sections".

- [ ] **Step 1: Failing tests** in `tests/city-progress.test.mjs`:

```js
const marks = [0, 1000, 2400, 4000, 5200, 6000];
test("at the top the line is at the first point", () => assert.equal(progressAt(0, marks, 800, 7000), 0));
test("halfway between two sections the line is halfway between their points", () => assert.equal(progressAt(500, marks, 800, 7000), 0.5));
test("at a section's top the line is exactly on its point", () => assert.equal(progressAt(2400, marks, 800, 7000), 2));
test("at the very bottom the line reaches the last point even if the last section is short", () =>
  assert.equal(progressAt(7000 - 800, marks, 800, 7000), 5));
test("never below the first point or past the last", () => {
  assert.equal(progressAt(-50, marks, 800, 7000), 0);
  assert.equal(progressAt(99999, marks, 800, 7000), 5);
});
test("a point does not flicker at its threshold", () => {
  assert.equal(reached(1.98, 1), 1);
  assert.equal(reached(2.0, 1), 2);
  assert.equal(reached(1.97, 2), 2); // stays lit until clearly left
  assert.equal(reached(1.85, 2), 1);
});
```

  plus source-level: one scroll listener, `{ passive: true }`; no `getBoundingClientRect`, `offsetTop` or `scrollHeight` read inside the scroll handler; `requestAnimationFrame` used and cancelled on unmount; the pulse and the fill's transition sit under `:root:not([data-still="on"])` and `prefers-reduced-motion: no-preference`; in still view `--progress` is written as the reached integer only.
- [ ] **Step 2:** Run; they fail.
- [ ] **Step 3:** Implement `progress.ts`, then the component and CSS. The last stretch maps the remaining scroll to the last point, as the fourth test requires.
- [ ] **Step 4:** Tests pass. In the browser at 1600, 1440 and 390: scroll slowly and fast; the fill tracks without lag; each point pulses once as it is reached, in both directions; nothing covers content or a focused element; with still view on, the fill steps and nothing pulses. Record a 5 s scroll trace: no long task from the line.
- [ ] **Step 5:** Commit `feat: a line that follows the page and locks onto each section`.

## Task 3: Contact, around one "Email me" button (one subagent, parallel with 4 and 5)

**Files:** `app/components/city2d/sections/Contact.tsx`, `CopyButton.tsx`, `tests/city-contact.test.mjs`

- [ ] **Step 1: Failing tests:** the first interactive element in the section is an `<a>` with `href="mailto:<profile.emails[0].address>"`, classes `glass glass-primary`, and the visible text "Email me"; the same address is printed as text directly under it with a Copy button; the second address is a smaller row with its own `mailto:` link and Copy; GitHub, LinkedIn and Résumé follow as three `.glass` keys with an icon and a label each; no `h3` per email.
- [ ] **Step 2:** Run; they fail.
- [ ] **Step 3:** Rebuild. Layout: one centred panel, about 44rem. Top: the "Email me" button, large (56px tall). Under it, the address in readable text with Copy and its "Copied" note. A hairline. Then "Other ways to reach me": the second email as one row; then the three keys in a row (stacked under 480px). Which address is first is the order in `profile.emails` (now: school). **(call; Richard can reorder the data.)**
- [ ] **Step 4:** Tests pass; at 320px the address wraps and nothing overflows.
- [ ] **Step 5:** Commit `feat: contact starts with "Email me"`.

## Task 4: Projects, as rows with an index (one subagent, parallel with 3 and 5)

The research's common ground: buttons at the top of each project; one fixed picture frame for all; the stack as one quiet line; "My part" visibly separate. The recommendation combines two of the three reports and leaves separate project pages out.

**Files:** `app/components/city2d/sections/Projects.tsx`, `tests/city-projects.test.mjs`; `app/data/portfolio.ts` (type only: `Project` gains optional `cover?: number`, the index of the screenshot to show first)

**Layout:**
- **Index.** Under the heading, a list of all five projects, each a link to its row: title and its summary's first clause, one line each, two columns on wide screens.
- **Rows.** No boxed panels; a hairline between projects. Wide screens: text in the left 5 of 12 columns, picture in the right 7, always that way round. Under 1024px: title, summary, role, picture, then the rest.
- **Text column, in order:** number and title (`h3`); summary; role when present; **Live demo** (primary, when there is one) and **Code** keys; "My part" with a 2px cyan rule down its left side when `contributions` exists, otherwise the `features` list in its place; "Built with" as one muted line joined by " · ".
- **Folded away** in a `<details>` whose summary reads "What it does" (plus "· N more screenshots" when there are more): the `features` list (when "My part" took its place above) and thumbnails linking to the full images.
- **Picture.** One frame per project, `aspect-ratio: 16 / 10`, on `--ink-2` with a `--line` edge, the cover screenshot inside with `object-fit: contain`. Portrait screenshots: when a project's first two screenshots are both portrait, show the two side by side in the frame. The frame is `position: sticky` under the bar only when its row's text is taller than it.
- **Skills** follow as a full-width edged panel, unchanged in content.

- [ ] **Step 1: Failing tests:** an index `nav` lists every project with a link to `#<its id>`; every row has `h3`, the keys before the lists in source order, a `<details>` with a `<summary>`; "My part" is conditional on `contributions`; no `rounded` panel class wraps a row; `cover` is read with a fallback to 0; `liveUrl` conditional; every `<Image` has `alt`.
- [ ] **Step 2:** Run; they fail.
- [ ] **Step 3:** Rebuild as above.
- [ ] **Step 4:** Tests pass. In the browser at 1440, 1024, 390, 320: rows are about half their old height; portrait pairs sit side by side; nothing overflows.
- [ ] **Step 5:** Commit `feat: projects as rows with an index; details on demand`.

Open for Richard, not blocking: MarketLab has no `role`, and Scrollganizer has no `contributions`; adding them to `portfolio.ts` fills those rows. The order of projects is the order in the data.

## Task 5: Interests as expanding panels with photos (one subagent, parallel with 3 and 4)

**How Richard adds pictures:** put image files in `public/interests/<scene>/` (`basketball`, `badminton`, `chess`, `poker`). They appear in that interest's panel in filename order. Nothing else to edit. Optional: a caption per file in `portfolio.ts`.

**Files:**
- Create: `app/lib/interestPhotos.ts`, `public/interests/{basketball,badminton,chess,poker}/.gitkeep`, `tests/city-interests.test.mjs` (rewrite)
- Modify: `app/components/city2d/sections/Interests.tsx`, `app/data/portfolio.ts` (type only: `Interest` gains optional `captions?: Record<string, string>`, filename → caption), `docs/adding-a-section.md` (a short "Adding photos to an interest" section)

**Interfaces:**
- `interestPhotos(scene: string): { src: string; alt: string }[]` — server-only; reads `public/interests/<scene>/` with `fs.readdirSync` at build time; keeps `.jpg .jpeg .png .webp .avif`; sorts by filename; `alt` is the caption when one exists, otherwise `"<Interest name>, photo <n>"`; returns `[]` when the folder is missing or empty.
- Each interest is a `<details name="interests">` (opening one closes the others), the first open by default. `<summary>`: the line mark, the name (`h3`), a chevron; 44px tall or more. Open: the description, then, only when there are photos, a grid of them (`next/image` with `fill` in fixed 4:3 tiles, `object-fit: cover`, lazy, each a link to the full image).

- [ ] **Step 1: Failing tests:** `interestPhotos` unit tests against a temp folder (filters by extension, sorts, uses captions, returns `[]` for a missing folder); source-level: every interest is a `<details` with `name="interests"`; the gallery is rendered only when the list is non-empty; no `canvas`; the open/close animation rules sit under the still-view and reduced-motion guards.
- [ ] **Step 2:** Run; they fail.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Tests pass. In the browser: panels open and close by mouse, keyboard (Enter/Space) and with JavaScript off; with no photos there is no gap where a gallery would be; drop one test image into `public/interests/chess/`, confirm it appears, then remove it.
- [ ] **Step 5:** Commit `feat: interests open to show their photos`.

## Task 5b: Numbers, in bold (one subagent, after Tasks 3–5)

Richard, 20 November: "Try to implement numbers and have them bolded when represented." Today only 5 of the 62 content points contain a figure (95 stocks, 100 puzzles across 15 repositories, 15 puzzles, 100,000 hands, a 3×3 board).

**Two parts:**
1. **Bold every figure wherever content is shown** (project summaries, roles, features, "My part", experience highlights, About points, interest descriptions). Done at render time, so the data stays plain text.
2. **More figures in the content.** Only real ones: (a) spelled-out quantities already in the data become digits ("a team of three" → "a team of 3", "every five-card hand" → "every 5-card hand"), idioms left alone; (b) Richard supplies new figures; the subagent writes him a list of the points where a number would say more (how many users, tests, files, hours, percent faster), per project and role, as questions. Nothing is added to the site until he answers. No figure is ever invented or estimated.

**Files:**
- Create: `app/lib/figures.ts` (pure), `app/components/city2d/Figures.tsx` (server), `tests/city-figures.test.mjs`
- Modify: `app/data/portfolio.ts` (spelled-out quantities to digits only), every section component that prints content points (wrap the text in `<Figures>`), `app/city.css` (one rule)

**Interfaces:**
- `splitFigures(text: string): { text: string; figure: boolean }[]` — a figure is a number with what is attached to it: thousands separators, decimals, a leading `$`, a trailing `+`, `%`, `×`, `k`, `M`, a ratio (`54/60`), a dimension (`3×3`), and a range (`10–12`). Not a figure: a number inside a word or name (`YOLO11`, `CS135`, `Next.js 16`, `GPT-4`), a year (1900–2099), a date's day, a version (`v2.1`), an ordinal used as a name ("Line 2").
- `<Figures>{text}</Figures>` renders the pieces, each figure in `<strong className="figure">`. `.figure` is weight 700 in `--text` (never an accent colour: figures sit in body text), with tabular numerals.

- [ ] **Step 1: Failing tests** in `tests/city-figures.test.mjs`:

```js
const figs = (t) => splitFigures(t).filter((p) => p.figure).map((p) => p.text);
test("counts, with their signs and separators", () => {
  assert.deepEqual(figs("Screened 6,000+ companies and sent 300+ emails."), ["6,000+", "300+"]);
  assert.deepEqual(figs("Cut load time by 40% for $7,500."), ["40%", "$7,500"]);
  assert.deepEqual(figs("100 puzzles across 15 repositories"), ["100", "15"]);
});
test("ratios, dimensions, decimals and ranges stay whole", () => {
  assert.deepEqual(figs("54/60 named, 0.885 mAP50, a 3×3 board, 10–12 players"), ["54/60", "0.885", "3×3", "10–12"]);
});
test("names, years and versions are not figures", () => {
  assert.deepEqual(figs("Built with YOLO11 and Next.js 16 for CS135 in 2026, v2.1."), []);
});
test("the pieces join back to the original text", () => {
  const t = "About 95 US stocks, tested on 100,000 hands.";
  assert.equal(splitFigures(t).map((p) => p.text).join(""), t);
});
test("every figure in the real data is found, and nothing else", () => { /* snapshot of figs() over every point in portfolio.ts, reviewed by hand once and stored in the test */ });
```

  plus source-level: `.figure` in `city.css` sets `font-weight: 700` and no `color` other than `var(--text)`; every section component that maps content points imports `Figures`.
- [ ] **Step 2:** Run; they fail.
- [ ] **Step 3:** Implement; convert the spelled-out quantities in the data; write the list of questions for Richard to `docs/city/figures-to-add.md`.
- [ ] **Step 4:** Tests pass; in the browser, figures are bold and still read as part of the sentence at 1440 and 390; contrast unchanged.
- [ ] **Step 5:** Commit `feat: figures in bold, wherever content is shown`.

## Task 6: Whole-branch review fixes, audits, and Richard's look (lead, then one subagent)

- [ ] **Step 1:** Fold in every Critical and Important finding from the whole-branch review of Plan A (`.superpowers/sdd/2026-11-19-shanghai-2d/final-review.md`) that Tasks 1–5 did not already remove.
- [ ] **Step 2:** Run the full audit set on a fresh production build and a fresh dev server: lint, tests, `tsc`, smoke tests with a server, `city-contrast.mjs` (20 skies, three widths), `mobile-audit.mjs`, `budget.mjs`, the keyboard walk, JavaScript off, Lighthouse mobile. Fix what fails. Report every number as measured, including the largest-paint figure against its 2.5 s target.
- [ ] **Step 3:** Independent review of the round's diff (Opus), then a fix round for anything Critical or Important.
- [ ] **Step 4:** Full-page screenshots at 1440 and 390, day and night, plus a short screen recording or frame sequence of the progress line snapping.
- [ ] **Step 5:** Commit `chore: round 2 audited`.
- [ ] **Step 6: CHECKPOINT.** Richard reviews at `localhost:3101`.
