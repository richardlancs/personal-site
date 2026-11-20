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
