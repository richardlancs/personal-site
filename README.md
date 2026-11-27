# Richard Lan — Personal Portfolio

My personal portfolio site: <https://personal-site-flame-eight-52.vercel.app>

I'm a Computer Science student at the University of Waterloo looking for software engineering internship and co-op roles. The site covers who I am, what I've built, my background, what I do away from the keyboard, and how to reach me.

## What it looks like

The whole site is one sheet of crumpled paper.

- **A sideways journey.** Six stops, Home, About, Projects (with Skills), Background, Interests and Contact, sit side by side, and scrolling as usual (wheel, trackpad, keys, the scrollbar) moves you along them. A metro-line map along the foot shows where you are and jumps to any stop. Every card sits in the middle of the screen, on clear glass over the paper.
- **Phones read top to bottom.** Below 768px wide the stops stack into an ordinary page. So does the page without JavaScript, and in print.
- **Day and night.** One key in the top bar switches between cream paper in blue-black ink with a bronze accent, and charcoal paper in chalk with gold leaf. The choice is remembered and set before the first paint, so nothing flashes.
- **Doodles in the margins.** Hand-drawn line drawings sit beside the cards. By day they are pencil on cream; by night they are chalk on a blackboard: a sun or a constellation, paper stars, a coffee ring or a moon, a small neural network, a sigmoid, a linked list, a git branch and merge, a binary tree, a bell curve, "Hi" in binary, and two equations in every gap between the project cards. They are decoration only: hidden from screen readers, never under the words, and gone with high contrast.
- **Interests as a scrapbook.** A column of keys picks an interest; its page shows a large stack of polaroids that flip with a toss.
- **Motion with a still view.** Each stop's arrival is choreographed as you reach it, and the keys answer every press. With reduced motion set, everything is still and fully readable.
- **Also:** an in-page résumé viewer, Waterloo's time and weather in the top bar, and the Oleo Script, Fredoka and Nunito typefaces.

## Tech stack

| Area      | Tools                                                                      |
| --------- | -------------------------------------------------------------------------- |
| Framework | [Next.js 16](https://nextjs.org) (App Router), React 19                    |
| Language  | TypeScript                                                                 |
| Styling   | Tailwind CSS v4 and plain CSS on design tokens (no UI library)             |
| Résumé    | `pdfjs-dist`, loaded only when the viewer opens                            |
| Weather   | [Open-Meteo](https://open-meteo.com), through the site's own `/api/weather` |
| Tests     | `node --test`, plus Playwright-driven audit scripts                        |
| Hosting   | Vercel, deployed from `main`                                               |

## Where things are

```
app/
├── page.tsx                 # The one page: the six stops, in order
├── layout.tsx               # HTML shell, fonts, metadata, the top bar, head scripts
├── city.css                 # Paper tokens (day and night), the bar, the map, keys, sections
├── city-track.css           # The sideways journey, the cards' layout, the doodles
├── paper.css                # The crumpled-paper texture, drawn in code
├── motion.css, reveal.css   # Motion tokens and the stops' arrivals
├── data/portfolio.ts        # All the content: profile, projects, experience, interests, …
├── sections/registry.ts     # The sections: anchors and titles (the menu and map read this)
├── lib/                     # Pure helpers: time, weather, the paper and journey head scripts
└── components/
    ├── city2d/              # The page: the journey, stations, top bar, map, doodles (Decor.tsx)
    │   └── sections/        # One component per section
    ├── ui/                  # The day/night key, the press feedback, the colophon
    ├── resume/              # The in-page résumé viewer
    └── weather/             # Waterloo's time and weather
public/
├── projects/                # Project screenshots
├── interests/<interest>/    # Photos for an interest (placeholders for now)
└── resume/                  # The résumé PDF
docs/                        # How-tos, the style guide, audit scripts, and the site's history
tests/                       # Unit and source-level tests; smoke tests need a running build
```

`CLAUDE.md` holds the full design rules: palette, type, layout, motion, accessibility and budgets.

## Running locally

Requires Node.js 20 or newer.

```bash
npm install
npm run dev          # then open http://localhost:3000
```

If a style change doesn't show up, stop the server, run `rm -rf .next`, and start it again: the dev server can serve an old stylesheet.

## Checking it

```bash
npm run lint
npm test                 # unit and source tests (smoke tests skip without a server)
npx tsc --noEmit

npm run build && npx next start -p 3100
SMOKE_URL=http://localhost:3100 npm test   # the smoke tests, against the build
npm run perf:budget                        # JavaScript and CSS size budgets
```

The browser audits need an installed Playwright (see `docs/audit/scripts/pw.mjs`; point `PLAYWRIGHT` at its `index.mjs`):

```bash
node docs/ui/scripts/track-journey.mjs http://localhost:3100      # wheel, keys, swipes, anchors along the journey
node docs/ui/scripts/palette-contrast.mjs                         # both papers' text contrast
node docs/ui/scripts/mobile-audit.mjs http://localhost:3100 out/  # phones to desktop, 200% text
node docs/audit/scripts/lighthouse.mjs http://localhost:3100/ out/ 3 mobile
```

## Updating content

- **Text:** edit [`app/data/portfolio.ts`](app/data/portfolio.ts) (`profile`, `about`, `projects`, `experience`, `interests`, `skillGroups`, `marginNotes`). The page picks it up, so no component needs editing. Figures in the text are set in bold automatically.
- **Project screenshots:** put them in `public/projects/` and list them on the project; `cover` picks the one shown first.
- **Interest photos:** delete the `*-placeholder.svg` files in `public/interests/<interest>/` and drop real photos in ([how](docs/adding-interest-photos.md)).
- **The résumé:** replace the PDF in `public/resume/`.
- **A new section:** [docs/adding-a-section.md](docs/adding-a-section.md).

## Contact

GitHub, LinkedIn and email are in the site's Contact section.
