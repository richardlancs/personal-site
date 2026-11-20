import type { SceneDef } from "../scenes";

// About: a grey stand-in for now (placeholder.tsx), the real scene later
const longtang: SceneDef = {
  offset: [500, 0, 0],
  home: { pos: [1.6, 1.8, 7.5], target: [-0.6, 1.6, -2] },
  enter: { pos: [0.4, 2.6, 16], target: [0, 1.8, 0] },
  exit: { pos: [0.4, 2.6, 16], target: [0, 1.8, 0] },
  focus: {},
  fov: 50,
  plateFrame: { fov: 50, pos: [1.6, 1.8, 7.5], target: [-0.6, 1.6, -2] },
  frame: "right",
  portrait: { yaw: 0, half: 24 },
  short: 4,
  threshold: "#16130f",
  fog: { color: "#1a1d24", near: 12, far: 70 },
  background: "#1a1d24",
};

export default longtang;
