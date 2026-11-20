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
  // Out in the bay, low, the horizon at about 69% of the height and the
  // Pearl at about 55% of the width, as in lujiazui-day.webp. The plate's
  // landmarks stand spread across its right half; here they stand together
  // (behind no board), so they span far less of the width (Task 18).
  plateFrame: { fov: 40, pos: [3, 1.5, -6], target: [-1.3, 15.4, -105.9] },
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

// Where everything on the riverside stands (Riverside.tsx builds it from
// this; nothing about the composition is written in the scene's code), in
// riverside units (10 m), the camera's eye at home.pos. The sections'
// boards are each section's own def (sign); everything here is placed
// round them. Change the composition here, then re-run
// docs/city/scripts/visibility.mjs.
type XZ = readonly [number, number];
export const RIVERSIDE = {
  // The water: from the promenade's edge (z = near) to the far bank's
  // (z = far), the whole width. The near bank is two quays reaching out
  // into it either side of the view, short of the promenade, so the view's
  // foot is water as in the plates.
  water: { near: 7, far: -51, width: 700 },
  quays: [
    { x0: -30, x1: -5, z0: -25, z1: -4 },
    { x0: 4, x1: 24, z0: -25, z1: -4 },
  ],
  // The promenade the camera stands on (30 m back from its edge, so the
  // view's foot is the bay's water), its railing along the water
  promenade: { z0: 7, z1: 40 },
  railing: { z: 7.15, x0: -5, x1: 4 },
  // The landmarks, on the far bank between Projects and Interests (so no
  // board has one behind its word), the Pearl in front
  landmarks: {
    pearl: [7.0, -101.8] as XZ,
    worldFinancialCenter: [9.4, -117.7] as XZ,
    jinMao: [10.9, -107.5] as XZ,
    shanghaiTower: [13.1, -123.4] as XZ,
  },
  landmarkKeepOut: 6.5,
  // The skyline: two rings of towers, the farther one fainter in the fog.
  // `crest`: where the skyline is tallest (x) and how fast it falls away
  // either side (the plates' skyline rises to the landmarks). A tower
  // that would stand behind a board's word is kept lower than the board's
  // foot instead.
  skyline: {
    near: { seed: 23, area: { x0: -120, x1: 120, z0: -100, z1: -58 }, count: 70, height: [5, 26] as [number, number] },
    // the towers crowding round the landmarks
    core: { seed: 31, area: { x0: -6, x1: 34, z0: -150, z1: -92 }, count: 22, height: [12, 34] as [number, number] },
    far: { seed: 29, area: { x0: -190, x1: 190, z0: -205, z1: -128 }, count: 60, height: [10, 34] as [number, number], fogScale: 1.7 },
    crest: { x: 10, spread: 75, least: 0.45 },
  },
  // The far bank's edge: an embankment, a row of trees and lamps
  bank: { z: -51.5, trees: { from: -120, to: 120, step: 2.2 }, lamps: { from: -96, to: 96, step: 6 } },
  // About: low lane houses on the left quay, behind and under its board
  lanes: { seed: 11, x: [-20, -7.5] as [number, number], z: [-23, -9] as [number, number], count: 14, litWindow: [-11.2, -15.6] as XZ },
  // Experience: the viaduct crossing the river's left part, its board on a
  // gantry on the deck; a train parked on it
  viaduct: { x0: -110, x1: -6, z: -31.5, y: 2.9, width: 1.1 },
  // Interests: a street mouth between two old facades on the right quay
  street: { facades: [[4.6, -25.5, 1.1, 4, 3.6], [9.4, -25.5, 1.3, 4, 4.2]] as readonly (readonly [number, number, number, number, number])[] },
  // Contact: the clock tower beside its board, on the right quay
  clockTower: { offset: 2.6, back: 2, size: 1.8, height: 9.5 },
  // A ferry on the channel
  boat: { seed: 3, z: -42, x0: -90, x1: 90, period: 140 },
  // Trees along the quays' edges
  quayTrees: [[-28, -6], [-25, -5], [-22, -5.4], [-29, -12], [12, -5], [15, -6.5], [18, -5], [21, -8]] as readonly XZ[],
  // The promenade's lamps, either side of the bay
  promenadeLamps: [[-6.5, 7.8], [5.5, 7.8]] as readonly XZ[],
};
