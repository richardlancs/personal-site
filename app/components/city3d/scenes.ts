// The six places of the 3D city: where each one is, how the camera
// arrives, where it looks, and the route from the riverside (Home) the
// camera flies to reach each section. Places are modelled in their own
// coordinates and sit far apart in one world (`offset`), past the fog, so
// only one is ever visible. Each place's numbers live in its own
// districts/<id>.def.ts (no three.js), so the Director knows every pose
// without pulling any scene's code into the main chunk.
//
// One world unit is ten metres (kit/landmarks.ts builds at 1:10).

import type { FogBase } from "./atmosphere/looks";
import type { DistrictId } from "../../sections/registry";
import bund from "./districts/bund.def.ts";
import longtang from "./districts/longtang.def.ts";
import lujiazui from "./districts/lujiazui.def.ts";
import metro from "./districts/metro.def.ts";
import nanjingRoad from "./districts/nanjing-road.def.ts";
import towers from "./districts/towers.def.ts";

export type SceneId = DistrictId;
export type V3 = [number, number, number];
export type Pose = { pos: V3; target: V3 };
export type SignSpot = { bearing: number; distance: number; y: number };

export type SceneDef = {
  offset: V3;
  home: Pose;
  // Where the camera is when it steps into the place, and where it backs
  // out to when leaving
  enter: Pose;
  exit: Pose;
  focus: Record<string, Pose>;
  // A section's place only: where its sign stands on the riverside, seen
  // from the riverside's home view (lujiazui.def.ts: home.pos): degrees
  // right of straight ahead, distance in units, and the board's middle
  // height. The board is as wide as 0.135 of its distance, so every sign is
  // about as wide on screen as the others.
  sign?: SignSpot;
  // The lens at the home view (vertical degrees) on landscape screens
  fov: number;
  // The pose and lens that frame the place like its painting
  // (app/assets/city/<id>-day.webp), for matching the plates (Task 18)
  plateFrame: { fov: number; pos: V3; target: V3 };
  // Which side of a wide screen the place is framed on, so the panel has
  // the other side
  frame: "left" | "right" | "center";
  // On a wide screen, at the home view: the lens widens if it must to show
  // `span` degrees either side of the view's middle in the part the panel
  // leaves
  span?: number;
  // On a portrait screen, at the place's home view: the middle of the view
  // is `yaw` degrees right of where the camera looks, and the lens widens
  // if it must to show `half` degrees either side of that
  // `lift`: the point that many degrees above where the camera looks goes
  // to the middle of the strip (phones: the band over the sheet), and the
  // lens shows at least `cover` degrees top to bottom in that strip
  portrait?: { yaw: number; half: number; lift?: number; cover?: number };
  // On a short landscape screen (a phone on its side), at the home view:
  // how many degrees under where the camera looks the place's fronts are,
  // lifted to the middle of the strip between the bar and the sheet
  short?: number;
  // The colour the view passes through between places
  threshold: string;
  fog: { color: string } & FogBase;
  background: string;
  // Where the sun (the moon at night) stands, as a direction toward it
  // (any length), so the place is lit from the side its plate is; the
  // world's default (common.tsx: WorldLights) when left out
  sun?: V3;
  // By day, a fill on what faces away from the sun (kit/uniforms.ts:
  // bounceUniforms): its colour and strength (about 0.2 lifts a shaded
  // wall to the plates' cool, readable shade); none when left out
  bounce?: { color: string; strength: number };
  // The sky dome's moon after dark: false hides it in this place (where
  // the painting has none in view)
  moon?: false;
  // A roof the rain and snow don't fall under, in the place's coordinates
  // (atmosphere/Precipitation.tsx), e.g. a platform's canopy
  shelter?: { min: V3; max: V3 };
};

// ---------- A painted place (kit/plate.ts, PlatePlace.tsx) ----------
//
// A place drawn as its painting (app/assets/city/<painting>-day.webp and
// -night.webp, one composition), on one plane given depth so the camera's
// slow drift and its small moves make the near parts slide over the far
// ones. Everything about the painting is data, in the painting's own
// measure, as read off the image:
//
// - UV: a point in the painting: u across from its left edge (0..1), v
//   down from its top edge (0..1), as the image's pixels run (x / width,
//   y / height)
// - depth, 0..1: how far a point comes out of the painting toward the eye
//   (0 the painting's own plane, the farthest; 1 the nearest), the same
//   measure as a depth map (near light, far dark)
//
// The plane stands square to the place's home view (home.pos looking at
// home.target), as far off as home.target, as tall as plateFrame.fov
// shows there; so from home.pos the painting is exactly itself, and a
// place's home pose is its plateFrame pose. Wherever a screen shows more
// than the painting (a wider lens, the panel's shift), the plane grows,
// centred on the view, until it fills the view (kit/plate.ts: cover).
export type UV = [number, number];
// An interactive spot: its four corners, clockwise from the top left, as
// [u, v, depth] (not metres, as the plan first had it: the painting's own
// measure is what a place's builder can read off the image; kit/plate.ts:
// spotPoint turns it into the place's coordinates)
export type Quad = [V3, V3, V3, V3];

// How the painting is given depth. The depth is made in code, in the
// browser, from data (no depth pictures: ChatGPT can't paint one that
// lines up with its painting), as a share of the distance each point is
// brought toward the eye (0 stays in the painting's plane):
// - "layers" (the one to use): built up in this order
//   1. `ground` (optional): the rows under `horizon` (a v) come toward the
//      eye, eased, to `near` at the bottom row (the paving, the water, the
//      foreground at the bottom of the frame)
//   2. with a ground, whatever above the horizon isn't sky stands a little
//      out of it (`standing`, default 0.06): the sky is found from the day
//      painting's colours by scripts/city/make-masks.mjs
//      (app/assets/city/masks/<painting>-sky.webp, skyMask), so the
//      skyline moves against the sky with no polygon drawn
//   3. `layers`: polygons cut out of the painting, each brought `z` toward
//      the eye (later over earlier): a near railing, a kiosk, a tree
//   So a horizon and a few polygons give a place gentle parallax.
// - "map": a grayscale depth map, near light
//   (app/assets/city/depth/<painting>-day.webp), `strength` the share the
//   nearest (white) comes; kept for a map made some other way, none exist
export type PlateDepth =
  | { kind: "layers"; layers: { mask: UV[]; z: number }[]; ground?: { horizon: number; near: number }; standing?: number }
  | { kind: "map"; strength: number };

// Parts of the painting that move a little (kit/plate.ts, the shader):
// "water" ripples, its reflections wavering and, in rain, rings; "wet"
// paving darkens and mirrors the lights above it after rain; "sky" drifts
// its clouds a little by day and shows a few steady stars on a clear
// night; "glass" catches a faint sheen that passes slowly by day.
export type PlateRegion = { kind: "water" | "wet" | "sky" | "glass"; poly: UV[] };

// Small lights that move over the painting, drawn in one instanced layer
// (kit/plate.ts: buildMovers), parked in still view:
// - "trail": `count` lights running along `path` one after another, each
//   a short streak along its way (traffic); a full run takes `period` s
// - "boat": one light (or `count` close together) crossing along `path`
//   once every `period` s
// - "beacon": a steady light at each point of `path` (aircraft on a mast,
//   a tower top) that swells and fades slowly over `period` s (never a
//   blink; 0 holds it steady)
// `size` is the light's width as a share of the painting's height (about
// 0.003 .. 0.01); `depth` as above (default 0); `night` (default true):
// lit only after dark, fading in with the night painting.
export type PlateMover = {
  kind: "trail" | "boat" | "beacon";
  path: UV[];
  period: number;
  color: string;
  size: number;
  count?: number;
  depth?: number;
  night?: boolean;
};

export type PlateDef = {
  painting: string; // asset id, e.g. "lujiazui" -> <id>-{day,night}.webp
  aspect: number; // width / height of the painting
  depth: PlateDepth;
  regions: PlateRegion[];
  spots: Record<string, Quad>; // interactive quads: "screen-0", "board", "machine", sign ids
  // The rest drift (City3D.tsx: Director), desktop tiers only, never in
  // still view: the eye wanders on a slow figure, `amplitude` a share of
  // the distance to what it looks at (sideways; half that up and down),
  // once round in `period` seconds. Keep driftTravel() under 0.01 (under
  // 1% of the view in any 10 s).
  drift: { amplitude: number; period: number };
  movers?: PlateMover[];
};

export type PlaceDef = SceneDef & { plate: PlateDef };

export const isPlace = (def: SceneDef): def is PlaceDef => "plate" in def && !!(def as PlaceDef).plate;

// The most the drift can carry the eye in any 10 s, as a share of the
// distance to what it looks at (the figure's widest swing, or its fastest
// pace for 10 s, whichever is less)
export function driftTravel(drift: PlateDef["drift"]): number {
  if (drift.amplitude <= 0 || drift.period <= 0) return 0;
  return Math.hypot(1, 0.5) * drift.amplitude * Math.min(2, (2 * Math.PI * 10) / drift.period);
}

// What's wrong with a painted place's data, as sentences (none: it's
// sound). Each place's test runs it (tests/city3d-<id>.test.mjs).
export function checkPlace(def: PlaceDef): string[] {
  const out: string[] = [];
  const p = def.plate;
  if (!p) return ["no plate"];
  const unit = (n: number) => Number.isFinite(n) && n >= 0 && n <= 1;
  const uvOk = (q: UV) => Array.isArray(q) && q.length === 2 && unit(q[0]) && unit(q[1]);
  const poly = (name: string, pts: UV[], inside = true) => {
    if (!Array.isArray(pts) || pts.length < 3) out.push(`${name}: a polygon needs 3 points or more`);
    else if (inside && !pts.every(uvOk)) out.push(`${name}: a point outside the painting (u, v in 0..1)`);
  };
  if (!/^[a-z0-9-]+$/.test(p.painting ?? "")) out.push(`painting "${p.painting}" isn't an asset id (lower case, digits, hyphens)`);
  if (!(p.aspect > 0.2 && p.aspect < 5)) out.push(`aspect ${p.aspect} isn't a painting's width / height`);
  const d = p.depth;
  const share = (n: number | undefined) => n === undefined || (n >= 0 && n <= 0.85);
  if (d?.kind === "map") {
    if (!share(d.strength)) out.push(`depth strength ${d.strength} outside 0..0.85`);
  } else if (d?.kind === "layers") {
    if (d.ground && (!unit(d.ground.horizon) || !share(d.ground.near))) out.push(`depth ground: horizon in 0..1, near in 0..0.85`);
    if (!share(d.standing)) out.push(`depth standing ${d.standing} outside 0..0.85`);
    d.layers.forEach((l, i) => {
      poly(`depth layer ${i}`, l.mask, false);
      if (!(l.z >= 0 && l.z <= 0.85)) out.push(`depth layer ${i}: z ${l.z} outside 0..0.85`);
    });
  } else out.push("depth: kind is layers or map");
  (p.regions ?? []).forEach((r, i) => {
    if (!["water", "wet", "sky", "glass"].includes(r.kind)) out.push(`region ${i}: kind "${r.kind}"`);
    poly(`region ${i} (${r.kind})`, r.poly, false);
  });
  for (const [key, q] of Object.entries(p.spots ?? {})) {
    if (!Array.isArray(q) || q.length !== 4) out.push(`spot ${key}: four corners`);
    else if (!q.every((c) => c.length === 3 && unit(c[0]) && unit(c[1]) && unit(c[2]))) out.push(`spot ${key}: a corner outside the painting (u, v, depth in 0..1)`);
  }
  for (const key of Object.keys(def.focus)) if (!(key in (p.spots ?? {}))) out.push(`focus "${key}" has no spot`);
  if (!(p.drift && p.drift.amplitude >= 0 && p.drift.period > 0)) out.push("drift: amplitude ≥ 0 and period > 0");
  else if (driftTravel(p.drift) >= 0.01) out.push(`drift travels ${driftTravel(p.drift).toFixed(4)} of the distance in 10 s (under 0.01)`);
  (p.movers ?? []).forEach((m, i) => {
    if (!["trail", "boat", "beacon"].includes(m.kind)) out.push(`mover ${i}: kind "${m.kind}"`);
    if (!Array.isArray(m.path) || m.path.length < (m.kind === "beacon" ? 1 : 2)) out.push(`mover ${i}: path too short`);
    if (!(m.period >= 0) || (m.kind !== "beacon" && !(m.period > 0))) out.push(`mover ${i}: period`);
    if (m.kind === "beacon" && m.period > 0 && m.period < 2) out.push(`mover ${i}: a beacon swells over 2 s or more (never a blink)`);
    if (!(m.size > 0 && m.size < 0.05)) out.push(`mover ${i}: size ${m.size} outside 0..0.05`);
    if (!/^#[0-9a-f]{6}$/i.test(m.color)) out.push(`mover ${i}: colour "${m.color}" (#rrggbb)`);
  });
  return out;
}

export const scenes: Record<SceneId, SceneDef> = {
  lujiazui,
  longtang,
  towers,
  metro,
  "nanjing-road": nanjingRoad,
  bund,
};

// The order places are built ahead in, after the first arrival: the
// riverside first (every journey goes through it)
export const sceneOrder: SceneId[] = ["lujiazui", "towers", "metro", "longtang", "nanjing-road", "bund"];

// Where each section's sign stands on the riverside, in riverside
// coordinates: its middle, its size and the way it faces (toward the home
// view's eye). Read by Riverside.tsx (which builds the boards) and by the
// routes below, from each place's def.
export const RIVERSIDE_EYE: V3 = lujiazui.home.pos;
export type SignPlace = { x: number; y: number; z: number; w: number; h: number; ry: number };
export function signPlace(id: Exclude<SceneId, "lujiazui">): SignPlace {
  const s = scenes[id].sign!;
  const [ex, , ez] = RIVERSIDE_EYE;
  const a = (s.bearing * Math.PI) / 180;
  const x = ex + s.distance * Math.sin(a);
  const z = ez - s.distance * Math.cos(a);
  const w = 0.135 * s.distance;
  return { x, y: s.y, z, w, h: w * 0.34, ry: Math.atan2(ex - x, ez - z) };
}

// The camera's route from the riverside's home view toward each section's
// sign, in riverside coordinates, on a gentle arc (up a little, then down
// to the board's height five units short of it), and where it looks at
// the end: the board's middle. The threshold closes over its last part.
const route = (id: Exclude<SceneId, "lujiazui">): { path: V3[]; look: V3 } => {
  const p = signPlace(id);
  const [ex, ey, ez] = RIVERSIDE_EYE;
  const d = Math.hypot(p.x - ex, p.z - ez);
  const at = (k: number, y: number): V3 => [+(ex + (p.x - ex) * k).toFixed(2), +y.toFixed(2), +(ez + (p.z - ez) * k).toFixed(2)];
  return { path: [at(0.38, (ey + p.y) / 2 + 1.5), at((d - 5) / d, p.y - 0.3)], look: [+p.x.toFixed(2), p.y, +p.z.toFixed(2)] };
};
export const routesFromRiverside: Record<Exclude<SceneId, "lujiazui">, { path: V3[]; look: V3 }> = {
  longtang: route("longtang"),
  towers: route("towers"),
  metro: route("metro"),
  "nanjing-road": route("nanjing-road"),
  bund: route("bund"),
};

// Spot lights per place, fixed at build and the same by day and night
// (their intensity rises after dark). The riverside has none.
export const DISTRICT_LIGHTS: Record<SceneId, number> = {
  lujiazui: 0,
  longtang: 2,
  towers: 2,
  metro: 3,
  "nanjing-road": 3,
  bund: 4,
};

// Where the camera rests in a place: the focus pose chosen there (the
// store's `focus`: a screen, a line, the machine), or its home view when
// nothing is chosen or the key isn't the place's
export function restingPose(id: SceneId, focus: string | null): Pose {
  return (focus ? scenes[id].focus[focus] : undefined) ?? scenes[id].home;
}

// The camera's turn toward something chosen in a place, or back home: a
// short gentle arc through a point a little above the way between (8% of
// the distance, at most 0.6 units), eased, longer for a longer way
// (0.6 s .. 1.1 s). `from` is where the camera is now.
export function focusTravel(from: Pose, to: Pose): { mid: Pose; dur: number; distance: number } {
  const d = (a: V3, b: V3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  const half = (a: V3, b: V3): V3 => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
  const move = d(from.pos, to.pos);
  const distance = move + 0.25 * d(from.target, to.target);
  const pos = half(from.pos, to.pos);
  pos[1] += Math.min(0.6, 0.08 * move);
  return { mid: { pos, target: half(from.target, to.target) }, dur: Math.min(1.1, Math.max(0.6, 0.55 + 0.03 * distance)), distance };
}
