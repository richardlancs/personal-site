import type { SceneDef } from "../scenes";

// Experience: a grey stand-in for now (placeholder.tsx), the real scene later.
// Everything the Director and the riverside need to know about this place
// lives here and only here (no three.js): its poses, its `focus` poses, and
// where its sign stands on the riverside (`sign`, which the riverside
// builds and the journey from the riverside flies toward; changed only
// with a re-run of docs/city/scripts/visibility.mjs).
// focus keys: "line-<n>", one per experience entry in sortNewestFirst order (store: sel.line)
const metro: SceneDef = {
  offset: [1500, 0, 0],
  home: { pos: [5, 3.2, 17], target: [0, 2.4, -2] },
  enter: { pos: [2, 4, 26], target: [0, 2.4, 0] },
  exit: { pos: [2, 4, 26], target: [0, 2.4, 0] },
  focus: {},
  sign: { bearing: -8.8, distance: 16.2, y: 1.1 },
  fov: 50,
  plateFrame: { fov: 50, pos: [5, 3.2, 17], target: [0, 2.4, -2] },
  frame: "right",
  span: 20,
  portrait: { yaw: 0, half: 24 },
  short: 4,
  threshold: "#101318",
  fog: { color: "#181b22", near: 20, far: 90 },
  background: "#181b22",
};

export default metro;
