# The World We Left Behind: Audit, Creative Direction and Park Plan

Status: **draft for Richard's review.** Nothing in the frontend has been changed.
Covers Phase 1 (audit) and Phase 2 (creative direction). Phase 3 (the park
vertical slice) starts only after this is approved.

---

## 0. Tool check

| Tool | Status in this session | How it was used |
|---|---|---|
| Superpowers | Available | `brainstorming` framed this document; `writing-plans` produces the Phase 3 task plan once this is approved |
| Frontend Design | Available | Token system, type and layout plan, self-review against generic defaults (§5, §6) |
| Context7 | Available (MCP) | Not needed yet; will be used for Next.js 16 image/`next/font` and View Transitions docs in Phase 3 |
| Playwright MCP | Available | Ran the local dev server and captured every screenshot in this audit |
| **Impeccable** | **Not available.** No skill, plugin or MCP server by that name is loaded in this session | Substituted with the `design:design-critique` skill plus my own critique of the screenshots. If you installed it, check `/plugin` and reload; I'll rerun the critique with it in Phase 4 |
| Image generation | **None available.** No tool in this session can paint raster artwork | This is the biggest constraint on the project. See §2 |

Screenshots: `.playwright-mcp/audit/` (1440×900, 1920×1080, 768×1024 and
390×844 for the clearing; every section at 1440 and 390). That folder is not
in `.gitignore`; it should be added before anything is committed.

---

## 1. Phase 1: audit of the current site

### What exists

- **Stack:** Next.js 16.4 (App Router, Turbopack), React 19.3, Tailwind 4,
  TypeScript. Zero runtime dependencies beyond Next/React. Keep it that way
  unless a library clearly pays for itself.
- **Structure:** `page.tsx` = `Sky` + `Navbar` + `ParkWalk` wrapping
  Hub → About → Projects → Experience → Interests → Skills → Contact.
- **The clearing** (`park/hub/`): five SVG depth layers on a 1600×900 canvas
  (sky, far city, mid city, treeline, ground) plus a foreground layer, all
  through a shared `#paint` filter for grain. Pointer parallax, magnetic path
  buttons, zoom-blur "travel" into a section. Three path layouts (wide, mid,
  narrow) so the buttons stay on-screen on phones.
- **The walk** (`ParkWalk.tsx`): sideways scroll-driven track on large screens,
  vertical stack on phones, portrait tablets and reduced motion. `--p` drives
  the sky from morning to dusk. Motion blur while walking.
- **Intro** (`Intro.tsx`, 429 lines): once-per-session animation, skipped
  under reduced motion.
- **Extras:** music toggle (CC0 track), theme toggle with a night park,
  no-flash theme script.
- **Content** (`data/portfolio.ts`): real and worth preserving exactly:
  2 projects (MarketLab, Scrollganizer), 2 experience entries, 4 interests,
  3 skill groups, 2 emails, GitHub, LinkedIn.
- **Assets in `public/`:** only the audio file and the Next.js starter SVGs.
  No photos, no project screenshots, **no résumé PDF**.
- **No console errors** at any viewport. No horizontal overflow.

### What works (keep it)

1. The idea is already right: a walk through a reclaimed place, with paths as
   navigation. The redesign deepens it rather than replacing it.
2. The engineering is careful: no-flash scripts, three responsive path
   layouts, reduced-motion handling, a real `<nav>` of path links, content in
   one data file. The parallax/travel machinery in `HubStage.tsx` is reusable
   as-is.
3. Content is honest, specific and readable.
4. Conventional navbar exists alongside exploration, which the brief requires.

### Critique (design-critique framework)

**First impression (2 s).** The eye lands on the name (good), then on six
identical white discs with brown pill labels fanned across a lawn. The scene
reads as a *diagram of a park*, not a place. The city is pale grey rectangles;
nothing tells me what happened here or invites me to look closer.

| # | Finding | Severity | Why it matters |
|---|---|---|---|
| 1 | **Everything is primitive shapes.** Towers are rectangles, trees are stacked circles, vines are circles on strokes, clouds are three-circle clip art. The grain filter adds texture but not form | 🔴 | The brief's top priority is convincing environmental detail. No amount of grain makes a circle into foliage |
| 2 | **No light.** The sun sits behind the text; there is no cast shadow direction, no rim light, no warm/cool split. Every surface is flat-filled | 🔴 | Lighting is what makes painted scenes feel like a place and what directs the eye |
| 3 | **Composition is symmetrical and radial.** Six paths fan from a fountain at bottom centre, like a menu. The far city is a uniform band. There's no focal object, no foreground framing, no path that leads *into* depth | 🔴 | It reads as navigation UI drawn on grass, not a world you could walk into |
| 4 | **The path buttons are app icons** (briefcase, folder, globe, `</>`) in white discs with all-caps pills. They don't belong to the world and they sit on top of the lanterns they should *be* | 🟡 | Breaks immersion; the generic icon set is the most "website" element in the scene |
| 5 | **Sections abandon the world.** Past the clearing, every section is the same rolling hills + grass strip + rounded cards, with an all-caps "THE NOTICE BOARD" pill above the heading | 🔴 | The six locations are not distinct places, and the card grid is the generic SaaS pattern the brief rules out |
| 6 | **Scale is inconsistent.** The car is about the size of a lantern; the fountain is wider than a city block; towers behind the treeline are the same height as trees in front | 🟡 | Breaks the sense of distance and makes the scene feel toy-like |
| 7 | **On phones the scene is a cropped strip** behind six floating buttons; the city and the fountain are lost | 🟡 | Mobile shows the least of the world, but it's the most common recruiter device |
| 8 | **Projects board clips off the right edge at 1440** and interest cards run off-screen | 🟡 | Content cut off on the most common laptop size |
| 9 | Typography leans on the tracked all-caps eyebrow + serif heading pattern | 🟢 | One of the commonest generated-page tells |
| 10 | No project screenshots and no résumé link anywhere | 🟡 | Recruiters look for both first |

**Accessibility:** body text on paper cards passes comfortably. Path labels
(cream on brown pill) pass. Hero intro text in muted grey over the hazy sky is
borderline near the sun glow and should be measured. Touch targets on the
path discs are ~54px (good). Keyboard focus reaches every path link.

### Priority for the redesign

1. Replace primitive-shape illustration with real painted artwork (§2).
2. Recompose the park around a focal point, a light direction and depth.
3. Make the path ends *objects in the world* instead of icon buttons.
4. Give each section its own place; drop the shared hills-and-cards template.
5. Add the missing content: project screenshots, résumé.

---

## 2. The decisive question: where the artwork comes from

The brief says the quality of the artwork decides the quality of the site,
and asks me not to pass off CSS shapes as finished environment art. I agree,
so I want to be direct about this:

**I cannot paint raster artwork in this session.** I can write SVG. The
current site is the honest ceiling of SVG-from-primitives. Hand-authored SVG
can go a long way further than it does now (layered brush-shaped paths,
displacement filters, painted gradients, careful lighting), but it will look
like a skilled *vector illustration*, not a Ghibli-style background painting.

Three routes:

| Route | What it looks like | Who makes the art | Cost / risk |
|---|---|---|---|
| **A. Painted backplates + SVG/HTML on top** (recommended) | Painterly raster scenes for sky, city, trees and ground; interactive props, light and atmosphere as SVG/CSS layers I build | You generate them in an image tool (Midjourney, Firefly, etc.) from prompts and specs I write, or commission an illustrator. I cut, grade, layer and integrate | Highest ceiling. Consistency across six scenes is the hard part; the art bible and fixed prompts exist to control it. You need to be comfortable with the tool's licence terms |
| **B. Deep hand-authored SVG** | Much richer vector art than today: brush-edged foliage clusters, perspective-correct buildings, light and shadow passes, a texture overlay | Me, entirely in code | No external tools. Ceiling is "beautiful storybook vector", not painted film background. Slow per scene |
| **C. Licensed asset pack** | Depends on the pack | Purchase | Rarely matches this exact world; mixing packs breaks consistency. I don't recommend it |

Route A meets the brief. Route B is the fallback if you don't want AI-generated
or commissioned images, and the rest of this document works for either: only
§8's "who produces it" column changes.

---

## 3. Creative concept

**Working title:** *The World We Left Behind*

A mid-sized Japanese-inspired city, about fifteen years after everyone left.
Not a disaster you can see; people simply went, and the place kept going
without them. It's late afternoon in early autumn: the light is low and gold
from the left, the air is full of pollen and dust, cicadas have just stopped.

The visitor arrives in **Hikari Park** (working name), a neighbourhood park
at the edge of the old centre. The park is the one place in the city that
looks *more* alive than before. From it you can see the station's clock tower,
the roof of the old workshop, the library pavilion and the arcade's faded sign
through the trees, and paths lead to each.

**Emotional ratio (from the brief):** 70% warmth and wonder, 30% loneliness.
In practice: warm light and lush growth carry the warmth; empty benches,
stopped clocks and objects left mid-use carry the loneliness. No darkness for
effect, no decay that reads as disgusting (no rot, no blood, no graffiti tags).

**The person in the world.** The site is about Richard, and the visitor never
sees him. Instead, the city is full of traces of *one recent visitor*: a
bicycle that isn't rusted like the others, a notebook left open on the
pavilion table, a laptop on the workshop bench that's still charged. That's
the thread that makes the portfolio content belong in the world: he's been
here, and he left his work out for you to find.

### Mood references (moods, not designs to copy)

- *Painted animated backgrounds*: depth through atmospheric perspective,
  backlit leaves, hand-observed everyday clutter, warm/cool light split.
- *Abandoned Tokyo streets in post-apocalyptic drama*: empty crossings,
  vending machines, overhead wires, signage that still makes sense.
- *Exploration games*: one strong landmark per view, light as wayfinding,
  "worth looking at before you click anything".

Everything drawn is original: no recognisable characters, logos, specific
film shots, or real locations reproduced.

---

## 4. World map

```
                    N (far / up-screen)
           ┌────────────────────────────────────┐
           │      [Railway Station]  clock tower│
           │      Experience & Education        │
           │            │ old tram line         │
   [Workshop]──────────┤                         │
   Projects + Skills   │                 [Arcade / Greenhouse]
   (west, roofline     │                  Interests
    visible from park) │                  (east, faded sign)
           │      ┌────┴─────┐                  │
           └──────┤ THE PARK ├──────────────────┘
                  │  (hub)   │
                  └────┬─────┘
             [Library Pavilion]        [Telephone Booth]
             About (near, left)        Contact (near, right,
                                        at the park gate)
                    S (camera / you)
```

| Location | Section | Distance from park | Seen from the park as |
|---|---|---|---|
| The Park | Hub: name, intro, paths | | |
| Library Pavilion | About | Near left, just inside the trees | Its tiled roof and lit windows |
| Workshop | Projects (+ Skills on the tool wall) | West, mid-distance | Sawtooth roof with skylights, ivy |
| Railway Station | Experience & Education | Far, centre-left | The clock tower, stopped at 4:17 |
| Arcade / Greenhouse | Interests | East, mid-distance | A faded neon-tube sign, glass roof |
| Telephone Booth | Contact | Near right, by the park gate | Green booth, light on inside |

Decision for you: the brief has no place for **Skills**. My call is to put
them on the Workshop's pegboard tool wall, next to the projects that use them.

---

## 5. Art bible

### 5.1 Camera and composition

- **Camera:** standing eye height (~1.6 m), slightly above the path, 35mm-ish
  field of view. No top-down map view in scenes; the world map exists only as
  an in-world object (the park notice board).
- **Horizon:** at 42% of the frame height on desktop, 38% on phones. Never
  centred.
- **Three planes, always:**
  - *Foreground* (0–20% depth): framing elements that crop at the edges:
    leaves, a bench arm, grass. Darker, cooler, slightly soft.
  - *Midground* (20–60%): the interactive props and the place itself. Sharpest
    and most saturated, where the light falls.
  - *Background* (60–100%): city and sky. Lower contrast, bluer, lighter.
    Atmospheric perspective is the main depth cue.
- **Focal point** on a rule-of-thirds line, never dead centre. One per scene.
- **Leading lines:** paths, rails, cables and roof edges point to the focal
  point or to the next location.
- **Scale ruler:** a door is 2.0 m, a bench seat is 0.45 m, a bicycle 1.7 m
  long. Every prop is checked against these in the layout sketch.

### 5.2 Light

- **Time of day:** late afternoon, sun ~25° above the horizon, coming from
  **upper left, slightly behind the camera**. All scenes share this direction
  so the world is consistent; the sky still shifts warmer as you go further.
- **Key light:** warm gold `#E9C27A`. Shadows: cool violet-green `#4C5A55`,
  never black. Shadows fall to the lower right.
- **Rim light** on foliage edges facing the sun; backlit leaves glow
  yellow-green.
- **God rays** only where there's an occluder (canopy gaps, broken roofs).
- Interactive objects sit in the brightest pools of light. **Light is the
  primary affordance.**
- **Night theme:** same scenes, moonlight from upper right, sodium-orange
  glow from the few lamps that still work, fireflies. Repainted
  backplates, not just a dark overlay.

### 5.3 Painting style

- Painterly, soft edges in the distance, firmer edges on interactive props.
- Visible but disciplined brushwork; no photo texture, no photobashing.
- Foliage as **clusters**, not individual circles: each cluster has a lit top,
  a mid tone and a cool shadow underside, with a few separated leaf shapes at
  the silhouette edge.
- **Species variety** in the park: camphor/zelkova canopy (broad), ginkgo
  (fan leaves, turning yellow), cherry (bare-ish, it's autumn), bamboo
  clump, kudzu over walls, susuki grass, cosmos and goldenrod as wildflowers.
- **Linework:** none as outlines. Edges are defined by value change.
- **Texture:** one shared paper-grain overlay at 4–6% opacity across the
  whole frame (replaces per-layer `#paint` filter, which is costly).

### 5.4 Abandonment vocabulary

Used consistently in every scene, so the world reads as one place:

- Concrete: hairline cracks with grass, water stains under every ledge,
  missing tiles in patterns (corners first).
- Metal: rust blooms at joints and fasteners first, then edges; never
  uniformly rusted.
- Paint: chipped on edges and hand-contact areas; sun-faded on the sunny side.
- Signage: still readable, colours shifted toward cyan (red fades first).
- Growth: vines climb from the ground and the shaded side, hang from ledges;
  moss on north faces and in joints; saplings in gutters.
- **Story objects** (one or two per scene, never interactive): a school bag
  on a bench, a calendar on a wall left at a month, a bicycle with a basket of
  dried flowers, a vending machine with one can still in the slot.

### 5.5 Colour

Core palette (hex values are starting points; contrast checked in Phase 3):

| Name | Hex | Use |
|---|---|---|
| Canopy | `#4E6A3B` | Main foliage mid tone |
| Moss | `#83904F` | Lit grass, moss, lichen |
| Late sun | `#E9C27A` | Key light, highlights, focus glow |
| Concrete | `#A8A195` | Buildings, paths, fountain |
| Rust | `#98543A` | Metal, accents, the only "red" in the world |
| Haze | `#AFC2C6` | Sky, distance, cool shadows |
| Ink | `#2B2F27` | Text (a green-black, never pure black) |
| Timetable paper | `#E8E3D0` | Content surfaces: greyer and greener than cream |

No neon, no saturated primaries. The faded arcade sign is the most saturated
element in the world, and even it is muted.

### 5.6 Typography

CLAUDE.md asks for system fonts. Staying within that:

- **Headings / environmental titles:** the bookish system serif (as now),
  larger and looser: name at ~clamp(48px, 7vw, 96px), weight 500, not bold.
- **Content:** system sans, 17px base, 1.6 line height, ≤70 characters.
- **In-world labels** (station signs, timetable, booth): set in the sans with
  tabular numbers, treated as *printed signage* (stencil-like spacing, fade
  texture applied through the backplate, not the text). Real HTML text so it's
  readable and indexable.
- **Dropped:** the all-caps tracked eyebrow pills. A location's name appears
  on its own sign in the scene instead.

Decision for you: a single licensed display face (via `next/font`, no new npm
dependency) would make the station and booth signage much more convincing.
My default is to stay on system fonts unless you'd like that.

### 5.7 Motion language

- **Ambient** (the only constant motion, all paused under reduced motion and
  when the tab is hidden): leaves in the foreground sway on a 6–9s cycle,
  dust motes drift in the light shafts, one bird crosses every 30–60s. Nothing
  else moves on its own.
- **Response:** hover/focus on a prop brightens its light pool and lifts it
  2–4px over 250ms; signs swing a few degrees on a spring.
- **Travel between locations:** the camera "walks": a 700–900ms push into the
  chosen path with the foreground parting, crossfading into the next scene's
  backplate. Uses the View Transitions API where supported (to confirm with
  Context7), plain crossfade otherwise, instant under reduced motion.
- **Parallax:** pointer-driven, max ±12px on the foreground, ±2px on the
  sky. Already implemented in `HubStage.tsx`; keep the numbers small.
- **No:** scroll hijacking of the clearing, loaders, motion blur on text,
  unskippable intro. (The current intro should become skippable and shorter,
  or be retired.)

---

## 6. Frontend Design plan, reviewed against generic defaults

**Layout concept:** each location is one full-viewport scene. Content opens
as an *in-world document* (a timetable, a notebook page, a lab notebook, the
booth's card) that slides up over the lower part of the scene, never covering
the focal object. Text is left-aligned inside documents; titles are set on
signs in the scene.

```
Desktop, location open:
┌──────────────────────────────────────────────┐
│ nav (thin, translucent)                      │
│                                              │
│      scene: focal object in light            │
│                                    ┌────────┐│
│                                    │document││
│   foreground leaves                │(paper) ││
│                                    │        ││
└────────────────────────────────────┴────────┘┘

Phone, location open:
┌────────────┐
│ scene crop │  scene keeps the focal object
│ (focal obj)│  (art-directed crop, not a shrink)
├────────────┤
│ document   │  document is a normal scrolling
│ (paper)    │  page below the scene
│            │
└────────────┘
```

Self-review: I checked the plan against the generic patterns the Frontend
Design guidance warns about.

- *Cream background + serif + terracotta accent:* the current site edges toward
  this. Changed: content paper is greyer/greener, the accent is rust
  `#98543A`, used sparingly, and most colour comes from the painted scene.
- *Identical rounded cards:* replaced with documents that differ by location
  (timetable rows, notebook pages, project dossiers on a bench).
- *All-caps eyebrows and middle-dot meta strings:* removed. The tech-stack line
  in projects becomes a short list on the dossier, not dot-joined.
- *Numbered markers:* used only on the station timetable, where the content
  really is a sequence in time.

**The one bold thing:** the light. Every scene is built around a single pool of
late-afternoon light falling on the thing you should click. Everything else
stays quiet.

---

## 7. The park: storyboard and layers

### 7.1 Shot 1: arrival (desktop 16:9)

The camera stands at the park's south entrance, at the top of three worn
stone steps, looking north along the main path.

```
┌──────────────────────────────────────────────────────────────────────┐
│ sky: warm haze, sun upper-left behind canopy           clock tower ▲ │ BG
│  ░░ distant towers, vine-draped, pale blue-grey ░░ station roof ░░░  │
│ ▓▓ canopy (left, dark, backlit edge) ▓▓          ▓▓ zelkova (right) ▓│ MG-far
│ ▓▓  workshop sawtooth roof            notice     arcade sign (faded) │
│ ▓▓  through gap                        board ◆                ▓▓▓▓▓▓ │
│      Richard Lan                    ╱ main path ╲      phone booth ◆ │ MG
│      CS @ Waterloo · intro    bench◆   fountain   bicycles           │
│ pavilion ◆ (lit window)      ╱  (moss, dry)  ╲     playground        │
│ ████ foreground: cherry branch, ginkgo leaves, bench arm, susuki ████│ FG
└──────────────────────────────────────────────────────────────────────┘
   ◆ = interactive
```

**Where the eye goes, in order:**
1. The light pool on the path just past the fountain (brightest value in the
   frame, lower-centre-right).
2. Up the path to the **notice board** standing in that light. This is the
   park's primary interactive object and the conventional menu in disguise.
3. Left to the name and intro, set on clear sky/ground behind a soft scrim
   between the left canopy and the path (no busy art behind it).
4. Outward to the landmarks on the skyline: clock tower, workshop roof,
   arcade sign, each lit by a rim of sun.

### 7.2 Layers

| Depth | Layer | Contents | Parallax |
|---|---|---|---|
| 0 | Sky | Gradient haze, sun disc behind canopy, thin cloud streaks | 0 |
| 1 | Far city | Towers with broken tops, vine curtains, the station clock tower, overhead wires sagging between poles | 0.08 |
| 2 | Landmarks | Workshop roof, arcade sign, pavilion roof, painted separately so they can glow on hover | 0.15 |
| 3 | Back canopy | Large zelkova/camphor masses framing the view, god rays through gaps | 0.25 |
| 4 | Park ground | Main path (cracked flagstones, grass in joints), fountain, playground, lawn going to meadow, old asphalt road edge with a faded crossing | 0.4 |
| 5 | Props | Notice board, bench with school bag, bicycles, phone booth, pavilion door, vending machine at the gate | 0.4 (ride the ground) |
| 6 | Atmosphere | Light shafts, dust motes, ground haze in the low areas | 0.5 |
| 7 | Foreground | Cherry branch top-left, ginkgo leaves, bench arm bottom-right, susuki grass | 1.0 |
| 8 | HTML | Name, intro, links, prop labels, the nav | none |

### 7.3 Interactive objects in the park

1. **The notice board** (primary). Pinned papers: a faded city map with the
   six locations marked, a lost-cat notice, a festival flyer from the last
   summer, a handwritten note. Hover: the map paper lifts in the wind.
   Click: the board fills the frame and becomes the **map navigation**: six
   pinned cards, each a link to a location, keyboard-navigable. This is the
   accessible menu.
2. **The phone booth** (Contact). Light flickers on inside. Click: the camera
   pushes in, the booth's directory card shows email, GitHub, LinkedIn and
   résumé as real links. *(Phase 3's "transition into one secondary location"
   candidate, because it's small, self-contained and immediately useful.)*
3. **The pavilion window** (About): a lit window with a notebook visible
   on the sill. Click: travel to the library.
4. **Path signs**: a weathered wooden fingerpost at each fork pointing to the
   workshop, station and arcade. Hover swings the sign; click travels.
5. **Discoveries, not interactive:** a bicycle under kudzu with a basket of
   dried cosmos; one swing still moving slightly; a calendar in the vending
   machine's window; cat paw prints in dried mud on the fountain rim.

Every interactive object is a real `<a>` or `<button>` positioned over the
art, with a visible label that appears on hover/focus (and always on touch),
a focus ring drawn as a light pool, and an accessible name.

### 7.4 Transition out

Choosing the booth: foreground leaves part left and right (300ms), the scene
scales toward the booth with a slight upward tilt (600ms), crossfade into the
booth close-up. Back button / Escape reverses it. The URL changes
(`/contact` or `#contact`; see §9), so the location is linkable and the
browser back button works.

### 7.5 Phone composition (390×844)

Not the desktop scene cropped. A **separate portrait painting** of the same
spot from closer in: the path climbing vertically, notice board in the upper
third in the light, fountain mid-frame, foreground branch top-left. Name and
intro sit in the sky above the canopy. The booth and pavilion are reachable
via the notice board map rather than squeezed into the frame.

---

## 8. Asset manifest

All raster backplates: authored at 2× (3200×1800 landscape, 1500×3248
portrait), delivered as AVIF + WebP via `next/image`, target ≤250 KB per
landscape layer at 1×. Props with transparency as WebP/AVIF with alpha or as
SVG when built by me.

**Produced by:** *Art* = painted raster (route A: you generate or commission
from my prompts; route B: replaced by me in SVG). *Code* = I build in SVG/CSS.

### Park (Phase 3)

| ID | Asset | Layer | Size / ratio | Alpha | By | Notes |
|---|---|---|---|---|---|---|
| P-01 | Sky + sun haze | 0 | 3200×1800, 16:9 | no | Art | Warm left, cooler right |
| P-02 | Far city + clock tower | 1 | 3200×1000 | yes | Art | Atmospheric blue, low contrast |
| P-03 | Landmark roofs (workshop, arcade sign, pavilion) | 2 | 3 × ~800×600 | yes | Art | Separate so each can glow |
| P-04 | Back canopy with light gaps | 3 | 3200×1400 | yes | Art | Two species minimum |
| P-05 | Park ground, path, fountain, playground | 4 | 3200×1100 | yes | Art | Must leave a clear area for the intro text |
| P-06 | Notice board | 5 | 600×800 | yes | Art + Code | Board painted; papers are HTML/SVG so they're real text |
| P-07 | Phone booth | 5 | 400×800 | yes | Art | Interior light as a separate layer |
| P-08 | Bench + school bag, bicycles, vending machine | 5 | ~600×400 each | yes | Art | Story objects |
| P-09 | Fingerpost signs ×3 | 5 | 300×500 | yes | Code | Text must be live |
| P-10 | Light shafts, dust, ground haze | 6 | n/a | n/a | Code | CSS/SVG, blend modes |
| P-11 | Foreground branch, leaves, grass, bench arm | 7 | 2 × ~1600×900 | yes | Art | Separate left/right so they can part |
| P-12 | Paper-grain overlay | top | 512×512 tile | yes | Code | Replaces per-layer filters |
| P-13 | Portrait park composition | all | 1500×3248, 9:19.5 | per layer | Art | Separate painting, same spot |
| P-14 | Night variants of P-01–P-05, P-07 | | as above | | Art | Can follow after day is approved |

### Later locations (Phase 5, one at a time)

| Location | Key art | Interactive props (live HTML on top) |
|---|---|---|
| Phone booth (first secondary) | Booth interior close-up | Directory card, receiver, résumé slip |
| Workshop | Interior, sawtooth skylights, bench, pegboard | Laptop per project (screenshot on screen), pegboard (skills) |
| Station | Platform, departure board, clock | Timetable (experience), ticket machine (education) |
| Library pavilion | Interior, shelves, table, window | Open notebook (about), photo board |
| Arcade / greenhouse | Cabinets under glass roof, plants | One cabinet or shelf per interest |

### Content assets you need to supply (no art tool can produce these)

| Asset | Used in | Status |
|---|---|---|
| **Résumé PDF** | Phone booth, nav | **Missing** |
| **MarketLab screenshots** (2–3) | Workshop | **Missing** (can capture from the live demo with Playwright, with your OK) |
| **Scrollganizer screenshots** (2–3) | Workshop | **Missing** |
| Personal photos (optional) | Library photo board | Optional; site works without |
| Any extra "about" story | Library notebook | Optional; current `about` text is enough to start |

---

## 9. Navigation and interaction spec

- **Routes:** keep a single page for the park, add one route per location
  (`/workshop`, `/station`, …) so each place is linkable, lazy-loaded and
  indexable. The current `#about`-style anchors redirect to them. *(My call;
  the alternative is keeping one long page with hash-based scenes.)*
- **Conventional nav** stays: a thin bar with About, Projects, Experience,
  Skills, Contact and Résumé, using plain names, not in-world ones. On phones it
  collapses into a single "Map" button that opens the notice-board map.
- **Every location** has a "Back to the park" control (top-left, also
  Escape) and a plain list of the content in the document panel.
- **No scroll hijacking.** The sideways scroll walk retires; walking happens by
  choosing paths. Scroll inside a location just scrolls its document.
- **Keyboard:** Tab order follows the eye order in §7.1. Arrow keys move
  between props when one is focused. Enter opens; Escape returns.
- **Touch:** prop labels always visible on touch devices (no hover-only
  information); targets ≥44px.
- **Reduced motion:** no ambient motion, no parallax, travel is an instant
  cut, everything else identical.

---

## 10. Responsive strategy

| Range | Composition |
|---|---|
| ≥1600 wide | Landscape art at full width, extra sky/ground revealed; content max width stays fixed |
| 1024–1599 | Landscape art, art-directed focal point kept within the safe area |
| 768–1023 portrait | Portrait art (P-13) with more of the scene visible; document as bottom sheet |
| <768 | Portrait art, scene is the top ~60vh, then the document scrolls as a normal page |

Art-direction safe areas are marked on each painting brief so the focal
object and the intro area never crop.

---

## 11. Performance and accessibility

- **Budget for the park:** LCP < 2.5s on a mid-range phone over 4G; total
  park image weight ≤900 KB at 1×; JS added ≤20 KB gzip beyond today.
- `next/image` with `priority` on the sky and ground only; everything else
  lazy. Secondary locations are separate routes, loaded on demand and
  prefetched on hover of their path.
- Retire the per-layer SVG `#paint` filter and the motion-blur filter. Both
  are expensive on large surfaces.
- All content is HTML text, never baked into images. Every painting is
  `alt=""` (decorative) and each location gets a short text description for
  screen readers.
- Contrast ≥4.5:1 for all text, checked on the actual backplate pixels behind
  it in Phase 4. Intro text gets a soft paper-coloured scrim if needed.
- SEO: each route has its own title/description; existing metadata kept.

---

## 12. Implementation plan

**Phase 3: park vertical slice** (after approval; detailed task plan comes
from `superpowers:writing-plans`):

1. Art briefs and generation prompts for P-01–P-13 (route A) or SVG layer
   build (route B).
2. Layout sketch at 1600×900 and 390×844 as an SVG wireframe over the art
   with the scale ruler; check against §7 before any art is final.
3. New `Scene` component: layered images with depth, safe-area cropping and
   the existing pointer parallax from `HubStage.tsx`.
4. Props as positioned accessible links/buttons with light-pool focus states.
5. Notice board → map navigation (interactive object 1).
6. Phone booth → Contact location with travel transition (object 2 plus the
   secondary location).
7. Atmosphere layers; paper-grain overlay.
8. Nav update, Résumé link, routes, reduced-motion path.
9. `npm run lint`, then Phase 4.

**Phase 4:** screenshots at the four viewports, critique (Impeccable if it's
available, otherwise design-critique), fix the top five issues, repeat.

**Phase 5:** Workshop → Station → Library → Arcade, one at a time, each
critiqued before the next. **Phase 6:** polish and regression.

**What gets retired** (with your OK, in Phase 3): the sideways `ParkWalk`
scroll track, the shared hills-and-cards section template, the circle-based
scenery in `scenery.tsx`. Kept: `portfolio.ts`, theme toggle and no-flash
scripts, music toggle, `HubStage` parallax logic, the reduced-motion
handling. The intro is shortened and made skippable, or retired.

`CLAUDE.md`'s "Design Direction" section describes the current park and will
be rewritten to point at this art bible once it's approved.

---

## 13. Decisions needed from you

1. **Art route** (§2): painted backplates you generate/commission from my
   briefs (A), or deep hand-authored SVG (B)?
2. **Résumé PDF and project screenshots**: can you provide them, and may I
   capture screenshots of the MarketLab live demo myself?
3. **Skills on the workshop pegboard** (§4): OK?
4. **Retire the sideways scroll walk** in favour of choosing paths with
   per-location routes (§9)?
5. **Fonts:** stay on system fonts, or allow one display face via
   `next/font`?
