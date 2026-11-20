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
  // The day painting's sun is high on the left and in front of the
  // skyline, so the fronts facing the river are sunlit, their right sides
  // in shade
  sun: [-45, 75, 80],
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
    // the paintings' band is tall only round the landmarks and falls to
    // low-rise toward either edge
    crest: { x: 8, spread: 70, least: 0.3 },
    sightlines: 5,
  },
  // Neon on the skyline, as accents: the share of towers taller than
  // `crownOver` with a lit crown, of all towers with a lit corner edge, and
  // how many carry a screen
  neon: { crownOver: 9, crowns: 0.62, edges: 0.2, screens: 6, tones: ["rose", "cyan", "rose", "cyan", "gold", "cyan", "rose"] as const, day: "#c3ccd3" },
  // The towers' facades, as the day painting has them: glass towers in
  // pale blue, deep blue and teal; stone ones pale, warm and silver; the
  // far layer pale in the haze. Each tower takes one by its seed (base,
  // the wall; glass, the panes by day)
  palettes: {
    glass: [
      { base: "#9dbedb", glass: "#c0dcf2" },
      { base: "#5d8cbb", glass: "#9cc7ec" },
      { base: "#79aac4", glass: "#a8d4e6" },
    ],
    stone: [
      { base: "#ddd0b8", glass: "#6888a8" },
      { base: "#cfa983", glass: "#57789a" },
      { base: "#bcc6cf", glass: "#86a6c2" },
    ],
    far: [
      { base: "#a9bfd2", glass: "#c3d8ea" },
      { base: "#d3cbbd", glass: "#9db4c8" },
    ],
  },
  // Low pale civic buildings along the far waterfront (the paintings'
  // podium row under the towers), and at the Pearl's foot the two glass
  // domes with a colonnaded hall between them
  civic: {
    row: { seed: 53, x0: -160, x1: 160, z: -54.6, w: [2.6, 7], h: [0.7, 2.4], d: [1.4, 2.6], gap: [0.3, 2.6], clear: [-3, 19] as const },
    hall: { x: 8, z: -62, w: 10.5, h: 4.6, d: 4 },
    domes: [[-0.2, -62], [16.2, -62]] as readonly XZ[],
    dome: { r: 3.0, drum: 2.4, podium: 1.0 },
  },
  // The far bank's edge: an embankment, a row of trees and lamps
  bank: { z: -51.5, trees: { from: -150, to: 150, step: 1.5, size: [1.3, 2.0] as const }, lamps: { from: -120, to: 120, step: 5 } },
  // The landing's planters, beyond the outer boards, by the railing
  planters: [[-7.4, -2.2], [-8.4, -0.6], [7.4, -2.2], [8.4, -0.6]] as readonly XZ[],
  // A ferry on the channel
  boat: { seed: 3, z: -38, x0: -90, x1: 90, period: 120 },
};
