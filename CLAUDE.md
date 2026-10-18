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

The site should use an Apple-inspired design language without directly
copying Apple's website or UI.

Aim for approximately:

- 75% Apple.com editorial design
- 25% macOS/iOS interface influence

The overall feeling should be:

- minimal
- premium
- calm
- spacious
- precise
- professional
- modern
- recruiter-friendly

Prioritize typography, whitespace, alignment, spacing, and hierarchy
over decoration.

---

## Color Palette

Do NOT use a solid black background across the entire website.

Use a soft layered palette with subtle tonal differences.

Preferred palette:

- Warm/off-white background: `#F7F6F2`
- Secondary warm gray: `#EFEDE8`
- Soft blue-gray: `#DCE3E8`
- Primary charcoal text: `#1F2328`
- Secondary text: `#687078`
- Muted steel-blue accent: `#537A91`

These values are guidelines rather than strict requirements.

Use approximately:

- 70% neutral tones
- 20% soft secondary tones
- 10% accent color

Use color to create subtle separation between sections.

Avoid:
- large areas of pure black
- pure white everywhere
- neon colors
- highly saturated colors
- rainbow gradients
- excessive glassmorphism
- excessive gradients

Subtle gradients are acceptable when they create gentle depth.

---

## Typography

Use a clean system font stack with an Apple/San Francisco-like feel.

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

Navigation should be:

- minimal
- responsive
- easy to scan
- optionally sticky
- subtly translucent when appropriate

If using transparency or blur, keep it restrained.

Navigation should clearly link to:

- About
- Projects
- Experience
- Skills
- Contact

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