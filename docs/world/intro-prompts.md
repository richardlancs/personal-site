# The intro's painted layers: how they were made

The home page's intro (`app/components/intro/`) is built from six painted
layers made in ChatGPT's image generator in one conversation, so they
share a style. They're compressed into `app/assets/intro/` by
`node scripts/intro-assets.mjs ~/Downloads` (reads `intro-<layer>.png`;
900 KB at most for all six, checked by `tests/intro.test.mjs`). Each
layer's starting place and depth are in `intro/timeline.ts` (`DEPTH`);
the kid's path over them is `KID_PATH`, measured on the composed picture.

To replace a layer, generate it in the same conversation (or start a new
one with the style message first), save it as `intro-<layer>.png`, rerun
the script, and check the composed picture and the kid's path with
`?intro=<seconds>` on `next dev` (holds the intro at that moment).

## The style message (sent first)

> I'm making a layered parallax intro for my personal website. I'll ask
> for 5 images, one per message, that must all share exactly this style:
> a hand-painted gouache animation background in the manner of 1990s
> Japanese hand-drawn animated films, soft cel shading, big summer cumulus
> clouds, lush saturated greens with warm ochre, a deep blue sky, calm,
> quiet and a little lonely, never frightening. The world is gently
> post-apocalyptic: nature has reclaimed everything, no people anywhere.
> No text, no signs, no logos, no watermark, no characters. Wide
> landscape 16:9.

## The layers

1. **sky** (opaque): only the sky. A deep blue sky fading paler toward the
   horizon at the bottom, filled with huge towering sunlit cumulus clouds
   with soft painted edges, a few wispy high clouds, warm afternoon light
   from the upper left. No land, no sea, nothing else.
2. **far** (transparent above the horizon): a calm blue sea on the left
   meeting a distant coastline, far hazy green hills, and a small
   abandoned seaside town swallowed by trees and vines: collapsed red and
   grey tiled roofs, a rusted leaning transmission pylon, a broken highway
   overpass covered in green. Soft aerial haze.
3. **mid** (top half transparent): wide wild fields and old rice terraces
   gone to seed, seen from a hillside looking down, a few broken wooden
   fences and a rusted abandoned kei truck half sunk in the grass,
   scattered trees; small in the distance, the edge of an overgrown autumn
   park, orange and green canopies around a small clock tower, where a
   dirt path arrives.
4. **near** (transparent above the ridge): the top of a grassy hillside
   close to the viewer and a worn dirt footpath with pale flat stones,
   wide at the bottom centre, winding down and away.
5. **front** (centre and top transparent): tall wild grass blades and seed
   heads very close to the viewer, up the bottom and both side edges like
   a soft frame, the centre bottom open; slightly soft focus.
6. **wipe** (top 20% transparent): a dense wall of tall grass seen
   extremely close to the lens, filling the bottom 80% edge to edge, a
   ragged edge of blade tips and seed heads at the top; soft focus.

Each image request ended with "same style and light, 16:9, on a fully
TRANSPARENT background (PNG with alpha)" (opaque for the sky) and
"Painted gouache texture. Generate the image now." No studio or film is
named, and no existing image is uploaded.
