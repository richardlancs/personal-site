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

---

# Glass on every control, and the interface on phones (10 November 2026)

Branch `feature/glass-mobile`, from `da822b6`.

## What changed

- **Glass everywhere.** The project tabs, cabinet tabs, timetable lines
  (24 → 44px), notebook page turns, screenshot thumbnails and the
  Sections menu's rows joined the corner controls, actions and résumé
  controls on `.glass`. One state system: primary (stronger blue, 600),
  secondary, chosen (`aria-pressed`, `aria-selected`, `aria-current`,
  `data-copied`, an open popover: baby blue, a double focus-blue edge,
  pressed in), disabled (`:disabled`, `aria-disabled`: no fill, dashed
  edge, no press), focus (ring on a cream halo). Each keeps its own sign
  (lamp, lit screen, tick). Name tags, map pins and tertiary text links
  stay as they are.
- **The press** lets go when a touch becomes a scroll (`pointercancel`)
  and when a popover closes over a pressed row.
- **Phones and tablets.** `docs/ui/scripts/mobile-audit.mjs`: 1,163
  failures on the old build → 0. The bar's back and Sections no longer
  overlap at 320 (the way back becomes its arrow when the bar is narrow
  for its words); every control and text clears the safe-area insets;
  standalone links and menu rows are 44–48px, 8px apart; menus and the
  slip fit and scroll inside; hover is gated to `(hover: hover)`; the
  résumé's toolbar is three rows at 320 instead of four; no blur behind
  glass on the phone's opaque sheet (4–5 blurred elements on screen while
  scrolling, was 6–12). With very large text on a phone, Sections is its
  map alone and the chip keeps to time, icon and temperature, so the
  fixed bar is 180px instead of 240–309px; tabs go to one column; titles
  stay whole.

## Validation (production build)

| Check | Result |
|---|---|
| lint, `tsc --noEmit`, build | clean |
| `SMOKE_URL=… npm test` | 94/94 |
| `perf:budget` | all within; CSS 14,494 / 18,000 (a clean build; Tailwind now skips untracked folders, so local matches Vercel) |
| `mobile-audit.mjs` (320, 390, 430, 768, 1024 ×2, 1440, 844×390, 667×375, and 200% text at 320, 390, 844×390; every route, menu, slip, résumé) | 0 failures, 1 warning (the name's brush deepening on hover) |
| `glass-states.mjs`, `glass-press.mjs` | all states as specified; every converted control gets the press; navigation not delayed |
| `glass-contrast.mjs`, 16 skies, 5 routes desktop + phone | worst label 5.34:1 |
| `resume-viewer.mjs` | 233/233 |
| matrix / motion / chip-layout | 261/261 / 29/29 / 100/100 (one run of chip-layout read 99/100, a 1px shift on a freshly started server; three reruns 100/100) |
| Independent QA (emulated touch, keyboard, skies, 200% text) | 2 must-fix and 3 should-fix, all fixed and re-measured |

Screenshots: `screenshots/responsive/{before,after}-{w320,w390,w430,land,w768,w1024,w1440}-{home,projects,experience,contact}.jpg`
(before from the live site), `after-w320-text200-projects.jpg`,
`screenshots/glass2-*.jpg` (each control's states),
`screenshots/mobile-{before,after}-*.jpg`.

## Open

- No real phone or tablet was used: every touch check is Chrome's
  emulation (`hasTouch`, `isMobile`, `tap()`, emulated notch insets).
  Not tested in Safari, Firefox or with a screen reader.
- Large text was emulated by raising the root font size, not a phone's
  own text-size setting.
- Over green scenery on clear days the corner keys' glass reads
  grey-green rather than baby blue (contrast is fine).
- The skip link is 37px tall and not glass (shown only on focus).

## Tools used

Three agents: one on the glass (skills `frontend-design`,
`design:design-system`, `design:accessibility-review`), one on mobile
(`design:accessibility-review`), in their own worktrees in parallel with
separate files, then an independent QA agent (no skills). Headless
Chrome through the repo's Playwright harness. The Playwright MCP and
Claude in Chrome weren't used.
