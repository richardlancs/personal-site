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
