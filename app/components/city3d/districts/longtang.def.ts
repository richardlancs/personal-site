import type { SceneDef } from "../scenes";

// About: a stone-gate lane, composed as its paintings
// (app/assets/city/longtang-day.webp, -night.webp). The camera stands low
// in the lane, looking down it and a little up: brick houses either side
// (taller on the left), stone gate frames with dark doors, potted plants,
// a bicycle by the left wall, a scooter by the right, laundry on two
// bamboo poles across the lane, and at its far end, over the roofs, the
// Pearl with the World Financial Center and Shanghai Tower to its right.
// Everything the Director and the riverside need to know about this place
// lives here and only here (no three.js): its poses, its `focus` poses, and
// where its sign stands on the riverside (`sign`, which the riverside
// builds and the journey from the riverside flies toward; changed only
// with a re-run of docs/city/scripts/visibility.mjs).
// focus keys: none (About has no picker)
const longtang: SceneDef = {
  offset: [500, 0, 0],
  // The eye a child's height in the lane (the paintings' lane is drawn
  // about 1.8 times life size against the eye), looking 8° up
  home: { pos: [0, 0.17, 0], target: [-0.85, 1.58, -10] },
  enter: { pos: [0.05, 0.3, 1.25], target: [-0.8, 1.4, -10] },
  exit: { pos: [0.05, 0.3, 1.25], target: [-0.8, 1.4, -10] },
  focus: {},
  sign: { bearing: -17.6, distance: 17.4, y: 1.15 },
  fov: 50,
  plateFrame: { fov: 50, pos: [0, 0.17, 0], target: [-0.85, 1.58, -10] },
  frame: "right",
  span: 24,
  portrait: { yaw: 3, half: 20, lift: 6 },
  short: 2,
  threshold: "#16130f",
  // The lane is under 5 units long; the skyline stands 70 to 170 off and
  // stays clear (keep), as in the paintings
  fog: { color: "#1c2232", near: 60, far: 520, keep: { near: 45, far: 380 } },
  background: "#1c2232",
  // the plates light the left-hand houses from the right
  sun: [70, 75, 15],
};

export default longtang;

// Where everything in the lane stands (longtang.tsx builds it from this).
// The lane itself is modelled in metres in a group scaled by `scale` (one
// metre of the painted lane is 0.18 units); the skyline is in world units
// (10 m), the landmarks at their real size.
type XZ = readonly [number, number];
export const LANE = {
  scale: 0.18,
  // Lane metres: the facades' planes, the paving's length, the end house
  left: -2.8,
  right: 3.2,
  near: 9,
  end: -44,
  // The houses: unit length (m) and eave heights, left side taller
  unit: [3.8, 4.8] as const,
  eaveLeft: [7.4, 8.4] as const,
  eaveRight: [6.4, 7.2] as const,
  // The one lit upstairs window: the left side's house at this many units
  // from the near end
  litHouse: 4,
  // Wall lanterns: [side (-1 left, 1 right), z (m)]; the first two hold
  // the scene's two spot lights
  lanterns: [[-1, -3.4], [1, -14], [-1, -19], [1, -27], [-1, -32], [1, -38]] as readonly (readonly [number, number])[],
  // The two lit blade signs (decorative marks): [side, z, height] in metres
  blades: [[-1, -6.4, 2.6], [1, -6.2, 2.8]] as readonly (readonly [number, number, number])[],
  // The bamboo poles across the lane, and what hangs on them
  laundry: { z: -11, y: 3.7, sag: 0.12 },
  bicycle: [-2.15, -7.4] as XZ,
  scooter: [2.2, -6.6] as XZ,
  // The skyline beyond the lane's end (world units, the eye at 0, 0.17,
  // 0): it stands on ground `lift` units up, hidden behind the lane's end,
  // as the paintings draw it higher than a flat city would show it
  lift: 7,
  landmarks: {
    pearl: [-0.4, -88] as XZ,
    jinMao: [9, -135] as XZ,
    worldFinancialCenter: [16, -115] as XZ,
    shanghaiTower: [30, -140] as XZ,
  },
  skyline: { seed: 77, area: { x0: -50, x1: 70, z0: -175, z1: -70 }, count: 60, height: [8, 28] as [number, number] },
};
