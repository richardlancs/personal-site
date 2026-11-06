# Adding a section

Every section of the site is one entry in `app/sections/registry.ts` and
one page file. The menu, the home page's tags and list, the map, the name
tags in the 3D park and the "Other sections" links at the foot of each
page are all generated from the registry, so none of them need editing.

The greenhouse (`/greenhouse`, `app/greenhouse/page.tsx`) is the starter:
registered but unlisted, so it has an address and no link to it. Copy it.

## 1. Register it

Add an entry to `sections` in `app/sections/registry.ts`:

```ts
{
  id: "reading",                // also the SectionId union, above
  href: "/reading",
  title: "Reading",             // the section, on the page and in lists
  place: "The bench",           // where it is in the park (wide screens)
  summary: "What I'm reading.", // one line, for lists
  glyph: "pavilion",            // its drawing (components/world/glyphs.ts)
  listed: false,                // true once it's ready to be pointed at
  intro: "A bench under the ginkgo, a book left face down.",
  side: "left",                 // the page's side of a wide screen
  scene: { id: "park", focus: null },   // where the camera goes
  plate: { x: 40, y: 60, zoom: 1.9 },   // where it is in the painting
  tag: { x: 40, y: 58 },                // its tag on the home page
  map: { x: 44, y: 70 },                // its pin on the map sheet
  metadata: { title: "Reading", description: "What Richard Lan is reading." },
}
```

What each field is for is commented in the registry. The only ones a new
section must have are `id`, `href`, `title`, `place`, `summary`, `glyph`,
`listed`, `side`, `scene`, `plate` and `metadata`; `npm test` checks the
rest is consistent (unique addresses, a page for every entry, a glyph and a
scene that exist, a tag and a pin for everything listed).

## 2. Give it a page

Create `app/<href>/page.tsx`:

```tsx
import Points from "../components/ui/Points";
import Location from "../components/world/Location";
import { section, sectionMetadata } from "../sections/registry";

export const metadata = sectionMetadata("reading");

export default function ReadingPage() {
  return (
    <Location section={section("reading")}>
      <section className="project-notes take-clicks">
        <h2 className="font-display text-3xl font-semibold tracking-tight">Lately</h2>
        <Points items={["…", "…"]} />
      </section>
    </Location>
  );
}
```

`Location` gives it the heading, the line about the place, the painting
on phones, the park behind it on wide screens, and the links on to
everything else. Inside, use the shared pieces:

- `components/ui/Points`: short points on paper (`variant="notebook"` for
  ruled lines)
- `components/ui/Notice`: a notice in the middle of the view (used by the
  not-found and error pages)
- the surfaces in `globals.css`: `.project-notes` (a clipped board),
  `.paper` (a plain sheet), `.directory`, `.timetable`, `.cabinet-card`
- the location components for the selectable patterns:
  `locations/Workbench` (tabs + notes + screenshots), `locations/Cabinets`
  (a row of choices + a card), `locations/Timetable` (a table + a notice),
  `locations/Notebook` (pages), `locations/Payphone` (links + copy)

The words themselves belong in `app/data/portfolio.ts`, next to the
projects and the notebook, so the content stays apart from the components.

## 3. Optional: artwork or a scene

- **Phones** show the painting of the park, moved in on `plate`. Pick a
  spot that suits the section; there's no second image to make.
- **Wide screens** show the 3D scene named in `scene.id`. A new section
  can simply stand in the park (`{ id: "park", focus: null }`), or at an
  existing place with the camera on one of its objects (`focus` is a key
  of that scene's `focus` poses in `components/world3d/scenes.ts`).
- A scene of its own: add it to `scenes.ts` (offset, poses, fog) and
  `components/world3d/scenes/`, register the component in `World3D.tsx`'s
  `components` map, and give the section an `anchor` if it has a building
  in the park (`scenes/Park.tsx` keeps the building positions by anchor).
  That is the one case that touches the renderer.

## 4. List it

Set `listed: true`. It now appears in the Places menu, the home page's
tags and section list, the map (if it has `map`), the name tags in the
park (if it has an `anchor`) and the links at the foot of every page.

Run `npm test`, `npm run lint` and `npm run build`.
