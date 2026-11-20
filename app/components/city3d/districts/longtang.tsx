"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { useDayShade, useDisposeOnUnmount, useGlowPools, SceneLights, type SceneProps } from "../common";
import type { DayShade, GlowPool } from "../kit/glow";
import { box, blob, merge, wire } from "../kit/geometry";
import { buildJinMao, buildPearlTower, buildShanghaiTower, buildWorldFinancialCenter, type Landmark } from "../kit/landmarks";
import { glowSprites, litSurface, SCENE_TONES, type SceneTone } from "../kit/neon";
import { buildMarkSign, disposeSign, glowPoints } from "../kit/signs";
import { buildSkyDome } from "../kit/sky";
import { glowMaterial } from "../kit/street";
import { surface } from "../kit/surface";
import { pavingTexture } from "../kit/textures";
import { buildTowers, layoutTowers } from "../kit/towers";
import { buildStreetTrees } from "../kit/trees";
import { wetPaving } from "../kit/water";
import { windowMaterial } from "../kit/windows";
import { rng, type Rng } from "../rng";
import type { V3 } from "../scenes";
import type { Quality } from "../tiers";
import { LANE } from "./longtang.def";

// About: a stone-gate lane, composed as its two paintings
// (app/assets/city/longtang-day.webp, -night.webp). The camera stands low
// in the lane and looks down it (longtang.def.ts: home). Left and right,
// a row of brick houses (taller on the left), each with a stone plinth,
// a string course and a cornice, a tiled roof sloping away from the lane,
// and either a stone gate frame (pilasters, lintel, a half-round
// pediment) round a pair of dark doors, or a ground-floor window; every
// house has an upstairs window, and one of them, on the left, is lit gold
// after dark. Potted plants and flowers along both walls, ivy on the near
// walls, a bicycle by the left wall and a scooter by the right (primitives),
// laundry on two bamboo poles across the lane, wall lanterns, and two lit
// blade signs (decorative marks, no words). At the lane's end a house with
// a gate, trees behind it, and over the roofs the skyline: the Pearl, the
// World Financial Center, Jin Mao and Shanghai Tower, among lower towers.
//
// The lane is modelled in metres in a group scaled by LANE.scale; the
// skyline is in world units (10 m). Where everything stands is data
// (longtang.def.ts: LANE). Scenery only: nothing to choose, no words,
// nothing that moves. Two spot lights (scenes.ts: DISTRICT_LIGHTS), at the
// two nearest lanterns; the other lanterns, the lit window and the blade
// signs are lit surfaces. The paving is the kit's wet paving, its fake
// streaks on every tier (the plan: About's paving is fake everywhere).

const K = LANE.scale;

// Colours, from the paintings
const C = {
  stone: "#b9b0a1",
  stoneDark: "#8f877b",
  door: "#6b2c2a",
  roof: "#7e4535",
  wood: "#4f3428",
  glass: "#2f3746",
  pot: "#a55c3c",
  glazed: "#5b3a33",
  bamboo: "#b49c5f",
  metal: "#2c3338",
  scooter: "#93bba6",
  seat: "#5a3b2e",
  ivy: "#5f8a3e",
  ivyLight: "#86a94c",
  pink: "#e6a6b9",
  lilac: "#a497d9",
  cloth: ["#e9e1cf", "#3c4a6b", "#d8a2b4", "#55617c"],
  far: "#5c6a7c",
} as const;

// The walls' brick is the kit's relief (courses of 7.5 cm, bricks of
// 22 cm, light mortar), drawn in the shader; box() lays a texture by the
// 0.6 m tile for the roofs' and gables' UVs
const BRICK_TILE = 0.6;
// The lane's stones: slabs about 0.6 m, a little uneven (the kit's
// paving, laid blue-grey); one tile of 4 × 4 is 2.4 m square
const SLAB_TILE = 2.4;

// A rod between two points (a frame tube, a handlebar)
function rod(a: V3, b: V3, r: number, radial = 6) {
  const A = new THREE.Vector3(...a);
  const B = new THREE.Vector3(...b);
  const len = A.distanceTo(B);
  const g = new THREE.CylinderGeometry(r, r, len, radial, 1);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize()));
  return g.translate((A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2);
}

// A box between two corners
const slab = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number) =>
  box(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0), 1 / BRICK_TILE).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);

type Parts = Record<string, THREE.BufferGeometry[]>;

// The bicycle, along z, its foot at the origin (metres)
function bicycle(p: Parts) {
  const W = 0.34;
  for (const z of [-0.55, 0.55]) {
    p.metal.push(new THREE.TorusGeometry(W, 0.025, 5, 22).rotateY(Math.PI / 2).translate(0, W, z));
    p.metal.push(rod([0, W, z], [0, W + 0.02, z * 0.05], 0.012));
  }
  const rear: V3 = [0, W, -0.55];
  const front: V3 = [0, W, 0.55];
  const seat: V3 = [0, 0.92, -0.25];
  const head: V3 = [0, 0.9, 0.38];
  const crank: V3 = [0, 0.3, -0.05];
  p.metal.push(rod(rear, seat, 0.016), rod(rear, crank, 0.016), rod(crank, seat, 0.02), rod(crank, head, 0.02), rod(seat, head, 0.018), rod(front, head, 0.018));
  p.metal.push(rod([0, 0.9, 0.38], [0, 1.02, 0.42], 0.016), rod([-0.28, 1.02, 0.42], [0.28, 1.02, 0.42], 0.014));
  p.seat.push(box(0.12, 0.05, 0.24).translate(0, 0.96, -0.27));
  // the basket over the front wheel
  p.wood.push(box(0.36, 0.26, 0.3).translate(0, 0.98, 0.68));
}

// The scooter, facing +z, its foot at the origin (metres)
function scooter(p: Parts) {
  const R = 0.2;
  for (const z of [-0.5, 0.55]) p.metal.push(new THREE.TorusGeometry(R, 0.07, 6, 18).rotateY(Math.PI / 2).translate(0, R, z));
  // the rear cowl, the floorboard, the leg shield, the front fender
  p.scooter.push(new THREE.CapsuleGeometry(0.28, 0.45, 4, 12).rotateX(Math.PI / 2).scale(1, 0.95, 1).translate(0, 0.5, -0.4));
  p.scooter.push(box(0.36, 0.08, 0.6).translate(0, 0.25, 0.12));
  p.scooter.push(box(0.4, 0.62, 0.07).rotateX(-0.3).translate(0, 0.6, 0.44));
  p.scooter.push(new THREE.CapsuleGeometry(0.12, 0.25, 3, 10).rotateX(Math.PI / 2 - 0.4).translate(0, 0.38, 0.58));
  p.metal.push(rod([0, 0.9, 0.46], [0, 1.15, 0.5], 0.03));
  p.scooter.push(box(0.62, 0.08, 0.12).translate(0, 1.16, 0.5));
  p.metal.push(rod([-0.24, 1.18, 0.5], [-0.28, 1.36, 0.48], 0.01), rod([0.24, 1.18, 0.5], [0.28, 1.36, 0.48], 0.01));
  p.metal.push(box(0.09, 0.05, 0.02).translate(-0.28, 1.38, 0.48), box(0.09, 0.05, 0.02).translate(0.28, 1.38, 0.48));
  p.seat.push(box(0.32, 0.1, 0.62).translate(0, 0.84, -0.32));
  p.stone.push(box(0.16, 0.1, 0.02).translate(0, 0.46, -0.86));
}

// A pot with flowers or a plant, its foot at (x, z), metres
function pot(p: Parts, r: Rng, x: number, z: number, big: boolean) {
  const rad = big ? r.range(0.32, 0.4) : r.range(0.2, 0.28);
  const h = big ? 0.75 : r.range(0.35, 0.5);
  const target = big ? p.glazed : p.pot;
  target.push(new THREE.CylinderGeometry(rad, rad * 0.75, h, 12).translate(x, h / 2, z));
  return { top: h, rad };
}

function build(quality: Quality) {
  const group = new THREE.Group();
  group.name = "longtang";
  const mobile = quality === "mobile";
  const geometries: THREE.BufferGeometry[] = [];
  const disposers: (() => void)[] = [];
  const add = <T extends THREE.Object3D>(o: T, parent: THREE.Object3D = group) => {
    parent.add(o);
    return o;
  };
  const r = rng(1611);

  // ---- The sky
  const sky = add(buildSkyDome({ seed: 116, radius: 900 }));
  geometries.push(sky.geometry);

  // ---- The lane, in metres
  const lane = add(new THREE.Group());
  lane.name = "lane";
  lane.scale.setScalar(K);
  const slabs = pavingTexture({ seed: 911, kind: "slabs", cols: 4, rows: 4, repeat: [(LANE.right - LANE.left) / SLAB_TILE, (LANE.near - LANE.end) / SLAB_TILE] });
  disposers.push(() => slabs.dispose());
  const parts: Parts = {
    brick: [],
    stone: [],
    stoneDark: [],
    door: [],
    roof: [],
    wood: [],
    glass: [],
    shop: [],
    lit: [],
    pot: [],
    glazed: [],
    metal: [],
    scooter: [],
    seat: [],
    ivy: [],
    ivyLight: [],
    pink: [],
    lilac: [],
    bamboo: [],
    lamp: [],
    cloth0: [],
    cloth1: [],
    cloth2: [],
    cloth3: [],
  };
  const trees: { x: number; z: number; s: number }[] = [];
  const glow: { pos: THREE.Vector3; color: string; size: number }[] = [];

  // A box on a facade, in the facade's terms: `side` -1 left, 1 right; u0..u1
  // along the lane (z), v0..v1 up, w0..w1 out from the wall into the lane
  const face = (side: number) => (side < 0 ? LANE.left : LANE.right);
  const fbox = (side: number, u0: number, u1: number, v0: number, v1: number, w0: number, w1: number) => {
    const f = face(side);
    return slab(f - side * w0, f - side * w1, v0, v1, u0, u1);
  };

  // ---- The houses, both sides, from behind the camera to the lane's end
  let litPlaced = false;
  for (const side of [-1, 1]) {
    const eaves = side < 0 ? LANE.eaveLeft : LANE.eaveRight;
    let z = LANE.near;
    let index = 0;
    while (z > LANE.end + 0.6) {
      const len = Math.min(r.range(LANE.unit[0], LANE.unit[1]), z - LANE.end);
      const z0 = z - len;
      const z1 = z;
      const mid = (z0 + z1) / 2;
      const H = r.range(eaves[0], eaves[1]);
      // the wall, 7 m deep, and its stone plinth, corner, string course and cornice
      parts.brick.push(fbox(side, z0, z1, 0, H, -7, 0));
      parts.stone.push(fbox(side, z0, z1, 0, 0.5, 0, 0.06));
      parts.stone.push(fbox(side, z1 - 0.38, z1, 0, H, 0, 0.09));
      parts.stone.push(fbox(side, z0, z1, 3.3, 3.48, 0, 0.11));
      parts.stoneDark.push(fbox(side, z0, z1, H - 0.28, H, 0, 0.22));
      // the roof: two tiled slopes, the near one overhanging the lane
      const pitch = 0.5;
      const run = 3.7;
      const f = face(side);
      const ridgeW = -run + 0.55;
      for (const back of [false, true]) {
        const lenS = run / Math.cos(pitch);
        const g = box(lenS, 0.16, len + 0.06, 1 / BRICK_TILE).rotateZ(side < 0 === back ? pitch : -pitch);
        const wc = back ? ridgeW - run / 2 : 0.55 - run / 2;
        g.translate(f - side * wc, H + (run / 2) * Math.tan(pitch), mid);
        parts.roof.push(g);
      }
      // gables between houses of different heights stay brick: a back wall to the ridge
      parts.brick.push(fbox(side, z0 + 0.1, z1 - 0.1, H, H + run * Math.tan(pitch) - 0.1, ridgeW - 0.2, ridgeW - 0.1));

      const gate = index % 2 === 0 ? r() < 0.8 : r() < 0.35;
      if (gate) {
        // pilasters, lintel, a half-round pediment and its keystone, the
        // step, and the two leaves of the door, recessed in the frame
        for (const u of [-1.2, 1.2]) parts.stone.push(fbox(side, mid + u - 0.17, mid + u + 0.17, 0.15, 2.95, 0, 0.16));
        parts.stone.push(fbox(side, mid - 1.45, mid + 1.45, 2.6, 2.98, 0, 0.2));
        const arch = new THREE.CylinderGeometry(1.15, 1.15, 0.14, 18, 1, false, 0, Math.PI).rotateZ(Math.PI / 2);
        parts.stone.push(arch.translate(f - side * 0.09, 2.98, mid));
        const inner = new THREE.CylinderGeometry(0.82, 0.82, 0.14, 16, 1, false, 0, Math.PI).rotateZ(Math.PI / 2);
        parts.stoneDark.push(inner.translate(f - side * 0.13, 2.98, mid));
        parts.stone.push(fbox(side, mid - 0.14, mid + 0.14, 2.98, 3.95, 0, 0.21));
        parts.stone.push(fbox(side, mid - 1.3, mid + 1.3, 0, 0.15, 0, 0.5));
        for (const u of [-1, 1]) parts.door.push(fbox(side, mid + (u < 0 ? -1.03 : 0.015), mid + (u < 0 ? -0.015 : 1.03), 0.15, 2.6, 0.02, 0.06));
        // the rings
        for (const u of [-0.18, 0.18]) parts.metal.push(new THREE.TorusGeometry(0.07, 0.012, 4, 10).rotateY(Math.PI / 2).translate(f - side * 0.075, 1.35, mid + u));
      } else {
        // a ground-floor window: stone frame, dark glass, wood bars, a sill
        const wz0 = mid - 0.7;
        const wz1 = mid + 0.7;
        parts.stone.push(fbox(side, wz0 - 0.14, wz1 + 0.14, 0.95, 1.05, 0, 0.16));
        parts.stone.push(fbox(side, wz0 - 0.14, wz1 + 0.14, 2.6, 2.78, 0, 0.12));
        parts.stone.push(fbox(side, wz0 - 0.14, wz0, 1.05, 2.6, 0, 0.1), fbox(side, wz1, wz1 + 0.14, 1.05, 2.6, 0, 0.1));
        parts.shop.push(fbox(side, wz0, wz1, 1.05, 2.6, 0, 0.02));
        parts.wood.push(fbox(side, mid - 0.04, mid + 0.04, 1.05, 2.6, 0, 0.05), fbox(side, wz0, wz1, 1.78, 1.85, 0, 0.05));
        // a window box of flowers
        if (r() < 0.6) {
          parts.wood.push(fbox(side, wz0, wz1, 1.05, 1.3, 0.16, 0.5));
          for (let k = 0; k < 10; k++) {
            const u = wz0 + 0.12 + (k * (wz1 - wz0 - 0.24)) / 9;
            const target = k % 3 === 1 ? parts.lilac : k % 2 ? parts.pink : parts.ivy;
            const b = blob(r, r.range(0.1, 0.16), 0.8, 0.3, 1);
            const w = r.range(0.24, 0.42);
            target.push(b.translate(face(side) - side * w, 1.38 + r.range(0, 0.1), u));
          }
        }
      }
      // the upstairs window, under a small tiled hood; one, on the left, lit
      const v0 = side < 0 ? 4.6 : 4.2;
      const uz0 = mid - 0.55;
      const uz1 = mid + 0.55;
      const lit = side < 0 && index === LANE.litHouse && !litPlaced;
      parts.stone.push(fbox(side, uz0 - 0.12, uz1 + 0.12, v0 - 0.12, v0, 0, 0.14));
      parts.stone.push(fbox(side, uz0 - 0.12, uz0, v0, v0 + 1.5, 0, 0.09), fbox(side, uz1, uz1 + 0.12, v0, v0 + 1.5, 0, 0.09));
      (lit ? parts.lit : parts.glass).push(fbox(side, uz0, uz1, v0, v0 + 1.5, 0, 0.02));
      parts.wood.push(fbox(side, mid - 0.035, mid + 0.035, v0, v0 + 1.5, 0, 0.045), fbox(side, uz0, uz1, v0 + 0.95, v0 + 1.01, 0, 0.045));
      parts.roof.push(box(0.75, 0.06, 1.5, 1 / BRICK_TILE).rotateZ(side * 0.45).translate(f - side * 0.32, v0 + 1.75, mid));
      if (lit) {
        litPlaced = true;
        glow.push({ pos: new THREE.Vector3(f - side * 0.05, v0 + 0.75, mid).multiplyScalar(K), color: SCENE_TONES.gold, size: 0.25 });
      }

      // pots at the wall's foot: flowers, small plants, now and then a big
      // glazed pot with a tall plant
      const pots = r() < 0.75 ? 1 + Math.floor(r() * 2) : 0;
      for (let k = 0; k < pots; k++) {
        const big = r() < 0.3;
        const u = z0 + 0.6 + r() * (len - 1.2);
        if (gate && Math.abs(u - mid) < 1.6) continue;
        const w = big ? 0.55 : r.range(0.35, 0.5);
        const x = face(side) - side * w;
        const { top, rad } = pot(parts, r, x, u, big);
        if (big || r() < 0.45) trees.push({ x, z: u, s: big ? r.range(1.6, 2.1) : r.range(1.0, 1.4) });
        else {
          const kind = r();
          for (let j = 0; j < 4; j++) {
            const target = j === 0 ? parts.ivy : kind < 0.5 ? parts.pink : parts.lilac;
            for (let q = 0; q < 2; q++) target.push(blob(r, rad * r.range(0.4, 0.6), 0.75, 0.3, 1).translate(x + r.range(-0.15, 0.15), top + 0.1 + j * 0.06, u + r.range(-0.18, 0.18)));
          }
        }
      }
      // ivy on the near houses' upper walls
      if (z1 > -12 && r() < 0.8) {
        const n = 14 + Math.floor(r() * 12);
        const u0 = z0 + r() * len * 0.4;
        for (let k = 0; k < n; k++) {
          const b = blob(r, r.range(0.22, 0.45), 0.85, 0.3, 1).scale(0.4, 1, 1);
          const target = k % 3 === 0 ? parts.ivyLight : parts.ivy;
          target.push(b.translate(f - side * 0.18, H - 0.3 - r() * 3.8 * (k / n), u0 + r.range(-0.6, 1.8)));
        }
      }
      z = z0;
      index++;
    }
  }

  // ---- The house across the lane's end: a gate and its doors, a window
  // either side, a roof, trees behind
  {
    const z = LANE.end;
    const H = 6.6;
    parts.brick.push(slab(LANE.left - 1, LANE.right + 1, 0, H, z - 6, z));
    parts.stone.push(slab(LANE.left - 1, LANE.right + 1, 0, 0.5, z, z + 0.06));
    parts.stoneDark.push(slab(LANE.left - 1, LANE.right + 1, H - 0.28, H, z, z + 0.22));
    parts.roof.push(box(LANE.right - LANE.left + 2.4, 0.16, 4.3, 1 / BRICK_TILE).rotateX(-0.5).translate((LANE.left + LANE.right) / 2, H + 0.95, z - 1.6));
    const cx = (LANE.left + LANE.right) / 2 + 0.3;
    for (const u of [-1.1, 1.1]) parts.stone.push(slab(cx + u - 0.16, cx + u + 0.16, 0.15, 2.9, z, z + 0.16));
    parts.stone.push(slab(cx - 1.35, cx + 1.35, 2.6, 2.95, z, z + 0.2));
    parts.stone.push(new THREE.CylinderGeometry(1.05, 1.05, 0.14, 18, 1, false, 0, Math.PI).rotateZ(Math.PI / 2).rotateY(Math.PI / 2).translate(cx, 2.95, z + 0.09));
    parts.door.push(slab(cx - 0.95, cx + 0.95, 0.15, 2.6, z, z + 0.04));
    for (const dx of [-2.1, 2.4]) {
      parts.glass.push(slab(cx + dx - 0.5, cx + dx + 0.5, 1.1, 2.4, z, z + 0.02));
      parts.stone.push(slab(cx + dx - 0.62, cx + dx + 0.62, 0.98, 1.1, z, z + 0.14));
    }
    for (const [x, dz, s] of [[-3, -8, 8.5], [0.8, -10, 10], [4, -7.5, 7.5], [-6, -9, 9]] as const) trees.push({ x, z: z + dz, s });
  }

  // ---- Lanterns on iron brackets; the first two hold the spot lights
  const spots: V3[] = [];
  LANE.lanterns.forEach(([side, z], i) => {
    const f = face(side);
    const y = 2.55;
    parts.metal.push(fbox(side, z - 0.03, z + 0.03, y + 0.42, y + 0.47, 0, 0.62));
    parts.metal.push(rod([f - side * 0.02, y - 0.2, z], [f - side * 0.5, y + 0.44, z], 0.02));
    const x = f - side * 0.62;
    parts.metal.push(new THREE.CylinderGeometry(0.06, 0.2, 0.14, 6).translate(x, y + 0.32, z));
    parts.lamp.push(new THREE.CylinderGeometry(0.15, 0.11, 0.42, 6).translate(x, y + 0.05, z));
    parts.metal.push(new THREE.CylinderGeometry(0.12, 0.08, 0.06, 6).translate(x, y - 0.18, z));
    if (i < 2) spots.push([x * K, (y - 0.2) * K, z * K]);
    glow.push({ pos: new THREE.Vector3(x, y + 0.05, z).multiplyScalar(K), color: "#ffc98a", size: 0.18 });
  });

  // ---- The laundry: two bamboo poles from wall to wall, and what hangs
  // on the nearer one
  {
    const { z, y, sag } = LANE.laundry;
    const a = new THREE.Vector3(LANE.left, y, z);
    const b = new THREE.Vector3(LANE.right, y + 0.1, z - 0.2);
    parts.bamboo.push(wire(a, b, sag, 0.05));
    parts.bamboo.push(wire(new THREE.Vector3(LANE.left, y - 0.15, z - 1.2), new THREE.Vector3(LANE.right, y - 0.05, z - 1.35), sag, 0.04));
    const cloths: [number, number, number][] = [[-1.2, 0.75, 0.95], [-0.15, 0.8, 1.05], [0.95, 0.7, 0.85], [1.9, 0.5, 1.1]];
    cloths.forEach(([x, w, h], i) => {
      const t = (x - LANE.left) / (LANE.right - LANE.left);
      const top = y + 0.1 * t - Math.sin(t * Math.PI) * sag - 0.03;
      const zz = z - 0.2 * t;
      parts[`cloth${i}`].push(box(w, h, 0.03).rotateY(r.range(-0.12, 0.12)).translate(x, top - h / 2, zz));
    });
    // the cables along the left eaves
    for (const [dy, s] of [[-0.4, 0.5], [-0.65, 0.7]] as const) parts.metal.push(wire(new THREE.Vector3(LANE.left + 0.25, LANE.eaveLeft[0] + dy, LANE.near), new THREE.Vector3(LANE.left + 0.25, LANE.eaveLeft[0] + dy - 0.6, LANE.end + 2), s, 0.025));
  }

  // ---- The bicycle by the left wall and the scooter by the right
  {
    const bike: Parts = { metal: [], seat: [], wood: [] };
    bicycle(bike);
    const [bx, bz] = LANE.bicycle;
    for (const [k, list] of Object.entries(bike)) for (const g of list) parts[k].push(g.rotateZ(0.06).rotateY(0.15).translate(bx, 0, bz));
    const sc: Parts = { metal: [], seat: [], scooter: [], stone: [] };
    scooter(sc);
    const [sx, sz] = LANE.scooter;
    for (const [k, list] of Object.entries(sc)) for (const g of list) parts[k].push(g.rotateY(-0.95).translate(sx, 0, sz));
  }

  // ---- The lane's materials, one merged mesh each
  const brickWall = surface({ color: "#a2604a", grime: 0.15, relief: { kind: "brick", course: 0.075 * K, length: 0.22 * K, strength: 0.85 } });
  const MATERIALS: Record<string, THREE.Material> = {
    brick: brickWall,
    stone: surface({ color: C.stone, grime: 0.1 }),
    stoneDark: surface({ color: C.stoneDark, grime: 0.1 }),
    door: surface({ color: C.door }),
    roof: surface({ color: C.roof, snow: true }),
    wood: surface({ color: C.wood }),
    // the ground floors' windows: dark glass by day, a dim warm gold after dark
    // (under the bloom); upstairs, only the one lit window glows
    glass: surface({ color: C.glass, wet: 0 }),
    shop: glowMaterial({ day: C.glass, night: "#6a4a30" }),
    lit: litSurface({ color: C.glass, tone: "gold", strength: 1.15 }),
    pot: surface({ color: C.pot }),
    glazed: surface({ color: C.glazed }),
    metal: surface({ color: C.metal }),
    scooter: surface({ color: C.scooter }),
    seat: surface({ color: C.seat }),
    ivy: surface({ color: C.ivy, snow: true }),
    ivyLight: surface({ color: C.ivyLight, snow: true }),
    pink: surface({ color: C.pink }),
    lilac: surface({ color: C.lilac }),
    bamboo: surface({ color: C.bamboo }),
    lamp: glowMaterial({ day: "#d8d2c4", night: "#ffd49a" }),
    cloth0: surface({ color: C.cloth[0] }),
    cloth1: surface({ color: C.cloth[1] }),
    cloth2: surface({ color: C.cloth[2] }),
    cloth3: surface({ color: C.cloth[3] }),
  };
  for (const [k, list] of Object.entries(parts)) {
    if (!list.length) continue;
    const g = merge(list);
    geometries.push(g);
    const m = add(new THREE.Mesh(g, MATERIALS[k]), lane);
    m.name = `lane:${k}`;
    m.castShadow = k !== "lamp" && k !== "lit" && k !== "shop";
    m.receiveShadow = true;
  }

  // ---- Plants in the pots and trees behind the lane's end
  // (a pot's plant stands on the pot: its foot at about the pots' height)
  const potted = trees.filter((t) => t.s < 4);
  const behind = trees.filter((t) => t.s >= 4);
  for (const [list, seed, y] of [[potted, 1613, 0.42], [behind, 1617, 0]] as const) {
    for (const t of buildStreetTrees(seed, list)) {
      geometries.push(t.geometry);
      t.position.y = y;
      add(t, lane);
    }
  }

  // ---- The blade signs, standing out from the walls (marks, no words)
  const tones: SceneTone[] = ["cyan", "rose"];
  LANE.blades.forEach(([side, z, y], i) => {
    const sign = buildMarkSign({ seed: 160 + i, tone: tones[i], w: 0.32, h: 0.8, kind: "blade" });
    sign.position.set(face(side) - side * 0.5, y, z);
    if (side > 0) sign.rotation.y = Math.PI;
    add(sign, lane);
    disposers.push(() => disposeSign(sign));
  });

  // ---- The paving: blue-grey slabs, wet in the rain, the lanterns' and
  // signs' lights streaked on it (fake on every tier)
  const paving = wetPaving({
    w: (LANE.right - LANE.left) * K,
    d: (LANE.near - LANE.end) * K,
    x: ((LANE.left + LANE.right) / 2) * K,
    z: ((LANE.near + LANE.end) / 2) * K,
    y: 0,
    mode: "fake",
    map: slabs,
    color: "#959cab",
    lights: [
      ...LANE.lanterns.map(([side, z]) => ({ x: (face(side) - side * 0.62) * K, z: z * K, w: 0.04, color: "#ffc98a", height: 0.45 })),
      ...LANE.blades.map(([side, z, y], i) => ({ x: (face(side) - side * 0.5) * K, z: z * K, w: 0.05, color: SCENE_TONES[tones[i]], height: y * K })),
    ],
  });
  add(paving.mesh);
  disposers.push(paving.dispose);

  // ---- The skyline beyond the lane's end, on ground `lift` up (hidden
  // behind the lane's end): lower towers, and the four landmarks
  const lift = LANE.lift;
  const lm = LANE.landmarks;
  const keepOut = Object.values(lm).map(([x, z]) => ({ x, z, r: 6 }));
  const S = LANE.skyline;
  const towers = buildTowers(layoutTowers(S.seed, S.area, S.count, S.height, keepOut), { far: true, fogScale: 1.3 });
  for (const t of towers) {
    t.position.y = lift;
    geometries.push(t.geometry);
    add(t);
  }
  const ground = add(new THREE.Mesh(slab(S.area.x0 - 30, S.area.x1 + 30, 0, lift + 0.2, S.area.z0 - 20, S.area.z1 + 8), surface({ color: C.far, fogScale: 1.5 })));
  geometries.push(ground.geometry);
  type Maker = (d: "near" | "far", m: { body: THREE.Material; glass: THREE.Material; lit: THREE.Material }) => Landmark;
  const LANDMARKS: [Maker, readonly [number, number], { body: THREE.Material; base: string; glass: string; lit: THREE.Material; tone: SceneTone }][] = [
    [buildPearlTower, lm.pearl, { body: litSurface({ color: "#d6ccc8", tone: "rose", strength: 0.22 }), base: "#bfb2ad", glass: "#8a6f88", lit: litSurface({ color: "#b4728f", tone: "rose", strength: 1.1 }), tone: "rose" }],
    [buildWorldFinancialCenter, lm.worldFinancialCenter, { body: surface({ color: "#7a93ad", fogScale: 1.1 }), base: "#5f7a95", glass: "#86aacb", lit: litSurface({ color: "#a7bfd4", tone: "cyan", strength: 1.05 }), tone: "cyan" }],
    [buildJinMao, lm.jinMao, { body: surface({ color: "#a69a83", fogScale: 1.1 }), base: "#7a705f", glass: "#45607b", lit: litSurface({ color: "#b9ab8e", tone: "gold", strength: 0.95 }), tone: "gold" }],
    [buildShanghaiTower, lm.shanghaiTower, { body: surface({ color: "#86a0b8", fogScale: 1.1 }), base: "#6b88a4", glass: "#8db3d3", lit: litSurface({ color: "#a9c0d4", tone: "gold", strength: 1.0 }), tone: "gold" }],
  ];
  for (const [builder, [x, z], c] of LANDMARKS) {
    const landmark = builder(mobile ? "far" : "near", { body: c.body, glass: windowMaterial({ base: c.base, glass: c.glass, fogScale: 1.1 }), lit: c.lit });
    landmark.group.position.set(x, lift, z);
    landmark.group.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) geometries.push((o as THREE.Mesh).geometry);
    });
    add(landmark.group);
    for (const m of landmark.lit) {
      m.geometry.computeBoundingSphere();
      const s = m.geometry.boundingSphere!;
      glow.push({ pos: s.center.clone().add(landmark.group.position), color: SCENE_TONES[c.tone], size: Math.min(3, s.radius * 0.8) });
    }
  }

  // ---- The mobile tier has no bloom: soft glow sprites stand in for it
  if (mobile) {
    const sprites = glowSprites([...glow, ...glowPoints(group)]);
    add(sprites);
    geometries.push(sprites.geometry);
    disposers.push(() => sprites.dispose());
  }

  return {
    group,
    spots,
    dispose: () => {
      geometries.forEach((g) => g.dispose());
      disposers.forEach((d) => d());
    },
  };
}

const face = (side: number) => (side < 0 ? LANE.left : LANE.right);

// After dark the lanterns warm the brick and the stones round them, and the
// blade signs throw their colour on the walls (kit/glow.ts: pools)
const SIGN_TONES: SceneTone[] = ["cyan", "rose"];
const POOLS: GlowPool[] = [
  ...LANE.lanterns.map(([side, z]): GlowPool => ({ pos: [(face(side) - side * 0.75) * K, 2.6 * K, z * K], reach: 3.6 * K, color: "#ffb873", strength: 1.1 })),
  ...LANE.blades.map(([side, z, y], i): GlowPool => ({ pos: [(face(side) - side * 0.5) * K, y * K, z * K], reach: 2.6 * K, color: SCENE_TONES[SIGN_TONES[i]], strength: 0.5 })),
];
// By day the right-hand houses shade the right side of the lane (the sun
// is on the right, as in the plate: longtang.def.ts: sun)
const SHADE: DayShade = {
  kind: "edge",
  box: [LANE.left * K, LANE.end * K, LANE.right * K, LANE.near * K],
  dir: [1, 0],
  at: (LANE.right - LANE.left) * 0.58 * K,
  depth: 0.38,
  top: 0.05,
};

function AboutScene({ quality, active }: SceneProps) {
  const built = useMemo(() => build(quality), [quality]);
  useGlowPools("longtang", POOLS, active);
  useDayShade("longtang", SHADE, active);
  useDisposeOnUnmount(built);
  return (
    <>
      <primitive object={built.group} />
      <SceneLights id="longtang" spots={built.spots} distance={3} angle={1.1} night={0.8} />
    </>
  );
}

export default AboutScene;
