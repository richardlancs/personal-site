import type { SceneDef } from "../scenes";

// Home: the riverside, composed as the riverside paintings
// (app/assets/city/lujiazui-day.webp, -night.webp): the camera stands on a
// terrace over a ferry landing (60 m up), looking a little up across the
// river, and the frame reads top to bottom as sky; the far bank's skyline
// across the whole width, the four landmarks rising out of it (the Pearl
// left of the middle, the World Financial Center, Jin Mao and Shanghai
// Tower grouped to the right with sky between them); the river, its far
// edge at about 69% of the height; and, low on the near bank against the
// water, the five sections' signs, left to right About, Experience,
// Projects, Interests, Contact (each section's def: sign; Riverside.tsx).
// Wide screens frame it on the right, the panel on the left. Portrait
// screens widen the lens until the band over the sheet holds it all, the
// skyline's top to the signs' feet (portrait.cover).
const lujiazui: SceneDef = {
  offset: [0, 0, 0],
  home: { pos: [0, 6, 14], target: [0, 16, -86] },
  enter: { pos: [0, 6.6, 20], target: [0, 14, -86] },
  exit: { pos: [0, 6.6, 20], target: [0, 14, -86] },
  focus: {},
  fov: 54,
  // The home view as the painting's frame: the same pose, the painting's
  // wider aspect
  plateFrame: { fov: 46, pos: [3, 6, 14], target: [3, 16, -86] },
  frame: "right",
  span: 23,
  portrait: { yaw: 0, half: 22, lift: -3, cover: 40 },
  short: 4,
  threshold: "#0c1526",
  // The signs stand 24 to 64 units off; the fog starts past them and
  // never closes in nearer than `keep`. The skyline (110+) takes more.
  fog: { color: "#141a24", near: 70, far: 320, keep: { near: 66, far: 260 } },
  background: "#10141c",
};

export default lujiazui;

// Where everything on the riverside stands (Riverside.tsx builds it from
// this; nothing about the composition is written in the scene's code), in
// riverside units (10 m); the eye is home.pos, (0, 6, 14). The sections'
// boards are each section's own def (sign): on the landing, against the
// water. Change the composition here, then re-run
// docs/city/scripts/visibility.mjs.
type XZ = readonly [number, number];
type Layer = { seed: number; area: { x0: number; x1: number; z0: number; z1: number }; count: number; height: [number, number] };
export const RIVERSIDE = {
  // The water: from the landing's edge (z = near) to the far bank's (far)
  water: { near: -3.4, far: -51, width: 700 },
  // The landing the boards stand on, from its edge back under the terrace;
  // a railing in front of the boards (nearer the camera), lamps between
  // them, trees at either end
  landing: { z0: -3.4, z1: 40 },
  railing: { z: -1.6, x0: -12, x1: 12 },
  lamps: [-4.4, 4.4, -13.2, 13.2].map((b) => [+(15.4 * Math.tan((b * Math.PI) / 180)).toFixed(2), -1.4] as XZ),
  trees: [[-9.5, -1.8], [-11.5, -1], [-14, -2.2], [9.5, -1.8], [11.5, -1], [14, -2.2]] as readonly XZ[],
  // The four landmarks, spread as in the paintings: the Pearl left of the
  // view's middle, well clear; the World Financial Center, Jin Mao and
  // Shanghai Tower grouped to the right with sky between them (bearings
  // from the eye about -5°, +6°, +11°, +16.5°)
  landmarks: {
    pearl: [-9.1, -89.6] as XZ,
    worldFinancialCenter: [13.0, -109.3] as XZ,
    jinMao: [21.8, -97.9] as XZ,
    shanghaiTower: [36.9, -110.6] as XZ,
  },
  landmarkKeepOut: 5,
  // The skyline: three layers of towers across the whole far bank, the
  // farther ones fainter in the fog; `crest`: where the band is tallest
  // (x) and how it falls away either side, so the landmarks rise out of
  // it. `sightlines`: keep the low front layer off the line to each
  // landmark's foot.
  skyline: {
    front: { seed: 23, area: { x0: -170, x1: 170, z0: -72, z1: -55 }, count: 160, height: [3, 11] } as Layer,
    mid: { seed: 31, area: { x0: -210, x1: 210, z0: -112, z1: -72 }, count: 180, height: [8, 28] } as Layer,
    far: { seed: 29, area: { x0: -280, x1: 280, z0: -195, z1: -112 }, count: 150, height: [12, 32] } as Layer,
    farFog: 1.6,
    crest: { x: 12, spread: 110, least: 0.6 },
    sightlines: 5,
  },
  // Neon on the skyline, as accents: the share of towers taller than
  // `crownOver` with a lit crown, of all towers with a lit corner edge, and
  // how many carry a screen
  neon: { crownOver: 9, crowns: 0.5, edges: 0.16, screens: 6 },
  // The far bank's edge: an embankment, a row of trees and lamps
  bank: { z: -51.5, trees: { from: -150, to: 150, step: 2 }, lamps: { from: -120, to: 120, step: 5 } },
  // A ferry on the channel
  boat: { seed: 3, z: -38, x0: -90, x1: 90, period: 120 },
};
