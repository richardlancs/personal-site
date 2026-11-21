import type { PlaceDef, Quad, UV, V3 } from "../scenes";

// Experience: an elevated metro platform under a curved glass canopy, drawn
// as its paintings (app/assets/city/metro-day.webp, -night.webp, 2400 ×
// 1032, one composition) on the plate (kit/plate.ts, PlatePlace.tsx).
// Every number about the painting is read off it, as [u, v] from its top
// left (scenes.ts: UV):
//
//   left, the train standing at the platform (its nose at u 0.13–0.3), the
//   line running away under the canopy to the vanishing point (0.49, 0.53);
//   middle, the departures board hanging from the canopy (0.49–0.68 across,
//   0.155–0.30 down): its three painted rows are where the experience
//   entries are shown (districts/metro.tsx, from app/data/portfolio.ts);
//   right, the platform's paving, a column, planters and a bench, the glass
//   railing, and past it two road decks curving away and the far skyline
//   with its towers.
//
// focus keys: "line-<n>", one per row of the board (METRO.rows), in
// sortNewestFirst(experience) order (store: sel.line; panels/BoardLines.tsx
// and a click on the board's row write it); every line is read on the one
// board, so each looks at the board.

const ROWS = 3;
// The painting point on a wide screen's middle (plate.look below)
const LOOK = 0.46;

// The painting's eye and where it looks (the place's own units; the plate
// stands square to this view, so from here the painting is exactly itself)
const EYE: V3 = [0.32, 1.365, 2.05];
const AHEAD: V3 = [0.32, 1.39, -10];
const FOV = 50; // the painting's lens, vertical degrees
const ASPECT = 2400 / 1032;

// The board: its face (the painted panel inside the frame), and how far it
// stands out of the painting (its layer's z below, so the shown rows stay
// on the painted board whatever the eye does)
const BOARD = { u0: 0.495, u1: 0.6735, v0: 0.164, v1: 0.2895, depth: 0.12 };
const rowQuad = (i: number): Quad => {
  const h = (BOARD.v1 - BOARD.v0) / ROWS;
  const top = BOARD.v0 + i * h, bottom = top + h;
  return [
    [BOARD.u0, top, BOARD.depth],
    [BOARD.u1, top, BOARD.depth],
    [BOARD.u1, bottom, BOARD.depth],
    [BOARD.u0, bottom, BOARD.depth],
  ];
};

// The view's own axes: ahead, right and up, and how far ahead the painting is
const AXES = (() => {
  const f = AHEAD.map((t, i) => t - EYE[i]);
  const distance = Math.hypot(f[0], f[1], f[2]);
  const ahead = f.map((x) => x / distance);
  const r = [-ahead[2], 0, ahead[0]];
  const rl = Math.hypot(r[0], r[2]);
  const right = [r[0] / rl, 0, r[2] / rl];
  const up = [right[1] * ahead[2] - right[2] * ahead[1], right[2] * ahead[0] - right[0] * ahead[2], right[0] * ahead[1] - right[1] * ahead[0]];
  return { ahead, right, up, distance, tan: Math.tan(((FOV / 2) * Math.PI) / 180) };
})();
const along = (a: number, x: number, y: number): V3 => [0, 1, 2].map((i) => EYE[i] + AXES.ahead[i] * a + AXES.right[i] * x + AXES.up[i] * y) as V3;

// Reading the board: the eye comes toward it without turning (the
// painting stays square to the view, so the board is never skewed), until
// the board is `zoom` times as large, and slides so the board's middle
// stands `at` (tangents right and up of the view's middle: right of the
// panel on a wide screen, frame "center", and below the bar)
function reading(zoom: number, at: [number, number]): { pos: V3; target: V3 } {
  // (where the board stands once the cover has slid the painting to put
  // LOOK on the view's middle: it slides by its distance from the middle)
  const u = (BOARD.u0 + BOARD.u1) / 2 + (0.5 - LOOK), v = (BOARD.v0 + BOARD.v1) / 2;
  const k = 1 - BOARD.depth;
  const height = 2 * AXES.distance * AXES.tan;
  const bx = (u - 0.5) * height * ASPECT * k, by = (0.5 - v) * height * k, bz = AXES.distance * k;
  const a = bz * (1 - 1 / zoom);
  const pos = along(a, bx - at[0] * (bz - a), by - at[1] * (bz - a));
  return { pos, target: [0, 1, 2].map((i) => pos[i] + AXES.ahead[i] * AXES.distance) as V3 };
}
// (0.33 across: the board whole between the panel and the screen's right
// edge from 1024 to 1920 wide)
const READ = reading(1.3, [0.33, 0.14]);

export const METRO = {
  eye: EYE,
  ahead: AHEAD,
  board: BOARD,
  rows: ROWS,
  // Rain doesn't fall under the canopy (atmosphere/Precipitation.tsx): the
  // box it covers round the eye, in the place's units; past the railing on
  // the right it falls, over the painting's open side
  shelter: { min: [-1.24, 1.0, -12.4] as V3, max: [1.1, 2.15, 2.5] as V3 },
};

const sky: UV[] = [[0.765, 0.2], [0.8, 0.16], [0.88, 0.1], [1, 0.05], [1, 0.5], [0.765, 0.5]];

const metro: PlaceDef = {
  offset: [1500, 0, 0],
  home: { pos: EYE, target: AHEAD },
  enter: { pos: [0.36, 1.42, 3.1], target: AHEAD },
  exit: { pos: [0.36, 1.42, 3.1], target: AHEAD },
  focus: Object.fromEntries(Array.from({ length: ROWS }, (_, i) => [`line-${i}`, READ])),
  fov: FOV,
  plateFrame: { fov: FOV, pos: EYE, target: AHEAD },
  // The painting is wider than any screen: centred, the panel's glass lies
  // over the train, and the board, the platform and the skyline stand in
  // the half it leaves
  frame: "center",
  portrait: { yaw: 19, half: 22, lift: 17 },
  // A phone on its side: the board's middle is the aim, so the cover slides
  // the painting down as far as it may (its top at the bar's foot: the
  // strip needn't be filled under the bar) and the board's first row
  // stands clear of the bar
  short: { under: 2, aim: [(BOARD.u0 + BOARD.u1) / 2, (BOARD.v0 + BOARD.v1) / 2] },
  threshold: "#101318",
  fog: { color: "#1a1f2a", near: 40, far: 520, keep: { near: 24, far: 300 } },
  background: "#181b22",
  moon: false,
  shelter: METRO.shelter,
  plate: {
    painting: "metro",
    // On a wide screen the painting slides a little right of its middle
    // (u LOOK on the view's middle), so the board's left end stands clear
    // of the panel's edge (at 1024, 1440 and 1920: the panel takes 50vw up
    // to 46rem, the painting the view's height) and the skyline keeps the
    // right; tests/city3d-metro.test.mjs measures it
    look: [LOOK, 0.5],
    aspect: ASPECT,
    depth: {
      kind: "layers",
      // the paving runs from the vanishing point to the bottom of the frame
      ground: { horizon: 0.54, near: 0.32 },
      standing: 0.05,
      layers: [
        // the train's nose and first car, standing at the platform
        { mask: [[0.128, 0.4], [0.15, 0.345], [0.2, 0.322], [0.29, 0.325], [0.31, 0.37], [0.31, 0.79], [0.128, 0.79]], z: 0.16 },
        // the departures board in its frame, on its rods
        { mask: [[0.48, 0.11], [0.69, 0.11], [0.69, 0.315], [0.48, 0.315]], z: BOARD.depth },
        // the near column under the arch
        { mask: [[0.692, 0.18], [0.748, 0.18], [0.748, 0.75], [0.692, 0.75]], z: 0.14 },
        // the bench
        { mask: [[0.71, 0.645], [0.835, 0.66], [0.835, 0.79], [0.805, 0.885], [0.73, 0.885], [0.71, 0.79]], z: 0.2 },
      ],
    },
    regions: [
      // the open sky past the railing, and its gap on the left
      { kind: "sky", poly: sky },
      { kind: "sky", poly: [[0, 0.28], [0.055, 0.28], [0.055, 0.42], [0, 0.42]] },
      // the canopy's glass overhead (a slow sheen by day)
      { kind: "glass", poly: [[0, 0], [0.7, 0], [0.7, 0.1], [0.58, 0.32], [0.3, 0.3], [0.13, 0.33], [0, 0.38]] },
      // the glass railing on the right
      { kind: "glass", poly: [[0.74, 0.555], [1, 0.6], [1, 0.9], [0.74, 0.72]] },
      // the platform's paving: darkens and mirrors the lamps after rain
      { kind: "wet", poly: [[0.49, 0.545], [0.53, 0.545], [0.62, 0.6], [0.66, 0.68], [0.7, 0.7], [0.71, 0.89], [0.8, 0.9], [0.86, 1], [0.15, 1], [0.21, 0.865]] },
    ],
    spots: Object.fromEntries(Array.from({ length: ROWS }, (_, i) => [`line-${i}`, rowQuad(i)])),
    drift: { amplitude: 0.003, period: 40 },
    movers: [
      // traffic on the upper road deck, both ways
      { kind: "trail", path: [[0.8, 0.53], [0.82, 0.512], [0.86, 0.497], [0.92, 0.489], [1, 0.484]], period: 30, count: 6, color: "#ffe2b0", size: 0.0035, depth: 0.05 },
      { kind: "trail", path: [[1, 0.488], [0.92, 0.493], [0.86, 0.501], [0.822, 0.516], [0.803, 0.534]], period: 36, count: 5, color: "#ff8a7a", size: 0.003, depth: 0.05 },
      // and on the lower one, seen through the railing's glass
      { kind: "trail", path: [[0.807, 0.54], [0.844, 0.587], [0.907, 0.626], [1, 0.655]], period: 26, count: 5, color: "#ffe2b0", size: 0.004, depth: 0.07 },
      { kind: "trail", path: [[1, 0.662], [0.905, 0.633], [0.84, 0.594], [0.803, 0.546]], period: 32, count: 4, color: "#ff8a7a", size: 0.0035, depth: 0.07 },
      // a train on a far line across the city, under the towers: its warm
      // windows and its headlight, arriving from the right and gliding on
      // behind the column, once a minute and a half
      { kind: "boat", path: [[0.995, 0.472], [0.9, 0.475], [0.82, 0.478], [0.76, 0.48]], period: 90, count: 9, color: "#ffd59a", size: 0.0032, depth: 0.05 },
      { kind: "boat", path: [[0.985, 0.4719], [0.89, 0.4752], [0.81, 0.4782], [0.75, 0.4801]], period: 90, color: "#fff6e8", size: 0.004, depth: 0.05 },
      // aircraft lights on the tallest towers, swelling slowly
      { kind: "beacon", path: [[0.9025, 0.222], [0.8775, 0.287], [0.982, 0.326]], period: 5.5, color: "#ff5a4a", size: 0.0045, depth: 0.05 },
    ],
  },
};

export default metro;
