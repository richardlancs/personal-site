# The world: progress log

## 2026-10-29: the park becomes a place you move through

### Baseline (before)

- Home: the park painting (`park-v04`) as one static image with invisible
  hotspots over it, and a row of six tabs in a fixed navbar.
- Each section page: the same template (a band of the painting, then a
  paper card), so every place looked alike.
- Screenshots: `.playwright-mcp/baseline/` (not committed).

### What changed

**Navigation.** The tab bar is gone. The painted park is mounted once in the
root layout (`components/world/World.tsx`) and stays on screen across pages;
the URL decides where its camera looks. Choosing a place moves the camera
there (starting on the click, before the page arrives), and the page's
content comes in once the camera has nearly arrived. Back/forward, deep links
(`/contact`, `/projects#scrollganizer`), Escape (back to the park) and the
keyboard all work. A small **Places** menu (top right, a native popover) and
the notice board's **map** (`/map`) are the plain ways around. A skip link
goes straight to the page content.

**Layers.** `scripts/art/layers.mjs` cuts the painting into layers with soft
masks keyed on its own colours (sky, foliage, haze), and fills the plate
behind anything that moves far enough to uncover it. Nothing is repainted;
at rest the layers recompose the painting exactly. Output:
`app/assets/park/layers/` (1.2 MB of WebP; the park downloads about 575 KB of
it at 1440 px wide).

| Layer | Moves |
|---|---|
| far (sky, mountains, towers) | least with the pointer; shrinks slightly as the camera pushes in |
| clouds | drift a few pixels over two minutes |
| canopy (big tree, right) | sways around the trunk; bends in gusts |
| tree-left, ginkgo | sway on their own periods |
| grass (lower left), ivy (lower right) | shear in the wind; most with the pointer |
| swing | a slow pendulum that dies away, then hangs still; a hard push when looked at |
| signpost pointer | knocks in gusts and when looked at |
| receiver (in the booth) | lifts off its hook on the Contact page |
| leaf sprites (4, from the canopy) | fall now and then, more in strong gusts |

Light: soft beams from the low sun, dappled light moving on the path, dust
drifting in the sun, a warm glow in each place that comes up on hover/focus
and when you arrive (the pavilion window, the booth tube, the clock face,
the greenhouse glass), and a booth light that catches now and then.

Gusts travel across the park from the sunny side, reaching each tree in turn,
at irregular times (6.5 to 17 s apart). Everything stops when the tab is
hidden or the park is scrolled away; nothing moves with reduced motion, and
the camera cuts instead of travelling.

**Places.** Each one has its own object, not a shared template:

| Place | Page | Object |
|---|---|---|
| Pavilion | About | A notebook open on the bench: ruled pages, a leaf sweeps across on each turn (buttons or arrow keys), or read every page at once |
| Workshop | Projects | Old screens on a bench, one per project; choosing one switches it on and puts its real screenshots on the big monitor, with clipped notes. Skills hang on a pegboard tool wall |
| Station | Experience | An enamel timetable; choosing a line turns its notice over line by line, like flaps |
| Greenhouse | Interests | Wooden markers in a planting bed; pulling one up brings out its seed packet |
| Phone booth | Contact | The line (pick up the receiver: it lifts in the painting) and a pinned directory card with every link and copy buttons |
| Notice board | Map | An inked map of the park unfolds over the board; every place on it is a link |

Small things to look at in the park (a note pinned beside each, nothing
about Richard): the bicycle, the swing, the signpost, the fountain, the bench.

**Phones.** The painting is a band at the top that you pan with a finger
(native horizontal scroll, starting on the notice board, with a hint until
you pan). Every place keeps a name tag; the introduction and a plain list of
places follow below. On a place's page the band is shorter and the camera
looks at that place, with the page under it.

### Tested

Playwright, against `next dev` and the production build (`next start`):
park → each place by clicking the painting, park → notice board → map → place,
Places menu, receiver, notebook turns, timetable, planting beds, project
screens and deep link, Escape, back/forward, keyboard tab order and Enter,
reduced motion (no sway, instant camera), every hotspot hit-tested at 1920,
1440 and 1280 wide, phone at 390 × 844 (pan, tap, no horizontal overflow),
dark theme. No console errors. 60 fps idle on the park. External links
checked (LinkedIn blocks automated requests, as it always does).

`npm run lint` and `npm run build` pass; every route is static.

### Known limits

- At 1024 × 768 (4:3 landscape) the pavilion is partly cropped and its
  left half sits under the introduction's buttons; it's still clickable on
  its right side and from the map and Places menu.
- When the camera pushes in, the painting is enlarged up to about 1.9×, so
  places are softer than the park itself. They need their own paintings
  (below).
- In development, Turbopack sometimes keeps serving an old `globals.css`
  until `.next` is deleted.

### Artwork still needed

None of these exist yet; the places use the park painting seen up close until
they do. Briefs and the workflow are in `docs/art/park/`.

1. A painting for each place, from inside or up close: the pavilion
   interior with the notebook on the bench; the workshop bench with old
   monitors; the station platform under the clock; the greenhouse beds under
   broken glass; the booth interior with the phone.
2. A portrait (phone) painting of the park, so phones don't pan a crop.
3. Night versions of the park (the dark theme still shows the day painting).
4. Optional: separate layers painted for the far city and the foreground,
   which would allow deeper parallax than cutting the one painting allows.

### Content still needed

- A résumé PDF. The Contact page has no résumé line until there is one (add
  the file to `public/` and a line in `app/contact/page.tsx`).
