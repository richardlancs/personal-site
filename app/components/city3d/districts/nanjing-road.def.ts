import type { PlaceDef, PlateDef, Quad, UV, V3 } from "../scenes";

// Interests: the pedestrian street, drawn as its paintings
// (app/assets/city/nanjing-road-day.webp, -night.webp, 2400 × 1032, one
// composition) on the plate (kit/plate.ts, PlatePlace.tsx). Every number
// about the painting is read off it, as [u, v] from its top left
// (scenes.ts: UV):
//   left, the old stone facades, the nearest the arcade under its long
//   cyan board (u 0–0.23), the one machine standing in its open front
//   (u 0.095–0.15, v 0.565–0.77), a domed corner building further down;
//   right, glass towers, a parked green tram (u 0.70–0.82) and planters;
//   down both sides, trees and lamps to the vanishing point (VP); at the
//   street's end the Pearl with the other three towers to its right.
//
// The arcade machine's screen is the one spot ("machine"): the live
// machine (arcade/arcadeMachine.ts) is drawn on it (nanjing-road.tsx).
// The two paintings draw the machine a little apart (the day one a hair
// left and lower), so the screen has a quad in each and the live picture
// moves from one to the other with the day/night blend.
//
// focus keys: "machine", the arcade machine's screen (store: sel.interest;
// panels/ArcadeControls.tsx and a click on the screen write it)

const ASPECT = 2400 / 1032;
// The painting's lens, top to bottom. The home lens (fov) is narrower, so
// on a wide screen the painting stands a little larger than the view and
// is never grown (kit/plate.ts: cover): its middle stays on the view's
// middle, and the day painting's dark foot (its last tenth) mostly falls
// below the frame
const PAINTING_FOV = 48;
const LENS = 40;
// The eye, looking straight down -z at the painting's middle; the plane
// stands DISTANCE off (the place's own units)
const EYE: V3 = [0, 0.17, 7];
const DISTANCE = 7;

// ---------- The street's depth ----------
//
// A one-point street: its facades and paving run to VP. How near a point
// is follows how far it lies from VP: on the left facades by its distance
// across (u, over WALL_L), on the right ones likewise (WALL_R), on the
// paving by its distance down (FLOOR), the nearer surface winning (the
// lines where they meet are where the facades stand on the paving: the
// arcade's sill at the left edge, v 0.83; the right planters' feet). The
// sky between the roofs and the skyline in it stay in the painting's
// plane. Gentle (at most 0.3 of the way to the eye at the frame's foot),
// so the drift and the turn to the machine slide the near over the far
// without tearing.
const VP: UV = [0.608, 0.65];
const FLOOR = 0.35;
const WALL_L = 1.14;
const WALL_R = 0.75;
const pullAt = (r: number) => Math.min(0.32, 1 - 1 / (1 + 0.466 * Math.max(0, r - 0.08)));
// The sky between the roofs: the left roofs' right edge and the right
// roofs' left edge, as [v, u] pairs, down to VP
const SKY_LEFT: UV[] = [[0, 0.4], [0.19, 0.4], [0.2, 0.5], [0.25, 0.505], [0.28, 0.545], [0.38, 0.557], [0.45, 0.58], [0.55, 0.59], [0.65, 0.608]];
const SKY_RIGHT: UV[] = [[0, 0.764], [0.14, 0.735], [0.4, 0.712], [0.55, 0.69], [0.6, 0.66], [0.65, 0.608]];
const edgeAt = (line: UV[], v: number) => {
  for (let i = 1; i < line.length; i++) {
    const [v0, u0] = line[i - 1], [v1, u1] = line[i];
    if (v <= v1) return u0 + ((u1 - u0) * (v - v0)) / Math.max(1e-6, v1 - v0);
  }
  return null;
};

// The arcade's front, the nearest building on the left (its stone, the
// cyan board, the open shopfront and the machine in it, down to its sill
// on the paving): one flat layer, so the eye can walk up to the machine
// without the facade's steps of depth sliding across it, and the live
// screen sits exactly on the painted one
const ARCADE: UV[] = [[0, 0], [0.235, 0], [0.235, 0.775], [0.16, 0.792], [0, 0.836]];
const ARCADE_Z = 0.14;
const inside = (poly: UV[], u: number, v: number) => {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [ui, vi] = poly[i], [uj, vj] = poly[j];
    if (vi > v !== vj > v && u < ((uj - ui) * (v - vi)) / (vj - vi) + ui) hit = !hit;
  }
  return hit;
};

// A point's depth (0..1, the plate's measure), for the spots and lights
// laid on the painting, so they sit where the layers put the paint
export function streetDepth(u: number, v: number): number {
  if (inside(ARCADE, u, v)) return ARCADE_Z;
  const left = edgeAt(SKY_LEFT, v), right = edgeAt(SKY_RIGHT, v);
  if (left !== null && right !== null && u > left && u < right) return 0;
  const wall = u < VP[0] ? (VP[0] - u) / WALL_L : (u - VP[0]) / WALL_R;
  const r = Math.max(wall, Math.max(0, v - VP[1]) / FLOOR);
  return +pullAt(r).toFixed(3);
}

// The layers that make that depth, far to near (each later one over the
// earlier): at each step of nearness, the left facades' strip out from VP,
// the right ones', and the paving's band below; the facades' strips stop
// at the sky. Steps of 0.02, softened at their edges by the engine; the
// arcade's front over them all.
function streetLayers(): { mask: UV[]; z: number }[] {
  const out: { mask: UV[]; z: number }[] = [];
  const rows = Array.from({ length: 14 }, (_, i) => i * 0.05);
  for (let z = 0.02; z <= 0.3 + 1e-9; z += 0.02) {
    // the r where the pull reaches z (pullAt's inverse)
    const r = 0.08 + (1 / (1 - z) - 1) / 0.466;
    const zz = +z.toFixed(3);
    const l = VP[0] - r * WALL_L, rr = VP[0] + r * WALL_R, f = VP[1] + r * FLOOR;
    if (l > 0) {
      const edge = rows.map((v): UV => [+Math.min(l, edgeAt(SKY_LEFT, v) ?? l).toFixed(4), +v.toFixed(2)]);
      out.push({ mask: [[0, 0], ...edge, [l, 0.65], [l, 1], [0, 1]], z: zz });
    }
    if (rr < 1) {
      const edge = rows.map((v): UV => [+Math.max(rr, edgeAt(SKY_RIGHT, v) ?? rr).toFixed(4), +v.toFixed(2)]);
      out.push({ mask: [[1, 0], ...edge, [rr, 0.65], [rr, 1], [1, 1]], z: zz });
    }
    if (f < 1) out.push({ mask: [[0, f], [1, f], [1, 1], [0, 1]], z: zz });
  }
  out.push({ mask: ARCADE, z: ARCADE_Z });
  return out;
}

// ---------- The machine ----------
//
// The screen's glass in each painting, its corners clockwise from the top
// left (the cabinet stands turned a little to the right, its screen
// leaning back, so the glass is a slanted quad)
const at = (c: UV): V3 => [c[0], c[1], streetDepth(0.118, 0.63)];
export const SCREEN: { night: Quad; day: Quad } = {
  night: [at([0.1081, 0.6033]), at([0.125, 0.6038]), at([0.1304, 0.643]), at([0.1114, 0.643])],
  day: [at([0.1034, 0.61]), at([0.1225, 0.6097]), at([0.1271, 0.6552]), at([0.1071, 0.6553])],
};
// The spot: both screens, so a click lands on the live one whichever
// painting shows
const MACHINE: Quad = [at([0.1034, 0.6033]), at([0.1304, 0.6033]), at([0.1304, 0.6555]), at([0.1034, 0.6555])];

// A point of the painting (u, v, pulled `pull` of the way to the eye) in
// the place's coordinates, with the painting at its own size (on a wide
// screen it is never grown: LENS < PAINTING_FOV)
function painted(u: number, v: number, pull: number): V3 {
  const height = 2 * DISTANCE * Math.tan(((PAINTING_FOV / 2) * Math.PI) / 180);
  const k = 1 - pull;
  return [EYE[0] + (u - 0.5) * height * ASPECT * k, EYE[1] + (0.5 - v) * height * k, EYE[2] - DISTANCE * k];
}

// Going to the machine: the eye walks up to the arcade, a little in front
// of the cabinet and just right of it, looking straight ahead as the home
// view does (so the painting stays square to it), until the cabinet stands
// tall in the half of a wide screen the panel leaves, its screen a little
// left of and above that half's middle (`aside`, `above`: shares of the
// gap, the lens's tangents). How near (`gap`) is set by the painting's
// left edge: it must stay past the screen's left edge (under the panel)
// at every wide screen's shape (1280 × 800 to 1920 × 1080: the panel's
// half puts the view's middle 1.12 to 1.15 lens-heights from the screen's
// left). The same pose serves a phone: there the view's middle is the
// strip over the sheet (portrait below: no turn to speak of, and `lift`
// puts the eye's aim at the screen's middle, so the painting stands where
// it does on a wide screen), and the screen shows just under the strip's
// middle.
const TOWARD = { gap: 1.7, aside: 0.05, above: 0.1 };
const screenMiddle = painted(0.119, 0.625, streetDepth(0.118, 0.63));
const seeFrom: V3 = [screenMiddle[0] + TOWARD.aside * TOWARD.gap, screenMiddle[1] - TOWARD.above * TOWARD.gap, screenMiddle[2] + TOWARD.gap];
const SEE_MACHINE = {
  pos: seeFrom.map((x) => +x.toFixed(3)) as V3,
  target: [seeFrom[0], seeFrom[1], screenMiddle[2]].map((x) => +x.toFixed(3)) as V3,
};
export const NANJING = { eye: EYE, distance: DISTANCE, lens: LENS, paintingFov: PAINTING_FOV, aspect: ASPECT, vp: VP, painted, toward: TOWARD };

// The skyline's towers and their lights, as the night painting draws them
const BEACONS: UV[] = [
  [0.6876, 0.212], // Shanghai Tower's crown
  [0.6322, 0.314], // the World Financial Center's top, both corners
  [0.6485, 0.308],
  [0.6633, 0.362], // Jin Mao's spire
  [0.5969, 0.246], // the Pearl's spire
];

const plate: PlateDef = {
  painting: "nanjing-road",
  aspect: ASPECT,
  depth: { kind: "layers", layers: streetLayers() },
  regions: [
    // the sky between the roofs: clouds drift a little by day, a few
    // steady stars on a clear night (only where the night sky is dark)
    { kind: "sky", poly: [[0.4, 0], [0.764, 0], [0.735, 0.14], [0.712, 0.4], [0.69, 0.55], [0.6, 0.55], [0.58, 0.45], [0.557, 0.38], [0.545, 0.28], [0.505, 0.25], [0.5, 0.2], [0.4, 0.19]] },
    // the glass towers on the right: a faint sheen passes by day
    { kind: "glass", poly: [[0.764, 0], [1, 0], [1, 0.42], [0.88, 0.47], [0.79, 0.43], [0.735, 0.4], [0.735, 0.14]] },
    // the paving, from the street's end to the frame's foot: after rain it
    // darkens and holds the lamps', shops' and signs' light, and rings
    // spread on it while it rains (the planters and the tram's wheels
    // left out)
    { kind: "wet", poly: [[0.585, 0.655], [0.635, 0.655], [0.7, 0.7], [0.82, 0.74], [0.86, 0.78], [1, 0.8], [1, 1], [0, 1], [0, 0.84], [0.16, 0.79], [0.3, 0.75], [0.45, 0.7]] },
  ],
  spots: { machine: MACHINE },
  // a slow, small drift (under 1% of the view in 10 s)
  drift: { amplitude: 0.0028, period: 44 },
  movers: [
    // the towers' aircraft lights: red, swelling slowly, after dark
    { kind: "beacon", path: BEACONS.slice(0, 1), period: 6, color: "#ff5a4a", size: 0.0042 },
    { kind: "beacon", path: BEACONS.slice(1, 3), period: 5.2, color: "#ff5a4a", size: 0.0032 },
    { kind: "beacon", path: BEACONS.slice(3), period: 7, color: "#ff6a5a", size: 0.003 },
    // a far aircraft crossing the strip of sky, high over the street
    { kind: "boat", path: [[0.42, 0.07], [0.58, 0.05], [0.74, 0.035]], period: 160, color: "#ffe2d6", size: 0.0028 },
  ],
};

// The arrival: from a little way down the street, so the facades slide
// past and open as the eye settles back (never behind the eye, where the
// painting would show its edge)
const IN: V3 = [EYE[0], EYE[1], EYE[2] - 0.12 * DISTANCE];

const nanjingRoad: PlaceDef = {
  offset: [2000, 0, 0],
  // The painting's eye (the plate's frame)
  home: { pos: EYE, target: [EYE[0], EYE[1], EYE[2] - DISTANCE] },
  enter: { pos: IN, target: [IN[0], IN[1], IN[2] - DISTANCE] },
  exit: { pos: IN, target: [IN[0], IN[1], IN[2] - DISTANCE] },
  focus: { machine: SEE_MACHINE },
  // where its board stands on the riverside (unchanged; moved only with a
  // re-run of docs/city/scripts/visibility.mjs)
  sign: { bearing: 8.8, distance: 16.2, y: 1.1 },
  fov: LENS,
  plateFrame: { fov: PAINTING_FOV, pos: EYE, target: [EYE[0], EYE[1], EYE[2] - DISTANCE] },
  frame: "right",
  // A phone: the lens no wider than the painting's (40 × 1.2), barely
  // turned (the Pearl right of the strip's middle, the arcade's machine
  // still in reach), and `lift` the degrees that put the aim at the
  // screen's middle on a 390 × 844 phone (City3D.tsx frames the strip's
  // middle 185 px over it), so the painting isn't slid and the machine's
  // pose holds
  portrait: { yaw: 3, half: 9, lift: 11 },
  short: 0,
  threshold: "#160f16",
  fog: { color: "#1c1820", near: 45, far: 420, keep: { near: 35, far: 260 } },
  background: "#1c1820",
  // the day painting's sun: high, from the right and a little behind the
  // eye, so the old stone on the left is sunlit and the glass in shade
  sun: [60, 75, 30],
  bounce: { color: "#c9d8e8", strength: 0.22 },
  plate,
};

export default nanjingRoad;
