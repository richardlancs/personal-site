"use client";

import { useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { interests } from "../../../data/portfolio";
import { anchors } from "../anchors";
import { createMachine } from "../arcade/arcadeMachine";
import { anchorKey, Hitbox, SceneLights, useMovers, type Mover, type SceneProps } from "../common";
import { box, merge } from "../kit/geometry";
import { buildJinMao, buildPearlTower, buildShanghaiTower, buildWorldFinancialCenter, type Landmark } from "../kit/landmarks";
import { glowSprites, litSurface, neonMaterial, SCENE_TONES, screenMaterial, type SceneTone } from "../kit/neon";
import { reflectIn, type LightStrip } from "../kit/reflection";
import { buildMarkSign, disposeSign, glowPoints } from "../kit/signs";
import { buildSkyDome } from "../kit/sky";
import { buildLampRow, glowMaterial } from "../kit/street";
import { surface } from "../kit/surface";
import { buildTowers, layoutTowers, type TowerSpec } from "../kit/towers";
import { buildStreetTrees } from "../kit/trees";
import { wetPaving } from "../kit/water";
import { windowMaterial } from "../kit/windows";
import { rng } from "../rng";
import type { V3 } from "../scenes";
import { useWorld, world } from "../store";
import { TIERS, type Quality } from "../tiers";
import def from "./nanjing-road.def";

// Interests: the pedestrian street of the two street paintings
// (app/assets/city/nanjing-road-day.webp, -night.webp), seen from the
// paving at eye height. One unit is ten metres; the street runs along -z.
//
//   left: old stone facades (the kit's beige and stepped stone towers,
//   their windows the shader's), a domed corner building further down, lit
//   shopfronts along their feet, and the nearest of them the arcade: an
//   open shopfront with the one machine standing in its door;
//   right: glass towers, their shopfronts lit too, and a parked tram on its
//   rails;
//   down both sides: trees in planters and lamps (the three nearest are
//   the place's spot lights after dark), and vertical neon blades and
//   boards, abstract (buildMarkSign: bars and dots, no words);
//   the far end: the city behind the roofs, the Pearl at the street's end
//   and the other three landmarks to its right;
//   underfoot: wet paving (planar on the high tier, the lights' streaks on
//   every tier, both only in the rain).
//
// The arcade machine (arcade/arcadeMachine.ts) is the one thing to use:
// every interest is a mode of it. Its screen is a Hitbox: a click plays
// the mode's one thing (what the panel's Play key does), and turns the
// camera to it. The panel's keys choose the mode (store: sel.interest) and
// count presses (arcadePress); the machine says how each turned out
// (arcadeStatus), read out by the panel. The screen animates as a mover
// (common.tsx: useMovers): parked in still view and while the place isn't
// showing, the canvas drawing every frame only while it's in view. Nothing
// else here moves: the tram is parked.

const XL = -1.3; // the left facades' fronts
const XR = 2.4; // the right facades' fronts
const FAR_Z = -62; // where the street's buildings end
const LAMP_L = -0.62;
const LAMP_R = 1.72;
const TREE_L = -0.86;
const TREE_R = 1.98;
const RAIL_X = 1.25;
const TRAM_Z = 2.6; // the tram's front, parked just down the street, right of the painting's middle

// The arcade: its building's length along the street, and the open
// shopfront in it (z), the room's depth and height
const ARCADE = { z0: 2.4, z1: 6.8, open0: 3.6, open1: 5.6, depth: 0.62, height: 0.44, band: 0.56 };
// The machine: where it stands in the door, how it's turned (toward the
// street and the camera), and its size (it's built in metres)
const MACHINE = { x: XL - 0.14, z: 4.5, ry: Math.PI / 2 - 0.55, scale: 0.1 * 1.9 };

// Lamps: the rows' z, left and right (from behind the camera); the two
// on the left by the arcade and the first right of the home view carry the
// place's three spot lights
const LAMPS_L = Array.from({ length: 40 }, (_, i) => 14.4 - i * 1.7).filter((z) => z > FAR_Z + 2);
const SPOT_L = 6; // z 4.2 and 2.5
// Kept clear: nothing stands between the home view, or the painting's
// view, and the machine (the left row's lamp at z 5.9, its trees by the
// arcade)
const CLEAR_L = { lamp: 5, trees: [2.8, 7.5] as const };
const SPOT_R = 6; // z 3.4
const LAMPS_R = Array.from({ length: 40 }, (_, i) => 13.6 - i * 1.7).filter((z) => z > FAR_Z + 2);

// The colours, from the plates
const PAVING = "#a49c90";
const STONE = "#cdbb9c";
const STONE_DARK = "#a8987c";
const FRAME = "#2a2d33";
const BODY = "#14161c"; // the cabinet: the interface's soft black, a little lifted
const FLOOD = "#ffb873"; // the warm light on the old stone after dark
const TRAM_GREEN = "#2f5a40";
const TRAM_CREAM = "#d6c9a2";

// A tone at a fraction of its strength
const dim = (tone: SceneTone, k: number) => `#${new THREE.Color(SCENE_TONES[tone]).multiplyScalar(k).getHexString()}`;

// The machine's canvases, read by its two faces' paint (their materials
// are shared and outlive a rebuild, so they read whichever machine is
// current)
const current: { screen: HTMLCanvasElement | null; marquee: HTMLCanvasElement | null } = { screen: null, marquee: null };
const copy = (from: () => HTMLCanvasElement | null) => (g: CanvasRenderingContext2D, w: number, h: number) => {
  const c = from();
  if (c) g.drawImage(c, 0, 0, w, h);
  else {
    g.fillStyle = "#08090c";
    g.fillRect(0, 0, w, h);
  }
};

const seconds = () => performance.now() / 1000;

type Built = {
  group: THREE.Group;
  spots: V3[];
  screen: { pos: THREE.Vector3; ry: number; size: [number, number, number] };
  machine: ReturnType<typeof createMachine>;
  repaint: () => void;
  movers: Mover[];
  attach: () => void;
  dispose: () => void;
};

function build(quality: Quality): Built {
  const group = new THREE.Group();
  group.name = "nanjing-road";
  const geometries: THREE.BufferGeometry[] = [];
  const disposers: (() => void)[] = [];
  const mobile = quality === "mobile";
  const add = <T extends THREE.Object3D>(o: T) => {
    group.add(o);
    return o;
  };
  const mesh = (geometry: THREE.BufferGeometry, material: THREE.Material, name = "") => {
    geometries.push(geometry);
    const m = new THREE.Mesh(geometry, material);
    m.name = name;
    return add(m);
  };
  const slab = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number) => box(x1 - x0, y1 - y0, z1 - z0).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  const lights: LightStrip[] = [];
  const glow: { pos: THREE.Vector3; color: string; size: number }[] = [];

  // ---- The sky
  const sky = add(buildSkyDome({ seed: 151, radius: 900 }));
  geometries.push(sky.geometry);

  // ---- The facades. Left: old stone, a row of buildings each 14 to 26 m
  // along the street, the arcade's the nearest (its ground floor is the
  // shopfront below, its upper floors a tower lifted onto it)
  const r = rng(1507);
  const left: TowerSpec[] = [];
  const shopsL: [number, number][] = [];
  // (behind the arcade, toward and past the camera: the street goes on)
  left.push({ x: XL - 0.7, z: 13.4, w: 1.4, d: 13, h: 3.2, ry: 0, style: 1, seed: 1998 });
  for (let z = ARCADE.z0 - 0.04; z > FAR_Z; ) {
    const d = r.range(1.4, 2.6);
    const w = 1.4;
    left.push({ x: XL - w / 2, z: z - d / 2, w, d: d - 0.04, h: r.range(2.2, 3.6) * (z < -30 ? 0.85 : 1), ry: 0, style: r() < 0.6 ? 1 : 3, seed: 2000 + left.length });
    shopsL.push([z - d + 0.2, z - 0.2]);
    z -= d;
  }
  const right: TowerSpec[] = [];
  const shopsR: [number, number][] = [];
  for (let z = 20; z > FAR_Z; ) {
    const d = r.range(1.8, 3.2);
    const w = 1.8;
    // tall near the camera (the round glass tower over the tram), lower
    // down the street so the landmarks show over them
    const near = z < 9 && z > 2;
    const h = near ? 9 : z > -12 ? r.range(4, 7) : r.range(2.2, 3.8);
    right.push({ x: XR + w / 2, z: z - d / 2, w, d: d - 0.05, h, ry: 0, style: near || r() < 0.35 ? 2 : 0, seed: 3000 + right.length });
    shopsR.push([z - d + 0.2, z - 0.2]);
    z -= d;
  }
  const arcadeUpper = buildTowers([{ x: XL - 0.7, z: (ARCADE.z0 + ARCADE.z1) / 2, w: 1.4, d: ARCADE.z1 - ARCADE.z0, h: 3.1, ry: 0, style: 1, seed: 1999 }], { far: false });
  for (const t of arcadeUpper) t.position.y = ARCADE.band;
  const nearTowers = [...buildTowers([...left, ...right], { far: false }), ...arcadeUpper];
  for (const t of nearTowers) {
    geometries.push(t.geometry);
    add(t);
  }

  // The domed corner building down the left side, as in the paintings: a
  // drum, a dome and a small lantern on its corner
  const domed = left.find((t) => t.z < -9) ?? left[left.length - 1];
  {
    const cx = domed.x;
    const cz = domed.z + domed.d * 0.25;
    const y = domed.h;
    mesh(
      merge([
        new THREE.CylinderGeometry(0.36, 0.38, 0.5, 16).translate(cx, y + 0.25, cz),
        new THREE.CylinderGeometry(0.4, 0.4, 0.05, 16).translate(cx, y + 0.52, cz),
        new THREE.SphereGeometry(0.33, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2).translate(cx, y + 0.54, cz),
        new THREE.CylinderGeometry(0.07, 0.08, 0.2, 8).translate(cx, y + 0.95, cz),
        new THREE.ConeGeometry(0.06, 0.16, 8).translate(cx, y + 1.13, cz),
      ]),
      surface({ color: STONE, grime: 0.2 }),
      "dome",
    );
  }

  // ---- The arcade's shopfront: stone piers and a band over the open
  // front, the room behind (its back wall and ceiling lit warm after dark)
  const A = ARCADE;
  mesh(
    merge([
      slab(XL - 1.4, XL, 0, A.band, A.open1, A.z1),
      slab(XL - 1.4, XL, 0, A.band, A.z0, A.open0),
      slab(XL - 1.4, XL, A.height, A.band, A.open0, A.open1),
      // a cornice over the ground floor, standing out a little
      slab(XL - 0.02, XL + 0.04, A.band - 0.03, A.band, A.z0, A.z1),
      // the room's back wall and floor
      slab(XL - 1.4, XL - A.depth, 0, A.height, A.open0, A.open1),
    ]),
    // (floodlit after dark, warm, as the plates' old fronts)
    litSurface({ color: STONE, tone: FLOOD, strength: 0.32 }),
    "arcade:front",
  );
  mesh(merge([slab(XL - A.depth, XL - 0.01, 0, 0.004, A.open0, A.open1)]), surface({ color: "#6a5f52" }), "arcade:floor");
  mesh(
    merge([slab(XL - A.depth, XL - A.depth + 0.01, 0.004, A.height, A.open0, A.open1), slab(XL - A.depth, XL, A.height - 0.01, A.height, A.open0, A.open1)]),
    glowMaterial({ day: "#4d4740", night: "#c58f55" }),
    "arcade:room",
  );
  // the door's frame: posts at the opening's ends and a transom
  mesh(
    merge([slab(XL - 0.03, XL + 0.01, 0, A.height, A.open0, A.open0 + 0.04), slab(XL - 0.03, XL + 0.01, 0, A.height, A.open1 - 0.04, A.open1), slab(XL - 0.03, XL + 0.01, A.height - 0.1, A.height - 0.08, A.open0, A.open1)]),
    surface({ color: FRAME }),
    "arcade:frame",
  );
  // a light in its ceiling
  mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.01, 12).translate(XL - A.depth / 2, A.height - 0.012, (A.open0 + A.open1) / 2), glowMaterial({ day: "#d8d2c4", night: "#ffd49a" }), "arcade:light");
  lights.push({ x: XL - 0.05, z: (A.open0 + A.open1) / 2, w: 0.5, color: "#ffc98a", height: 0.3 });

  // ---- The machine
  const machine = createMachine(interests);
  current.screen = machine.canvas;
  current.marquee = machine.marqueeCanvas;
  const screenFace = screenMaterial(
    copy(() => current.screen),
    { w: 512, h: 400, key: "nanjing-road:arcade:screen" },
  );
  const marqueeFace = screenMaterial(
    copy(() => current.marquee),
    { w: 512, h: 112, key: "nanjing-road:arcade:marquee", glow: 1.4 },
  );
  const repaint = () => {
    (screenFace.userData.redraw as () => void)();
    (marqueeFace.userData.redraw as () => void)();
  };
  const cab = new THREE.Group();
  cab.name = "arcade:machine";
  const part = (g: THREE.BufferGeometry, m: THREE.Material, name: string) => {
    geometries.push(g);
    const o = new THREE.Mesh(g, m);
    o.name = name;
    cab.add(o);
    return o;
  };
  // (in metres, before the group's scale): the stand, the control deck,
  // the screen's housing, the marquee's box
  part(
    merge([
      box(0.7, 0.9, 0.66).translate(0, 0.45, 0),
      box(0.74, 0.07, 0.34).rotateX(0.28).translate(0, 0.94, 0.24),
      box(0.7, 0.9, 0.5).translate(0, 1.42, -0.06),
      box(0.74, 0.22, 0.6).translate(0, 1.98, -0.02),
    ]),
    surface({ color: BODY }),
    "arcade:body",
  );
  // the lit edges up its front, and the buttons, in the street's tones
  part(merge([box(0.025, 1.12, 0.025).translate(-0.36, 1.43, 0.2), box(0.025, 1.12, 0.025).translate(0.36, 1.43, 0.2)]), neonMaterial(dim("cyan", 0.55), { dayColor: SCENE_TONES.cyan }), "arcade:edge");
  part(
    merge([new THREE.CylinderGeometry(0.03, 0.03, 0.03, 10).translate(0.12, 0.99, 0.25), new THREE.CylinderGeometry(0.03, 0.03, 0.03, 10).translate(0.22, 0.99, 0.25), new THREE.CylinderGeometry(0.012, 0.012, 0.09, 6).translate(-0.18, 1.02, 0.25)]),
    neonMaterial(dim("rose", 0.6), { dayColor: SCENE_TONES.rose }),
    "arcade:buttons",
  );
  const screen = part(new THREE.PlaneGeometry(0.56, 0.4375), screenFace, "arcade:screen");
  screen.position.set(0, 1.42, 0.192);
  const marquee = part(new THREE.PlaneGeometry(0.64, 0.14), marqueeFace, "arcade:marquee");
  marquee.position.set(0, 1.98, 0.282);
  cab.scale.setScalar(MACHINE.scale);
  cab.position.set(MACHINE.x, 0.004, MACHINE.z);
  cab.rotation.y = MACHINE.ry;
  add(cab);
  cab.updateMatrixWorld(true);
  const screenPos = screen.getWorldPosition(new THREE.Vector3());
  glow.push({ pos: screenPos.clone(), color: SCENE_TONES.cyan, size: 0.08 });

  // ---- Shopfronts along the facades' feet, lit warm after dark
  const shopGlass = glowMaterial({ day: "#33414b", night: "#eab36c" });
  const shopParts: THREE.BufferGeometry[] = [];
  const shopFrames: THREE.BufferGeometry[] = [];
  for (const [z0, z1] of shopsL) {
    shopParts.push(slab(XL, XL + 0.006, 0.02, 0.36, z0, z1));
    shopFrames.push(slab(XL, XL + 0.02, 0.36, 0.42, z0 - 0.06, z1 + 0.06));
    lights.push({ x: XL + 0.03, z: (z0 + z1) / 2, w: 0.35, color: "#ffc98a", height: 0.2 });
  }
  for (const [z0, z1] of shopsR) {
    shopParts.push(slab(XR - 0.006, XR, 0.02, 0.4, z0, z1));
    shopFrames.push(slab(XR - 0.02, XR, 0.4, 0.46, z0 - 0.06, z1 + 0.06));
    lights.push({ x: XR - 0.03, z: (z0 + z1) / 2, w: 0.4, color: "#ffd9a0", height: 0.22 });
  }
  mesh(merge(shopParts), shopGlass, "shops");
  mesh(merge(shopFrames), litSurface({ color: STONE_DARK, tone: FLOOD, strength: 0.28 }), "shops:frames");
  // A floodlit band along the old fronts over their shops (a cornice,
  // standing out a little), warm after dark like the plates' facades
  mesh(merge(left.map((t) => slab(XL, XL + 0.025, 0.42, 0.52, t.z - t.d / 2, t.z + t.d / 2))), litSurface({ color: STONE, tone: FLOOD, strength: 0.3 }), "cornice");

  // ---- Neon: blades out from the walls and boards flat on them, abstract
  // (bars and dots, no words), in the plates' pink, cyan and gold
  const blade = (seed: number, tone: SceneTone, side: -1 | 1, z: number, y: number, w: number, h: number) => {
    const s = buildMarkSign({ seed, tone, w, h, kind: "blade" });
    // the arms reach -x: toward the left wall as built, turned for the right
    const out = 0.08 + 0.3 + w / 2;
    s.position.set(side < 0 ? XL + out : XR - out, y, z);
    s.rotation.y = side < 0 ? 0 : Math.PI;
    add(s);
    disposers.push(() => disposeSign(s));
    lights.push({ x: side < 0 ? XL + out : XR - out, z, w: w * 0.8, color: SCENE_TONES[tone], height: y });
  };
  const board = (seed: number, tone: SceneTone, side: -1 | 1, z: number, y: number, w: number, h: number) => {
    const s = buildMarkSign({ seed, tone, w, h, kind: "board" });
    s.position.set(side < 0 ? XL + 0.07 : XR - 0.07, y, z);
    s.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2;
    add(s);
    disposers.push(() => disposeSign(s));
    lights.push({ x: side < 0 ? XL + 0.1 : XR - 0.1, z, w: 0.25, color: SCENE_TONES[tone], height: y });
  };
  // the arcade's board over its open front, cyan as in the plates
  board(401, "cyan", -1, (A.open0 + A.open1) / 2, A.height + 0.17, 1.7, 0.15);
  blade(402, "rose", -1, 1.6, 1.15, 0.2, 0.62);
  board(403, "gold", -1, -0.2, 0.52, 1.2, 0.16);
  blade(404, "cyan", -1, -4.6, 0.95, 0.16, 0.34);
  blade(405, "rose", -1, -9.5, 1.05, 0.16, 0.5);
  blade(406, "gold", -1, -14.5, 0.9, 0.14, 0.4);
  blade(407, "rose", -1, -21, 1.0, 0.14, 0.46);
  blade(408, "cyan", -1, -29, 0.8, 0.14, 0.36);
  blade(409, "rose", 1, 4.4, 2.4, 0.26, 0.8);
  blade(410, "gold", 1, -6.5, 1.1, 0.16, 0.5);
  blade(411, "rose", 1, -11, 1.25, 0.16, 0.56);
  blade(412, "gold", 1, -17, 1.0, 0.14, 0.42);
  board(413, "gold", 1, 0.8, 0.62, 1.6, 0.2);

  // ---- The ground: the paving between the facades (planar in the
  // puddles on the high tier), the tram's rails
  const length = 22 - FAR_Z;
  const paving = wetPaving({
    w: XR - XL + 0.2,
    d: length,
    x: (XL + XR) / 2,
    z: 22 - length / 2,
    y: 0,
    mode: TIERS[quality].reflection,
    color: PAVING,
    lights: [...lights, ...LAMPS_L.map((z) => ({ x: LAMP_L + 0.1, z, w: 0.14, color: "#ffc98a", height: 0.6 })), ...LAMPS_R.map((z) => ({ x: LAMP_R - 0.1, z, w: 0.14, color: "#ffc98a", height: 0.6 }))],
    size: TIERS[quality].reflectionSize || undefined,
  });
  add(paving.mesh);
  disposers.push(paving.dispose);
  // the street goes on past its buildings, plainer, to the city behind
  mesh(slab(-60, 80, -0.02, -0.005, -260, FAR_Z + 0.5), surface({ color: "#6f6b66", fogScale: 1.2 }), "ground:far");
  mesh(
    merge([-0.07, 0.07].map((dx) => slab(RAIL_X + dx - 0.006, RAIL_X + dx + 0.006, 0, 0.006, FAR_Z, 22))),
    surface({ color: "#3a3c40" }),
    "rails",
  );

  // ---- Lamps down both sides; the first two on the left and the first on
  // the right carry the spot lights
  const spotLamps = buildLampRow(
    [
      { x: LAMP_L, z: LAMPS_L[SPOT_L] },
      { x: LAMP_L, z: LAMPS_L[SPOT_L + 1] },
      { x: LAMP_R, z: LAMPS_R[SPOT_R], ry: Math.PI },
    ],
    { light: "spot" },
  );
  const lamps = buildLampRow([
    ...LAMPS_L.filter((_, i) => i !== SPOT_L && i !== SPOT_L + 1 && i !== CLEAR_L.lamp).map((z) => ({ x: LAMP_L, z })),
    ...LAMPS_R.filter((_, i) => i !== SPOT_R).map((z) => ({ x: LAMP_R, z, ry: Math.PI })),
  ]);
  for (const row of [spotLamps, lamps]) {
    row.meshes.forEach((m) => add(m));
    disposers.push(row.dispose);
    for (const h of row.heads.slice(0, 12)) glow.push({ pos: h.clone(), color: "#ffc98a", size: 0.1 });
  }
  const spots = spotLamps.heads.map((h) => [h.x, h.y - 0.02, h.z] as V3);

  // ---- Trees in planters between the lamps
  const treeSpots = [...LAMPS_L.map((z) => ({ x: TREE_L, z: z - 0.85, s: 0.95 })).filter((t) => t.z < CLEAR_L.trees[0] || t.z > CLEAR_L.trees[1]), ...LAMPS_R.map((z) => ({ x: TREE_R, z: z - 0.85, s: 1.0 }))].filter((t) => t.z > FAR_Z + 1);
  const trees = buildStreetTrees(1531, treeSpots);
  for (const t of trees) {
    geometries.push(t.geometry);
    add(t);
  }
  mesh(
    merge(treeSpots.filter((_, i) => i % 2 === 0).map((t) => box(0.2, 0.07, 0.14).translate(t.x, 0.035, t.z + 0.35))),
    surface({ color: "#7a5b3e", grime: 0.3 }),
    "planters",
  );

  // ---- The tram, parked on its rails: two green cars with a cream band,
  // its windows lit after dark, its headlamp gold
  const tram = new THREE.Group();
  tram.name = "tram";
  {
    const green: THREE.BufferGeometry[] = [];
    const cream: THREE.BufferGeometry[] = [];
    const roof: THREE.BufferGeometry[] = [];
    const panes: THREE.BufferGeometry[] = [];
    const L = 1.1;
    for (const z0 of [0, -(L + 0.05)]) {
      const zc = z0 - L / 2;
      green.push(box(0.24, 0.13, L).translate(0, 0.105, zc), box(0.24, 0.035, L).translate(0, 0.31, zc));
      cream.push(box(0.246, 0.014, L + 0.004).translate(0, 0.177, zc), box(0.2, 0.02, L * 0.96).translate(0, 0.338, zc));
      roof.push(box(0.17, 0.02, L * 0.9).translate(0, 0.357, zc), box(0.26, 0.012, L + 0.02).translate(0, 0.332, zc));
      panes.push(box(0.244, 0.1, L * 0.94).translate(0, 0.235, zc), box(0.2, 0.1, 0.004).translate(0, 0.235, z0 + 0.001));
    }
    // the trolley pole
    roof.push(box(0.01, 0.01, 0.5).rotateX(-0.5).translate(0, 0.43, -0.6));
    const tramMesh = (parts: THREE.BufferGeometry[], m: THREE.Material, name: string) => {
      const g = merge(parts);
      geometries.push(g);
      const o = new THREE.Mesh(g, m);
      o.name = name;
      tram.add(o);
    };
    tramMesh(green, surface({ color: TRAM_GREEN, grime: 0.25 }), "tram:body");
    tramMesh(cream, surface({ color: TRAM_CREAM }), "tram:band");
    tramMesh(roof, surface({ color: "#2b2f33" }), "tram:roof");
    tramMesh(panes, glowMaterial({ day: "#26343a", night: "#f2c27a" }), "tram:windows");
    tramMesh([new THREE.CylinderGeometry(0.025, 0.025, 0.01, 12).rotateX(Math.PI / 2).translate(0, 0.12, 0.006)], neonMaterial(dim("gold", 0.6), { dayColor: "#e9dcb0" }), "tram:lamp");
    tram.position.set(RAIL_X, 0.01, TRAM_Z);
    add(tram);
    lights.push({ x: RAIL_X, z: TRAM_Z, w: 0.2, color: SCENE_TONES.gold, height: 0.12 });
    glow.push({ pos: new THREE.Vector3(RAIL_X, 0.13, TRAM_Z + 0.02), color: SCENE_TONES.gold, size: 0.12 });
  }

  // ---- The city behind the roofs, and the four landmarks at the street's
  // end: the Pearl just left of it, the others to its right, as painted
  const lm: [(d: "near" | "far", m: { body: THREE.Material; glass: THREE.Material; lit: THREE.Material }) => Landmark, number, number, { body: THREE.Material; glass: THREE.Material; lit: THREE.Material }][] = [
    [buildPearlTower, -2.1, -135, { body: litSurface({ color: "#d6ccc8", tone: "rose", strength: 0.22 }), glass: windowMaterial({ base: "#bfb2ad", glass: "#8a6f88", fogScale: 1.1 }), lit: litSurface({ color: "#b4728f", tone: "rose", strength: 1.1 }) }],
    [buildWorldFinancialCenter, 15, -200, { body: surface({ color: "#7a93ad", fogScale: 1.1 }), glass: windowMaterial({ base: "#5f7a95", glass: "#86aacb", fogScale: 1.1 }), lit: litSurface({ color: "#a7bfd4", tone: "cyan", strength: 1.05 }) }],
    [buildJinMao, 18.5, -180, { body: surface({ color: "#a69a83", fogScale: 1.1 }), glass: windowMaterial({ base: "#7a705f", glass: "#45607b", fogScale: 1.1 }), lit: litSurface({ color: "#b9ab8e", tone: "gold", strength: 0.95 }) }],
    [buildShanghaiTower, 33, -220, { body: surface({ color: "#86a0b8", fogScale: 1.1 }), glass: windowMaterial({ base: "#6b88a4", glass: "#8db3d3", fogScale: 1.1 }), lit: litSurface({ color: "#a9c0d4", tone: "gold", strength: 1.0 }) }],
  ];
  const landmarks: THREE.Group[] = [];
  for (const [make, x, z, m] of lm) {
    const l = make("far", m);
    l.group.position.set(x, 0, z);
    l.group.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) geometries.push((o as THREE.Mesh).geometry);
    });
    add(l.group);
    landmarks.push(l.group);
  }
  const skyline = layoutTowers(
    1553,
    { x0: -45, x1: 60, z0: -240, z1: FAR_Z - 8 },
    mobile ? 60 : 110,
    [2, 16],
    [...lm.map(([, x, z]) => ({ x, z, r: 5 })), { x: -1.2, z: -100, r: 5 }],
  );
  const farTowers = buildTowers(skyline, { far: true, fogScale: 1.4 });
  for (const t of farTowers) {
    geometries.push(t.geometry);
    add(t);
  }

  // ---- What the planar paving reflects (high tier)
  if (TIERS[quality].reflection === "planar") reflectIn(sky, ...nearTowers, ...landmarks, cab, tram, ...group.children.filter((o) => o.name.startsWith("mark:") || o.name === "shops" || o.name.startsWith("arcade:")), ...spotLamps.meshes, ...lamps.meshes);

  // ---- The mobile tier has no bloom: soft glow sprites stand in for it
  if (mobile) {
    const sprites = glowSprites([...glowPoints(group), ...glow]);
    add(sprites);
    geometries.push(sprites.geometry);
    disposers.push(() => sprites.dispose());
  }

  // ---- The machine's screen, as a mover: it plays at 12 frames a second
  // while it's on and the place is showing; parked, it holds a frame
  let last = -Infinity;
  const on = () => world.get().arrived;
  const screenMover: Mover = {
    object: cab,
    update(t) {
      if (t - last < 1 / 12 && t >= last) return;
      last = t;
      machine.draw(t, on(), false);
      repaint();
    },
    park() {
      machine.draw(seconds(), on(), true);
      repaint();
    },
  };

  return {
    group,
    spots,
    screen: { pos: screenPos, ry: MACHINE.ry, size: [0.56 * MACHINE.scale * 1.2, 0.44 * MACHINE.scale * 1.3, 0.12 * MACHINE.scale] },
    machine,
    repaint,
    movers: [screenMover],
    attach: () => {
      if (!paving.mesh.parent) group.add(paving.mesh);
      current.screen = machine.canvas;
      current.marquee = machine.marqueeCanvas;
    },
    dispose: () => {
      geometries.forEach((g) => g.dispose());
      disposers.forEach((d) => d());
      machine.tex.dispose();
      machine.marquee.dispose();
      if (current.screen === machine.canvas) current.screen = current.marquee = null;
    },
  };
}

function InterestsScene({ quality, active, still }: SceneProps) {
  const built = useMemo(() => build(quality), [quality]);
  useEffect(() => {
    // (attach: development runs this effect twice, StrictMode reaching the
    // canvas, and the cleanup between takes the paving off; disposed
    // geometry is uploaded again when it's next drawn)
    built.attach();
    anchors.set(anchorKey("nanjing-road", "machine"), built.screen.pos.clone().add(new THREE.Vector3(...def.offset)));
    return () => {
      anchors.delete(anchorKey("nanjing-road", "machine"));
      built.dispose();
    };
  }, [built]);
  const invalidate = useThree((s) => s.invalidate);
  const interest = useWorld((s) => s.sel.interest);
  const arrived = useWorld((s) => s.arrived);
  const press = useWorld((s) => s.arcadePress);
  const on = active && arrived;
  useMovers(built.movers, { active: on, still });

  // A mode chosen (a key in the panel, or the idle cycle there): the
  // machine boots into it (in still view it cuts); off until arrival
  useEffect(() => {
    const m = built.machine;
    if (on && m.mode() !== interest) m.setMode(interest, seconds(), still);
    m.draw(seconds(), on, true);
    built.repaint();
    invalidate();
  }, [built, on, interest, still, invalidate]);

  // The panel's Play key: the mode's one thing, as a click on the screen
  const seen = useRef(press);
  const play = () => {
    const t = seconds();
    const s = world.get().still;
    const status = built.machine.press(null, t, s);
    if (status) world.set({ arcadeStatus: status });
    if (s) {
      built.machine.draw(t, true, true);
      built.repaint();
    }
    invalidate();
  };
  useEffect(() => {
    if (press === seen.current) return;
    seen.current = press;
    if (on) play();
    // (play reads the store and the built machine; it changes with them)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [press, on]);

  return (
    <>
      <primitive object={built.group} />
      <SceneLights id="nanjing-road" spots={built.spots} distance={6} angle={0.75} />
      <Hitbox
        id="nanjing-road:machine"
        position={[built.screen.pos.x, built.screen.pos.y, built.screen.pos.z]}
        rotation={built.screen.ry}
        size={built.screen.size}
        enabled={() => on}
        onSelect={() => {
          world.set({ focus: "machine" });
          play();
        }}
      />
    </>
  );
}

export default InterestsScene;
