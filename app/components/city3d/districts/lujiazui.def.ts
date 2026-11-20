import type { SceneDef } from "../scenes";

// Home: the riverside. The camera stands at the back of a small bay at a
// railing, looking across the river at the skyline; the five sections'
// signs stand along the near bank, over the river and on the far bank,
// left to right About, Experience, Projects, Interests, Contact, within
// about 24 degrees either side of the view's middle (each section's def:
// sign; Riverside.tsx).
// Wide screens frame it on the right, the panel on the left; portrait
// phones widen the lens to show all five.
const lujiazui: SceneDef = {
  offset: [0, 0, 0],
  home: { pos: [0, 2, 10], target: [0, 17, -90] },
  enter: { pos: [0, 2.6, 16], target: [0, 12, -90] },
  exit: { pos: [0, 2.6, 16], target: [0, 12, -90] },
  focus: {},
  fov: 55,
  plateFrame: { fov: 55, pos: [0, 2, 10], target: [0, 17, -90] },
  frame: "right",
  span: 24,
  portrait: { yaw: 0.2, half: 24 },
  short: 0.5,
  threshold: "#0c1526",
  // The signs stand 24 to 64 units off; the fog starts past them and
  // never closes in nearer than `keep`. The skyline (110+) takes more.
  fog: { color: "#141a24", near: 70, far: 320, keep: { near: 66, far: 260 } },
  background: "#10141c",
};

export default lujiazui;
