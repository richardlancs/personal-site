# Overnight pass, 6 November 2026: checklist

Text and typography, a flat layout for phones, and an audit. Screenshots and
the browser scripts are in `.playwright-mcp/overnight/` (not in git):
`before/`, `after/`, `scripts/`.

## Routes and states

| Route | States | Wide (3D) | Flat (phone) |
|---|---|---|---|
| `/` park | name, links; flat: intro, tags on the painting, places list | checked | checked |
| `/about` pavilion | 4 notebook pages (2 spreads), all pages at once | checked | one sheet, all four groups |
| `/projects` workshop | MarketLab, Scrollganizer, Codebase Puzzles; 3/3/2 screenshots; `#project` links; Skills (`#skills`) | checked | checked |
| `/experience` station | FlyRank AI, Drive Gears, Waterloo | checked (one at a time) | all three written out |
| `/interests` arcade | Basketball, Badminton, Chess, Poker | checked (one at a time) | all four cards |
| `/contact` booth | 2 emails with Copy, GitHub, LinkedIn, résumé; pick up the phone | checked | "Write me an email" in place of the phone |
| `/map` notice board | 5 pins, key list | checked | checked |
| not found | notice with the way back | checked | checked |

## Priority 1: text

- [x] Projects: one-line summary, role, "What it does" points, "My part so far" (Codebase Puzzles), links moved up under the summary, "Built with" as one quiet line. Data: `summary`, `role`, `features`, `contributions` in `app/data/portfolio.ts`.
- [x] MarketLab keeps "simulated prices, not real market data". Scrollganizer: role is separate from what the team built. Codebase Puzzles: product, grading/indexing and my part are three separate groups.
- [x] About: four headed groups (Who I am / Building and learning / Away from the keyboard / Where to find me), same data in the notebook, the all-pages sheet, the flat sheet and the 3D notebook's pages. Every line sits on a ruled line.
- [x] Experience: FlyRank AI split into three points (self-paced track and capstone wording kept); Drive Gears no longer repeats sequencing/timing/debugging; Waterloo tightened.
- [x] One bullet style everywhere (`.points`, `.notebook-points`): a rust dash hung in the margin.
- [x] Interests, contact, map, menus: reviewed; left as sentences. Booth summary now mentions the résumé; "Download PDF" (it opens, not downloads) is "Open the PDF"; pavilion "bench"/"desk" made consistent.
- [x] No facts added: every statement comes from the previous content.

## Priority 2: flat layout (phones, portrait tablets, short windows)

- [x] No WebGL, no three.js, no render loop: `WorldShell` never imports the world there.
- [x] Painting plate per page from one cached image (`Plate.tsx`); wide screens never fetch it.
- [x] Sticky paper bar (back, Places, music, theme), 44px targets, fits at 320px.
- [x] Home: painting with a tag on each place, name, headline, two-sentence intro, links, places list with the map's drawings.
- [x] Projects: selector, the chosen screenshot on a monitor, thumbnails, points, skills.
- [x] Experience: every line of the timetable written out. Interests: all four cards. Contact: email button, directory with Copy. Map: larger pins, labels kept apart, key list.
- [x] "Elsewhere in the park" at the foot of each place.
- [x] Opaque paper (no backdrop blur), no arrival delay, music still loads only on Play.
- [x] 320, 375, 390, 430, 768 portrait, 844x390 landscape: no horizontal overflow, no console errors. Night theme checked.
- [x] Rotating a tablet swaps layouts both ways (world loads on landscape, unloads on portrait).

## Priority 3: found and fixed

- [x] Fonts: 313 font files (8.5 MB) were preloaded on every page, and 200 KB of font CSS blocked rendering (also on the live site). Now five local Latin files, 94 KB.
- [x] Escape did nothing (documented, and promised in the Back button's tooltip). Now goes back to the park; an open Places menu takes the key first.
- [x] Direct visits waited 1.5 s before showing the page's words. Now 0.15 s; in-site journeys keep the camera's timing.
- [x] `/projects#scrollganizer` could open MarketLab (an effect wrote the stale project back to the address; always in development, a race in production).
- [x] Notebook: after turning to the last page with the keyboard, the Next button became disabled, dropped focus, and the arrow keys stopped working. Now `aria-disabled`.
- [x] Contrast: links and rust text on translucent paper fell to 3.8–4.0:1 over dark scenes; night-theme paper fell to 3.6:1 over sunlit ones. Tokens adjusted; measured worst case now 4.7:1.
- [x] Notebook spread was used from 900px wide, where each page is about 10 characters across. Now from 1200px.
- [x] Tool wall: three boards side by side in a 34rem column wrapped every tag. Now stacked.
- [x] Default 404 page replaced with a notice in the park's voice.
- [x] 3D monitors loaded the raw screenshot PNGs (1.4 MB). Now through the image optimizer (about 250 KB).
- [x] Tests: `npm test` (content shape; the layout queries in CSS and code match).

## Measured (production build, cold load, this machine)

| | Before | After |
|---|---|---|
| Phone `/`: transferred | 10,665 KB, 415 requests | 507 KB, 36 requests |
| Phone `/`: script time, JS heap | 1.51 s, 33 MB | 0.02 s, 4 MB |
| Phone `/projects`: largest paint | 4.5 s | 0.16 s |
| Desktop `/`: transferred | 10,665 KB, 415 requests | 1,339 KB, 55 requests |
| Render-blocking CSS (gzip) | 237 KB | 45 KB |
| Desktop place page: words visible | 1.9 s | 0.75 s |

## Not done

- Real phones and Safari: only Chromium's phone emulation was available.
- LinkedIn link: LinkedIn refuses automated requests (status 999), so it wasn't verified by request.
- Noto Serif SC (Chinese on the 3D signs) still costs 34 KB of CSS everywhere and about 460 KB of slices on wide screens. A subset with only the characters used would fix it, but would need regenerating when a sign changes.
- `components/world/ShowPlaces.tsx` isn't used anywhere.
