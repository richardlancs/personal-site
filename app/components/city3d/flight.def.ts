import type { PlaceDef, SceneId, V3 } from "./scenes";

// The flight between two places (docs/superpowers/plans/2026-11-21-city-
// painted-25d.md, Task 3): the camera lifts out of the place (its picture
// pulls back and the clouds close over it), comes out above the city's
// aerial painting (app/assets/city/aerial-{day,night}.webp, one
// composition), cruises over it toward the next place with a gentle bank,
// thin clouds passing under, then comes down through the clouds into the
// next place, whose picture comes up to meet it. 2 to 3 s in all, eased.
// Pure data and arithmetic, no three.js: Flight.tsx draws it and the
// Director (City3D.tsx) runs it.
//
// The aerial painting stands as a plate (kit/plate.ts) square to its own
// home view, `distance` away, as tall as `fov` shows there; so the camera
// straight in front of it at that distance sees the painting exactly as
// painted, and a camera nearer the plane (`alt`, a share of `distance`)
// sees a part of it, larger: the lower, the closer to the city.

export type MapUV = [number, number]; // u across from the left edge, v down from the top (0..1)

export const AERIAL = {
  painting: "aerial",
  aspect: 1672 / 941,
  fov: 50, // the painting's own lens (vertical degrees) from its home view
  distance: 100, // world units from the home view to the painting
};

// The six places on the aerial painting, read off it (1672 × 941): where
// each place is, so the flight leaves from one and comes down on the other
export const MAP: Record<SceneId, MapUV> = {
  // Home, the rooftop: the tall block on the near-left (west) bank, low
  lujiazui: [0.163, 0.735],
  // Projects: the supertalls in the middle, between Jin Mao, the World
  // Financial Center and the Shanghai Tower
  towers: [0.66, 0.245],
  // Experience: the elevated metro line, its train, lower middle
  metro: [0.632, 0.712],
  // About: the old brick lane houses' red roofs, lower right
  longtang: [0.685, 0.845],
  // Interests: the bright shopping street, far right
  "nanjing-road": [0.85, 0.795],
  // Contact: the clock tower on the riverfront (its face at u 0.607,
  // v 0.575; the brief's "lower centre-left" is the waterfront's left of
  // the train line: the tower itself stands just right of the middle)
  bund: [0.607, 0.585],
};

// Where the aerial painting stands in the world: far from every place
// (scenes.ts: offsets along x, up to 2500), past the camera's far plane
// from any of them, so neither ever shows from the other
export const FLIGHT_ORIGIN: V3 = [0, 0, -9000];

// The aerial painting as a plate (kit/plate.ts: buildPlate reads `home`,
// `plateFrame.fov` and `plate`; the rest is the PlaceDef's shape, unused):
// square to a home view from `distance` in front, so the painting's plane
// is z = 0 of the flight's group, its middle at the origin.
//
// Depth: the island of supertalls stands a little out of the river (a
// few hundredths of the way), so they slide over the water as the camera
// passes. Water: the wide reach of the river in the middle, which ripples
// (and rings in rain); nothing else moves.
const H = 2 * AERIAL.distance * Math.tan((AERIAL.fov * Math.PI) / 360);
export const AERIAL_FRAME = { width: H * AERIAL.aspect, height: H };
export const AERIAL_PLACE: PlaceDef = {
  offset: FLIGHT_ORIGIN,
  home: { pos: [0, 0, AERIAL.distance], target: [0, 0, 0] },
  enter: { pos: [0, 0, AERIAL.distance], target: [0, 0, 0] },
  exit: { pos: [0, 0, AERIAL.distance], target: [0, 0, 0] },
  focus: {},
  fov: AERIAL.fov,
  plateFrame: { fov: AERIAL.fov, pos: [0, 0, AERIAL.distance], target: [0, 0, 0] },
  frame: "center",
  threshold: "#0c1526",
  fog: { color: "#0c1526", near: 1000, far: 2000 },
  background: "#0c1526",
  plate: {
    painting: AERIAL.painting,
    aspect: AERIAL.aspect,
    depth: {
      kind: "layers",
      layers: [
        {
          mask: [[0.315, 0.38], [0.335, 0.27], [0.4, 0.17], [0.43, 0.04], [0.47, 0.03], [0.6, 0.12], [0.66, 0.08], [0.7, 0.02], [0.74, 0.02], [0.76, 0.12], [0.86, 0.13], [0.89, 0.27], [0.85, 0.36], [0.72, 0.44], [0.58, 0.48], [0.42, 0.46], [0.34, 0.42]],
          z: 0.035,
        },
      ],
    },
    regions: [
      {
        kind: "water",
        poly: [[0.02, 0.665], [0.13, 0.62], [0.2, 0.565], [0.23, 0.5], [0.225, 0.42], [0.2, 0.34], [0.25, 0.27], [0.3, 0.3], [0.32, 0.41], [0.38, 0.465], [0.48, 0.5], [0.6, 0.505], [0.7, 0.49], [0.62, 0.53], [0.5, 0.58], [0.38, 0.63], [0.28, 0.67], [0.15, 0.71], [0.03, 0.74]],
      },
    ],
    spots: {},
    drift: { amplitude: 0, period: 40 },
  },
};

// Heights over the painting, as a share of `distance` (1 is the home view,
// the whole painting): where the flight comes out of and goes down into a
// place, and where it cruises
export const LOW_ALT = 0.3;
export const CRUISE_ALT = 0.62;

// The phases' lengths, s. The cruise grows with the way to go (`span`, in
// the painting's heights) inside its bounds.
export const LIFT = 0.5;
export const DESCEND = 0.8;
export const CRUISE_MIN = 0.9;
export const CRUISE_MAX = 1.45;
const CRUISE_PER = 0.9; // s per painting height
// A short way back out of a lift not yet finished (a click on the place
// the flight is just leaving): never shorter or longer than these
const BACK_MIN = 0.15;
const BACK = 0.35;
// The descent passes through the clouds at this share of its length: the
// camera crosses into the next place there, unseen
export const CROSS = 0.5;
// How small the place's picture gets as the camera lifts out of it, and
// how small the next one is when the clouds part over it
export const LIFT_SCALE = 0.86;
// The bank at its most (radians, about 8.5°), and the curve's bow (a share
// of the way): a gentle arc, never a swerve
const BANK_MAX = 0.15;
const BOW = 0.16;
// The path's samples (the plan's `path`)
const SAMPLES = 9;

// Where a flight starts when it doesn't start at rest in a place: another
// choice made in the middle of one (Review Focus 1). `airborne`: over the
// aerial painting already, at `at` and `alt`, the clouds at `veil`; or
// still in the place (lifting out, or the next place's clouds parting) with
// the clouds at `veil` and the picture at `scale`.
export type FlightStart = { airborne: true; at: MapUV; alt: number; veil: number } | { airborne: false; veil: number; scale: number };

export type FlightPlan = {
  from: SceneId;
  to: SceneId;
  lift: number; // s
  cruise: number; // s
  descend: number; // s
  path: MapUV[]; // the cruise's way over the painting, from where it starts to `to`'s point
  bank: number; // radians at the cruise's middle; positive rolls the view counter-clockwise
  back?: boolean; // only settling back into `from` (no cruise, no descent)
  start: { alt: number; veil: number; scale: number };
};

export type TravelKind = "cut" | "open" | "stay" | "fly";

// What a change of address does: a cut in still view (and so under
// prefers-reduced-motion, lib/still.ts); on arriving on the site the view
// simply opens; the same place stays; anything else is a flight
export function travelKind(from: SceneId | null, to: SceneId, still: boolean): TravelKind {
  if (still) return "cut";
  if (!from) return "open";
  if (from === to) return "stay";
  return "fly";
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const smooth = (x: number) => {
  const k = clamp01(x);
  return k * k * (3 - 2 * k);
};
export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t: number) => 1 - Math.pow(1 - clamp01(t), 3);
const easeIn = (t: number) => Math.pow(clamp01(t), 2);
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

// The way between two points of the painting, in painting heights (u is
// stretched by the aspect, so a step across counts as much as one down)
export const span = (a: MapUV, b: MapUV) => Math.hypot((b[0] - a[0]) * AERIAL.aspect, b[1] - a[1]);

const bezier = (a: MapUV, c: MapUV, b: MapUV, t: number): MapUV => {
  const s = 1 - t;
  return [s * s * a[0] + 2 * s * t * c[0] + t * t * b[0], s * s * a[1] + 2 * s * t * c[1] + t * t * b[1]];
};

// The flight from one place to another, or from wherever a flight was
// when another choice came (`start`). Pure: the same in, the same out.
export function flightPlan(from: SceneId, to: SceneId, start?: FlightStart): FlightPlan {
  if (start && !start.airborne && from === to) {
    // Back into the place it was leaving: the clouds part again, the
    // picture comes back to size, no flight
    const left = Math.max(start.veil, (1 - start.scale) / (1 - LIFT_SCALE));
    const t = Math.min(BACK, Math.max(BACK_MIN, BACK * left));
    return { from, to, lift: t, cruise: 0, descend: 0, path: [MAP[from], MAP[from]], bank: 0, back: true, start: { alt: LOW_ALT, veil: start.veil, scale: start.scale } };
  }
  const a: MapUV = start?.airborne ? [start.at[0], start.at[1]] : MAP[from];
  const b = MAP[to];
  const d = span(a, b);
  // The bow: to the side of the way that is farther into the painting
  // (smaller v: over the river and the far bank, not the frame's near edge)
  const mid: MapUV = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  let px = 0;
  let py = 0;
  if (d > 1e-6) {
    // the perpendicular, in the stretched measure, back in u and v
    const dx = ((b[0] - a[0]) * AERIAL.aspect) / d;
    const dy = (b[1] - a[1]) / d;
    let nx = -dy;
    let ny = dx;
    if (ny > 0) {
      nx = -nx;
      ny = -ny;
    }
    px = (nx * BOW * d) / AERIAL.aspect;
    py = ny * BOW * d;
  }
  const c: MapUV = [mid[0] + px, mid[1] + py];
  const path = Array.from({ length: SAMPLES }, (_, i) => bezier(a, c, b, i / (SAMPLES - 1)));
  // The bank: into the turn (the side the curve bends to), more for a
  // longer way. The turn's side: the cross of the way's first half with
  // its second (in the stretched measure); screen y runs down.
  const ux = (c[0] - a[0]) * AERIAL.aspect, uy = c[1] - a[1];
  const vx = (b[0] - c[0]) * AERIAL.aspect, vy = b[1] - c[1];
  const turn = ux * vy - uy * vx; // > 0: turning clockwise on screen (to the right)
  const bank = d < 1e-6 ? 0 : -Math.sign(turn) * Math.min(BANK_MAX, 0.06 + 0.1 * d);
  const cruise = Math.min(CRUISE_MAX, Math.max(CRUISE_MIN, 0.85 + CRUISE_PER * d));
  if (start?.airborne) {
    return { from, to, lift: 0, cruise, descend: DESCEND, path, bank, start: { alt: start.alt, veil: start.veil, scale: 1 } };
  }
  const veil = start?.veil ?? 0;
  const scale = start?.scale ?? 1;
  // A lift already under way finishes in what's left of it
  const done = Math.max(veil, (1 - scale) / (1 - LIFT_SCALE));
  const lift = LIFT * Math.max(0.3, 1 - done);
  return { from, to, lift, cruise, descend: DESCEND, path, bank, start: { alt: LOW_ALT, veil, scale } };
}

export const flightLength = (p: FlightPlan) => p.lift + p.cruise + p.descend;
// When the camera crosses into the next place (under the thickest cloud)
export const crossAt = (p: FlightPlan) => p.lift + p.cruise + p.descend * CROSS;
// When it comes out above the painting
export const riseAt = (p: FlightPlan) => p.lift;

// Where along the path (0..1 of its samples)
export function along(path: MapUV[], k: number): MapUV {
  const x = clamp01(k) * (path.length - 1);
  const i = Math.min(path.length - 2, Math.floor(x));
  const f = x - i;
  return [lerp(path[i][0], path[i + 1][0], f), lerp(path[i][1], path[i + 1][1], f)];
}

// A moment of a flight. `stage`: in the place it left ("from"), over the
// painting ("air"), or in the place it's going to ("to"); `at` the point
// of the painting under the camera and `look` the one it looks at (a
// little ahead while cruising); `alt` its height; `veil` how far the
// clouds have closed over the view (0 clear .. 1 closed); `scale` the
// place's picture (1 its own size); `roll` the bank (radians).
export type FlightSample = {
  stage: "from" | "air" | "to";
  at: MapUV;
  look: MapUV;
  alt: number;
  veil: number;
  scale: number;
  roll: number;
  progress: number; // 0..1 through the stage: in a place, how far toward its exit (or, arriving, its rest)
  done: boolean;
};

export function flightAt(p: FlightPlan, t: number): FlightSample {
  const end = p.path[p.path.length - 1];
  if (p.back) {
    const k = smooth(t / p.lift);
    return { stage: "from", at: p.path[0], look: p.path[0], alt: LOW_ALT, veil: lerp(p.start.veil, 0, k), scale: lerp(p.start.scale, 1, k), roll: 0, progress: k, done: t >= p.lift };
  }
  const total = flightLength(p);
  if (t >= total) return { stage: "to", at: end, look: end, alt: LOW_ALT, veil: 0, scale: 1, roll: 0, progress: 1, done: true };
  if (t < p.lift) {
    // Lifting out: the picture pulls back, the clouds close from the edges
    const k = t / p.lift;
    return {
      stage: "from",
      at: p.path[0],
      look: p.path[0],
      alt: LOW_ALT,
      // (closed a little before the camera leaves, so it leaves unseen)
      veil: lerp(p.start.veil, 1, easeIn(k / 0.85)),
      scale: lerp(p.start.scale, LIFT_SCALE, smooth(k)),
      roll: 0,
      progress: smooth(k),
      done: false,
    };
  }
  if (t < p.lift + p.cruise) {
    const k = (t - p.lift) / p.cruise;
    const e = easeInOut(k);
    // a little ahead along the way: the view leans into the travel
    const ahead = easeInOut(Math.min(1, k + 0.14));
    const veil0 = p.lift > 0 ? 1 : p.start.veil;
    return {
      stage: "air",
      at: along(p.path, e),
      look: along(p.path, ahead),
      // climbing out of the clouds over the first half, then holding
      alt: lerp(p.start.alt, CRUISE_ALT, smooth(k / 0.5)),
      // the clouds part over the first third
      veil: lerp(veil0, 0, smooth(k / 0.32)),
      scale: 1,
      roll: p.bank * Math.sin(Math.PI * k),
      progress: k,
      done: false,
    };
  }
  const k = (t - p.lift - p.cruise) / p.descend;
  if (k < CROSS) {
    // Coming down over the place, into the clouds
    const q = k / CROSS;
    return { stage: "air", at: end, look: end, alt: lerp(CRUISE_ALT, LOW_ALT * 0.85, easeIn(q)), veil: smooth(q / 0.9), scale: 1, roll: 0, progress: q, done: false };
  }
  // In the next place: the clouds part, its picture comes up to meet the eye
  const q = (k - CROSS) / (1 - CROSS);
  return { stage: "to", at: end, look: end, alt: LOW_ALT, veil: 1 - smooth(q), scale: lerp(LIFT_SCALE, 1, easeOut(q)), roll: 0, progress: easeOut(q), done: false };
}

// Another choice in the middle of a flight (Review Focus 1): the new
// flight starts from wherever this one is, never from its start, and
// replaces it (never queued behind it). `active` is the place the camera
// is in now (the Director's: `to` once it has crossed).
export function flightFrom(p: FlightPlan, t: number, active: SceneId, to: SceneId): FlightPlan {
  const s = flightAt(p, t);
  if (s.stage === "air") return flightPlan(active, to, { airborne: true, at: s.at, alt: s.alt, veil: s.veil });
  return flightPlan(active, to, { airborne: false, veil: s.veil, scale: s.scale });
}
