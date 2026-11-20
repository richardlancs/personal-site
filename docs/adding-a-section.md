# Adding a section

The site is one page, `/`: six sections, each under a band of painting
of its district (never named on the page) (`app/page.tsx`,
`app/components/city2d/`). A section is two things:

- one entry in `app/sections/registry.ts`, and
- one component in `app/components/city2d/sections/`, mounted inside its
  `<Station>` in `app/page.tsx`.

The Sections menu, the progress line, the section shown in the top bar
and the sections' numbers (01 to 06) are all generated from the
registry, so none of them need editing.

The starter is `docs/development/section-template/Greenhouse.tsx`. It
lives in `docs/` so it is never built or served; `npm test` checks that
its imports still resolve from `app/components/city2d/sections/` and that
nothing called "greenhouse" is mounted or registered. Copy it there and
follow the steps below.

## 1. Register it

Add an entry to `pageSections` in `app/sections/registry.ts`, at its
place in the page's order (the sections are numbered by it):

```ts
{
  id: "reading",                    // also the SectionId union, above
  hash: "reading",                  // its anchor: /#reading
  href: "/#reading",
  title: "Reading",                 // the section's h2, and its name in lists
  listed: false,                    // true once it's ready to be pointed at
  district: "yuyuan",               // the painting above it (DistrictId)
  scene: { id: "park", focus: null },  // the 3D city's (Plan B); any SceneId for now
}
```

and its words to `sectionWords` in `app/sections/metadata.ts` (read only on
the server, so they stay out of every page's first load):

```ts
reading: { summary: "What I'm reading.", metadata: { title: "Reading", description: "…" } },
```

What each field is for is commented in the registry. A section that is
`listed: false` is still on the page; it just isn't in the menu or the
lists. `subsections` adds deeper anchors to the menu (as Projects has
Skills).

The words in `title` and `summary` are interface words;
anything about Richard belongs in `app/data/portfolio.ts`.

## 2. Give it a district and its plates

Each section has its own district: add it to `DistrictId` in the
registry, then:

1. Paint a day and a night plate of one composition, following
   `docs/city/style.md` (the style paragraph opens every prompt; the
   prompts used so far are in `docs/city/prompts.md`; record yours there).
2. Save them as `shanghai-plate-<district>-day.png` and `-night.png` in a
   folder, add the district to the list at the top of
   `scripts/city-plates.mjs`, and run
   `node scripts/city-plates.mjs <folder> [check-sheet.jpg]`. It writes
   `app/assets/city/<district>-<day|night>.webp` at 2400 × 1032, each at
   most 600 KB; the sheet lays each pair over itself at 50% so you can
   check that the buildings line up.
3. Import both in `app/components/city2d/plates.ts` and add them to
   `plates`, with the district's `focal` point (where its subject sits, so
   the phone's 4:3 crop keeps it).

Until it has plates, a band is its dark gradient, which already holds its
height.

## 3. Write the component and mount it

Copy the starter to `app/components/city2d/sections/<Name>.tsx` and
replace its placeholders. Then in `app/page.tsx`:

```tsx
<Station section={section("reading")}>
  <Reading />
</Station>
```

`<Station>` (`components/city2d/Station.tsx`) draws the band (the plates
following Richmond Hill's clock, the weather over them), the section's
number ("02", muted, hidden from screen readers) and its `h2` from
`title`. No place is ever named on the page. So:

- the component's headings start at `h3`;
- it is a server component; a small client child (as Contact's
  `CopyButton.tsx`) only where the browser is truly needed;
- its words come from `app/data/portfolio.ts`, and any text that holds
  figures is wrapped in `<Figures>` (`components/city2d/Figures.tsx`), so
  numbers are bold wherever content is shown;
- it uses the shared pieces in `app/city.css`: `.points` (short points
  with a quiet muted dash, the one list marker on black), hairlines
  (`border-line`) and spacing rather than boxes, a panel (`bg-panel`, a
  `--line` edge, `--radius-lg`) only where a thing must stand apart,
  `.glass` and `.glass-primary` keys (`.glass-lg` for one large action),
  `.text-link`; GitHub, LinkedIn and the résumé through `ProfileLinks`
  (`components/city2d/ProfileLinks.tsx`), never written out again;
- anything that opens is a native `<details>` (it works without
  JavaScript); its chevron takes the class `chevron` so it turns gently,
  and not at all in still view or with reduced motion;
- lists stay under about 65 characters a line (`max-w-[65ch]`), body text
  is at least 16px on phones, and the accents (cyan; the lantern only for
  the primary key's fill and tiny marks) are for edges, chosen states and
  display type of 24px or more, never body text;
- no words on a painting.

## Photos for an interest

The Interests section reads its photos from `public/interests/<scene>/`
at build time: drop the files in, nothing else to edit. Captions are
optional, in `portfolio.ts`. The steps, sizes and formats:
[`docs/adding-interest-photos.md`](adding-interest-photos.md).

## 4. List it, and check

Set `listed: true`. Then run:

```
npm run lint && npm test && npx tsc --noEmit
rm -rf .next && npm run build && npx next start -p 3100
SMOKE_URL=http://localhost:3100 npm test
node docs/audit/scripts/budget.mjs
```

and, against `next dev -p 3101` (the `?sky=` preview is dev only),
`node docs/ui/scripts/city-contrast.mjs` and, against the build,
`node docs/ui/scripts/mobile-audit.mjs http://localhost:3100 <out-dir>`
(both need `PLAYWRIGHT` pointing at an installed Playwright: see
`docs/audit/scripts/pw.mjs`). Add the section's content to the smoke
test that checks every section's content is in its section's HTML.
