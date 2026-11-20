import type { SceneDef, V3 } from "../scenes";

// Experience: an elevated metro platform under a curved glass canopy,
// composed as its paintings (app/assets/city/metro-day.webp, -night.webp):
// the camera stands on the platform at eye height, looking along it; the
// track and a train at the platform on the left, the platform's paving
// running away to the right of it, the canopy's arches overhead, the
// departures board hanging in the middle, and past the railing on the
// right the trees below, a curving road viaduct and the far skyline. One
// unit is ten metres; the ground is y = 0 and the platform's top is
// METRO.deck (12 m up). Everything about where things stand is data here
// (METRO); districts/metro.tsx builds it.
//
// focus keys: "line-<n>", one per experience entry in sortNewestFirst
// order (store: sel.line); every line is read on the one board, so each
// looks at the board (more keys than entries are harmless)

// Where everything stands, in the place's own units (10 m)
const DECK = 1.2;
export const METRO = {
  deck: DECK,
  // The painting's eye (plateFrame below)
  eye: [0.32, DECK + 0.165, 2.05] as V3,
  // The platform: from the track's edge (x = 0) to the railing, along -z
  platform: { x0: 0, x1: 1.15, z0: 2.6, z1: -13.2 },
  // The track bed left of the platform, the rails' top under the deck
  track: { x0: -1.28, x1: 0, x: -0.19, rail: -0.11, gauge: 0.1435 },
  // The canopy: arches every `step` from z0 to z1, springing at `spring`
  // over the deck from x0 (beyond the track) to x1 (over the platform's
  // columns), rising `rise`; a column under every other arch each side
  canopy: { x0: -1.24, x1: 0.98, spring: 0.52, rise: 0.4, z0: 2.5, z1: -12.4, step: 0.7, columnsEvery: 2 },
  // The departures board, hanging from the canopy over the platform
  board: { x: 0.36, y: DECK + 0.64, z: -0.1, w: 0.92, h: 0.3 },
  // The train: its cars, where it stops (the nose), and how far off it
  // comes from and goes to (units); one arrival every `cycle` seconds,
  // `dwell` seconds at the platform
  train: { cars: 6, nose: 1.12, snout: 0.11, reach: 42, cycle: 60, arrive: 11, dwell: 20, leave: 11 },
  // The three spot lights (scenes.ts: DISTRICT_LIGHTS.metro), under the
  // canopy over the platform
  spots: [
    [0.42, DECK + 0.72, 0.6],
    [0.42, DECK + 0.72, -2.2],
    [0.42, DECK + 0.72, -5.0],
  ] as V3[],
  // Benches and planters along the railing side
  benches: [-0.35, -3.6, -6.9],
  planters: [0.45, -1.75, -4.95, -8.2],
  // Outside: the trees below, the road viaduct curving away on the right
  road: { y: 0.95, width: 0.8, path: [[6.2, 7], [4.6, -1], [5.6, -8], [9.5, -13.5], [16, -16.5], [26, -17.5], [40, -17]] as [number, number][] },
  // The far skyline: the four landmarks to the right of the line, as the
  // paintings place them, and two bands of towers
  landmarks: {
    pearl: [158, -212] as const,
    jinMao: [176, -226] as const,
    worldFinancialCenter: [196, -240] as const,
    shanghaiTower: [216, -238] as const,
  },
  skyline: {
    near: { seed: 71, area: { x0: 30, x1: 270, z0: -90, z1: -190 }, count: 70, height: [5, 18] as [number, number] },
    far: { seed: 73, area: { x0: -320, x1: 320, z0: -150, z1: -380 }, count: 150, height: [8, 26] as [number, number] },
  },
  // Rain doesn't fall under the canopy (for the atmosphere's shelter,
  // when it has one): the box it covers, in the place's units
  shelter: { min: [-1.24, 1.0, -12.4] as V3, max: [1.1, DECK + 0.95, 2.5] as V3 },
};

// The camera at the painting's spot: on the platform, eye height, looking
// along it with the track on the left
const EYE: V3 = METRO.eye;
const AHEAD: V3 = [0.32, DECK + 0.19, -10];
// The board, seen from under it, a little nearer
const BOARD: { pos: V3; target: V3 } = { pos: [0.3, DECK + 0.2, 1.45], target: [METRO.board.x, METRO.board.y - 0.06, METRO.board.z] };

const metro: SceneDef = {
  offset: [1500, 0, 0],
  // The home view: the same spot, turned a little toward the track, so
  // the train, the board and the platform stand in the half the panel
  // leaves
  home: { pos: [0.34, DECK + 0.17, 2.15], target: [-0.9, DECK + 0.32, -6] },
  enter: { pos: [0.4, DECK + 0.24, 3.3], target: [-0.6, DECK + 0.3, -6] },
  exit: { pos: [0.4, DECK + 0.24, 3.3], target: [-0.6, DECK + 0.3, -6] },
  focus: Object.fromEntries(Array.from({ length: 8 }, (_, i) => [`line-${i}`, BOARD])),
  sign: { bearing: -8.8, distance: 16.2, y: 1.1 },
  fov: 52,
  plateFrame: { fov: 50, pos: EYE, target: AHEAD },
  frame: "right",
  span: 26,
  portrait: { yaw: -6, half: 30, lift: 6 },
  short: 2,
  threshold: "#101318",
  // The platform is within 16 units; the skyline 100 to 380 off takes the
  // fog, which never closes in on the platform
  fog: { color: "#1a1f2a", near: 40, far: 520, keep: { near: 24, far: 300 } },
  background: "#181b22",
  shelter: METRO.shelter,
};

export default metro;
