# The 3D world: progress log

Branch: `world-3d`. Previous 2D layered-painting version: commit `4acaddd` on `main`.

## Decisions

- **Renderer:** three 0.186 + @react-three/fiber 9.8 (supports React 19.3). No drei,
  no postprocessing: everything needed is small and written here.
- **Assets:** Blender is not installed and no image-generation tool is connected
  in this environment, so every model and texture is generated procedurally
  in code from fixed seeds (reproducible, nothing to download). No third-party
  models are used, so there are no licences to track. The only downloaded images
  are the project screenshots already in `public/projects/`.
- **Look:** one shared material (`world3d/paint.ts`): Lambert lighting patched
  with world-space brush variation, moss on up-facing surfaces, grime from the
  ground up, rust blooms, cool shadows / warm light, slightly stepped shading,
  and wind that bends geometry in world space.
- **Navigation:** the URL picks the place; `World3D.tsx`'s Director plans the
  camera journey (fly the park route to the door, threshold iris in the place's
  colour, swap to the destination's geometry, walk in, settle). Interruptible.

## Files

| File | What it makes |
|---|---|
| `world3d/rng.ts` | seeded random numbers |
| `world3d/paint.ts` | the painted material, its shadow-depth twin, wind uniforms |
| `world3d/textures.ts` | canvas textures: flagstones, planks, plaster, facades, roof tiles, enamel, ground, leaf clusters (5 palettes), fallen leaves, text panels, clock face, notices |
| `world3d/geometry.ts` | tubes with varying radius, wires, blobs, trees (recursive), leaf cards, bushes, ivy, grass, path ribbons |
| `world3d/props.ts` | bench, lamp, pole + wires, vending machine, phone booth, bicycle, swing, fountain + water shader, notice board, signpost, dust, sunbeams, sky dome, falling and fallen leaves |
| `world3d/buildings.ts` | pavilion, workshop, station + clock tower, arcade, city, hills, railings |
| `world3d/scenes/*.tsx` | the six places |
| `world3d/scenes.ts` | where each place is, camera poses, routes from the park |
| `world3d/World3D.tsx` | canvas, Director (camera + journeys), wind/gusts, labels |

## Status

- [x] Renderer, material, textures, modelling toolkit
- [x] Park, workshop, station, arcade, pavilion reading room, phone booth
- [x] Journeys park → place, place → park, place → place; deep links; back/forward
- [x] HTML panels synced with 3D objects (store.ts)
- [ ] Mobile pass, reduced-motion pass, keyboard pass, production build, deploy
