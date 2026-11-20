import type { SceneDef } from "../scenes";

// Experience: a grey stand-in for now (placeholder.tsx), the real scene later
const metro: SceneDef = {
  offset: [1500, 0, 0],
  home: { pos: [5, 3.2, 17], target: [0, 2.4, -2] },
  enter: { pos: [2, 4, 26], target: [0, 2.4, 0] },
  exit: { pos: [2, 4, 26], target: [0, 2.4, 0] },
  focus: {},
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
