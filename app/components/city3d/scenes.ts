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

export type SceneDef = {
  offset: V3;
  home: Pose;
  // Where the camera is when it steps into the place, and where it backs
  // out to when leaving
  enter: Pose;
  exit: Pose;
  focus: Record<string, Pose>;
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
  portrait?: { yaw: number; half: number };
  // On a short landscape screen (a phone on its side), at the home view:
  // how many degrees under where the camera looks the place's fronts are,
  // lifted to the middle of the strip between the bar and the sheet
  short?: number;
  // The colour the view passes through between places
  threshold: string;
  fog: { color: string } & FogBase;
  background: string;
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

// The camera's route from the riverside's home view toward each section's
// sign, in riverside coordinates, on a gentle arc, and where it looks at
// the end. The threshold closes over its last part.
export const routesFromRiverside: Record<Exclude<SceneId, "lujiazui">, { path: V3[]; look: V3 }> = {
  longtang: { path: [[-2.9, 4, 1], [-6.5, 3, -10]], look: [-8.03, 3.2, -14.73] },
  metro: { path: [[-2.6, 4.9, -6.4], [-5.8, 5, -26.5]], look: [-6.57, 5.4, -31.48] },
  towers: { path: [[0.5, 5.9, -16.5], [1, 7.2, -49]], look: [1.12, 7.6, -53.99] },
  "nanjing-road": { path: [[2, 4.5, -2], [4.5, 4, -16.6]], look: [5.28, 4.4, -21.56] },
  bund: { path: [[2.6, 5.1, 1.9], [5.9, 5.5, -8.1]], look: [7.42, 6.4, -12.83] },
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
