# Prompts used for the city's paintings

All made in ChatGPT (Richard's account), 19 November 2026, in one chat so
each image could take the earlier ones as its style reference. Each prompt
began with the style paragraph from `docs/city/style.md`, or with "same
painting style, palette, very wide format and dark lower fifth" once the
first frame was accepted as the reference. Output: 1914×822.

Note: the first attempt returned only a sky with clouds (the account's
memory of the park's sky layers, probably). Saying so and restating the
scene fixed it. If it happens again, say "the full scene, not a sky
layer".

## Concept frames (dusk)

**lujiazui** (Home). The Lujiazui skyline seen across the Huangpu River
from the Bund, at dusk just after sunset. The city fills the frame: the
Oriental Pearl Tower, Shanghai Tower, Jin Mao Tower and the World
Financial Center (the bottle opener) clearly recognisable, with a few
taller imagined towers behind. Deep ink-navy and blue dusk sky with a thin
amber band at the horizon, no big daytime clouds. Windows beginning to
light, calm river with soft reflections, one low river boat.

**longtang** (About). A longtang lane at dusk. Two rows of old shikumen
stone-gate houses in brick with dark wooden doors face each other across a
narrow lane seen from one end, bamboo laundry poles overhead with a few
clothes, a parked bicycle and a scooter, potted plants, tangled cables.
One upstairs window is warmly lit amber; small cyan and magenta glows from
a few abstract signs. Above the roofs at the end of the lane, the lit
Lujiazui towers rise in the haze.

**towers** (Projects). Lujiazui at street level at dusk. Looking up from
the elevated circular pedestrian walkway toward the three supertall towers
standing close together: Shanghai Tower with its twist, Jin Mao with its
tiered crown, and the World Financial Center with its trapezoid opening.
Several large glowing display screens on the lower buildings, showing only
soft abstract colour fields and simple shapes, no writing, no faces. Haze
between the towers.

**metro** (Experience). An elevated metro station at dusk. View along an
open-air platform under a curved steel-and-glass canopy; a sleek metro
train pulling in on the left with lit windows; a hanging departure board
glowing amber with rows of plain glowing bars instead of text; platform
edge lights in cyan. Beyond the platform the city spreads out with the
Lujiazui towers small in the distance and an elevated highway curving
past.

**nanjing-road** (Interests). Nanjing Road pedestrian street at dusk. View
straight down the wide paved street between old department-store facades
and newer buildings, dense with vertical and horizontal neon signs and
glowing shopfronts, every sign an abstract shape, bar or pattern. One open
shopfront on the left is a small arcade with a single glowing arcade
cabinet visible inside. Wet paving with soft reflections, a small
sightseeing tram parked, haze at the far end.

**bund** (Contact). The Bund promenade at dusk, looking along the
waterfront walkway. On the left, the row of historic stone buildings,
warmly floodlit, with the Customs House and its clock tower prominent. On
the right, the railing, the Huangpu River and a glimpse of the lit
Lujiazui towers across the water. On the promenade stands one small glass
kiosk with a cyan-lit interior, like a modern phone booth. Lamp posts with
amber light, a few magenta accents, calm and quiet, more restrained than
the shopping street.

## Plates

Made in the same chat, 19 November 2026; converted to the site's files by
`scripts/city-plates.mjs` (2400×1032 WebP in `app/assets/city/`).

What works: paint the DAY plate fresh (the scene's description from above,
plus the day light below), then ask for the NIGHT plate as an edit of
"this exact image you just made". Asking for an edit of an older image in
the chat gives a new composition; it must be the latest image, or attached.
So each pair's composition differs from its dusk concept frame; the style
is the same.

**Day light, every district.** Clear late-morning daylight: soft blue sky
with a few thin high clouds, sunlit surfaces, no lit windows, lamps and
train lights off, signs and screens switched off and reading as plain pale
or dark panels. Same style, very wide format, lower fifth falling into
deep ink-navy shadow, the subject within the middle 60% of the width. No
writing, no people.

**Night edit, every district.** "This is the DAY plate. Now edit this
exact image you just made into its NIGHT plate. Do not move, add, remove
or reshape anything: [the scene's things] stay pixel-for-pixel in the same
place, same camera, same crop. Change only the light: full night, deep
ink-navy sky, [the scene's lights]. Same hand-painted gouache brushwork.
Lower fifth falls into deep ink-navy shadow. No writing, no people."

The scene's lights:
- lujiazui: windows warm; neon edges in cyan, magenta, amber; the Pearl
  Tower's spheres magenta; coloured reflections on dark water.
- longtang: one upstairs window amber; a few small signs cyan and
  magenta; pools of light on the paving; the distant towers lit.
- towers: windows warm with cyan edge lighting; the screens on, showing
  soft abstract colour fields; walkway lights amber. "Restrained, not
  garish."
- metro: train windows and headlights lit; the departure board amber with
  rows of plain bars; platform edge lights cyan; canopy lamps warm.
- nanjing-road: signs on as solid cyan, magenta or amber shapes and bars
  ("no rainbow stripes"); shop windows warm; the arcade cabinet's screen
  glowing; lamps amber; wet-looking paving.
- bund: the historic buildings floodlit amber; the clock face lit; lamps
  amber; the kiosk cyan from inside; the towers across the river lit.

Overlay check (each pair at 50%): lujiazui, longtang, towers, metro and
bund line up. nanjing-road's night plate moved the tram, the signs and the
facades; see the progress notes for what was done about it.

## The painted 2.5D city (21 November 2026)

Made in ChatGPT (Richard's account) in one chat, 1672×941, saved as webp
under `app/assets/city/` (originals in `docs/city/concepts/25d/`). Each
prompt began with the style paragraph, adjusted: "restrained neon in cyan
and warm lantern amber" (no magenta), "very rich fine detail everywhere",
"Wide 16:9 landscape format".

**rooftop-night** (3D Home). At night, the famous view from the edge of a
very high rooftop looking out and steeply down over the whole of Shanghai.
In the foreground, the corner of the rooftop with a low parapet, a few
rooftop vents, cables and a small glowing cyan light strip. Below, the
Huangpu River curves through the middle, glittering with reflections and a
few lit river boats. Across the river the entire Lujiazui skyline, densely
packed lit towers. Far below, streets full of tiny light trails of traffic,
an elevated metro line, old stone buildings along the riverfront promenade
with a clock tower, a narrow old lane of low brick houses with lanterns, a
bright shopping street of glowing signs. Haze and city glow rising into a
deep navy sky with a few stars.

**rooftop-day**. "Exactly the same image, the same composition … on a clear
late afternoon by day: warm golden sunlight from the left, a deep
gouache-blue sky with a few towering white cumulus clouds, the river blue
with sun glints, windows mostly unlit with sky reflections, neon signs
faint, the rooftop in soft shade."

**aerial-night** (the flight). An aerial view of the whole city at night
from a plane high above, looking steeply down at about 60 degrees. The
river in a big S curve; the Lujiazui towers seen from above; on the west
bank the riverfront promenade with a clock tower, a street grid with light
trails, an elevated metro line, a bright shopping street, a quarter of old
low brick lane houses with lanterns. Thin wisps of low cloud.

**aerial-day**. The same, by day on a clear late afternoon.

A depth map was tried ("a depth map of exactly that image"): ChatGPT
repaints the scene with a different composition, so it can't be used.
Depth is made in code from layers and polygons instead.

## The continuous panorama (22 November 2026)

Made in ChatGPT (Richard's account) in one chat, for the horizontal city:
six day segments of one side-on panorama, then each segment's night
version. About 1670×941 each; originals (WebP q92) in
`docs/city/concepts/panorama/{day,night}-0N.webp`, PNGs kept outside git.

**Method.** Segment 1 painted fresh. For each later segment, a canvas
the size of the last one was made in code: its left third is the previous
segment's right third, the rest flat grey; it was attached with "the
attached image's left third is the right third of segment N; the grey
area is blank. Paint the full 16:9 image: its left third must continue
that exact content (…), and the rest continues the city sideways to the
right with no seam." ChatGPT keeps the left third close, not exact, so
the join script aligns and feathers each overlap. Night versions: the
day segment attached, "Edit this exact image into its NIGHT version: do
not move, add, remove or reshape anything … Change only the light", plus
the segment's lights (as for the plates, above). Type each prompt as one
paragraph: a newline in the box sends the message.

**Segment 1's prompt** began with the style paragraph (cyan and lantern
amber, no magenta, "very rich fine detail", "Wide 16:9 landscape
format"), then: "This is segment 1 of 6 of ONE long continuous
side-scrolling panorama … a flat side-on view, camera level at about
first-floor height looking straight across, no vanishing point in the
middle … The horizon line sits at exactly 45% of the height. Across the
bottom third, a calm, plain, dark riverside promenade with a low railing
runs straight across the full width as a horizontal band … empty of
objects (text will sit over it)."

The scenes, each ending with what continues off the right edge:
1. Home: the Lujiazui skyline across the river, side-on; the bank rising
   into the first grey-brick roofs of an old lane quarter.
2. About: a row of shikumen houses with stone gate arches, laundry poles,
   plants, a bicycle; the towers small behind; then glass tower bases.
3. Projects: Shanghai Tower, Jin Mao and the World Financial Center at
   street level, the circular walkway, large screens; then a metro
   viaduct.
4. Experience: the elevated metro and an open-air station with a curved
   canopy and a departure board; then the old shopping street.
5. Interests: ornate department stores with sign boxes, an arcade
   shopfront with one cabinet, a sightseeing tram; then the riverfront.
6. Contact: the Bund's stone buildings, the Customs House clock tower,
   lamp posts, a glass kiosk; then the river and the towers across it,
   "so the journey ends where it began".

## The hyperrealistic panorama (23 November 2026, replaces the gouache one)

Richard: "tell chatgpt to build directly off a hyperrealistic model of the
city and find real city skyline photos to use as reference"; the final
look is hyperrealistic. Made in a fresh ChatGPT chat (Richard's account);
originals (WebP q92) in `docs/city/concepts/panorama-real/`, PNGs kept
outside git. `docs/city/concepts/panorama/` (gouache) is superseded.

1. **Research first.** ChatGPT searched the web for real reference photos
   of each place (Wikimedia Commons, Flickr: the Bund skyline with its
   documented left-to-right order Oriental Pearl, Jin Mao, World Financial
   Center, Shanghai Tower; shikumen lanes; the Lujiazui circular walkway;
   Metro Line 3's viaduct and stations; Nanjing Road's department stores
   and sightseeing tram; the Customs House and the HSBC dome), listed
   what each showed, and built a spatial model of the six places along one
   walk ("cinematic geography": Lujiazui is on the east bank, the rest on
   the west).
2. **Segment 1**: "hyperrealistic, like a high-end architectural
   photograph or a photoreal 3D render of the real city … built directly
   from the reference photos and the spatial model", with the same rules
   as before (level, nearly orthographic side-on camera at first-floor
   height, horizon at 45%, light from the upper left, a plain dark empty
   ground band across the bottom third), "today's real city only".
3. **Segments 2–6**: the same seed-canvas method as the gouache panorama,
   each prompt "built from your [place] references".
4. **Nights**: each day segment attached, "edit this exact image into its
   NIGHT version, as a real hyperrealistic night photograph … Change only
   the light, true to [place] at night", palette "white, warm amber and
   cyan (no magenta, no purple)".
