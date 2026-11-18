# The film look: what the world is painted to match

The intro (`public/intro/`, `docs/world/intro-prompts.md`) is a hand-painted
film; the park and every place are painted to look like they belong to it.
This is the target, sampled from the film's frame at 4 s (dark / mid /
light of each region), and how close the park is.

| Region | Film (dark, mid, light) | What it means for the world |
|---|---|---|
| Sky overhead | `#1959a3` `#1c5ca5` `#2b67ab` | a deep gouache blue, not cyan |
| Sky low | `#296db5` `#2e73ba` `#397abf` | still blue near the horizon; only a thin pale band |
| Cumulus | `#919eb8` `#e1c3aa` `#fde4af` | cream-gold tops, lavender-blue bellies, towering |
| Far hills | `#6e94ab` `#799cb0` `#8ca7b7` | blue aerial haze, not grey |
| Sea | `#6a93a0` `#6e9bbc` `#9aaeb8` | calm, blue-grey |
| Trees | `#40584e` `#667f5f` `#93a378` | sage greens, soft blue-green shade |
| Orange trees | `#675f43` `#91744a` `#b19165` | a few, warm orange, not red |
| Grass | `#636d3e` `#9d9f52` `#c4ba65` | olive to sunlit yellow-green tips |
| Path | `#898541` `#a39f4b` `#d2b67a` | warm ochre earth |

Where it's tuned: `world3d/atmosphere/looks.ts` (the DAY row and the
dawn/dusk tops), `vegetation/foliage.ts` and `grass.ts` (ramps),
`textures.ts` (ground, flagstones), the park's fog (`scenes.ts`) and its
mix of trees (`scenes/Park.tsx`: mostly greens, a few in autumn colour).

## Measuring it

`docs/world/scripts/film-compare.mjs` photographs a place's home view with
the page hidden beside the film's frame and prints the colour difference
(CIE ΔE76) per region. Clear day, the park:

| | sky top | sky | cloud | far | trees | grass | path | mean |
|---|---|---|---|---|---|---|---|---|
| Before (pale cyan sky, grey towers) | 44.9 | (other regions measured differently) | | | | | | 29.7 |
| Phase 1 (palette) | 14.0 | 8.6 | 19.0 | 15.9 | 18.4 | 8.6 | 20.8 | 14.8 |
| Phase 5 (clouds, ink, far view, plants) | 14.0 | 9.7 | 17.9 | 7.3 | 18.0 | 8.6 | 20.6 | 13.5 |

Since then: towering, lumpy cumulus on the horizon (`props.ts: buildSky`),
firmer cel bands and a soft ink line (`paint.ts`, `Painterly.tsx: Ink`),
the film's far view in place of the city (`buildings.ts: buildSea,
buildRuinedTown, buildPylon, buildOverpass, buildHills`), pampas and
daisies (`vegetation/flowers.ts`), and the camera rising from the park's
gate as the intro's grass wipe opens (`World3D.tsx: held`). What's left is
mostly composition: the film is a field and a path, the park a plaza.
