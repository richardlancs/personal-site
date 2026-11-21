"use client";

import { useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { interests } from "../../../data/portfolio";
import { anchors } from "../anchors";
import { createMachine } from "../arcade/arcadeMachine";
import { useDayShade, useDisposeOnUnmount, useGlowPools, anchorKey, Hitbox, SceneLights, useMovers, type Mover, type SceneProps } from "../common";
import { box, merge } from "../kit/geometry";
import { buildJinMao, buildPearlTower, buildShanghaiTower, buildWorldFinancialCenter, type Landmark } from "../kit/landmarks";
import { glowSprites, litSurface, neonMaterial, SCENE_TONES, screenMaterial, type SceneTone } from "../kit/neon";
import { reflectIn, type LightStrip } from "../kit/reflection";
import { buildPanels, disposeSign, glowPoints, type PanelSpec } from "../kit/signs";
import { buildSkyDome } from "../kit/sky";
import { buildLampRow, glowMaterial } from "../kit/street";
import { surface } from "../kit/surface";
import { glassMaterial } from "../kit/glass";
import { buildTowers, layoutTowers, type TowerSpec } from "../kit/towers";
import { pavingTexture } from "../kit/textures";
import { buildPlanters, buildStreetTrees } from "../kit/trees";
import { wetPaving } from "../kit/water";
import type { DayShade, GlowPool } from "../kit/glow";
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
const GROUND = 0.5; // the shops' storey; the floors over it
const FLOOR = 0.36; // a storey (the carving's cornices, the windows)
const BAY = 0.34; // a window bay (the carving's pilasters)
const RECESS = 0.12; // how far the shop fronts stand back of the facades
const FAR_Z = -62; // where the street's buildings end
const LAMP_L = -0.62;
const LAMP_R = 1.72;
const TREE_L = -0.86;
const TREE_R = 1.98;
const RAIL_X = 1.25;
const TRAM_Z = 4.0; // the tram's front, parked just down the street, right of the painting's middle

// The arcade: its building's length along the street, and the open
// shopfront in it (z), the room's depth and height, the glazing's transom,
// the open door (z) the machine stands in, and the board's middle
const ARCADE = { z0: 2.4, z1: 6.8, open0: 3.6, open1: 5.6, depth: 0.62, room: 0.5, transom: 0.42, door: [4.15, 5.25] as const, board: 0.655, band: 0.56 };
// The arched window over its door, as painted: from over the board up to
// a round head
const ARCH = { z0: 3.62, z1: 5.58, y0: 0.75, spring: 0.86, top: 1.2 };
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
const PAVING = "#ddd2c0";
const STONE = "#d8ccb6";
const FRAME = "#2a2d33";
const BODY = "#14161c"; // the cabinet: the interface's soft black, a little lifted
const FLOOD = "#ffb873"; // the warm light on the old stone after dark, from the foot
const STEEL = "#8c99a6"; // the right side's frames and spandrels
const TRAM_GREEN = "#2f5a40";
const TRAM_CREAM = "#d6c9a2";

// The old stone after dark: floodlit from the foot, softer up the walls,
// so the lit windows and the shops carry the warmth (the plates')
const FLOODLIT = { tone: "#f6c994", strength: 0.26, base: 0.15, fade: 1.8 };
// The plates' trees: bright yellow-green, leafy, lit warm from below
const TREES = { greens: ["#9cbb48", "#87ad3e", "#b0c85a", "#7aa23c"], underGlow: { tone: "#ffc070", strength: 0.8 }, leaves: 0.6 };

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
  pools: GlowPool[];
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
  // along the street, the arcade's the nearest; right: glass and steel.
  // Each is a block of the kit's surface (the left's carved: pilasters, a
  // cornice at every floor, window surrounds, floodlit warm after dark),
  // its ground floor set back behind glazed, lit shopfronts, its windows
  // panes of glow (lit by floors after dark, dark glass by day)
  const r = rng(1507);
  const left: TowerSpec[] = [];
  const shopsL: [number, number][] = [];
  // (behind the arcade, toward and past the camera: the street goes on)
  left.push({ x: XL - 0.7, z: 13.4, w: 1.4, d: 13, h: 3.6, ry: 0, style: 1, seed: 1998 });
  for (let z = ARCADE.z0 - 0.04; z > FAR_Z; ) {
    const d = r.range(1.4, 2.6);
    const w = 1.4;
    left.push({ x: XL - w / 2, z: z - d / 2, w, d: d - 0.04, h: r.range(3.0, 4.2) * (z < -30 ? 0.85 : 1), ry: 0, style: 1, seed: 2000 + left.length });
    shopsL.push([z - d + 0.12, z - 0.12]);
    z -= d;
  }
  const right: TowerSpec[] = [];
  const shopsR: [number, number][] = [];
  for (let z = 20; z > FAR_Z; ) {
    const d = r.range(1.8, 3.2);
    const w = 1.8;
    // tall near the camera, lower down the street so the landmarks show
    // over them
    const h = z > 2 ? r.range(5.5, 7) : z > -12 ? r.range(3.6, 5.5) : r.range(2.4, 3.8);
    right.push({ x: XR + w / 2, z: z - d / 2, w, d: d - 0.05, h, ry: 0, style: 0, seed: 3000 + right.length });
    shopsR.push([z - d + 0.15, z - 0.15]);
    z -= d;
  }
  // the arcade's building: its upper floors over the open shopfront
  const arcadeBlock: TowerSpec = { x: XL - 0.7, z: (ARCADE.z0 + ARCADE.z1) / 2, w: 1.4, d: ARCADE.z1 - ARCADE.z0, h: 3.8, ry: 0, style: 1, seed: 1999 };
  // the round glass tower down the right side (as painted, past the tram)
  const roundAt = right.findIndex((t) => t.z < -2.5);
  const round = right[roundAt];
  // (the domed corner building, taller than its row)
  const domed = left.find((t) => t.z < -6) ?? left[left.length - 1];
  domed.h = 4.4;
  const stoneParts: THREE.BufferGeometry[] = [];
  const steelParts: THREE.BufferGeometry[] = [];
  const litPanes: THREE.BufferGeometry[] = [];
  const darkPanes: THREE.BufferGeometry[] = [];
  const ribbonLit: THREE.BufferGeometry[] = [];
  const ribbonDark: THREE.BufferGeometry[] = [];
  const wr = rng(1511);
  // a pane facing the street: +x on the left, -x on the right
  const pane = (side: -1 | 1, x: number, y0: number, y1: number, z0: number, z1: number) =>
    new THREE.PlaneGeometry(z1 - z0, y1 - y0).rotateY(side < 0 ? Math.PI / 2 : -Math.PI / 2).translate(x, (y0 + y1) / 2, (z0 + z1) / 2);
  // a round-headed pane facing +x (the left facades): a half disc on [z0, z1] springing at y
  const paneHead = (x: number, y: number, z0: number, z1: number) =>
    new THREE.CircleGeometry((z1 - z0) / 2, 12, 0, Math.PI).rotateY(Math.PI / 2).translate(x, y, (z0 + z1) / 2);
  // The carving as geometry, where it is near enough to show (the desktop
  // tiers, the nearer 40 units of the street): pilasters between the bays,
  // a sill course under every floor's windows, a hood over each window and
  // its jambs either side, so the windows sit in the wall; the first floor
  // over the shops round-headed and taller. Mobile keeps the shader's relief
  // and the courses only.
  const carved = !mobile;
  const NEAR_Z = -40;
  for (const t of [arcadeBlock, ...left]) {
    const z0 = t.z - t.d / 2;
    const z1 = t.z + t.d / 2;
    const back = XL - t.w;
    const arcade = t === arcadeBlock;
    const near = carved && z1 > NEAR_Z;
    // the ground floor (set back behind the shop glass; the arcade's is its own), the floors over it
    if (!arcade)
      stoneParts.push(
        slab(back, XL - RECESS, 0, GROUND, z0, z1),
        // rusticated piers at the shopfront's ends, standing a little proud
        slab(XL - RECESS, XL + 0.02, 0, GROUND - 0.02, z0, z0 + 0.1),
        slab(XL - RECESS, XL + 0.02, 0, GROUND - 0.02, z1 - 0.1, z1),
      );
    stoneParts.push(
      slab(back, XL, arcade ? ARCADE.band : GROUND, t.h, z0, z1),
      // a deep cornice over the shops (the arcade has its own), a frieze and a
      // heavy cornice at the roof, and an attic set back
      slab(XL, XL + (arcade ? 0 : 0.05), GROUND - 0.02, GROUND + 0.035, z0, z1),
      slab(XL, XL + 0.085, t.h - 0.05, t.h, z0 - 0.02, z1 + 0.02),
      slab(XL, XL + 0.05, t.h - 0.075, t.h - 0.05, z0, z1),
      slab(XL, XL + 0.02, t.h - 0.15, t.h - 0.11, z0, z1),
      slab(back + 0.1, XL - 0.18, t.h, t.h + 0.22, z0 + 0.12, z1 - 0.12),
    );
    const f0 = Math.ceil((GROUND + 0.1) / FLOOR - 0.37);
    // pilasters between the bays, every other bay, with a capital
    if (near)
      for (let k = Math.ceil(z0 / BAY + 0.1); k * BAY < z1 - 0.05; k += 2) {
        const z = k * BAY;
        stoneParts.push(slab(XL, XL + 0.022, GROUND + 0.035, t.h - 0.15, z - 0.032, z + 0.032), slab(XL, XL + 0.034, t.h - 0.19, t.h - 0.15, z - 0.042, z + 0.042));
      }
    // its windows, in the carving's recesses, lit by floors after dark
    for (let f = f0; (f + 0.75) * FLOOR < t.h - 0.1; f++) {
      if ((f + 0.37) * FLOOR < GROUND + 0.06) continue;
      const share = wr() < 0.6 ? 0.85 : 0.3;
      const first = f === f0;
      // a sill course along the floor (all tiers: cheap)
      if (!arcade || (f + 0.37) * FLOOR > ARCH.top + 0.04) stoneParts.push(slab(XL, XL + 0.026, (f + 0.32) * FLOOR, (f + 0.355) * FLOOR, z0, z1));
      for (let k = Math.ceil(z0 / BAY + 0.1); (k + 1) * BAY < z1 - 0.05; k++) {
        // (over the arcade's door, its arched window instead)
        if (arcade && (f + 0.37) * FLOOR < ARCH.top + 0.04 && (k + 0.7) * BAY > ARCH.z0 - 0.3 && (k + 0.3) * BAY < ARCH.z1 + 0.3) continue;
        const a = (k + 0.3) * BAY;
        const b = (k + 0.7) * BAY;
        const y0 = (f + 0.37) * FLOOR;
        const y1 = (f + (first ? 0.78 : 0.73)) * FLOOR;
        const lit = wr() < share;
        const panes = lit ? litPanes : darkPanes;
        panes.push(pane(-1, XL + 0.003, y0, y1, a, b));
        if (first) panes.push(paneHead(XL + 0.003, y1, a, b));
        if (!near) continue;
        const top = first ? y1 + (b - a) / 2 : y1;
        // jambs, and a hood (a keystone on the round heads)
        stoneParts.push(slab(XL, XL + 0.014, y0 - 0.005, top, a - 0.018, a), slab(XL, XL + 0.014, y0 - 0.005, top, b, b + 0.018));
        stoneParts.push(first ? slab(XL, XL + 0.02, top - 0.012, top + 0.022, (a + b) / 2 - 0.014, (a + b) / 2 + 0.014) : slab(XL, XL + 0.03, top, top + 0.022, a - 0.028, b + 0.028));
      }
    }
  }
  for (const t of right) {
    if (t === round) continue;
    const z0 = t.z - t.d / 2;
    const z1 = t.z + t.d / 2;
    const back = XR + t.w;
    const near = carved && z1 > NEAR_Z;
    steelParts.push(slab(XR + RECESS, back, 0, GROUND, z0, z1), slab(XR, XR + RECESS, 0, GROUND, z0, z0 + 0.08), slab(XR, XR + RECESS, 0, GROUND, z1 - 0.08, z1), slab(XR, back, GROUND, t.h, z0, z1), slab(XR - 0.04, XR, GROUND - 0.03, GROUND + 0.02, z0, z1));
    // a canopy over the shops: a thin steel blade on the steel band
    steelParts.push(slab(XR - 0.2, XR, GROUND - 0.06, GROUND - 0.045, z0 + 0.04, z1 - 0.04));
    // ribbon windows, floor by floor, broken by mullions
    for (let f = 2; (f + 0.85) * FLOOR < t.h - 0.1; f++) {
      const share = wr() < 0.65 ? 0.9 : 0.25;
      // the floor's ledge, standing out of the glass
      if (near) steelParts.push(slab(XR - 0.022, XR, (f + 0.85) * FLOOR, (f + 0.85) * FLOOR + 0.016, z0, z1));
      for (let s0 = z0 + 0.06; s0 < z1 - 0.1; s0 += 0.32) {
        const s1 = Math.min(s0 + 0.3, z1 - 0.06);
        (wr() < share ? ribbonLit : ribbonDark).push(pane(1, XR - 0.003, (f + 0.25) * FLOOR, (f + 0.85) * FLOOR, s0, s1));
      }
    }
    // the mullions as fins, up the whole glass
    if (near) for (let s = z0 + 0.05; s < z1 - 0.04; s += 0.32) steelParts.push(slab(XR - 0.026, XR, 2 * FLOOR, t.h - 0.05, s - 0.007, s + 0.007));
  }
  if (round) {
    // a drum of glass ribbons over a stone base, its curve toward the street
    const rad = Math.max(round.d / 2, 1.05);
    const cx = XR + rad;
    const cz = round.z;
    const h = 7.2;
    steelParts.push(
      new THREE.CylinderGeometry(rad, rad, h - GROUND, 32).translate(cx, (h + GROUND) / 2, cz),
      new THREE.CylinderGeometry(rad - RECESS, rad - RECESS, GROUND, 32).translate(cx, GROUND / 2, cz),
      new THREE.CylinderGeometry(rad + 0.04, rad + 0.04, 0.05, 32).translate(cx, GROUND, cz),
    );
    for (let f = 2; (f + 0.85) * FLOOR < h - 0.1; f++) {
      const share = wr() < 0.7 ? 0.9 : 0.3;
      for (let a = 0; a < 8; a++) {
        const g = new THREE.CylinderGeometry(rad + 0.004, rad + 0.004, FLOOR * 0.6, 4, 1, true, Math.PI * (0.92 + a * 0.145), Math.PI * 0.14).translate(cx, (f + 0.55) * FLOOR, cz);
        (wr() < share ? ribbonLit : ribbonDark).push(g);
      }
    }
    shopsR.splice(roundAt, 1, [cz - rad * 0.8, cz + rad * 0.8]);
  }

  // The domed corner building down the left side, as in the paintings: a
  // square tower on its corner, a drum, a dome and a small lantern, the
  // whole floodlit after dark
  {
    const k = 1.35;
    const cx = XL - 0.42 * k;
    const cz = domed.z + domed.d * 0.5 - 0.42 * k;
    const y = domed.h;
    stoneParts.push(slab(cx - 0.42 * k, cx + 0.42 * k, y - 0.1, y + 0.8 * k, cz - 0.42 * k, cz + 0.42 * k), slab(cx - 0.47 * k, cx + 0.47 * k, y + 0.8 * k, y + 0.88 * k, cz - 0.47 * k, cz + 0.47 * k));
    mesh(
      merge([
        new THREE.CylinderGeometry(0.34, 0.36, 0.55, 20).translate(0, 1.15, 0),
        new THREE.CylinderGeometry(0.4, 0.4, 0.05, 20).translate(0, 1.45, 0),
        new THREE.SphereGeometry(0.34, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 1.25, 1).translate(0, 1.47, 0),
        new THREE.CylinderGeometry(0.08, 0.09, 0.22, 10).translate(0, 1.98, 0),
        new THREE.ConeGeometry(0.07, 0.2, 10).translate(0, 2.19, 0),
      ]).scale(k, k, k).translate(cx, y, cz),
      surface({ color: STONE, grime: 0.15, glow: { tone: FLOOD, strength: 0.4 } }),
      "dome",
    );
  }
  // (the stone and the steel, carved and floodlit; the panes)
  mesh(merge(stoneParts), surface({ color: STONE, grime: 0.2, relief: { kind: "stone", bay: BAY, floor: FLOOR, strength: 0.8 }, glow: FLOODLIT }), "facades:stone");
  mesh(merge(steelParts), surface({ color: STEEL, grime: 0.1, glow: { tone: "#e8d2b8", strength: 0.08, base: 0.15, fade: 1.6 } }), "facades:glass");
  mesh(merge(litPanes), glowMaterial({ day: "#3d5266", night: "#f1b866" }), "windows:lit");
  mesh(merge(darkPanes), glowMaterial({ day: "#3d5266", night: "#3a3029" }), "windows:dark");
  mesh(merge(ribbonLit), glowMaterial({ day: "#8eaecb", night: "#f4c27a" }), "ribbons:lit");
  mesh(merge(ribbonDark), glowMaterial({ day: "#8eaecb", night: "#28313d" }), "ribbons:dark");
  const nearTowers = group.children.filter((o) => o.name.startsWith("facades:") || o.name.startsWith("windows:") || o.name.startsWith("ribbons:") || o.name === "dome");

  // ---- The arcade's shopfront: stone piers and a band over the open
  // front, the room behind (its back wall and ceiling lit warm after dark)
  // A shopfront as painted: the whole bay under one stone arch between two
  // proud piers; below the board, glazing in dark frames either side of
  // the open door where the machine stands, a fanlight over them, a steel
  // and glass canopy over the door; behind, the lit room (its back wall,
  // ceiling lights, a row of dark cabinets with lit screens, a counter)
  const A = ARCADE;
  const D0 = A.door[0];
  const D1 = A.door[1];
  mesh(
    merge([
      slab(XL - 1.4, XL, 0, A.band, A.open1, A.z1),
      slab(XL - 1.4, XL, 0, A.band, A.z0, A.open0),
      slab(XL - 1.4, XL, A.room, A.band, A.open0, A.open1),
      // a cornice over the ground floor, standing out a little
      slab(XL - 0.02, XL + 0.04, A.band - 0.03, A.band, A.z0, A.z1),
      // the piers either side of the bay, with capitals and bases
      slab(XL, XL + 0.05, 0, ARCH.spring, A.open0 - 0.16, A.open0 - 0.02),
      slab(XL, XL + 0.05, 0, ARCH.spring, A.open1 + 0.02, A.open1 + 0.16),
      slab(XL, XL + 0.07, ARCH.spring - 0.04, ARCH.spring, A.open0 - 0.18, A.open0),
      slab(XL, XL + 0.07, ARCH.spring - 0.04, ARCH.spring, A.open1, A.open1 + 0.18),
      slab(XL, XL + 0.065, 0, 0.05, A.open0 - 0.18, A.open0),
      slab(XL, XL + 0.065, 0, 0.05, A.open1, A.open1 + 0.18),
      // the room's back wall
      slab(XL - 1.4, XL - A.depth, 0, A.room, A.open0, A.open1),
    ]),
    // (floodlit after dark, warm, as the plates' old fronts; carved: piers,
    // a cornice, window surrounds, in the kit's relief)
    surface({ color: STONE, grime: 0.2, relief: { kind: "stone", bay: 0.34, floor: 0.28, strength: 0.75 }, glow: FLOODLIT }),
    "arcade:front",
  );
  // the room's floor: chequered tiles, warm
  {
    const tiles: THREE.BufferGeometry[] = [];
    const dark: THREE.BufferGeometry[] = [];
    const n = 10;
    const m = 4;
    for (let i = 0; i < n; i++)
      for (let j = 0; j < m; j++) {
        const z0 = A.open0 + ((A.open1 - A.open0) * i) / n;
        const x0 = XL - A.depth + (A.depth * j) / m;
        ((i + j) % 2 ? dark : tiles).push(slab(x0, x0 + A.depth / m, 0, 0.004, z0, z0 + (A.open1 - A.open0) / n));
      }
    mesh(merge(tiles), glowMaterial({ day: "#7a6d5c", night: "#b58652" }), "arcade:floor");
    mesh(merge(dark), glowMaterial({ day: "#4a4038", night: "#6e4a2c" }), "arcade:floor-dark");
  }
  mesh(
    merge([slab(XL - A.depth, XL - A.depth + 0.01, 0.004, A.room, A.open0, A.open1), slab(XL - A.depth, XL, A.room - 0.01, A.room, A.open0, A.open1)]),
    glowMaterial({ day: "#4d4740", night: "#c58f55" }),
    "arcade:room",
  );
  // inside: a row of cabinets along the back wall, each a dark body with a
  // lit screen and marquee, and a low counter by the right-hand glazing;
  // their side walls a shade darker than the back
  const screensIn: THREE.BufferGeometry[] = [];
  {
    const bx = XL - A.depth + 0.012;
    const bodies: THREE.BufferGeometry[] = [slab(XL - A.depth, XL - 0.02, 0.004, A.room, A.open0, A.open0 + 0.012), slab(XL - A.depth, XL - 0.02, 0.004, A.room, A.open1 - 0.012, A.open1)];
    const n = 7;
    for (let i = 0; i < n; i++) {
      const z = A.open0 + 0.16 + ((A.open1 - A.open0 - 0.32) * i) / (n - 1);
      bodies.push(slab(bx, bx + 0.09, 0.004, 0.34, z - 0.055, z + 0.055), slab(bx + 0.06, bx + 0.12, 0.13, 0.16, z - 0.055, z + 0.055));
      screensIn.push(pane(-1, bx + 0.091, 0.19, 0.29, z - 0.04, z + 0.04), pane(-1, bx + 0.091, 0.305, 0.33, z - 0.045, z + 0.045));
    }
    // the counter by the door
    bodies.push(slab(XL - 0.36, XL - 0.2, 0.004, 0.1, D1 + 0.04, A.open1 - 0.1));
    mesh(merge(bodies), surface({ color: "#2a2228", glow: { tone: "#6a4a3a", strength: 0.25 } }), "arcade:inside");
  }
  mesh(merge(screensIn.filter((_, i) => i % 4 < 2)), neonMaterial(dim("cyan", 0.4), { dayColor: "#5a7c88" }), "arcade:screens");
  mesh(merge(screensIn.filter((_, i) => i % 4 >= 2)), neonMaterial(dim("rose", 0.4), { dayColor: "#86607a" }), "arcade:screens2");
  // the glazing either side of the door and the fanlight over all three;
  // their dark frames, the door's posts and a transom
  {
    const glass = [pane(-1, XL - 0.012, 0.03, A.transom, A.open0, D0), pane(-1, XL - 0.012, 0.03, A.transom, D1, A.open1), pane(-1, XL - 0.012, A.transom, A.room, A.open0, A.open1)];
    mesh(merge(glass), glassMaterial({ tint: "#55697a", opacity: 0.26, sky: 0.6, glow: { tone: "#ffb45e", strength: 0.12 } }), "arcade:glass");
    const frame: THREE.BufferGeometry[] = [
      slab(XL - 0.03, XL + 0.012, 0, A.room, D0 - 0.02, D0),
      slab(XL - 0.03, XL + 0.012, 0, A.room, D1, D1 + 0.02),
      slab(XL - 0.03, XL + 0.012, A.transom - 0.01, A.transom + 0.01, A.open0, A.open1),
      slab(XL - 0.03, XL + 0.012, 0, 0.03, A.open0, D0),
      slab(XL - 0.03, XL + 0.012, 0, 0.03, D1, A.open1),
      slab(XL - 0.03, XL + 0.012, A.room - 0.014, A.room, A.open0, A.open1),
    ];
    for (const [z0, z1] of [[A.open0, D0], [D1, A.open1]] as const) {
      const n = Math.max(1, Math.round((z1 - z0) / 0.16));
      for (let i = 1; i < n; i++) {
        const z = z0 + ((z1 - z0) * i) / n;
        frame.push(slab(XL - 0.03, XL + 0.008, 0.03, A.transom, z - 0.006, z + 0.006));
      }
    }
    for (let i = 1; i < 8; i++) {
      const z = A.open0 + ((A.open1 - A.open0) * i) / 8;
      frame.push(slab(XL - 0.03, XL + 0.008, A.transom, A.room, z - 0.005, z + 0.005));
    }
    // the canopy over the door: a glass leaf in a steel frame, two ties up to the wall
    const cy = A.transom + 0.012;
    frame.push(
      slab(XL, XL + 0.2, cy, cy + 0.012, D0 - 0.06, D0 - 0.045),
      slab(XL, XL + 0.2, cy, cy + 0.012, D1 + 0.045, D1 + 0.06),
      slab(XL + 0.185, XL + 0.2, cy, cy + 0.016, D0 - 0.06, D1 + 0.06),
    );
    for (const z of [D0 - 0.05, D1 + 0.05]) {
      const tie = new THREE.Vector3(0.2, -(A.room + 0.02 - cy), 0);
      const len = tie.length();
      frame.push(box(0.006, len, 0.006).translate(0, len / 2, 0).applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), tie.normalize())).translate(XL, A.room + 0.02, z));
    }
    mesh(merge(frame), surface({ color: FRAME }), "arcade:frame");
    mesh(slab(XL, XL + 0.19, cy + 0.004, cy + 0.008, D0 - 0.045, D1 + 0.045), glassMaterial({ tint: "#6d8496", opacity: 0.4, sky: 0.8 }), "arcade:canopy");
  }
  // the arch over the bay: lit glass in a stone archivolt with a keystone,
  // its glazing bars dark
  {
    const half = (ARCH.z1 - ARCH.z0) / 2;
    const mid = (ARCH.z0 + ARCH.z1) / 2;
    const rise = ARCH.top - ARCH.spring;
    const head = (r: number) => new THREE.CircleGeometry(1, 24, 0, Math.PI).scale(r, (rise / half) * r, 1).rotateY(Math.PI / 2).translate(XL + 0.004, ARCH.spring, mid);
    const glass = merge([pane(-1, XL + 0.004, ARCH.y0, ARCH.spring, ARCH.z0, ARCH.z1), head(half)]);
    mesh(glass, glowMaterial({ day: "#4a6075", night: "#e2a85f" }), "arcade:arch");
    const bars: THREE.BufferGeometry[] = [slab(XL, XL + 0.012, ARCH.spring - 0.006, ARCH.spring + 0.006, ARCH.z0, ARCH.z1)];
    for (let i = 1; i < 8; i++) {
      const z = ARCH.z0 + ((ARCH.z1 - ARCH.z0) * i) / 8;
      const u = (z - mid) / half;
      bars.push(slab(XL, XL + 0.012, ARCH.y0, ARCH.spring + rise * Math.sqrt(1 - u * u), z - 0.006, z + 0.006));
    }
    bars.push(slab(XL, XL + 0.03, ARCH.y0 - 0.03, ARCH.y0, ARCH.z0 - 0.05, ARCH.z1 + 0.05));
    mesh(merge(bars), surface({ color: FRAME }), "arcade:bars");
    // the archivolt: stones round the head, a keystone at its crown
    const ring: THREE.BufferGeometry[] = [];
    const N = 19;
    for (let i = 0; i <= N; i++) {
      const a = (i / N) * Math.PI;
      const z = mid - Math.cos(a) * (half + 0.045);
      const y = ARCH.spring + Math.sin(a) * (rise + 0.045);
      const big = i === Math.round(N / 2);
      // (each stone's length along the radius: turned from upright by a - π/2)
      ring.push(box(big ? 0.05 : 0.035, big ? 0.13 : 0.085, big ? 0.07 : 0.062).rotateX(a - Math.PI / 2).translate(XL + 0.018, y + (big ? 0.02 : 0), z));
    }
    mesh(merge(ring), surface({ color: STONE, grime: 0.15, glow: FLOODLIT }), "arcade:archivolt");
  }
  // lights in its ceiling
  mesh(
    merge([0.25, 0.5, 0.75].flatMap((u) => [0.3, 0.7].map((v) => new THREE.CylinderGeometry(0.03, 0.03, 0.008, 12).translate(XL - A.depth * v, A.room - 0.012, A.open0 + (A.open1 - A.open0) * u)))),
    glowMaterial({ day: "#d8d2c4", night: "#ffe2b0" }),
    "arcade:light",
  );
  for (const z of [A.open0 + 0.35, (D0 + D1) / 2, A.open1 - 0.35]) lights.push({ x: XL - 0.05, z, w: 0.12, color: "#ffc98a", height: 0.3 });

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

  // ---- Shopfronts along the facades' feet: glass over a lit room (its
  // back wall warm after dark), mullions and a transom; on the left a
  // fanlight over each
  const rooms: THREE.BufferGeometry[] = [];
  const counters: THREE.BufferGeometry[] = [];
  const glazing: THREE.BufferGeometry[] = [];
  const mullions: THREE.BufferGeometry[] = [];
  const shopFront = (side: -1 | 1, z0: number, z1: number, top: number) => {
    const face = side < 0 ? XL - RECESS : XR + RECESS;
    const glassX = side < 0 ? XL - 0.01 : XR + 0.01;
    rooms.push(pane(side, face - side * 0.002, 0.004, top, z0, z1));
    counters.push(pane(side, face - side * 0.004, 0.004, 0.09, z0, z1));
    glazing.push(pane(side, glassX, 0.004, top, z0, z1));
    const n = Math.max(1, Math.round((z1 - z0) / 0.32));
    for (let i = 0; i <= n; i++) {
      const zz = z0 + ((z1 - z0) * i) / n;
      mullions.push(slab(glassX - 0.008, glassX + 0.008, 0, top, zz - 0.007, zz + 0.007));
    }
    mullions.push(slab(glassX - 0.008, glassX + 0.008, top * 0.72, top * 0.72 + 0.012, z0, z1), slab(glassX - 0.01, glassX + 0.01, top - 0.012, top, z0, z1));
  };
  for (const [z0, z1] of shopsL) {
    shopFront(-1, z0, z1, GROUND - 0.03);
    for (let z = z0 + 0.15; z < z1 - 0.1; z += 0.34) lights.push({ x: XL + 0.03, z, w: 0.09, color: "#ffc98a", height: 0.22 });
  }
  for (const [z0, z1] of shopsR) {
    shopFront(1, z0, z1, GROUND - 0.03);
    for (let z = z0 + 0.15; z < z1 - 0.1; z += 0.34) lights.push({ x: XR - 0.03, z, w: 0.09, color: "#ffd9a0", height: 0.24 });
  }
  mesh(merge(rooms), glowMaterial({ day: "#38424a", night: "#f0b062" }), "shops");
  mesh(merge(counters), glowMaterial({ day: "#2a3036", night: "#a8693a" }), "shops:counters");
  mesh(merge(glazing), glassMaterial({ tint: "#55697a", opacity: 0.32, sky: 0.6, glow: { tone: "#ffb45e", strength: 0.18 } }), "shops:glass");
  mesh(merge(mullions), surface({ color: FRAME }), "shops:frames");

  // ---- Neon: plain glowing panels, as the plates paint them (no words,
  // no marks): blades out from the walls on arms, stacked up the street at
  // all heights and sizes, and boards flat on the walls over the shops, in
  // the plates' pink, cyan and gold. One kit row (buildPanels: four draws)
  const panels: PanelSpec[] = [];
  const blade = (tone: SceneTone, side: -1 | 1, z: number, y: number, w: number, h: number) => {
    // the arms reach -x: toward the left wall as built, turned for the right
    const out = 0.08 + 0.3 + w / 2;
    panels.push({ tone, w, h, x: side < 0 ? XL + out : XR - out, y, z, ry: side < 0 ? 0 : Math.PI });
    lights.push({ x: side < 0 ? XL + out : XR - out, z, w: Math.min(w * 0.8, 0.16), color: SCENE_TONES[tone], height: y });
  };
  const board = (tone: SceneTone, side: -1 | 1, z: number, y: number, w: number, h: number) => {
    panels.push({ tone, w, h, x: side < 0 ? XL + 0.07 : XR - 0.07, y, z, ry: side < 0 ? Math.PI / 2 : -Math.PI / 2, arms: false });
    for (const k of w > 0.8 ? [-0.3, 0, 0.3] : [0]) lights.push({ x: side < 0 ? XL + 0.1 : XR - 0.1, z: z + k * w, w: 0.1, color: SCENE_TONES[tone], height: y });
  };
  // the arcade's board over its open front, cyan as in the plates
  board("cyan", -1, (A.open0 + A.open1) / 2, A.board, 1.76, 0.15);
  // the near ones, as painted: a tall pink blade past the arcade, a gold
  // board over the next shop, a tall pink one high on the right
  blade("rose", -1, 1.6, 1.35, 0.26, 1.0);
  board("gold", -1, -0.2, 0.66, 1.2, 0.14);
  blade("rose", 1, 4.4, 2.4, 0.26, 0.8);
  board("gold", 1, 0.8, 0.62, 1.6, 0.18);
  blade("gold", 1, 1.4, 1.5, 0.2, 0.55);
  // and down the street, from a seed: a blade on most buildings, at any
  // height, and a board over every other shop
  {
    const sr = rng(1561);
    const tone = (): SceneTone => {
      const p = sr();
      return p < 0.5 ? "rose" : p < 0.75 ? "gold" : "cyan";
    };
    for (const t of left) {
      const z1 = t.z + t.d / 2;
      if (z1 > 0.6 || z1 < -46) continue;
      if (sr() < 0.8) blade(tone(), -1, z1 - 0.2, sr.range(0.8, 1.7), sr.range(0.12, 0.2), sr.range(0.3, 0.75));
      if (sr() < 0.35) blade(tone(), -1, t.z, sr.range(1.6, 2.4), sr.range(0.12, 0.18), sr.range(0.25, 0.5));
    }
    for (const [z0, z1] of shopsL) if (z1 < -1 && z1 > -46 && sr() < 0.5) board(sr() < 0.6 ? "gold" : "rose", -1, (z0 + z1) / 2, 0.66, Math.min((z1 - z0) * 0.7, 1.1), 0.12);
    for (const t of right) {
      const z1 = t.z + t.d / 2;
      if (z1 > 0.4 || z1 < -46) continue;
      if (sr() < 0.85) blade(tone(), 1, z1 - 0.25, sr.range(0.9, Math.min(2.6, t.h - 0.4)), sr.range(0.13, 0.22), sr.range(0.35, 0.9));
    }
    for (const [z0, z1] of shopsR) if (z1 < -1 && z1 > -46 && sr() < 0.5) board(sr() < 0.6 ? "gold" : "cyan", 1, (z0 + z1) / 2, 0.62, Math.min((z1 - z0) * 0.7, 1.3), 0.13);
  }
  const signs = add(buildPanels(panels));
  disposers.push(() => disposeSign(signs));

  // ---- The ground: the paving between the facades (planar in the
  // puddles on the high tier), the tram's rails
  const length = 22 - FAR_Z;
  // (big square stone slabs, about 1.2 m, laid square as painted: the kit's paving)
  const slabs = pavingTexture({ seed: 1543, kind: "grid", cols: 4, rows: 4, joint: 2, mortar: "#a49c90", vary: 64, repeat: [(XR - XL + 0.2) / 0.5, length / 0.5] });
  disposers.push(() => slabs.dispose());
  const paving = wetPaving({
    map: slabs,
    w: XR - XL + 0.2,
    d: length,
    x: (XL + XR) / 2,
    z: 22 - length / 2,
    y: 0,
    mode: TIERS[quality].reflection,
    color: PAVING,
    lights: [...lights, ...LAMPS_L.map((z) => ({ x: LAMP_L, z, w: 0.14, color: "#ffc98a", height: 0.6 })), ...LAMPS_R.map((z) => ({ x: LAMP_R, z, w: 0.14, color: "#ffc98a", height: 0.6 }))],
    size: TIERS[quality].reflectionSize || undefined,
    // polished stone: it carries the shops, the signs and the lamps dry, after dark
    polish: 0.95,
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
    { light: "spot", head: "lantern" },
  );
  // (lantern posts, as the plates' street has them)
  const lamps = buildLampRow([
    ...LAMPS_L.filter((_, i) => i !== SPOT_L && i !== SPOT_L + 1 && i !== CLEAR_L.lamp).map((z) => ({ x: LAMP_L, z })),
    ...LAMPS_R.filter((_, i) => i !== SPOT_R).map((z) => ({ x: LAMP_R, z, ry: Math.PI })),
  ], { head: "lantern" });
  for (const row of [spotLamps, lamps]) {
    row.meshes.forEach((m) => add(m));
    disposers.push(row.dispose);
    for (const h of row.heads.slice(0, 12)) glow.push({ pos: h.clone(), color: "#ffc98a", size: 0.1 });
  }
  const spots = spotLamps.heads.map((h) => [h.x, h.y - 0.02, h.z] as V3);

  // ---- Trees in planters between the lamps
  const treeSpots = [...LAMPS_L.map((z) => ({ x: TREE_L, z: z - 0.85, s: 0.95 })).filter((t) => t.z < CLEAR_L.trees[0] || t.z > CLEAR_L.trees[1]), ...LAMPS_R.map((z) => ({ x: TREE_R, z: z - 0.85, s: 1.0 }))].filter((t) => t.z > FAR_Z + 1);
  const trees = buildStreetTrees(1531, treeSpots, TREES);
  for (const t of trees) {
    geometries.push(t.geometry);
    add(t);
  }
  // planters with flowers (the kit's)
  for (const p of buildPlanters(
    1537,
    treeSpots.filter((_, i) => i % 2 === 0).map((t) => ({ x: t.x, z: t.z + 0.35, w: 0.2, d: 0.14, h: 0.07 })),
    { stone: "#7a5b3e" },
  )) {
    geometries.push(p.geometry);
    add(p);
  }

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
    // (after dark, lit by the lamps and shops either side, as painted)
    tramMesh(green, surface({ color: TRAM_GREEN, grime: 0.25, glow: { tone: "#5f8a5c", strength: 0.32 } }), "tram:body");
    tramMesh(cream, surface({ color: TRAM_CREAM, glow: { tone: "#c9a76a", strength: 0.35 } }), "tram:band");
    tramMesh(roof, surface({ color: "#2b2f33" }), "tram:roof");
    tramMesh(panes, glowMaterial({ day: "#26343a", night: "#f2c27a" }), "tram:windows");
    tramMesh([new THREE.CylinderGeometry(0.025, 0.025, 0.01, 12).rotateX(Math.PI / 2).translate(0, 0.12, 0.006)], neonMaterial(dim("gold", 0.6), { dayColor: "#e9dcb0" }), "tram:lamp");
    tram.scale.setScalar(1.15);
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
  if (TIERS[quality].reflection === "planar") reflectIn(sky, ...nearTowers, ...landmarks, cab, tram, signs, ...group.children.filter((o) => o.name === "shops" || o.name.startsWith("arcade:")), ...spotLamps.meshes, ...lamps.meshes);

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
    pools: poolsFor(shopsL, shopsR),
    dispose: () => {
      geometries.forEach((g) => g.dispose());
      disposers.forEach((d) => d());
      machine.tex.dispose();
      machine.marquee.dispose();
      if (current.screen === machine.canvas) current.screen = current.marquee = null;
    },
  };
}

// After dark (kit/glow.ts: pools, at most 12): the lamps' light on the
// facades and the paving near the eye (not the three spot lamps, which
// light their own), the arcade's cyan board on its stone, and the shops'
// warm light spilling out over the paving
function poolsFor(shopsL: [number, number][], shopsR: [number, number][]): GlowPool[] {
  const span = (shops: [number, number][], z0: number, z1: number): [number, number] => {
    const zs = shops.flatMap(([a, b]) => [a, b]).filter((z) => z < z1 && z > z0);
    return [Math.min(...zs), Math.max(...zs)];
  };
  const [l0, l1] = span(shopsL, -26, 2.6);
  const [r0, r1] = span(shopsR, -26, 9);
  return [
    // the lamps all the way down each side: one line pool a side
    { from: [LAMP_L, 0.6, 2.2], to: [LAMP_L, 0.6, -26], reach: 1.0, color: "#ffc98a", strength: 0.55 },
    { from: [LAMP_R, 0.6, 6.5], to: [LAMP_R, 0.6, -26], reach: 1.0, color: "#ffc98a", strength: 0.55 },
    // the shops' warm light out over the paving before them, down each side
    { from: [XL + 0.25, 0.16, l1], to: [XL + 0.25, 0.16, l0], reach: 0.95, color: "#ffb866", strength: 1.5 },
    { from: [XR - 0.25, 0.16, r1], to: [XR - 0.25, 0.16, r0], reach: 0.95, color: "#ffc47a", strength: 1.5 },
    // the arcade's cyan board, and its warm room out over the paving
    { pos: [XL + 0.3, ARCADE.board, (ARCADE.open0 + ARCADE.open1) / 2], reach: 1.2, color: SCENE_TONES.cyan, strength: 0.6 },
    { pos: [XL + 0.35, 0.12, (ARCADE.open0 + ARCADE.open1) / 2], reach: 1.3, color: "#ffb866", strength: 0.9 },
    // the near lamps without a spot of their own, a little stronger
    ...LAMPS_L.filter((z, i) => z < 2 && z > -1.5 && i !== SPOT_L && i !== SPOT_L + 1).map((z): GlowPool => ({ pos: [LAMP_L, 0.6, z], reach: 1.1, color: "#ffc98a", strength: 0.6 })),
    ...LAMPS_R.filter((z, i) => z < 6 && z > 1 && i !== SPOT_R).map((z): GlowPool => ({ pos: [LAMP_R, 0.6, z], reach: 1.1, color: "#ffc98a", strength: 0.6 })),
  ].slice(0, 12) as GlowPool[];
}

// By day: the trees' dappled shade over the paving, as the day plate paints it
const SHADE: DayShade = { kind: "dapple", box: [XL, FAR_Z, XR, 22], depth: 0.38, top: 0.04, period: 0.32, duty: 0.55 };

function InterestsScene({ quality, active, still }: SceneProps) {
  const built = useMemo(() => build(quality), [quality]);
  useEffect(() => {
    anchors.set(anchorKey("nanjing-road", "machine"), built.screen.pos.clone().add(new THREE.Vector3(...def.offset)));
    return () => {
      anchors.delete(anchorKey("nanjing-road", "machine"));
    };
  }, [built]);
  useDisposeOnUnmount(built);
  const invalidate = useThree((s) => s.invalidate);
  const interest = useWorld((s) => s.sel.interest);
  const arrived = useWorld((s) => s.arrived);
  const press = useWorld((s) => s.arcadePress);
  const on = active && arrived;
  useGlowPools("nanjing-road", built.pools, active);
  useDayShade("nanjing-road", SHADE, active);
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
  // (`uv`: where on the screen a click landed, for the modes that aim;
  // the Play key presses without aiming)
  const play = (uv: THREE.Vector2 | null = null) => {
    const t = seconds();
    const s = world.get().still;
    const status = built.machine.press(uv, t, s);
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
        onSelect={(hit) => {
          world.set({ focus: "machine" });
          // the Hitbox is the screen grown 1.2 × 1.3 round its middle, so
          // the screen's own uv is the hit point scaled back
          const u = 0.5 + hit.point.x * 1.2;
          const v = 0.5 + hit.point.y * ((0.44 * 1.3) / 0.4375);
          play(u >= 0 && u <= 1 && v >= 0 && v <= 1 ? new THREE.Vector2(u, v) : null);
        }}
      />
    </>
  );
}

export default InterestsScene;
