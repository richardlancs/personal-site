import type { PlaceDef, PlateDef, Quad, UV } from "../scenes";

// Home: the rooftop view, drawn as its two paintings
// (app/assets/city/rooftop-day.webp, -night.webp, 1672 × 941, one
// composition) on the plate (kit/plate.ts, PlatePlace.tsx). Every number
// under `plate` and in HOME_SIGNS is read off the painting: u across from
// its left edge, v down from its top, depth the share of the way a point
// comes toward the eye (scenes.ts: PlateDef).
//
// From a rooftop high over the city, looking out and down. Top to bottom:
// the sky with its cumulus (stars by night); the skyline across the whole
// width, the Pearl (its tip at u 0.559, v 0.018) and the three supertalls
// right of it (Jin Mao, the World Financial Center, Shanghai Tower, its
// crown at u 0.786); the river curving in from the left, round the far
// bank's point; the near riverfront, its domed stone buildings and the
// clock tower (u 0.25 .. 0.28) on the left; the elevated metro line
// crossing the middle with its train (u 0.48 .. 0.64, v 0.65 .. 0.72);
// below it the old lane of low brick houses; on the right the bright
// shopping street running toward the river; and in the bottom left
// corner the roof the view is from (its parapet, a vent, a fan unit).
//
// Its five section signs are spots on the places the painting shows
// (HOME_SIGNS; Riverside.tsx puts a Hitbox and the anchor
// "sign:<section>" on each, and the section's name on a small board):
// Projects on the supertalls, Experience on the metro line and its train,
// About on the old lane, Interests on the shopping street, Contact on the
// near riverfront. The clock tower itself stands under the title card on
// every landscape screen (the card is 568 px wide at 1440, and the
// painting can only slide so far: kit/plate.ts, cover), so Contact's spot
// is the riverfront building to the tower's right, the first of the Bund
// that clears the card.
//
// focus keys: none (Home's panel has no picker; its spots navigate).

// The ground's depth (kit/plate.ts: makeDepth): rows below the horizon
// come toward the eye, eased, to `near` at the bottom row; what stands
// above it out of the sky comes `standing`
const GROUND = { horizon: 0.36, near: 0.4 };
const STANDING = 0.05;
// The depth of the painting at a row (for the spots and the boards, so
// they move with what they sit on as the eye drifts)
export const groundDepth = (v: number) =>
  v < GROUND.horizon ? STANDING : STANDING + (GROUND.near - STANDING) * Math.pow((v - GROUND.horizon) / (1 - GROUND.horizon), 1.35);

// A spot as a rectangle in the painting [u0, v0, u1, v1], at the depth
// of the ground at its middle row (or `depth`)
const rect = (u0: number, v0: number, u1: number, v1: number, depth = groundDepth((v0 + v1) / 2)): Quad => {
  const d = +depth.toFixed(3);
  return [
    [u0, v0, d],
    [u1, v0, d],
    [u1, v1, d],
    [u0, v1, d],
  ];
};

// The five sections' places in the painting, left to right as they stand
// (the order Tab takes their links: City3D.tsx sorts them by each
// section's `sign.bearing`, which runs the same way): `spot`, the place
// (a Hitbox, and the link laid over it: its focus ring and pointer
// target); `label`, where the board with the section's name stands, the
// middle of its bottom edge, inside the spot; `size`, the board's height
// as a share of the painting's. On a 1440 × 900 screen the spots stand
// 8 px or more apart and clear of the card and the dock.
export type HomeSign = { spot: Quad; label: UV; size: number };
export const HOME_SIGNS = {
  // the Bund's riverfront building right of the clock tower, its ornate
  // front over the promenade
  contact: { spot: rect(0.372, 0.455, 0.44, 0.6), label: [0.406, 0.535], size: 0.04 },
  // the old lane of low brick houses under the metro line
  about: { spot: rect(0.405, 0.748, 0.585, 0.885), label: [0.495, 0.875], size: 0.04 },
  // the elevated metro line and its train
  experience: { spot: rect(0.47, 0.615, 0.655, 0.735), label: [0.563, 0.655], size: 0.04 },
  // the Lujiazui supertalls across the river: Jin Mao, the World
  // Financial Center and Shanghai Tower (from under the top bar down)
  projects: { spot: rect(0.66, 0.09, 0.812, 0.37, STANDING), label: [0.736, 0.355], size: 0.04 },
  // the bright shopping street on the right
  interests: { spot: rect(0.792, 0.6, 0.885, 0.87), label: [0.838, 0.835], size: 0.04 },
} satisfies Record<"about" | "experience" | "projects" | "interests" | "contact", HomeSign>;

const ASPECT = 1672 / 941;

const plate: PlateDef = {
  painting: "rooftop",
  aspect: ASPECT,
  depth: {
    kind: "layers",
    ground: GROUND,
    standing: STANDING,
    layers: [
      // the roof the view is from: its parapet's outer edge runs from the
      // vent (top left) down to the bottom edge at u 0.495
      { mask: [[0, 0.6], [0.105, 0.6], [0.108, 0.65], [0.2, 0.678], [0.32, 0.805], [0.42, 0.915], [0.497, 1], [0, 1]], z: 0.55 },
      // the tall blocks along the shopping street's right side, nearest
      // of the city
      { mask: [[0.885, 0.55], [0.96, 0.52], [1, 0.5], [1, 1], [0.93, 1], [0.9, 0.8]], z: 0.34 },
    ],
  },
  regions: [
    // the sky down to the skyline, stopping short of the Pearl and the
    // three supertalls' tops (no stars, no cloud shade on them)
    {
      kind: "sky",
      poly: [[0, 0], [1, 0], [1, 0.22], [0.812, 0.22], [0.812, 0.004], [0.76, 0.004], [0.76, 0.088], [0.662, 0.088], [0.662, 0.2], [0.594, 0.2], [0.594, 0.008], [0.538, 0.008], [0.538, 0.24], [0, 0.25]],
    },
    // the river, from the channel upstream on the left round the far
    // bank's point to the right edge's blocks, its near edge the
    // riverfront promenade
    {
      kind: "water",
      poly: [
        [0.17, 0.405], [0.185, 0.37], [0.215, 0.347], [0.27, 0.336], [0.345, 0.338], [0.358, 0.37], [0.39, 0.405], [0.44, 0.424],
        [0.55, 0.438], [0.66, 0.444], [0.78, 0.44], [0.86, 0.434], [0.944, 0.424], [0.946, 0.54], [0.83, 0.553], [0.71, 0.572],
        [0.69, 0.585], [0.55, 0.58], [0.44, 0.545], [0.4, 0.525], [0.36, 0.505], [0.3, 0.482], [0.285, 0.46], [0.245, 0.44], [0.2, 0.432],
      ],
    },
    // the supertalls' glass: Shanghai Tower, the World Financial Center
    { kind: "glass", poly: [[0.774, 0.022], [0.798, 0.022], [0.802, 0.12], [0.805, 0.27], [0.765, 0.27], [0.768, 0.12]] },
    { kind: "glass", poly: [[0.714, 0.104], [0.742, 0.104], [0.742, 0.25], [0.715, 0.25]] },
    // the avenue running down under the metro line, and the shopping
    // street's paving
    { kind: "wet", poly: [[0.552, 0.75], [0.578, 0.75], [0.64, 0.84], [0.705, 1], [0.66, 1], [0.615, 0.86]] },
    { kind: "wet", poly: [[0.783, 0.625], [0.81, 0.625], [0.86, 0.8], [0.935, 1], [0.815, 1], [0.795, 0.8]] },
  ],
  spots: Object.fromEntries(Object.entries(HOME_SIGNS).map(([id, s]) => [id, s.spot])),
  // A slow figure, under 1 % of the view in 10 s
  drift: { amplitude: 0.003, period: 44 },
  movers: [
    // a second train along the metro line, its lit windows a short row,
    // gliding through every minute and a half
    { kind: "boat", path: [[0.115, 0.567], [0.228, 0.6], [0.347, 0.632], [0.478, 0.66], [0.584, 0.686], [0.688, 0.732]], period: 90, count: 7, color: "#bdf4ff", size: 0.0045, depth: groundDepth(0.66) },
    // boats on the river: one down the middle, one along the far bank,
    // one far up the channel
    { kind: "boat", path: [[0.41, 0.5], [0.6, 0.515], [0.8, 0.51], [0.94, 0.5]], period: 170, count: 2, color: "#ffe2a8", size: 0.005, depth: groundDepth(0.51) },
    { kind: "boat", path: [[0.935, 0.455], [0.75, 0.462], [0.55, 0.458], [0.43, 0.44]], period: 210, count: 2, color: "#fff0c8", size: 0.004, depth: groundDepth(0.455) },
    { kind: "boat", path: [[0.19, 0.39], [0.26, 0.36], [0.34, 0.35]], period: 150, color: "#ffe7b8", size: 0.003, depth: groundDepth(0.37) },
    // traffic: the avenue under the metro line, headlights coming down,
    // tail lights going up
    { kind: "trail", path: [[0.556, 0.752], [0.602, 0.795], [0.632, 0.848], [0.661, 0.922], [0.682, 1]], period: 24, count: 7, color: "#ffe6b8", size: 0.0045, depth: groundDepth(0.85) },
    { kind: "trail", path: [[0.69, 1], [0.672, 0.922], [0.643, 0.848], [0.612, 0.795], [0.566, 0.752]], period: 28, count: 6, color: "#ff7a6a", size: 0.004, depth: groundDepth(0.85) },
    // the road along the riverfront, under its lamps
    { kind: "trail", path: [[0.27, 0.556], [0.4, 0.586], [0.52, 0.6], [0.62, 0.611], [0.7, 0.614]], period: 34, count: 8, color: "#ffd9a0", size: 0.0035, depth: groundDepth(0.59) },
    // the road under the metro line on the left
    { kind: "trail", path: [[0.246, 0.71], [0.2, 0.66], [0.109, 0.616]], period: 30, count: 5, color: "#ff8f7a", size: 0.004, depth: groundDepth(0.66) },
    // the aircraft lights on the tall tops: the Pearl's mast, Jin Mao's
    // spire, the World Financial Center, Shanghai Tower; swelling and
    // fading slowly, never a blink
    { kind: "beacon", path: [[0.559, 0.019], [0.689, 0.108], [0.728, 0.1], [0.786, 0.019]], period: 5, color: "#ff5a52", size: 0.0045, depth: STANDING },
  ],
};

const lujiazui: PlaceDef = {
  offset: [0, 0, 0],
  // The home view is the painting's own frame (the plate stands square to
  // it), a hundred units to the painting. Every journey from Home still
  // leaves along the riverside's routes (scenes.ts: routesFromRiverside)
  // until the flight replaces them, so the eye stays where it was.
  home: { pos: [0, 6, 14], target: [0, 16, -86] },
  // Arriving and leaving: a step back along the same line, so the settle
  // in shows the roof slide over the city
  enter: { pos: [0, 6.3, 18], target: [0, 16, -86] },
  exit: { pos: [0, 6.3, 18], target: [0, 16, -86] },
  focus: {},
  // The lens is the painting's: on a 16:10 screen the painting fills the
  // height, and the card's shift slides it as far as it can go
  fov: 40,
  plateFrame: { fov: 40, pos: [0, 6, 14], target: [0, 16, -86] },
  frame: "right",
  // Portrait screens: the painting fills the whole lens, so a phone's
  // band shows about a quarter of its width; turned 18° right, that
  // quarter is the river and the skyline from the Pearl to Shanghai Tower
  // (u 0.54 .. 0.79 on a 390 × 844 phone), a portrait tablet's from the
  // Pearl to the shopping street
  portrait: { yaw: 18, half: 14, lift: 4 },
  short: -2,
  threshold: "#0c1526",
  fog: { color: "#141a24", near: 400, far: 900, keep: { near: 400, far: 900 } },
  background: "#10141c",
  sun: [-45, 75, 80],
  plate,
};

export default lujiazui;
