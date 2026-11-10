# Baby blue, glass buttons and the in-page résumé (10 November 2026)

Branch `feature/baby-blue-glass-resume`, from `12215ee`.

## What changed

- **Palette.** Indigo is gone from the interface. Tokens at the top of
  `app/globals.css`:
  - baby blue `#b8dcfa`, hover `#9bcbf1`, pale `#eaf5ff`, light `#f7fbff`
    and line `#c6dff0`, for surfaces, chosen states and washes;
  - slate `#203245` for text;
  - `--accent` `#23527c` for links;
  - focus `#326e9f`.

  Cream stays for paper. The name is slate on its cream backing with a
  baby-blue stroke. The timetable, cabinets and notebook cover are deep
  slate-blue "enamel" objects. The contact page's phone line is a
  pale-blue slip.
- **Glass buttons.** Every button and action is `.glass` (secondary) or
  `.glass glass-primary`, except scene objects. Each is:
  - 44 px tall, with a 10 px radius;
  - a baby-blue tint over a 14 px backdrop blur;
  - a thin edge, a top highlight and an opaque slate label.

  Over the world the glass is thicker, and near-opaque under dark skies.
  Where backdrop-filter is unsupported, a translucent fill stands in.
- **The press.** `components/ui/GlassPress.tsx` is one delegated listener
  with no timers. A press:
  - compresses to 98%;
  - sends a ripple from the pointer, or from the centre for the keyboard;
  - sweeps a curved highlight across;
  - settles by about 420 ms.

  The action is not delayed. Reduced motion and still view give a brief
  tint instead.
- **Résumé.** The résumé links on home, About and Contact open a dialog
  over the page (`components/resume/`):
  - pdf.js 5.4.624, legacy build, loaded only when it opens;
  - a canvas at the screen's pixel ratio, plus a selectable text layer and
    the PDF's links;
  - zoom, fit to width, page navigation when there is more than one page,
    Download PDF and Close;
  - loading, error and Retry states.

  It is centred on desktop and a full-height panel on phones. Focus moves
  in, is trapped, and returns to the link; Escape works. The page behind
  is inert and keeps its scroll position. The links stay real links to
  the PDF: with no JavaScript, with a modified click, or when the
  viewer's code can't be fetched, they open the file itself.

## Validation (production build)

| Check | Result |
|---|---|
| lint, `tsc --noEmit`, `npm run build` | clean |
| `SMOKE_URL=… npm test` | 92/92 |
| `perf:budget` | all within budget. Page JS 200,851 / 210,000; total JS 513,878 / 536,000; CSS 17,757 / 18,000. The résumé's on-demand JS 447,888 / 470,000 and CSS 1,950 / 2,500 have their own budgets |
| `docs/ui/scripts/resume-viewer.mjs` | 233/233: every trigger, mouse and keyboard, desktop and phone, focus, scroll, zoom, download, the failures, reduced motion |
| `docs/audit/scripts/matrix.mjs` / `motion.mjs` | 261/261 / 29/29 |
| `docs/weather/scripts/chip-layout.mjs` | 100/100 |
| Independent QA | Text contrast of every text run over all 16 skies × 7 routes, desktop and phone: 0 failures (worst 4.82:1). Glass inventory and press, measured. Its must-fix and should-fix findings were fixed and re-checked |

Screenshots in `screenshots/`:
- `before-*` and `after-*` (desktop and phone; home, projects, contact, about);
- `press-{pointer,keyboard,reduced,fallback}.jpg`;
- `resume-{desktop,phone}-{open,zoomed,error}.jpg`.

## Open

- Not tested on real iOS Safari, Android Chrome or Firefox, or with a
  screen reader (headless Chrome with phone emulation; the accessibility
  tree was inspected).
- The backdrop-filter fallback was reviewed and rendered by forcing it,
  not in a browser that lacks the feature.
- The 3D station board (`world3d/scenes/Station.tsx`) keeps its indigo
  enamel as scenery. Its HTML timetable is now slate blue.
- On a slow connection the first open shows the link dimmed while the
  viewer's 5 KB loads, then "Opening the résumé…" while pdf.js (about
  440 KB) arrives.

## Tools used

- **Agents:** two parallel agents in their own worktrees, one on the
  palette and glass, one on the résumé viewer, then an independent QA
  agent. The coordinator integrated their work and fixed the findings.
- **Skills:** `frontend-design`, `design:design-critique` and
  `design:accessibility-review`.
- **Browser:** headless Chrome through the repo's Playwright harness. The
  Playwright MCP was held by other sessions, and Claude in Chrome wasn't
  used.
