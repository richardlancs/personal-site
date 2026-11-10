# Release check: audit acceptance criteria (10 November 2026)

The evidence for the ten audit commits on
`audit/portfolio-polish-2026-11-10` (base `e32397c`), taken on a
production build of the final commit (`npm run build && npx next start`).
What was checked, how, what came out, what's still open, and what
couldn't be checked here. The state before the work is in
`baseline.md`; the renderer's measurements are in `performance.md`.

## How the work was done

- Three specialist agents worked in parallel, each in its own git
  worktree on its own files, and handed back commits with their evidence:
  A (content, navigation, accessibility: commits 3 and 5), B (layout,
  typography, vectors, project previews: 4 and 8), C (WebGL, loading,
  motion: 6 and 7). Shared files (`globals.css`, `layout.tsx`, configs)
  were theirs to propose and the coordinator's to integrate. The
  coordinator wrote 1, 2, 9 and 10 and integrated the rest in order,
  resolving three conflicts (the menu icon against its new label; the
  camera's narrow-screen lift against still view's framing; two test
  files' new tests).
- An independent read-only QA agent then reviewed the integrated branch
  against the audit. Its findings and what was done about each are below.

## Findings F1–F5

| Finding | Status | Evidence |
|---|---|---|
| F1 default favicon | Fixed (commit 9) | New mark in `app/icon.svg`, `favicon.ico` (16/32/48), `apple-icon.png` (180); test: the favicon's hash isn't the create-next-app one; served with the right types |
| F2 `/greenhouse` public | Fixed (commit 2) | 404 on the build; template in `docs/development/section-template/page.tsx`, with a test that its imports still resolve from `app/` |
| F3 "Choose one to play", INSERT COIN | Fixed (commit 2) | "Choose an interest to explore."; the cabinet screens no longer draw the text; tests pin both |
| F4 "Choose a line, or scroll" | Fixed (commit 2) | "Select a role to read details." |
| F5 Interests panel skipped by Tab | Fixed (commit 5) | `tabindex="0"`, focus ring; Tab from the chosen cabinet reaches it, Shift+Tab returns (matrix, keyboard) |
| Metadata | Added (commit 9) | Canonical, Open Graph and Twitter tags with the share card on all seven pages; `robots.txt`, `sitemap.xml` from the registry; one origin constant |

## Validation

| Check | Result |
|---|---|
| `npm run lint` | clean |
| `npx tsc --noEmit` | clean |
| `npm test` | 22 passed, 16 skipped (the smoke checks, offline) |
| `SMOKE_URL=… npm test` (production build) | 38/38 passed |
| `npm run build` | succeeds; 7 routes plus icons, robots, sitemap, all static |
| `npm run perf:budget` | all within budget: page JS 194,341 / 205,000; largest chunk 288,597 / 300,000 gzip; all JS 492,621 / 520,000; CSS 15,623 / 17,000 |
| `docs/audit/scripts/matrix.mjs` | 261/261 passed (below) |
| `docs/audit/scripts/motion.mjs` | 29/29 passed (commit 6, re-run after integration) |
| Each commit on its own | lint, type check and `npm test` pass at every one of the ten |

### The matrix (`matrix.mjs`)

| Group | Checks | What |
|---|---|---|
| Sizes 320×740, 390×844, 768×1024, 1024×768, 1440×1000, 1920×1080, 844×390 | 154 | Every route: answers 200 with its heading; no horizontal scroll; every control at least 24×24 (links inside sentences excepted, as WCAG 2.5.8 allows); no page or console errors |
| Zoom 200% and 400% (a 1280-wide window: 640×450 and 320×225 CSS px at DPR 2 and 4) | 44 | The same, reflowed |
| Keyboard | 11 | Skip link first, Enter moves focus to the content, Shift+Tab; project tabs: ArrowRight/End/Home and the address follows; Interests: Tab into the panel with a visible ring, Shift+Tab back; Sections menu: Enter opens, Escape closes with focus back on the button; Escape goes back to the park; Space toggles Still view |
| Focus never hidden (WCAG 2.4.11), 1440×900, 1024×768, 400% | 21 | Every Tab stop on every route is on screen and nothing is drawn over it |
| Reduced motion | 2 | The system setting turns Still view on; the world is still drawn |
| WebGL disabled, 1440 and 390 | 18 | The painting stands in on every route, the words are there, the home actions work, no errors |
| Slow load (slow 4G, 4× CPU, 390×844) | 2 | The name is on screen at 1.5 s, before the world; "View projects" works while the world is still loading |
| Failures | 4 | Clipboard blocked: "Couldn't copy …" on screen; audio fails: the button isn't left on and says so; project screenshots fail: the words and links stay; no page errors |
| Rapid route changes | 4 | Five places in under a second lands on the last; back and forward land where they should |
| Phone hero | 1 | A place's world band is 253 px at 390×844, loaded directly or after the home page (304 px) |

### Links

Every external link answered 200, checked with `curl -L`: GitHub
profile, the four project repositories, both live demos and the site's
own pages. The exception is LinkedIn, which answers 999, its block for
automated clients. That is not evidence the link is broken, but it means
the LinkedIn link wasn't verified. The résumé is served as
`application/pdf`.

### Contrast

Measured by agents B and A on the real composite: each page
screenshotted with its text made transparent, then the scene under every
run of text sampled. Seven routes at 1440, 1024, 1920 and 390: no normal
text under 4.5:1 and no large text under 3:1. The lowest are the
timetable dates (4.73:1, up from 3.69 before commit 4) and the dial
digits (4.85:1). The QA agent repeated the measurement independently at
768 as well, and over the painting fallback, with no failures.

### Lighthouse, the home page, 3 cold runs per profile (final build)

Lighthouse 13.6.0, fresh profile per run, Chrome 157 headless on an
Apple M2 with WebGL on. Values are median (min–max), times in ms.

| Profile | Settings | Score | FCP | LCP | TBT | CLS | SI |
|---|---|---|---|---|---|---|---|
| mobile | 412×823 at DPR 1.75; simulated 150 ms RTT, 1.6 Mbps, 4× CPU; benchmark index 3,158–3,213 | 69 (69–69) | 905 (904–905) | 2,801 (2,800–2,806) | 1,594 (1,543–1,756) | 0 | 2,449 (2,347–2,475) |
| desktop | 1350×940 at DPR 1; simulated 40 ms RTT, 10 Mbps, no CPU slowdown; benchmark index 3,178–3,218 | 75 (74–76) | 246 (245–246) | 246 (245–246) | 612 (567–663) | 0 | 1,332 (1,309–1,383) |

For comparison, the base revision measured mobile 67, TBT 3,464, LCP
2,695, at a similar benchmark index (about 3,000), and desktop 61–70, TBT
975–4,725 (`performance.md`). Blocking time is down on both profiles.
Mobile LCP is about 0.1 s higher in this simulation. The LCP element is
the home page's text sheet, which now holds the introduction and the
actions, and the stylesheet ahead of it grew from 11.7 to 15.6 KB. Its
observed render delay is 108 ms; the rest is Lighthouse's simulated
throttling of the JS and CSS ahead of it.

These are lab numbers on one machine. They don't show what visitors
experience: the targets (p75 LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1) are
for field data, and there is none. Frame traces of the walk-in and the
journeys are in `performance.md`. Worst frames during the walk-in went
from 500 to 200 ms on desktop and from 467 to 117 ms on the phone tier,
and the rest state holds 60 fps.

## The QA review, and what was done

| QA finding | Severity | Done |
|---|---|---|
| On phones, after leaving home, every place kept home's taller hero. Next.js keeps the home page hidden in the document, and `:root:has(.park-sheet)` still matched it | should-fix | Fixed in commit 4: CSS and `World3D.tsx` look only for a sheet that isn't inside a hidden page; matrix "phone hero" |
| On `/map`, Tab went to the park's name tags under the map sheet, unseen. At 400%, focused pins went under the fixed controls (both also on production) | should-fix | Fixed in commit 5: the name tags render on the home page only; `scroll-padding-top` keeps focused elements below the controls; matrix "focus never hidden". The same check finds 2 hidden stops on production's `/map` |
| The Still view button widens the corner cluster, which covers more of a right-hand column as it scrolls under | should-fix | Partly: focus can no longer end up under the controls (scroll padding), and nothing sits under them at rest. Text still scrolls beneath them, as it did before. Open, below |
| "Look at the tool wall" and the map's "Back to the park" were 20 px tall | minor | Fixed in commit 5: 24 px minimum (matrix: 24×24 at every size) |
| `performance.md`'s benchmark-index line and "proposed" budget script | minor | Corrected in commit 7 |
| A second music failure might not be announced | minor | Fixed in commit 5: the note clears before a retry |
| The section template isn't type-checked | minor | Commit 2: a test checks its imports and names against `app/` |
| Route lists in the audit scripts | minor | `shots.mjs` and `matrix.mjs` take them from the registry; `motion.mjs` keeps its own map of routes to scenes (a test script, scene-specific) |
| Home introduction at 15px | minor | 16px (commit 3). Captions and small labels stay at 14px as secondary text |
| Still view button renders unpressed during hydration, then corrects itself | minor | Open (below) |
| `Host:` in robots.txt | minor | Removed (commit 9) |

## Screenshots

`screenshots/before/` and `screenshots/after/`: the seven routes at
1440×1000 and 390×844, 5 s after load, same script (`shots.mjs`). The
matrix's screenshots of every route at every size are not kept in git;
rerun it to get them.

## Open items

- **Text scrolls under the corner controls.** On wide screens a page's
  column scrolls beneath the fixed controls; the Still view button made
  the right-hand group wider (at 1024 px the Sections pill starts 62 px
  further left). Focus is never hidden there, and nothing is covered at
  rest. A fuller fix would be a quiet paper band behind the controls
  once the page has scrolled, or narrower columns on the right; that's a
  design decision left to the owner.
- **Still view's first paint.** The page is still from its first paint
  (an inline script sets the attribute), but the button itself renders
  as not pressed until hydration, so its `aria-pressed` is briefly wrong.
- **Mobile LCP in the lab is 2.8 s** (simulated, above). The next step
  would be measuring on a real mid-range phone before changing anything.
- **Next.js feedback.** Agents A and B saw `next dev` serve a stale
  `globals.css` after an edit, which only a real content change fixed.
  Production builds weren't affected. Drafts for Next.js's feedback form
  were prepared and not sent.

## Not run here

- Real iOS and Android devices (viewport and touch emulation only).
- VoiceOver or NVDA. Announcements were checked as roles, names, states
  and live regions in the DOM and Chrome's accessibility tree, not heard.
- True browser zoom. 200% and 400% were approximated with the CSS
  viewport and device pixel ratio they produce.
- Safari and Firefox (all checks ran in Chrome 157).
- Field data: INP and the p75 targets need real visitors.
- Audio quality, and whether the LinkedIn link works for a person.
