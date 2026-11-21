import type { PlaceDef, Quad, UV, V3 } from "../scenes";

// Projects: the walkway ring under the three supertalls, drawn as its two
// paintings (app/assets/city/towers-day.webp, -night.webp, 2400 × 1032,
// one composition) on the plate (kit/plate.ts, PlatePlace.tsx). Every
// number under `plate` is read off the painting: u across from its left
// edge, v down from its top, depth the share of the way a point comes
// toward the eye (scenes.ts: PlateDef).
//
// Left to right the painting has: a tree over the top left corner; the
// left podium with its big curved screen (u 0.13 .. 0.26); the World
// Financial Center, Jin Mao and Shanghai Tower in the middle (u 0.38 ..
// 0.68); smaller towers; the right podium with the other big screen
// (u 0.79 .. 0.92); and the elevated walkway's ring sweeping across the
// bottom on its round pillars, trees behind its glass railing.
//
// The projects' wall: the right screen, the one that comes clear of the
// panel, shows all the projects at once, a tile each (WALL below: three
// over two, in portfolio order), the chosen one lit and edged in gold
// (towers.tsx draws it). Each tile is a spot, "screen-<n>": clicking it
// chooses that project, as the panel's keys do. The left screen keeps the
// painting's own picture (it sits behind the panel's glass on wide
// screens, where a bright screenshot would fight the panel's words).
//
// focus keys: "screen-<n>", one per project in portfolio order (store:
// sel.project), every one the same short pan to the wall (FOCUS below):
// on a wide screen the home view holds the three supertalls in the half
// the panel leaves, the wall past its right edge; a choice slides the
// view right, along the painting, until the wall stands in that half.
//
// Where its sign stands on the riverside (`sign`) is the riverside's.

// The painting's size, and the home view's lens and distance (the plate
// stands square to it, `D` off, as tall as `FOV` shows there)
const ASPECT = 2400 / 1032;
const FOV = 50;
const D = 30;
const H = 2 * D * Math.tan((FOV * Math.PI) / 360);
const W = H * ASPECT;
const EYE: V3 = [0, 0, 0];
const AIM: V3 = [0, 0, -D];

// The right screen's lit face, its corners clockwise from the top left
// (measured off the night painting: where its picture's colour ends), and
// how far it stands out (the right podium's layer, below)
const PODIUM = 0.025;
const SCREEN: [UV, UV, UV, UV] = [
  [0.786, 0.512],
  [0.898, 0.335],
  [0.915, 0.544],
  [0.794, 0.674],
];

// The wall's layout, in the screen's own measure (s across, t down, 0..1
// over its face): a frame of `margin`, three tiles over two, the gap
// between them `gap`. Five projects; a sixth would need a new layout
// (tests/city3d-towers.test.mjs checks there's a tile per project).
const margin = { s: 0.05, t: 0.08 };
const gap = { s: 0.03, t: 0.06 };
const tileW = (1 - 2 * margin.s - 2 * gap.s) / 3;
const tileH = (1 - 2 * margin.t - gap.t) / 2;
const tiles: { s: number; t: number }[] = [
  ...[0, 1, 2].map((k) => ({ s: margin.s + k * (tileW + gap.s), t: margin.t })),
  ...[0, 1].map((k) => ({ s: 0.5 - tileW - gap.s / 2 + k * (tileW + gap.s), t: margin.t + tileH + gap.t })),
];
export const WALL = { screen: SCREEN, depth: PODIUM, tiles, tileW, tileH } as const;

// A point of the screen's face, (s, t) in its own measure, in the
// painting (bilinear between its corners, as the picture drawn on it is
// laid: towers.tsx, kit/plate.ts spotGeometry)
export function wallPoint(s: number, t: number): UV {
  const [tl, tr, br, bl] = SCREEN;
  const top = [tl[0] + (tr[0] - tl[0]) * s, tl[1] + (tr[1] - tl[1]) * s];
  const bottom = [bl[0] + (br[0] - bl[0]) * s, bl[1] + (br[1] - bl[1]) * s];
  const r = (n: number) => +n.toFixed(4);
  return [r(top[0] + (bottom[0] - top[0]) * t), r(top[1] + (bottom[1] - top[1]) * t)];
}

// Tile n as a spot: its four corners on the screen, at the podium's depth
function tileQuad(n: number): Quad {
  const { s, t } = tiles[n];
  const at = (a: number, b: number): V3 => [...wallPoint(a, b), PODIUM];
  return [at(s, t), at(s + tileW, t), at(s + tileW, t + tileH), at(s, t + tileH)];
}

// The pan to the wall: the eye slides right along the painting by 0.235
// of its width, still looking straight ahead (a turn, or a step in or
// out, would show past the painting's edges: kit/plate.ts covers the view
// from the home pose). The lens's cover puts the painting's left edge at
// the screen's left on a wide screen, so how far it can slide is what the
// screen leaves of the painting: a 16:9 screen shows 0.76 of its width,
// and the slide leaves it 0.01 to spare; at 1440 × 900 (0.69 of it) the
// wall then stands whole in the half the panel leaves, at its right edge.
const PAN = 0.235 * W;
const FOCUS = { pos: [+(EYE[0] + PAN).toFixed(2), EYE[1], EYE[2]] as V3, target: [+(AIM[0] + PAN).toFixed(2), AIM[1], AIM[2]] as V3 };

const towers: PlaceDef = {
  offset: [1000, 0, 0],
  // The home view is the painting's own frame: straight ahead, D units to
  // the painting. Wide screens put the view's middle (Jin Mao) in the half
  // the panel leaves, so that half holds the three supertalls
  home: { pos: EYE, target: AIM },
  // Arriving and leaving: a step in along the same line (4 % of the way),
  // so the settle back shows the ring and the podiums slide over the far
  // towers, and nothing past the painting's edges shows
  enter: { pos: [0, 0, -0.04 * D], target: AIM },
  exit: { pos: [0, 0, -0.04 * D], target: AIM },
  focus: Object.fromEntries(tiles.map((_, n) => [`screen-${n}`, FOCUS])),
  fov: FOV,
  plateFrame: { fov: FOV, pos: EYE, target: AIM },
  frame: "right",
  // Portrait phones show the middle of the painting, the three supertalls
  // in the band over the sheet
  portrait: { yaw: 0, half: 24 },
  short: 0,
  threshold: "#0b1424",
  fog: { color: "#151c2a", near: 70, far: 300, keep: { near: 60, far: 240 } },
  background: "#151c2a",
  // the paintings have no moon beside the supertalls
  moon: false,
  plate: {
    painting: "towers",
    aspect: ASPECT,
    depth: {
      kind: "layers",
      // No ground: the painting looks up, its foot is the walkway. The
      // supertalls and the sky stay in the painting's plane; the podiums,
      // the ring and the near tree come a little toward the eye, enough
      // for the pan to the wall to show them slide over the far towers
      // (more would stretch the painting at their edges in the pan)
      layers: [
        // the left podium and the tower over it
        { mask: [[0, 0], [0.27, 0], [0.27, 0.1], [0.265, 0.34], [0.27, 0.47], [0.262, 0.66], [0, 0.62]], z: PODIUM },
        // the right podium and the building over it
        { mask: [[0.797, 0.33], [0.86, 0.2], [0.92, 0.12], [1, 0.08], [1, 0.62], [0.78, 0.74], [0.776, 0.5]], z: PODIUM },
        // the walkway's ring, its railing's top to the bottom edge
        { mask: [[0, 0.5], [0.1, 0.555], [0.25, 0.625], [0.4, 0.68], [0.5, 0.695], [0.6, 0.69], [0.75, 0.665], [0.8, 0.672], [0.85, 0.64], [0.9, 0.585], [1, 0.515], [1, 1], [0, 1]], z: 0.045 },
        // the tree over the top left corner
        { mask: [[0, 0], [0.34, 0], [0.33, 0.06], [0.26, 0.1], [0.17, 0.1], [0.13, 0.16], [0.12, 0.3], [0.125, 0.42], [0.09, 0.52], [0.04, 0.56], [0, 0.56]], z: 0.06 },
      ],
    },
    regions: [
      // The open sky, clear of the tree, the supertalls and the podiums
      { kind: "sky", poly: [[0.345, 0], [0.575, 0], [0.575, 0.08], [0.52, 0.08], [0.505, 0.095], [0.46, 0.12], [0.385, 0.12], [0.345, 0.06]] },
      { kind: "sky", poly: [[0.69, 0], [0.95, 0], [0.92, 0.1], [0.865, 0.17], [0.82, 0.25], [0.8, 0.32], [0.76, 0.38], [0.705, 0.4], [0.69, 0.3]] },
      { kind: "sky", poly: [[0.3, 0.07], [0.375, 0.13], [0.37, 0.44], [0.335, 0.45], [0.31, 0.35], [0.285, 0.3], [0.275, 0.1]] },
      // The supertalls' glass: a slow sheen by day
      { kind: "glass", poly: [[0.385, 0.13], [0.45, 0.13], [0.446, 0.68], [0.375, 0.68]] },
      { kind: "glass", poly: [[0.49, 0.16], [0.535, 0.16], [0.555, 0.68], [0.475, 0.68]] },
      { kind: "glass", poly: [[0.578, 0.025], [0.64, 0.025], [0.675, 0.7], [0.58, 0.7]] },
      // The plaza's dark paving under the ring: it mirrors the walkway's
      // lights after rain
      { kind: "wet", poly: [[0, 0.9], [1, 0.9], [1, 1], [0, 1]] },
    ],
    spots: Object.fromEntries(tiles.map((_, n) => [`screen-${n}`, tileQuad(n)])),
    drift: { amplitude: 0.003, period: 40 },
    movers: [
      // aircraft lights on the supertalls' tops: Jin Mao's spire, the
      // World Financial Center's top, Shanghai Tower's crown; a slow swell
      { kind: "beacon", path: [[0.5125, 0.1], [0.398, 0.131], [0.6, 0.024]], period: 4.5, color: "#ff5a4e", size: 0.004 },
      // a plane's light crossing the open sky on the right, high, slowly
      { kind: "boat", path: [[0.94, 0.17], [0.82, 0.1], [0.7, 0.05]], period: 150, color: "#fff1d6", size: 0.003 },
    ],
  },
};

export default towers;
