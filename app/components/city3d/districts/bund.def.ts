import type { PlaceDef } from "../scenes";

// Contact: the promenade along the river, drawn as its two paintings
// (app/assets/city/bund-day.webp, -night.webp, 2400 × 1032, one
// composition) on the plate (kit/plate.ts, PlatePlace.tsx). Every number
// under `plate` is read off the painting: u across from its left edge,
// v down from its top, depth the share of the way a point comes toward
// the eye (scenes.ts: PlateDef).
//
// Left to right the painting has: a plane tree over the left edge and a
// bed of hydrangeas under it; the floodlit stone facades, the domed bank
// and the clock tower (its face at u 0.412, v 0.216, and a second face on
// its side, seen edge on); the glass phone booth lit cyan; the wet paving
// running away to the middle; the lamps on the railing's stone piers, the
// big one at u 0.68; the river with a ferry, and across it the skyline,
// the Pearl at u 0.81.
//
// focus keys: none (Contact has no picker). Its one spot, "clock" (and
// "clock-side"), carries the clock that tells Richmond Hill's time
// (bund.tsx: the kit's clockFace, redrawn when the minute changes).
//
// Where its sign stands on the riverside (`sign`) is the riverside's.
const bund: PlaceDef = {
  offset: [2500, 0, 0],
  // The home view is the painting's own frame (the plate stands square to
  // it): along the promenade, looking a little up, ten units to the
  // painting. Wide screens put the view's middle in the half the panel
  // leaves, so that half holds the clock tower, the promenade's lamps and
  // the start of the river; the facades and the booth sit behind the
  // panel's clear glass.
  home: { pos: [0, 0.22, 0], target: [-0.26, 0.97, 10] },
  // Arriving and leaving: a step in along the same line (4 % of the way),
  // so the settle back shows the near railing and tree slide over the far
  // bank, and nothing past the painting's edges shows
  enter: { pos: [-0.01, 0.25, 0.4], target: [-0.26, 0.97, 10] },
  exit: { pos: [-0.01, 0.25, 0.4], target: [-0.26, 0.97, 10] },
  focus: {},
  fov: 50,
  plateFrame: { fov: 50, pos: [0, 0.22, 0], target: [-0.26, 0.97, 10] },
  frame: "right",
  // (no `span`: a lens wider than the painting's only makes the plate
  // grow to fill it, showing less of the painting, not more)
  // Portrait phones show about a fifth of the painting's width, from the
  // top down to the far bank above the sheet. The phone's wide lens grows
  // the plate (kit/plate.ts: cover, about 2.4× on a 390 × 844 phone), so
  // the turn moves the view across the painting by tan(yaw) / (2 tan 25° ×
  // 2400/1032 × that growth): 22° left puts the clock tower (u 0.41) near
  // the middle, the facades left of it and the promenade's lamps right
  portrait: { yaw: -22, half: 27 },
  short: { under: 3 },
  threshold: "#0f1418",
  sun: [-60, 60, -25],
  fog: { color: "#161c22", near: 60, far: 640, keep: { near: 45, far: 480 } },
  background: "#161c22",
  plate: {
    painting: "bund",
    aspect: 2400 / 1032,
    depth: {
      kind: "layers",
      // The paving and the river come toward the eye under the far end of
      // the promenade; the facades, the clock tower and the skyline stand
      // a little out of the sky
      ground: { horizon: 0.6, near: 0.3 },
      standing: 0.05,
      layers: [
        // the big lamp on its pier and the railing up to it (the middle distance)
        { mask: [[0.6, 0.62], [0.665, 0.63], [0.665, 0.25], [0.7, 0.25], [0.705, 0.64], [0.705, 0.78], [0.66, 0.72], [0.6, 0.66]], z: 0.14 },
        // the near railing, right of the big pier, to the bottom right corner
        { mask: [[0.705, 0.652], [0.8, 0.668], [0.9, 0.686], [1, 0.702], [1, 0.96], [0.9, 0.92], [0.8, 0.865], [0.705, 0.79]], z: 0.24 },
        // the glass phone booth
        { mask: [[0.255, 0.455], [0.365, 0.455], [0.365, 0.49], [0.345, 0.49], [0.345, 0.77], [0.255, 0.77]], z: 0.17 },
        // the hydrangea bed and its stone planters, bottom left
        { mask: [[0, 0.52], [0.06, 0.52], [0.14, 0.6], [0.21, 0.66], [0.215, 0.78], [0.18, 0.8], [0.18, 0.9], [0, 0.9]], z: 0.3 },
        // the plane tree: its trunk at the left edge, its crown over the top
        { mask: [[0, 0], [0.39, 0], [0.39, 0.07], [0.3, 0.15], [0.2, 0.2], [0.1, 0.27], [0.06, 0.32], [0.055, 0.6], [0, 0.62]], z: 0.36 },
      ],
    },
    regions: [
      // The open sky (bounding make-masks' sky; clear of the tree, the
      // clock tower, the lamps and the towers)
      { kind: "sky", poly: [[0.435, 0], [1, 0], [1, 0.14], [0.435, 0.14]] },
      { kind: "sky", poly: [[0.475, 0.14], [0.66, 0.14], [0.66, 0.38], [0.475, 0.38]] },
      { kind: "sky", poly: [[0.705, 0.14], [0.8, 0.14], [0.8, 0.37], [0.705, 0.37]] },
      { kind: "sky", poly: [[0.82, 0.14], [0.86, 0.14], [0.86, 0.37], [0.82, 0.37]] },
      { kind: "sky", poly: [[0.94, 0.14], [1, 0.14], [1, 0.37], [0.94, 0.37]] },
      // The river above the railing's top rail (the bars and the lamps'
      // piers kept out, so they never waver): right of the big pier, and
      // the strip between the lamps left of it
      { kind: "water", poly: [[0.705, 0.59], [1, 0.586], [1, 0.7], [0.9, 0.684], [0.8, 0.666], [0.705, 0.65]] },
      { kind: "water", poly: [[0.625, 0.593], [0.66, 0.592], [0.66, 0.622], [0.625, 0.628]] },
      // The promenade's paving, round the booth and the planters
      {
        kind: "wet",
        poly: [[0.5, 0.605], [0.53, 0.606], [0.6, 0.658], [0.66, 0.725], [0.72, 0.795], [0.82, 0.862], [0.92, 0.918], [0.96, 0.95], [0.18, 0.95], [0.18, 0.82], [0.25, 0.775], [0.35, 0.775], [0.35, 0.69], [0.42, 0.665], [0.47, 0.625]],
      },
      // The booth's glass and the skyline's glass towers catch a slow sheen by day
      { kind: "glass", poly: [[0.26, 0.49], [0.343, 0.49], [0.343, 0.75], [0.26, 0.75]] },
      { kind: "glass", poly: [[0.862, 0.27], [0.886, 0.27], [0.886, 0.55], [0.862, 0.55]] },
      { kind: "glass", poly: [[0.905, 0.2], [0.937, 0.2], [0.937, 0.55], [0.905, 0.55]] },
    ],
    spots: {
      // The clock tower's face toward the eye, to the outside of its dark rim
      clock: [
        [0.4043, 0.1958, 0.05],
        [0.4202, 0.1958, 0.05],
        [0.4202, 0.2357, 0.05],
        [0.4043, 0.2357, 0.05],
      ],
      // …and its face on the river side, seen almost edge on
      "clock-side": [
        [0.4243, 0.2022, 0.05],
        [0.4307, 0.2042, 0.05],
        [0.4307, 0.2368, 0.05],
        [0.4243, 0.2378, 0.05],
      ],
    },
    drift: { amplitude: 0.003, period: 40 },
    movers: [
      // Two ferries' lit windows: one crossing the open river right of the
      // big pier, one slipping between the lamps left of it, each fading in
      // and out behind a pier
      { kind: "boat", path: [[0.99, 0.616], [0.71, 0.621]], period: 150, count: 5, color: "#ffe7b8", size: 0.0032 },
      { kind: "boat", path: [[0.735, 0.642], [0.99, 0.652]], period: 190, count: 4, color: "#fff1d6", size: 0.0036, depth: 0.04 },
      { kind: "boat", path: [[0.657, 0.607], [0.535, 0.602]], period: 120, count: 3, color: "#ffe2a8", size: 0.0026 },
      // Traffic along the far bank's embankment road, both ways
      { kind: "trail", path: [[0.535, 0.586], [0.75, 0.585], [1, 0.583]], period: 70, count: 8, color: "#ffd9a0", size: 0.0022 },
      { kind: "trail", path: [[1, 0.581], [0.75, 0.582], [0.535, 0.583]], period: 80, count: 6, color: "#ff9a8a", size: 0.002 },
      // Aircraft lights on the towers' tops, swelling slowly
      { kind: "beacon", path: [[0.8095, 0.163], [0.92, 0.192], [0.874, 0.264]], period: 4.5, color: "#ff6a6a", size: 0.004 },
    ],
  },
};

export default bund;
