# Personal Portfolio — Claude Code Instructions

## Project Purpose

This is Richard's personal portfolio website.

The site is intended to:
- present my background professionally
- showcase software projects
- support software engineering internship/co-op applications
- link to my GitHub, LinkedIn, resume, and contact information
- evolve over time as I build more projects and gain experience

Do not invent personal information, projects, work experience, skills,
achievements, contact details, or education details.

If information is missing, use a clearly labeled placeholder or ask me.

---

## Tech Stack

This project uses:

- Next.js with the App Router
- React
- TypeScript
- Tailwind CSS
- npm

Do not replace the existing stack unless I explicitly ask.

Avoid adding new dependencies unless they provide a meaningful benefit.
Prefer built-in Next.js, React, CSS, and Tailwind functionality.

---

## Project Structure

The main application lives under:

- `app/`
- `app/components/`
- `app/data/`
- `public/`

Important files include:

- `app/page.tsx` — homepage
- `app/layout.tsx` — root layout
- `app/globals.css` — global styling
- `app/data/portfolio.ts` — portfolio content/data

Prefer reusable components over putting everything into `page.tsx`.

Keep content/data separate from visual components where practical.

---

## Design Direction

The site is a small real-time 3D world: an abandoned, overgrown Japanese
park and the places around it, in late-afternoon autumn light. It is built
with three.js and React Three Fiber in `app/components/world3d/`, and every
model and texture there is generated in code from fixed seeds (no downloaded
models, no Blender). The painting `app/assets/park/park-v04.png` is the art
reference, and the fallback when WebGL isn't available.

Six places, each its own 3D scene: the park (home; its notice board opens
the map at `/map`), the workshop (Projects, Skills), the station
(Experience), the arcade (Interests), the pavilion reading room (About) and
the phone booth (Contact). The URL picks the place; `World3D.tsx` moves the
camera there. Each page's HTML panel and its 3D objects share state through
`world3d/store.ts`. Progress, decisions and limits:
`docs/world/3d-progress-log.md`.

On phones and portrait screens the world is a band at the top of the page,
with the page below it.

The overall feeling should be:

- warm
- calm
- nostalgic, quietly lonely, never frightening
- polished
- recruiter-friendly: content stays readable and easy to skim

Build scenery as 3D in `world3d/`, through the shared painted material
(`paint.ts`), not as CSS or SVG. Keep text on paper or open sky, never over
busy scenery. Real content stays in HTML.

---

## Color Palette

All colors are tokens in `app/globals.css` (day in `:root`, night in
`[data-theme="dark"]`): paper, green-black ink, leaf green and rust. The
painting stays the same in both themes for now.

Avoid:
- large areas of pure black or pure white
- neon or highly saturated colors
- rainbow gradients
- excessive glassmorphism

Keep text contrast at 4.5:1 or better on paper and on every sky.

---

## Typography

Two typefaces from `next/font/google`, set in `app/layout.tsx`: Shippori
Mincho B1 for headings and place names (`font-display`), Zen Kaku Gothic
New for text (`font-sans`).

Prefer:

- large, confident hero typography
- clear heading hierarchy
- comfortable body text
- restrained use of font weights
- generous line-height
- strong readability

Avoid excessive font sizes and decorative fonts.

---

## Layout

Use:

- generous whitespace
- strong vertical rhythm
- centered content containers
- responsive layouts
- large editorial sections
- clean alignment

Prefer a few strong elements per section rather than many small cards.

The site should feel spacious rather than dense.

---

## Navigation

There is no row of tabs. Visitors get around by going to places in the
park; the camera moves there. The plain alternatives, always one step away:

- the **Places** menu in the top-right corner (every section, including
  Skills)
- the notice board's map (`/map`)
- "Back to the park" and Escape on every place's page

Every place is a real URL, so browser history, deep links and the keyboard
work. Keep the corner controls small and on paper.

---

## Hero Section

The hero should prioritize:

1. My name
2. My professional/academic headline
3. A concise introduction
4. Primary call to action
5. GitHub / LinkedIn links where appropriate

Keep the hero simple.

Do not add unnecessary decorative graphics just to fill space.

---

## Project Section

Projects should be the most important portfolio content.

Project components should support:

- title
- description
- technologies
- GitHub link
- optional live demo
- optional image
- optional longer project page in the future

Do not invent projects.

Keep project cards visually polished but restrained.

Prefer:
- soft surfaces
- subtle borders
- rounded corners
- gentle hover behavior

Avoid:
- huge shadows
- excessive animation
- cluttered technology badges

---

## Motion

Animations should be subtle.

Preferred:
- opacity transitions
- small translate transitions
- gentle hover effects
- approximately 200–400ms durations

Respect `prefers-reduced-motion`.

Do not add:
- excessive parallax
- animated cursors
- distracting background animations
- unnecessary page loaders
- constant movement

---

## Responsive Design

Every change must work on:

- mobile
- tablet
- laptop
- large desktop

Do not optimize only for my current browser size.

Check especially:

- navigation
- hero typography
- project cards
- spacing
- overflow
- buttons
- contact links

---

## Accessibility

Maintain good accessibility.

Use:
- semantic HTML
- appropriate headings
- keyboard-accessible controls
- visible focus states
- useful alt text
- sufficient color contrast

Do not sacrifice accessibility for visual styling.

---

## Content Rules

Never invent:

- projects
- employers
- jobs
- internships
- awards
- grades
- technologies I know
- years of experience
- GitHub usernames
- LinkedIn URLs
- email addresses
- statistics

If something is unknown, either:
1. ask me, or
2. leave an obvious placeholder.

Do not use generic AI-written statements such as:

"Passionate developer creating innovative digital experiences."

Prefer concise, natural language.

---

## Coding Style

Use TypeScript.

Prefer:
- simple components
- meaningful names
- reusable components
- clear props
- readable code
- straightforward solutions

Avoid:
- premature abstraction
- giant components
- unnecessary state
- unnecessary client components
- unnecessary dependencies
- overly clever code

Use Server Components by default when possible.

Only use `"use client"` when client-side behavior actually requires it.

---

## Editing Rules

Before making a large change:

1. inspect the relevant existing files
2. understand the current implementation
3. preserve functionality that is unrelated to the request
4. make the smallest reasonable set of changes

Do not rewrite unrelated sections of the site unless necessary.

For major redesigns, explain the plan before implementing it.

---

## Validation

After significant code changes, run:

```bash
npm run lint