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

The site is a painted park in an abandoned, overgrown Japanese city, in
late-afternoon autumn light. The home page is one painting
(`app/assets/park/park-v04.png`, from the versioned masters in
`art/park/masters/`, history in `docs/art/park/`). Painted objects are the
navigation: the notice board opens a map, and the pavilion (About),
workshop (Projects, Skills), station (Experience), greenhouse (Interests)
and phone booth (Contact) lead to their pages (`app/data/world.ts` holds
their positions in painting pixels). Each page opens on a band of the
painting looking toward its place, with the content on paper below, until
that place gets its own painting.

On phones and portrait screens the painting is a cropped band above the
introduction and a plain list of places.

The overall feeling should be:

- warm
- calm
- nostalgic, quietly lonely, never frightening
- polished
- recruiter-friendly: content stays readable and easy to skim

The painting is the artwork; don't redraw scenery in CSS or SVG. Changes
to the painting go through the workflow in
`docs/art/park/refinement-workflow.md`. Keep text on paper or open sky,
never over busy illustration.

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