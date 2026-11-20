import type { SceneDef } from "../scenes";

// Interests: the pedestrian street, framed like its paintings
// (app/assets/city/nanjing-road-day.webp, -night.webp). One unit is ten
// metres. The street runs away from the camera along -z, its middle near
// x = 0.4: old stone facades on the left (their fronts at x = -1.3), glass
// on the right (x = 2.4), rows of trees and lamps down both sides, a
// parked tram on the right, and at the far end, over the low roofs, the
// Pearl with the other three landmarks to its right. The arcade's
// shopfront is the nearest on the left, the one machine in its open door
// (nanjing-road.tsx: ARCADE).
//
// - home: with the panel over the left half, the view turns toward the
//   arcade, so its shopfront and the machine stand in the right half's
//   middle with the street running off behind them.
// - plateFrame: the painting's frame, at eye height, looking a little
//   left of straight down the street (its far end sits right of the
//   frame's middle, as in the painting) and a little up.
// - sign: where its board stands on the riverside (unchanged; moved only
//   with a re-run of docs/city/scripts/visibility.mjs).
// focus keys: "machine", the arcade machine's screen (store: sel.interest)
const nanjingRoad: SceneDef = {
  offset: [2000, 0, 0],
  home: { pos: [0.25, 0.22, 7.1], target: [-1.4, 0.28, 4.1] },
  enter: { pos: [1.1, 0.5, 13], target: [-0.6, 0.4, 3] },
  exit: { pos: [1.1, 0.5, 13], target: [-0.6, 0.4, 3] },
  focus: {
    machine: { pos: [-0.62, 0.21, 5.38], target: [-1.5, 0.17, 4.4] },
  },
  sign: { bearing: 8.8, distance: 16.2, y: 1.1 },
  fov: 50,
  plateFrame: { fov: 48, pos: [0.2, 0.17, 7], target: [-2.12, 1.52, -2.73] },
  frame: "right",
  span: 20,
  portrait: { yaw: 0, half: 24, lift: 3 },
  short: 2,
  threshold: "#160f16",
  // The street's far end is 70 units off and the landmarks 135 to 220:
  // the fog starts past the street and takes the skyline softly
  fog: { color: "#1c1820", near: 45, far: 420, keep: { near: 35, far: 260 } },
  background: "#1c1820",
  // the day plate's sun: high, from the right and a little behind the
  // eye, so the old stone on the left is sunlit and the glass in shade
  sun: [60, 75, 30],
  // and the glass side in the shade, lit a little by the sky and the stone
  bounce: { color: "#c9d8e8", strength: 0.22 },
};

export default nanjingRoad;
