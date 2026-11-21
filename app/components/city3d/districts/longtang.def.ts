import type { PlaceDef, PlateDef, UV, V3 } from "../scenes";

// About: an old stone-gate lane, drawn as its paintings
// (app/assets/city/longtang-day.webp, -night.webp, 2400 × 1032, one
// composition): low brick houses either side with stone door frames,
// vines, potted plants, a bicycle by the left wall and a scooter by the
// right, a wall lantern on the near left, laundry on two bamboo poles
// across the lane, and at the far end, over the roofs, the Pearl with the
// World Financial Center and Shanghai Tower beside it. Everything is read
// off the painting (u across from its left edge, v down from its top;
// kit/plate.ts draws it, PlatePlace.tsx wraps it). No three.js here.
//
// focus keys: none (About has no picker). Its spots are anchors only (the
// lit windows, the lantern, the lane's end), nothing to choose.

// ---------- The lane's depth ----------
//
// The lane is a one-point corridor: its walls and paving run to one
// vanishing point at the far end (VP). How near a point is follows how far
// it lies from VP, as in any corridor seen down its middle: on a wall by
// its distance across (|u - VP.u| / WALL), on the paving by its distance
// down ((v - VP.v) / FLOOR), the nearer surface winning; the two meet on
// the lines where the walls stand on the paving. The sky between the
// roofs, and the skyline in it, stay in the painting's plane.
const VP: UV = [0.538, 0.65];
const WALL = 0.255;
const FLOOR = 0.3;
// The share of the distance a point at corridor measure r is brought
// toward the eye: parallax grows in step with r, as it does with
// nearness (1 / distance), held at 0.7 at the frame's edges
const pullAt = (r: number) => Math.min(0.7, 1 - 1 / (1 + 1.1 * Math.max(0, r - 0.1)));
// The sky between the roofs: its left and right edges as [v, u] pairs,
// down to where the houses close over it; the walls' layers stop there
const SKY_LEFT: UV[] = [[0, 0.425], [0.05, 0.45], [0.1, 0.43], [0.13, 0.44], [0.19, 0.47], [0.25, 0.485], [0.33, 0.5], [0.36, 0.538]];
const SKY_RIGHT: UV[] = [[0, 0.715], [0.12, 0.7], [0.22, 0.665], [0.27, 0.64], [0.33, 0.62], [0.36, 0.538]];
const edgeAt = (line: UV[], v: number) => {
  if (v >= line[line.length - 1][0]) return null;
  for (let i = 1; i < line.length; i++) {
    const [v0, u0] = line[i - 1], [v1, u1] = line[i];
    if (v <= v1) return u0 + ((u1 - u0) * (v - v0)) / (v1 - v0);
  }
  return null;
};

// A point's depth (0..1, the plate's measure), for the spots and lights
// laid on the painting, so they sit where the layers put the paint
export function laneDepth(u: number, v: number): number {
  const left = edgeAt(SKY_LEFT, v), right = edgeAt(SKY_RIGHT, v);
  if (left !== null && right !== null && u > left && u < right) return 0;
  const r = Math.max(Math.abs(u - VP[0]) / WALL, Math.max(0, v - VP[1]) / FLOOR);
  return +pullAt(r).toFixed(3);
}

// The layers that make that depth, far to near (each later one over the
// earlier): at each step of nearness, the left wall's strip out from VP,
// the right wall's, and the paving's band below; the walls' strips stop at
// the sky. Steps of 0.025, softened at their edges by the engine.
function laneLayers(): { mask: UV[]; z: number }[] {
  const out: { mask: UV[]; z: number }[] = [];
  const rows = Array.from({ length: 19 }, (_, i) => i * 0.02);
  for (let z = 0.025; z <= 0.7 + 1e-9; z += 0.025) {
    // the r where the pull reaches z (pullAt's inverse)
    const r = 0.1 + (1 / (1 - z) - 1) / 1.1;
    const zz = +z.toFixed(3);
    const l = VP[0] - r * WALL, rr = VP[0] + r * WALL, f = VP[1] + r * FLOOR;
    if (l > 0) {
      const edge = rows.map((v): UV => [+Math.min(l, edgeAt(SKY_LEFT, v) ?? l).toFixed(4), +v.toFixed(2)]);
      out.push({ mask: [[0, 0], ...edge, [l, 1], [0, 1]], z: zz });
    }
    if (rr < 1) {
      const edge = rows.map((v): UV => [+Math.max(rr, edgeAt(SKY_RIGHT, v) ?? rr).toFixed(4), +v.toFixed(2)]);
      out.push({ mask: [[1, 0], ...edge, [rr, 1], [1, 1]], z: zz });
    }
    if (f < 1) out.push({ mask: [[0, f], [1, f], [1, 1], [0, 1]], z: zz });
  }
  return out;
}

// A spot as the box between two corners of the painting, at its depth
const box = (u0: number, v0: number, u1: number, v1: number): [V3, V3, V3, V3] => {
  const d = laneDepth((u0 + u1) / 2, (v0 + v1) / 2);
  return [[u0, v0, d], [u1, v0, d], [u1, v1, d], [u0, v1, d]];
};

const plate: PlateDef = {
  painting: "longtang",
  aspect: 2400 / 1032,
  depth: { kind: "layers", layers: laneLayers() },
  regions: [
    // the sky between the roofs: clouds drift a little by day, a few
    // steady stars on a clear night (only where the night sky is dark,
    // so never on the towers)
    { kind: "sky", poly: [[0.425, 0], [0.715, 0], [0.7, 0.12], [0.665, 0.22], [0.64, 0.27], [0.62, 0.33], [0.5, 0.33], [0.485, 0.25], [0.47, 0.19], [0.44, 0.13], [0.43, 0.1]] },
    // the two glass towers: a faint sheen passes by day
    { kind: "glass", poly: [[0.594, 0.15], [0.616, 0.15], [0.617, 0.34], [0.593, 0.34]] },
    { kind: "glass", poly: [[0.636, 0.055], [0.656, 0.055], [0.659, 0.29], [0.633, 0.29]] },
    // the lane's paving, from the far gate to the frame's foot: after
    // rain it darkens and holds the lanterns' and windows' light, and
    // rings spread on it while it rains
    { kind: "wet", poly: [[0.508, 0.655], [0.57, 0.655], [0.6, 0.7], [0.655, 0.8], [0.73, 0.88], [0.79, 0.93], [0.8, 1], [0.3, 1], [0.32, 0.93], [0.365, 0.88], [0.43, 0.8], [0.485, 0.7]] },
  ],
  spots: {
    // the lit upstairs window, top left
    window: box(0.355, 0.02, 0.38, 0.13),
    // the lit window beside the cyan board, left
    "window-low": box(0.282, 0.29, 0.325, 0.49),
    // the wall lantern, near left
    lantern: box(0.088, 0.2, 0.135, 0.41),
    // the far gate at the lane's end, under its lamps
    "lane-end": box(0.515, 0.54, 0.56, 0.655),
  },
  // a slow, small drift (under 1% of the view in 10 s)
  drift: { amplitude: 0.0028, period: 46 },
  movers: [
    // the towers' aircraft lights: red, swelling slowly, after dark
    { kind: "beacon", path: [[0.646, 0.045], [0.6045, 0.148]], period: 5.5, color: "#ff5a4a", size: 0.0045 },
    { kind: "beacon", path: [[0.537, 0.028]], period: 6.5, color: "#ff6a5a", size: 0.0035 },
    // a far aircraft crossing the strip of sky, high over the towers
    { kind: "boat", path: [[0.49, 0.016], [0.6, 0.012], [0.7, 0.01]], period: 150, color: "#ffe2d6", size: 0.003 },
  ],
};

const longtang: PlaceDef = {
  offset: [500, 0, 0],
  // The painting's eye (the plate's frame): a child's height in the lane,
  // looking down it; the painting is a 50° lens, top to bottom
  home: { pos: [0, 0.22, 0], target: [-0.85, 1.35, -10] },
  // Stepping in: a little nearer down the lane, so the walls slide past
  // and open as the camera settles back (never behind the eye, where the
  // painting would show its edge)
  enter: { pos: [-0.03, 0.24, -0.35], target: [-0.88, 1.37, -10.35] },
  exit: { pos: [-0.03, 0.24, -0.35], target: [-0.88, 1.37, -10.35] },
  focus: {},
  sign: { bearing: -17.6, distance: 17.4, y: 1.15 },
  fov: 50,
  plateFrame: { fov: 50, pos: [0, 0.22, 0], target: [-0.85, 1.35, -10] },
  frame: "right",
  portrait: { yaw: 3, half: 20, lift: 6 },
  short: 2,
  threshold: "#16130f",
  fog: { color: "#1c2232", near: 60, far: 520, keep: { near: 45, far: 380 } },
  background: "#1c2232",
  sun: [70, 75, 15],
  bounce: { color: "#c6d5e6", strength: 0.26 },
  plate,
};

export default longtang;
