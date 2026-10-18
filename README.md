# Richard Lan — Personal Portfolio

My personal portfolio site. I'm a Computer Science student at the University of Waterloo looking for software engineering internship and co-op roles. The site covers who I am, what I've built, my experience, and how to reach me.

## Tech stack

| Area      | Tools                                                   |
| --------- | ------------------------------------------------------- |
| Framework | [Next.js 16](https://nextjs.org) (App Router), React 19 |
| Language  | TypeScript                                              |
| Styling   | Tailwind CSS v4 with CSS custom properties for theming  |
| Tooling   | ESLint, Turbopack                                       |

No UI libraries or icon packs: every component and animation is written by hand.

## Highlights

- **Content separate from code.** Everything on the page (bio, projects, experience, skills, contact links) lives in [`app/data/portfolio.ts`](app/data/portfolio.ts). Updating the portfolio means editing data, not components.
- **Light and dark themes with no flash.** A tiny inline script in [`app/layout.tsx`](app/layout.tsx) applies the saved theme before the first paint, so returning visitors never see the wrong theme flicker in. The choice is saved in `localStorage`.
- **Smooth theme switching.** Colors fade between themes, and the toggle icon morphs from a sun into a crescent moon using SVG masks and CSS transforms ([`ThemeToggle.tsx`](app/components/ThemeToggle.tsx)).
- **One set of color tokens.** All colors are CSS variables in [`app/globals.css`](app/globals.css), exposed to Tailwind through `@theme`. Restyling the whole site means changing a handful of values.
- **Subtle motion.** Sections fade in as they scroll into view (an `IntersectionObserver` in [`Reveal.tsx`](app/components/Reveal.tsx)), and buttons grow slightly on hover.
- **Accessible by default.** Semantic HTML, visible keyboard focus rings, and every animation turns off for visitors whose system asks for reduced motion.
- **Static and fast.** The page is prerendered to static HTML at build time.

## Project structure

```
app/
├── components/      # One file per section (Hero, About, Projects, ...) plus shared pieces
│   ├── Section.tsx  # Shared layout every section uses
│   ├── Reveal.tsx   # Fade-in-on-scroll wrapper
│   └── ThemeToggle.tsx
├── data/
│   └── portfolio.ts # All site content
├── globals.css      # Color tokens, themes, and animations
├── layout.tsx       # HTML shell, metadata, and the no-flash theme script
└── page.tsx         # Puts the sections together
```

## Running locally

Requires Node.js 20 or newer.

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

Other scripts:

```bash
npm run build   # production build
npm run start   # serve the production build
npm run lint    # run ESLint
```

## Updating content

1. Open [`app/data/portfolio.ts`](app/data/portfolio.ts).
2. Edit the `profile`, `about`, `projects`, `experience`, or `skillGroups` values.
3. Save. The dev server reloads the page automatically.

To add a project, add another object to the `projects` array. It shows up in the Projects section with no other changes.

## Contact

- Email: [r6lan@uwaterloo.ca](mailto:r6lan@uwaterloo.ca)
- GitHub: [@richardlancs](https://github.com/richardlancs)
- LinkedIn: [Richard Lan](https://www.linkedin.com/in/richard-lan-0312072a8)
