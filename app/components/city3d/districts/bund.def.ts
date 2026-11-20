import type { SceneDef } from "../scenes";

// Contact: the promenade along the river, composed as its paintings
// (app/assets/city/bund-day.webp, -night.webp). The camera stands on the
// promenade at eye height (2.2 m) looking along it; one unit is ten
// metres. The promenade runs toward +z; its stone facades stand on the
// left (+x), their fronts toward the river; the railing, its lamps and the
// river are on the right (-x), the far bank's skyline across it.
// Everything's place is data (BUND, below); the scene (bund.tsx) builds
// it from this. Nothing here is clickable, so there are no focus keys.
// Where its sign stands on the riverside (`sign`) is the riverside's
// (changed only with a re-run of docs/city/scripts/visibility.mjs).
// focus keys: none (Contact has no picker)
const bund: SceneDef = {
  offset: [2500, 0, 0],
  // Wide screens frame it on the right, the panel on the left: 80 m
  // further back along the promenade, by the railing, the view turned 12°
  // toward the river, so the half the panel leaves holds the clock tower,
  // the kiosk, the lamps and the far skyline with the Pearl
  home: { pos: [-0.1, 0.3, -11.5], target: [-1.9, 1.12, 0.3] },
  enter: { pos: [0.1, 0.6, -13], target: [-2.23, 1.0, 1.78] },
  exit: { pos: [0.1, 0.6, -13], target: [-2.23, 1.0, 1.78] },
  focus: {},
  sign: { bearing: 17.6, distance: 17.4, y: 1.15 },
  fov: 50,
  // The painting's frame: straight along the promenade, looking a little
  // up, the vanishing point just right of the middle
  plateFrame: { fov: 50, pos: [0, 0.22, 0], target: [-0.26, 0.97, 10] },
  frame: "right",
  span: 25,
  // (portrait: the middle a little toward the river, so the clock tower and the Pearl both show)
  portrait: { yaw: 3, half: 27 },
  short: 3,
  threshold: "#0f1418",
  // the sun from over the river and a little behind the eye, full on the
  // facades' river fronts as the day plate has it
  sun: [-60, 60, -25],
  // The facades and lamps are within 90 units; the landmarks 130 to 230
  // off, so the fog keeps well clear of them (the far layer takes more)
  fog: { color: "#161c22", near: 60, far: 640, keep: { near: 45, far: 480 } },
  background: "#161c22",
};

export default bund;

// Where everything on the promenade stands, in the scene's units, as
// (side, along): `s` metres-in-tens to the right of the promenade's
// middle line, `a` along it from the eye (bund.tsx: P(s, a) → world x =
// -s, z = a). Change the composition here.
export const BUND = {
  // The promenade's paving from the road's kerb to the river wall
  promenade: { s0: -1.85, s1: 0.75, a0: -16, a1: 130 },
  // The road between the promenade and the facades
  road: { s0: -3.05, s1: -1.85 },
  // The river wall, its parapet and railing, and the water below
  edge: { s: 0.72, water: -0.3 },
  // The lamps on stone piers along the railing: four of them from
  // `spots` on carry the place's four spot lights (scenes.ts:
  // DISTRICT_LIGHTS.bund), the first lamps ahead of the painting's eye,
  // and in the home view's foreground too
  lamps: { s: 0.68, from: -9.7, step: 1.12, count: 44, pier: 0.16, spots: 10 },
  // The glass kiosk, left of the middle near the eye (scenery)
  kiosk: { s: -0.62, a: 1.45, w: 0.15, d: 0.14, h: 0.34 },
  // The trees between the promenade and the road; the big one at the
  // left edge; the planters of flowers along them
  trees: { s: -2.15, from: -12.4, step: 1.15, to: 70 },
  bigTree: { s: -2.3, a: 2.4, size: 2.1 },
  planters: { s: -1.5, from: -12, step: 1.7, to: 40 },
  bed: { s0: -1.85, s1: -0.98, a0: 0.25, a1: 2.3 },
  // The facades: their fronts on one line (s = front), each building
  // `a0`..`a1` along, `h` tall, with its crown
  front: -3.05,
  buildings: [
    { a0: -18, a1: -4.4, h: 2.4, crown: "flat" },
    { a0: -4, a1: 6, h: 2.2, crown: "colonnade" },
    { a0: 6.4, a1: 12, h: 2.5, crown: "dome" },
    { a0: 12.4, a1: 16.8, h: 2.5, crown: "clock" },
    { a0: 17.2, a1: 21, h: 2.4, crown: "flat" },
    { a0: 21.4, a1: 25, h: 3.2, crown: "cupola" },
    { a0: 25.4, a1: 30, h: 2.6, crown: "flat" },
    { a0: 30.4, a1: 34.2, h: 3.5, crown: "pyramid" },
    { a0: 34.6, a1: 40, h: 2.5, crown: "flat" },
    { a0: 40.4, a1: 46, h: 3.0, crown: "cupola" },
    { a0: 46.4, a1: 52, h: 2.7, crown: "flat" },
    { a0: 52.4, a1: 57, h: 3.3, crown: "pyramid" },
    { a0: 57.4, a1: 64, h: 2.6, crown: "flat" },
    { a0: 64.4, a1: 70, h: 3.0, crown: "cupola" },
    { a0: 70.4, a1: 80, h: 2.8, crown: "flat" },
  ] as const,
  dome: { a: 9.2, back: 1.45, r: 0.72, attic: 0.55 },
  clock: { a: 14.6, w: 1.1, top: 5.6, face: 5.05 },
  // The far bank, across the river (s = bank), the four landmarks as in the
  // paintings (bearings right of straight ahead: the Pearl 34°, the World
  // Financial Center 40°, Shanghai Tower 43°, Jin Mao 46.5°, from 132 to
  // 230 units off, so they stand as low as the paintings' do)
  bank: 42,
  landmarks: {
    pearl: [74.8, 108.8] as const,
    worldFinancialCenter: [138.2, 164.7] as const,
    shanghaiTower: [156.9, 168.2] as const,
    jinMao: [166.8, 158.3] as const,
  },
  // The skyline: a low front, a taller middle and a faint far layer on the
  // far bank, and far towers up the river beyond the promenade's end
  skyline: {
    front: { seed: 71, area: { s0: 46, s1: 170, a0: 55, a1: 300 }, count: 100, height: [3, 8] as [number, number] },
    mid: { seed: 73, area: { s0: 70, s1: 240, a0: 80, a1: 340 }, count: 100, height: [8, 26] as [number, number] },
    far: { seed: 79, area: { s0: 140, s1: 340, a0: 100, a1: 380 }, count: 60, height: [12, 30] as [number, number] },
    upriver: { seed: 83, area: { s0: -70, s1: -4, a0: 150, a1: 320 }, count: 50, height: [4, 16] as [number, number] },
  },
  // A ferry on the river
  boat: { seed: 5, s: 14, a0: 14, a1: 110, period: 140 },
};
