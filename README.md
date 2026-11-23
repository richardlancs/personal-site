# Richard Lan — Personal Portfolio

My personal portfolio site. I'm a Computer Science student at the University of Waterloo looking for software engineering internship and co-op roles. The site covers who I am, what I've built, my experience, and how to reach me.

The site is one journey along a city: six sections (Home, About, Projects with Skills, Experience, Interests, Contact) are six stops along one continuous panorama of Shanghai. Scrolling as usual (wheel, trackpad, keys, the scrollbar, a swipe) moves you sideways along it; the city is shown by day or by night as the clock in Richmond Hill, Ontario has it, with that day's weather over it. A metro-line map along the foot of the screen marks the stop you're at and jumps to the others. Without JavaScript the page reads top to bottom.

## Tech stack

| Area      | Tools                                                   |
| --------- | ------------------------------------------------------- |
| Framework | [Next.js 16](https://nextjs.org) (App Router), React 19 |
| Language  | TypeScript                                              |
| Styling   | Tailwind CSS v4 and one stylesheet of design tokens     |
| Tests     | `node --test`, plus Playwright-driven audit scripts     |

No UI libraries or icon packs. There is one theme (dark) and no theme toggle.

## Where things are

```
app/
├── page.tsx                 # The one page: six stops, in order, on the journey
├── layout.tsx               # HTML shell, fonts, metadata, the top bar
├── city.css                 # Tokens, the bar, the metro map, glass keys
├── city-track.css           # The journey: the stage, panels, sky and the living city
├── data/portfolio.ts        # All the content: profile, projects, experience, …
├── sections/registry.ts     # The sections: anchors, titles, their stretch of the city
├── lib/                     # Pure helpers (the sky, the map's progress, figures, …)
├── assets/city/panorama/    # The panorama's tiles, by day and by night
└── components/
    ├── city2d/              # The page: the journey, the panorama, the top bar, the map
    │   └── sections/        # One component per section
    ├── resume/              # The in-page résumé viewer
    └── weather/             # Richmond Hill's time and weather
public/
├── projects/                # Project screenshots
├── interests/<interest>/    # Photos for an interest (shown by themselves)
└── resume/                  # The résumé PDF
docs/                        # How-tos, the style guide, audits and their scripts
tests/                       # Unit and source-level tests; smoke tests need a server
```

The 3D city that was at `/city` was removed on 2026-11-22; its addresses redirect to the page.

## Running locally

Requires Node.js 20 or newer.

```bash
npm install
npm run dev          # then open http://localhost:3000
```

If a style change doesn't show up, stop the server, `rm -rf .next`, and start it again: the dev server can serve an old stylesheet.

In development, `?sky=<weather>-<daylight>` previews a sky, for example `/?sky=rain-night` or `/?sky=clear-dusk-0.8`.

## Checking it

```bash
npm run lint
npm test                 # unit and source tests (smoke tests skip without a server)
npx tsc --noEmit

rm -rf .next && npm run build && npx next start -p 3100
SMOKE_URL=http://localhost:3100 npm test                 # the smoke tests, against the build
node docs/audit/scripts/budget.mjs                       # JavaScript and CSS size budgets
```

The browser audits need an installed Playwright (see `docs/audit/scripts/pw.mjs`; point `PLAYWRIGHT` at its `index.mjs`):

```bash
node docs/ui/scripts/track-journey.mjs http://localhost:3100      # wheel, keys, swipes, anchors along the journey
node docs/ui/scripts/palette-contrast.mjs                         # the palette's text contrast
node docs/ui/scripts/city-contrast.mjs http://localhost:3101      # every word over every sky (next dev)
node docs/ui/scripts/mobile-audit.mjs http://localhost:3100 out/  # phones to desktop, 200% text
node docs/audit/scripts/lighthouse.mjs http://localhost:3100/ out/ 3 mobile
```

## Updating content

- Text: edit [`app/data/portfolio.ts`](app/data/portfolio.ts) (`profile`, `about`, `projects`, `experience`, `interests`, `skillGroups`). The page picks it up; no component needs editing. Figures in the text are set in bold by themselves.
- A project's screenshots go in `public/projects/`; list them on the project, and `cover` picks the one shown first.
- Photos for an interest: drop them into `public/interests/<interest>/` ([how](docs/adding-interest-photos.md)).
- The résumé: replace the PDF in `public/resume/`.
- A new section: [docs/adding-a-section.md](docs/adding-a-section.md).

## Contact

GitHub, LinkedIn and email are on the site's Contact section.
