import type { Pose, SceneDef, V3 } from "../scenes";

// Projects: the walkway ring under the three supertalls, composed as the
// paintings (app/assets/city/towers-day.webp, -night.webp). The camera
// stands at street level just inside the ring's south side and looks up
// and north, across the plaza, past the ring's far side and its trees, to
// the World Financial Center, Jin Mao and Shanghai Tower, left to right.
// Round the plaza, past the ring, curved podiums each carry one big
// curved screen: one per project, in portfolio order round the ring, the
// first two the paintings' left and right screens (towers.tsx builds it
// all from TOWERS below).
//
// focus keys: "screen-<n>", one per project in portfolio order (store:
// sel.project), each looking at its screen from across the plaza.
// Everything the Director and the riverside need to know about this place
// lives here and only here (no three.js); `sign` is changed only with a
// re-run of docs/city/scripts/visibility.mjs.

// Where everything stands, in the place's own units (10 m); the plaza's
// middle is the origin, north is -z, and an azimuth is degrees from north
// toward +x (east), seen from the plaza's middle
type XZ = readonly [number, number];
export const TOWERS = {
  // The eye at the home view: street level, just inside the ring's south side
  eye: [0, 0.16, 5.0] as V3,
  // The elevated walkway: a full circle, its deck `deck` up, a pillar every
  // `pillarStep` degrees, each `pillar` round; glass along both edges
  // `glass` tall (the paintings draw it heavy: a deep fascia, fat round
  // pillars, a tall glass railing)
  ring: { r: 8.5, width: 1.2, deck: 1.5, thick: 0.4, pillarStep: 20, pillar: 0.28, glass: 0.2 },
  // The podiums round the plaza: their inner face `r` from the middle,
  // `depth` deep and `height` tall, `span` degrees wide, one per screen;
  // none north of `open` degrees either side, where the supertalls stand
  podium: { r: 19, depth: 6, height: 10.5, span: 44, open: 34 },
  // The screens, on the podiums' inner faces: their middles' azimuths, one
  // per project in portfolio order (projects past five share the last
  // ones' places; there are five), their size and their middle's height
  screens: { az: [-52, 52, 116, 180, -116] as readonly number[], w: 7.6, h: 5.3, y: 6.4 },
  // The three supertalls past the ring's north side, left to right from
  // the eye, Jin Mao nearest (its spire reaches nearly as high in the frame
  // as the others' tops, as in the paintings)
  supertalls: {
    worldFinancialCenter: [-10, -35] as XZ,
    jinMao: [0.6, -29] as XZ,
    shanghaiTower: [15, -40] as XZ,
  },
  // The two spot lights: under the ring's deck, either side of the view
  spots: [-28, 28] as readonly number[],
} as const;

const rad = (deg: number) => (deg * Math.PI) / 180;
const round = (v: number) => +v.toFixed(2);

// The middle of screen n's face (on the podium's inner face)
export function screenMiddle(n: number): V3 {
  const az = rad(TOWERS.screens.az[n % TOWERS.screens.az.length]);
  const r = TOWERS.podium.r - 0.06;
  return [round(r * Math.sin(az)), TOWERS.screens.y, round(-r * Math.cos(az))];
}

// Looking at screen n from across the plaza, a little below its middle,
// from 14 units off (above the ring's deck on that line)
function screenPose(n: number): Pose {
  const az = rad(TOWERS.screens.az[n]);
  const back = TOWERS.podium.r - 14;
  return { pos: [round(back * Math.sin(az)), 0.5, round(-back * Math.cos(az))], target: screenMiddle(n) };
}

const towers: SceneDef = {
  offset: [1000, 0, 0],
  home: { pos: TOWERS.eye, target: [4, 16, -30] },
  enter: { pos: [0, 0.5, 6.5], target: [1.2, 12, -30] },
  exit: { pos: [0, 0.5, 6.5], target: [1.2, 12, -30] },
  focus: Object.fromEntries(TOWERS.screens.az.map((_, n) => [`screen-${n}`, screenPose(n)])),
  sign: { bearing: 0, distance: 16.8, y: 1.15 },
  fov: 62,
  // The painting's frame: the same eye, the painting's wide (2.33:1),
  // steep view up
  plateFrame: { fov: 66, pos: TOWERS.eye, target: [0.6, 15.5, -30] },
  frame: "right",
  span: 32,
  portrait: { yaw: 0, half: 30, lift: 18 },
  short: -10,
  threshold: "#0b1424",
  // The plaza is all within 25 units; the supertalls stand 45 to 60 off and
  // the city behind them to 150: the fog starts past the supertalls
  fog: { color: "#151c2a", near: 70, far: 300, keep: { near: 60, far: 240 } },
  background: "#151c2a",
};

export default towers;
