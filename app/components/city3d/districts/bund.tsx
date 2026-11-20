"use client";

import { useEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { SceneLights, useMovers, type Mover, type SceneProps } from "../common";
import { blob, box, merge } from "../kit/geometry";
import { buildJinMao, buildPearlTower, buildShanghaiTower, buildWorldFinancialCenter, type Landmark } from "../kit/landmarks";
import { aircraftLights, buildBoat } from "../kit/movers";
import { glowSprites, litSurface, neonMaterial, SCENE_TONES, screenMaterial, type SceneTone } from "../kit/neon";
import { reflectIn, type LightStrip } from "../kit/reflection";
import { buildSkyDome } from "../kit/sky";
import { buildLampRow, buildRailing, glowMaterial } from "../kit/street";
import { surface } from "../kit/surface";
import { track } from "../kit/textures";
import { buildTowers, layoutTowers } from "../kit/towers";
import { buildStreetTrees } from "../kit/trees";
import { buildRiver, wetPaving } from "../kit/water";
import { windowMaterial } from "../kit/windows";
import { rng } from "../rng";
import type { V3 } from "../scenes";
import { useWorld } from "../store";
import { TIERS, type Quality } from "../tiers";
import { BUND } from "./bund.def";

// Contact, the promenade along the river, composed as its two paintings
// (app/assets/city/bund-day.webp, -night.webp). The camera stands on the
// promenade and looks along it (bund.def.ts); one unit is ten metres.
// Left to right the frame is:
//
//   a big plane tree over the left edge, a bed of hydrangeas under it;
//   the stone facades along the road, their bays instanced (pilasters,
//   windows lit warm after dark), floodlit gold at night (kit/neon.ts:
//   litSurface), the domed bank and the clock tower whose clock shows
//   Richmond Hill's time (store: hour; a face painted on a canvas, redrawn
//   when the minute changes); trees and planters along the road;
//   a glass kiosk lit cyan, scenery only (nothing here is clickable);
//   the paving, wet in the rain, the lamps streaked on it;
//   the railing on stone piers, a lamp on each, four near the eye carrying
//   the place's four spot lights (scenes.ts: DISTRICT_LIGHTS.bund), the
//   rest lit surfaces with a soft pool;
//   the river (planar on the high tier, painted streaks of the far
//   skyline's lights on every tier), a ferry (a mover), and across it the
//   skyline with its four landmarks, the Pearl right of the middle.
//
// No words anywhere in the scene, no decorative signs. Where everything
// stands is data (bund.def.ts: BUND), in (side, along) coordinates.

const B = BUND;
// (side to the right, along the promenade) → the scene's x and z
const X = (s: number) => -s;
const Z = (a: number) => a;

const LAND = 0;
const WATER_Y = B.edge.water;

// Colours, from the plates
const PAVING = "#a49a8c";
const ROAD = "#5d6066";
const STONE = "#f0e2c4";
const STONE_TRIM = "#f6ecd4";
const PIER = "#c9bba0";
const METAL = "#2a3138";
const GLASS_DAY = "#3c4756";

const dim = (tone: SceneTone, k: number) => `#${new THREE.Color(SCENE_TONES[tone]).multiplyScalar(k).getHexString()}`;

// The clock: Richmond Hill's hour (0..24, minutes as a fraction), read by
// the face's painter whenever it is redrawn
const clock = { hour: 12 };
function paintClock(g: CanvasRenderingContext2D, w: number, h: number) {
  const c = w / 2;
  const R = w / 2 - 4;
  g.fillStyle = "#1f2226";
  g.fillRect(0, 0, w, h);
  g.fillStyle = "#f1ead6";
  g.beginPath();
  g.arc(c, c, R, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = "#2b2f33";
  g.lineWidth = w * 0.03;
  g.stroke();
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * Math.PI * 2;
    const long = i % 5 === 0;
    g.lineWidth = long ? w * 0.028 : w * 0.009;
    g.beginPath();
    g.moveTo(c + Math.cos(a) * R * (long ? 0.74 : 0.84), c + Math.sin(a) * R * (long ? 0.74 : 0.84));
    g.lineTo(c + Math.cos(a) * R * 0.92, c + Math.sin(a) * R * 0.92);
    g.stroke();
  }
  const minutes = Math.floor((((clock.hour % 24) + 24) % 24) * 60);
  const hand = (turn: number, len: number, width: number) => {
    const a = turn * Math.PI * 2 - Math.PI / 2;
    g.lineWidth = width;
    g.lineCap = "round";
    g.beginPath();
    g.moveTo(c, c);
    g.lineTo(c + Math.cos(a) * len, c + Math.sin(a) * len);
    g.stroke();
  };
  g.strokeStyle = "#22262a";
  hand((minutes % 720) / 720, R * 0.5, w * 0.045);
  hand((minutes % 60) / 60, R * 0.78, w * 0.025);
  g.fillStyle = "#22262a";
  g.beginPath();
  g.arc(c, c, w * 0.03, 0, Math.PI * 2);
  g.fill();
}
// The promenade's paving: square stone slabs, a little uneven in tone,
// painted once from a seed and repeated, one slab a metre
let tiles: THREE.CanvasTexture | null = null;
function pavingTiles(w: number, d: number) {
  if (!tiles) {
    const size = 256;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const g = canvas.getContext("2d")!;
    const r = rng(37);
    const n = 4;
    const cell = size / n;
    const base = new THREE.Color(PAVING);
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        const k = 0.9 + r() * 0.16;
        g.fillStyle = `#${base.clone().multiplyScalar(k).getHexString()}`;
        g.fillRect(i * cell, j * cell, cell, cell);
      }
    g.strokeStyle = "rgba(70,60,50,0.32)";
    g.lineWidth = 2;
    for (let i = 0; i <= n; i++) {
      g.beginPath();
      g.moveTo(i * cell, 0);
      g.lineTo(i * cell, size);
      g.moveTo(0, i * cell);
      g.lineTo(size, i * cell);
      g.stroke();
    }
    tiles = track(new THREE.CanvasTexture(canvas));
    tiles.colorSpace = THREE.SRGBColorSpace;
    tiles.wrapS = tiles.wrapT = THREE.RepeatWrapping;
    tiles.anisotropy = 8;
  }
  // a slab 0.1 units square: n slabs a repeat
  tiles.repeat.set(w / 0.4, d / 0.4);
  return tiles;
}

const clockMaterial = () => screenMaterial(paintClock, { w: 256, h: 256, key: "bund:clock" });

type Built = {
  group: THREE.Group;
  spots: V3[];
  movers: Mover[];
  dispose: () => void;
};

function build(quality: Quality): Built {
  const group = new THREE.Group();
  group.name = "bund";
  const geometries: THREE.BufferGeometry[] = [];
  const disposers: (() => void)[] = [];
  const mode = TIERS[quality].reflection;
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
  const instanced = (geometry: THREE.BufferGeometry, material: THREE.Material, matrices: THREE.Matrix4[], name: string) => {
    geometries.push(geometry);
    const m = new THREE.InstancedMesh(geometry, material, matrices.length);
    matrices.forEach((x, i) => m.setMatrixAt(i, x));
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
    m.name = name;
    return add(m);
  };
  // A box between two sides, two alongs and two heights
  const slab = (s0: number, s1: number, a0: number, a1: number, y0: number, y1: number) =>
    box(Math.abs(s1 - s0), y1 - y0, Math.abs(a1 - a0)).translate((X(s0) + X(s1)) / 2, (y0 + y1) / 2, (Z(a0) + Z(a1)) / 2);
  const glow: { pos: THREE.Vector3; color: string; size: number }[] = [];
  const waterLights: LightStrip[] = [];

  // ---- The sky
  const sky = add(buildSkyDome({ seed: 107, radius: 900 }));
  geometries.push(sky.geometry);

  // ---- The ground: the promenade's paving (wet in the rain, the lamps
  // streaked on it), the road, the river wall
  const lampAlong = Array.from({ length: B.lamps.count }, (_, i) => B.lamps.from + i * B.lamps.step);
  const P = B.promenade;
  const paving = wetPaving({
    w: P.s1 - P.s0,
    d: P.a1 - P.a0,
    x: (X(P.s0) + X(P.s1)) / 2,
    z: (Z(P.a0) + Z(P.a1)) / 2,
    y: LAND,
    mode: "fake",
    color: "#ffffff",
    map: pavingTiles(P.s1 - P.s0, P.a1 - P.a0),
    lights: [
      ...lampAlong.slice(0, 24).map((a) => ({ x: X(B.lamps.s - 0.1), z: Z(a), w: 0.12, color: "#ffc98a", height: 0.75 })),
      { x: X(B.kiosk.s), z: Z(B.kiosk.a), w: 0.08, color: SCENE_TONES.cyan, height: 0.3 },
    ],
  });
  add(paving.mesh);
  disposers.push(paving.dispose);
  mesh(
    merge([
      slab(B.road.s0 - 4, B.road.s1, P.a0, P.a1, LAND - 0.3, LAND - 0.004),
      slab(P.s0, P.s1, P.a0, P.a1, LAND - 0.3, LAND - 0.01),
      // the kerb
      slab(P.s0 - 0.03, P.s0, P.a0, P.a1, LAND, LAND + 0.015),
    ]),
    surface({ color: ROAD, grime: 0.2 }),
    "road",
  );
  // The river wall down to the water, and the parapet the railing stands on
  const E = B.edge;
  mesh(merge([slab(E.s - 0.02, E.s + 0.1, P.a0, P.a1, WATER_Y - 0.2, LAND + 0.06), slab(E.s + 0.1, E.s + 0.18, P.a0, P.a1, WATER_Y - 0.2, LAND - 0.02)]), surface({ color: PIER, grime: 0.6 }), "river-wall");
  const railing = add(buildRailing([new THREE.Vector3(X(E.s + 0.03), LAND + 0.06, Z(P.a0)), new THREE.Vector3(X(E.s + 0.03), LAND + 0.06, Z(P.a1))]));
  geometries.push(railing.geometry);

  // ---- The piers and their lamps: the four nearest are the spot lights
  const L = B.lamps;
  const pierGeo = box(0.11, L.pier, 0.11).translate(0, L.pier / 2, 0);
  const pierCap = box(0.13, 0.015, 0.13).translate(0, L.pier + 0.0075, 0);
  const one = new THREE.Vector3(1, 1, 1);
  const q = new THREE.Quaternion();
  instanced(merge([pierGeo, pierCap]), surface({ color: PIER, grime: 0.4 }), lampAlong.map((a) => new THREE.Matrix4().compose(new THREE.Vector3(X(L.s), LAND, Z(a)), q, one)), "piers");
  // heads over the promenade (the lamp's head is over its +x; the
  // promenade is +x of the railing)
  const lampSpots = lampAlong.map((a) => ({ x: X(L.s), y: LAND + L.pier + 0.015, z: Z(a), ry: 0 }));
  const lit = buildLampRow(lampSpots.slice(L.spots, L.spots + 4), { light: "spot" });
  const rest = buildLampRow([...lampSpots.slice(0, L.spots), ...lampSpots.slice(L.spots + 4)]);
  for (const row of [lit, rest]) {
    row.meshes.forEach((m) => add(m));
    disposers.push(row.dispose);
  }
  const spots = lit.heads.map((h) => [h.x, h.y - 0.01, h.z] as V3);
  for (const h of [...lit.heads, ...rest.heads.slice(0, 20)]) glow.push({ pos: h, color: "#ffc98a", size: 0.12 });
  for (const a of lampAlong.slice(0, 20)) waterLights.push({ x: X(L.s + 0.15), z: Z(a), w: 0.1, color: "#ffc98a", height: 0.9 });

  // ---- The facades: stone bodies along the road, their fronts toward
  // the river, each bay a pilaster and a column of windows (instanced),
  // the crowns on top
  const F = B.front;
  const back = 2.6;
  const stone = litSurface({ color: STONE, tone: "gold", strength: 0.34 });
  const trim = litSurface({ color: STONE_TRIM, tone: "gold", strength: 0.5 });
  const roof = surface({ color: "#6d7a74", grime: 0.4 });
  const bodies: THREE.BufferGeometry[] = [];
  const trims: THREE.BufferGeometry[] = [];
  const roofs: THREE.BufferGeometry[] = [];
  const pilasters: THREE.Matrix4[] = [];
  const panesOn: THREE.Matrix4[] = [];
  const panesOff: THREE.Matrix4[] = [];
  const wr = rng(97);
  const BAY = 0.42;
  const FLOOR = 0.36;
  const GROUND = 0.46;
  const paneTurn = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 2); // facing -x, the river
  for (const b of B.buildings) {
    const len = b.a1 - b.a0;
    bodies.push(slab(F - back, F, b.a0, b.a1, LAND, b.h));
    // the ground floor's rusticated base, the string course over it, the
    // cornice and the parapet
    trims.push(slab(F, F + 0.035, b.a0, b.a1, LAND, 0.06));
    trims.push(slab(F, F + 0.04, b.a0, b.a1, GROUND - 0.02, GROUND + 0.02));
    trims.push(slab(F, F + 0.07, b.a0 - 0.03, b.a1 + 0.03, b.h - 0.12, b.h - 0.06));
    trims.push(slab(F - 0.04, F + 0.02, b.a0, b.a1, b.h - 0.06, b.h + 0.08));
    const bays = Math.max(3, Math.round(len / BAY));
    const bw = len / bays;
    const floors = Math.max(3, Math.floor((b.h - GROUND - 0.2) / FLOOR));
    for (let i = 0; i < bays; i++) {
      const a = b.a0 + (i + 0.5) * bw;
      if (i > 0) pilasters.push(new THREE.Matrix4().compose(new THREE.Vector3(X(F + 0.015), (GROUND + b.h - 0.12) / 2, Z(b.a0 + i * bw)), q, new THREE.Vector3(0.03, b.h - 0.12 - GROUND, 0.05)));
      // the ground floor's tall arched openings
      const door = new THREE.Matrix4().compose(new THREE.Vector3(X(F + 0.004), 0.22, Z(a)), paneTurn, new THREE.Vector3(bw * 0.5, 0.3, 1));
      (wr() < 0.75 ? panesOn : panesOff).push(door);
      for (let f = 0; f < floors; f++) {
        const y = GROUND + 0.1 + f * FLOOR + FLOOR * 0.42;
        if (y > b.h - 0.22) break;
        const m = new THREE.Matrix4().compose(new THREE.Vector3(X(F + 0.004), y, Z(a)), paneTurn, new THREE.Vector3(bw * 0.42, FLOOR * 0.55, 1));
        (wr() < 0.62 ? panesOn : panesOff).push(m);
      }
    }
    const mid = (b.a0 + b.a1) / 2;
    if (b.crown === "colonnade") {
      // a colonnade of round columns over the first floors, a pediment
      for (let i = 1; i < bays; i++) trims.push(new THREE.CylinderGeometry(0.032, 0.036, b.h - GROUND - 0.55, 8).translate(X(F + 0.07), (GROUND + b.h - 0.55) / 2 + 0.02, Z(b.a0 + i * bw)));
      trims.push(slab(F, F + 0.1, b.a0 + bw, b.a1 - bw, b.h - 0.58, b.h - 0.5));
    } else if (b.crown === "cupola" || b.crown === "pyramid") {
      // a small tower in the middle, a dome or a steep pyramid roof on it
      const w = b.crown === "pyramid" ? 1.1 : 0.7;
      const top = b.h + (b.crown === "pyramid" ? 0.5 : 0.45);
      bodies.push(slab(F - 0.2 - w, F - 0.2, mid - w / 2, mid + w / 2, b.h, top));
      trims.push(slab(F - 0.22 - w, F - 0.18, mid - w / 2 - 0.03, mid + w / 2 + 0.03, top - 0.06, top));
      const cap =
        b.crown === "pyramid"
          ? new THREE.ConeGeometry(w * 0.72, 0.9, 4, 1).rotateY(Math.PI / 4).translate(X(F - 0.2 - w / 2), top + 0.45, Z(mid))
          : new THREE.SphereGeometry(w * 0.42, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 1.3, 1).translate(X(F - 0.2 - w / 2), top, Z(mid));
      roofs.push(cap);
    } else {
      // a low mansard
      roofs.push(new THREE.CylinderGeometry(0.01, 1, 1, 4, 1).rotateY(Math.PI / 4).scale(back * 0.6, 0.35, len * 0.62).translate(X(F - back / 2), b.h + 0.17, Z(mid)));
    }
  }

  // The domed bank: a drum ringed with columns and a dome, a lantern on top
  const D = B.dome;
  const domeX = X(F - D.back);
  const b2 = B.buildings.find((b) => b.crown === "dome")!;
  const drumY = b2.h + 0.08 + D.attic;
  bodies.push(slab(F - D.back - D.r - 0.15, F - D.back + D.r + 0.15, D.a - D.r - 0.15, D.a + D.r + 0.15, b2.h, drumY));
  trims.push(slab(F - D.back - D.r - 0.2, F - D.back + D.r + 0.2, D.a - D.r - 0.2, D.a + D.r + 0.2, drumY - 0.06, drumY));
  trims.push(new THREE.CylinderGeometry(D.r, D.r * 1.04, 0.42, 28).translate(domeX, drumY + 0.21, Z(D.a)));
  for (let i = 0; i < 16; i++) {
    const t = (i / 16) * Math.PI * 2;
    trims.push(new THREE.CylinderGeometry(0.03, 0.03, 0.36, 6).translate(domeX + Math.cos(t) * (D.r + 0.05), drumY + 0.2, Z(D.a) + Math.sin(t) * (D.r + 0.05)));
  }
  const dome = new THREE.SphereGeometry(D.r * 0.98, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 1.05, 1).translate(domeX, drumY + 0.42, Z(D.a));
  const lantern = merge([new THREE.CylinderGeometry(0.1, 0.12, 0.26, 10).translate(domeX, drumY + 0.42 + D.r + 0.1, Z(D.a)), new THREE.ConeGeometry(0.12, 0.24, 10).translate(domeX, drumY + 0.42 + D.r + 0.35, Z(D.a))]);

  // The clock tower, on the front of the third building: a square shaft,
  // a clock on its river face and on the face toward the eye, then two
  // stages, a pyramid and a mast
  const C = B.clock;
  const b3 = B.buildings.find((b) => b.crown === "clock")!;
  const cs = F - C.w / 2 - 0.05;
  const cx = X(cs);
  const cz = Z(C.a);
  bodies.push(slab(cs - C.w / 2, cs + C.w / 2, C.a - C.w / 2, C.a + C.w / 2, b3.h - 0.1, C.top));
  trims.push(slab(cs - C.w / 2 - 0.05, cs + C.w / 2 + 0.05, C.a - C.w / 2 - 0.05, C.a + C.w / 2 + 0.05, C.top - 0.08, C.top));
  trims.push(slab(cs - C.w / 2 - 0.04, cs + C.w / 2 + 0.04, C.a - C.w / 2 - 0.04, C.a + C.w / 2 + 0.04, C.face - 0.48, C.face - 0.42));
  const s2 = C.w * 0.78;
  bodies.push(slab(cs - s2 / 2, cs + s2 / 2, C.a - s2 / 2, C.a + s2 / 2, C.top, C.top + 0.62));
  for (const [dx, dz] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) trims.push(box(0.09, 0.62, 0.09).translate(cx + (dx * s2) / 2, C.top + 0.31, cz + (dz * s2) / 2));
  trims.push(slab(cs - s2 / 2 - 0.04, cs + s2 / 2 + 0.04, C.a - s2 / 2 - 0.04, C.a + s2 / 2 + 0.04, C.top + 0.62, C.top + 0.69));
  const s3 = C.w * 0.5;
  bodies.push(slab(cs - s3 / 2, cs + s3 / 2, C.a - s3 / 2, C.a + s3 / 2, C.top + 0.69, C.top + 1.05));
  roofs.push(new THREE.ConeGeometry(s3 * 0.75, 0.42, 4, 1).rotateY(Math.PI / 4).translate(cx, C.top + 1.26, cz));
  trims.push(new THREE.CylinderGeometry(0.008, 0.008, 0.5, 4).translate(cx, C.top + 1.7, cz));
  // the clock's openings: a lit slot under each stage's cornice
  for (let i = 0; i < 3; i++) panesOn.push(new THREE.Matrix4().compose(new THREE.Vector3(X(cs + s2 / 2 + 0.003), C.top + 0.3, Z(C.a - s2 / 2 + (i + 0.5) * (s2 / 3))), paneTurn, new THREE.Vector3(0.12, 0.36, 1)));

  mesh(merge(bodies), stone, "facades");
  mesh(merge(trims), trim, "facades:trim");
  mesh(merge([...roofs]), roof, "facades:roofs");
  mesh(merge([dome, lantern]), litSurface({ color: "#cbbd9f", tone: "gold", strength: 0.75 }), "dome");
  instanced(box(1, 1, 1), trim, pilasters, "facades:pilasters");
  const pane = new THREE.PlaneGeometry(1, 1);
  instanced(pane, glowMaterial({ day: GLASS_DAY, night: "#ffcd86" }), panesOn, "facades:windows-lit");
  instanced(pane.clone(), glowMaterial({ day: GLASS_DAY, night: "#3a3128" }), panesOff, "facades:windows");
  glow.push({ pos: new THREE.Vector3(domeX, drumY + 0.6, Z(D.a)), color: SCENE_TONES.gold, size: 1.4 });
  glow.push({ pos: new THREE.Vector3(cx, C.top + 0.4, cz), color: SCENE_TONES.gold, size: 1.0 });

  // The clock's two faces
  const faceGeo = new THREE.CircleGeometry(0.3, 40);
  const faces = mesh(merge([faceGeo.clone().rotateY(-Math.PI / 2).translate(X(cs + C.w / 2 + 0.006), C.face, cz), faceGeo.clone().rotateY(Math.PI).translate(cx, C.face, Z(C.a - C.w / 2 - 0.006))]), clockMaterial(), "clock");
  faceGeo.dispose();
  faces.renderOrder = 1;

  // ---- Trees along the road, the big one at the left edge, planters of
  // flowers between them, the bed of hydrangeas near the eye
  const T = B.trees;
  const tr = rng(53);
  const treeSpots: { x: number; z: number; s: number }[] = [];
  for (let a = T.from; a <= T.to; a += T.step) treeSpots.push({ x: X(T.s + tr.range(-0.1, 0.1)), z: Z(a + tr.range(-0.15, 0.15)), s: tr.range(0.8, 0.98) });
  treeSpots.push({ x: X(B.bigTree.s), z: Z(B.bigTree.a), s: B.bigTree.size });
  const trees = buildStreetTrees(29, treeSpots);
  for (const t of trees) {
    geometries.push(t.geometry);
    add(t);
  }
  const fr = rng(59);
  const planterParts: THREE.BufferGeometry[] = [];
  const leaves: THREE.BufferGeometry[] = [];
  const blooms: [THREE.BufferGeometry[], THREE.BufferGeometry[]] = [[], []];
  const flowers = (s0: number, s1: number, a0: number, a1: number, top: number, n: number) => {
    for (let i = 0; i < n; i++) {
      const s = fr.range(s0 + 0.04, s1 - 0.04);
      const a = fr.range(a0 + 0.04, a1 - 0.04);
      leaves.push(blob(fr, fr.range(0.06, 0.1), 0.7, 0.25, 1).translate(X(s), top + 0.03, Z(a)));
      if (fr() < 0.8) blooms[fr() < 0.55 ? 0 : 1].push(blob(fr, fr.range(0.025, 0.04), 0.9, 0.3, 1).translate(X(s + fr.range(-0.03, 0.03)), top + fr.range(0.07, 0.11), Z(a + fr.range(-0.03, 0.03))));
    }
  };
  const Bd = B.bed;
  planterParts.push(slab(Bd.s0, Bd.s1, Bd.a0, Bd.a1, LAND, 0.085));
  flowers(Bd.s0, Bd.s1, Bd.a0, Bd.a1, 0.085, 70);
  for (let a = B.planters.from; a <= B.planters.to; a += B.planters.step) {
    if (a > Bd.a0 - 0.4 && a < Bd.a1 + 0.4) continue;
    const s = B.planters.s;
    planterParts.push(slab(s - 0.14, s + 0.14, a - 0.22, a + 0.22, LAND, 0.065));
    flowers(s - 0.14, s + 0.14, a - 0.22, a + 0.22, 0.065, 5);
  }
  mesh(merge(planterParts), surface({ color: PIER, grime: 0.5 }), "planters");
  mesh(merge(leaves), surface({ color: "#4d7a3c" }), "planters:leaves");
  mesh(merge(blooms[0]), surface({ color: "#9d8fd8" }), "planters:hydrangea-blue");
  mesh(merge(blooms[1]), surface({ color: "#d99ac4" }), "planters:hydrangea-pink");

  // ---- The glass kiosk, lit cyan (scenery): a dark frame, glass that
  // glows cyan after dark, a phone inside, a lit strip under its roof
  const K = B.kiosk;
  const kx = X(K.s);
  const kz = Z(K.a);
  const frame: THREE.BufferGeometry[] = [box(K.w + 0.02, 0.012, K.d + 0.02).translate(kx, 0.006, kz), box(K.w + 0.06, 0.016, K.d + 0.05).translate(kx, K.h + 0.008, kz)];
  for (const [dx, dz] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) frame.push(box(0.012, K.h, 0.012).translate(kx + (dx * K.w) / 2, K.h / 2, kz + (dz * K.d) / 2));
  frame.push(box(K.w, 0.01, 0.006).translate(kx, K.h * 0.55, kz - K.d / 2), box(0.006, 0.01, K.d).translate(kx - K.w / 2, K.h * 0.55, kz));
  frame.push(box(0.045, 0.07, 0.02).translate(kx + 0.02, K.h * 0.55, kz + K.d / 2 - 0.02));
  mesh(merge(frame), surface({ color: METAL }), "kiosk");
  const glass = [box(K.w - 0.01, K.h - 0.02, 0.004).translate(kx, K.h / 2, kz - K.d / 2), box(K.w - 0.01, K.h - 0.02, 0.004).translate(kx, K.h / 2, kz + K.d / 2), box(0.004, K.h - 0.02, K.d - 0.01).translate(kx - K.w / 2, K.h / 2, kz), box(0.004, K.h - 0.02, K.d - 0.01).translate(kx + K.w / 2, K.h / 2, kz)];
  mesh(merge(glass), litSurface({ color: "#93b4ba", tone: "cyan", strength: 0.16 }), "kiosk:glass");
  mesh(box(K.w - 0.02, 0.008, K.d - 0.02).translate(kx, K.h - 0.006, kz), neonMaterial(dim("cyan", 0.55), { dayColor: "#c9dce0" }), "kiosk:light");
  glow.push({ pos: new THREE.Vector3(kx, K.h * 0.6, kz), color: SCENE_TONES.cyan, size: 0.35 });

  // ---- The far bank, its trees, and the skyline with its landmarks
  const W = 600;
  const bankLand = mesh(merge([slab(B.bank, B.bank + W, -200, 600, -0.4, LAND + 0.05), slab(B.bank - 0.2, B.bank, -200, 600, WATER_Y - 0.2, LAND + 0.1), slab(-W, P.s1, P.a1, 600, -0.4, LAND + 0.05)]), surface({ color: "#55604f", grime: 0.3, snow: true, fogScale: 1.2 }), "bank");
  const lm = B.landmarks;
  const keepOut = Object.values(lm).map(([s, a]) => ({ x: X(s), z: Z(a), r: 6 }));
  const area = (o: { s0: number; s1: number; a0: number; a1: number }) => ({ x0: X(o.s1), x1: X(o.s0), z0: Z(o.a0), z1: Z(o.a1) });
  const S = B.skyline;
  const front = layoutTowers(S.front.seed, area(S.front.area), S.front.count, S.front.height, keepOut);
  const midTowers = layoutTowers(S.mid.seed, area(S.mid.area), S.mid.count, S.mid.height, keepOut);
  const far = layoutTowers(S.far.seed, area(S.far.area), S.far.count, S.far.height, keepOut);
  const upriver = layoutTowers(S.upriver.seed, area(S.upriver.area), S.upriver.count, S.upriver.height);
  const nearTowers = buildTowers([...front, ...midTowers], { far: false, fogScale: 1.1 });
  const farTowers = buildTowers([...far, ...upriver], { far: true, fogScale: 1.4 });
  for (const t of [...nearTowers, ...farTowers]) {
    geometries.push(t.geometry);
    add(t);
  }
  const detail = mobile ? "far" : "near";
  type Maker = (d: "near" | "far", m: { body: THREE.Material; glass: THREE.Material; lit: THREE.Material }) => Landmark;
  const LANDMARKS: [Maker, readonly [number, number], { body: THREE.Material; base: string; glass: string; lit: THREE.Material; tone: SceneTone }][] = [
    [buildPearlTower, lm.pearl, { body: litSurface({ color: "#d6ccc8", tone: "rose", strength: 0.22 }), base: "#bfb2ad", glass: "#8a6f88", lit: litSurface({ color: "#b4728f", tone: "rose", strength: 1.1 }), tone: "rose" }],
    [buildWorldFinancialCenter, lm.worldFinancialCenter, { body: surface({ color: "#7a93ad", fogScale: 1.1 }), base: "#5f7a95", glass: "#86aacb", lit: litSurface({ color: "#a7bfd4", tone: "cyan", strength: 1.05 }), tone: "cyan" }],
    [buildJinMao, lm.jinMao, { body: surface({ color: "#a69a83", fogScale: 1.1 }), base: "#7a705f", glass: "#45607b", lit: litSurface({ color: "#b9ab8e", tone: "gold", strength: 0.95 }), tone: "gold" }],
    [buildShanghaiTower, lm.shanghaiTower, { body: surface({ color: "#86a0b8", fogScale: 1.1 }), base: "#6b88a4", glass: "#8db3d3", lit: litSurface({ color: "#a9c0d4", tone: "gold", strength: 1.0 }), tone: "gold" }],
  ];
  const landmarks: Landmark[] = [];
  for (const [builder, [s, a], c] of LANDMARKS) {
    const landmark = builder(detail, { body: c.body, glass: windowMaterial({ base: c.base, glass: c.glass, fogScale: 1.1 }), lit: c.lit });
    landmark.group.position.set(X(s), LAND, Z(a));
    landmark.group.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) geometries.push((o as THREE.Mesh).geometry);
    });
    add(landmark.group);
    landmarks.push(landmark);
    for (const m of landmark.lit) {
      m.geometry.computeBoundingSphere();
      const sphere = m.geometry.boundingSphere!;
      glow.push({ pos: sphere.center.clone().add(landmark.group.position), color: SCENE_TONES[c.tone], size: Math.min(3, sphere.radius * 0.8) });
    }
    waterLights.push({ x: X(s - 4), z: Z(a), w: 0.6, color: SCENE_TONES[c.tone], height: 14 });
  }

  // Neon on the skyline, as accents: lit crowns on some of the taller
  // towers (one merged mesh per tone), and their lights in the water
  const accents = rng(43);
  const tones: SceneTone[] = ["cyan", "rose", "gold", "cyan", "rose"];
  const crowns: Record<SceneTone, THREE.BufferGeometry[]> = { cyan: [], rose: [], gold: [] };
  for (const t of [...front, ...midTowers].sort((p, n) => p.seed - n.seed)) {
    const tone = accents.pick(tones);
    if (t.h > 8 && accents() < 0.5) {
      const band = 0.4;
      const y = t.h - band / 2 - 0.05;
      for (const p of [box(t.w + 0.04, band, 0.05).translate(0, 0, t.d / 2 + 0.02), box(t.w + 0.04, band, 0.05).translate(0, 0, -t.d / 2 - 0.02), box(0.05, band, t.d).translate(t.w / 2 + 0.02, 0, 0), box(0.05, band, t.d).translate(-t.w / 2 - 0.02, 0, 0)])
        crowns[tone].push(p.rotateY(t.ry).translate(t.x, y, t.z));
      waterLights.push({ x: t.x + t.w / 2, z: t.z, w: t.w * 0.25, color: SCENE_TONES[tone], height: t.h * 0.5 });
      glow.push({ pos: new THREE.Vector3(t.x, y, t.z), color: SCENE_TONES[tone], size: t.w * 0.7 });
    } else if (accents() < 0.25) {
      waterLights.push({ x: t.x + t.w / 2, z: t.z, w: Math.max(0.2, t.w * 0.15), color: accents() < 0.9 ? "#ffc98a" : "#bfe4ff", height: t.h * 0.3 });
    }
  }
  for (const tone of ["cyan", "rose", "gold"] as SceneTone[]) if (crowns[tone].length) mesh(merge(crowns[tone]), neonMaterial(dim(tone, 0.5), { dayColor: dim(tone, 0.7) }), `neon:${tone}`);

  const bankTreeSpots: { x: number; z: number; s: number }[] = [];
  const bt = rng(67);
  for (let a = -20; a <= 280; a += 2.2) bankTreeSpots.push({ x: X(B.bank + 1 + bt.range(0, 1.2)), z: Z(a + bt.range(-0.5, 0.5)), s: bt.range(0.9, 1.3) });
  const bankTrees = buildStreetTrees(31, bankTreeSpots);
  for (const t of bankTrees) {
    geometries.push(t.geometry);
    t.position.y = LAND + 0.05;
    add(t);
  }

  // ---- The river, from the wall to the far bank, on past the
  // promenade's end
  const riverS0 = E.s + 0.18;
  const riverS1 = B.bank;
  const river = buildRiver({ w: riverS1 - riverS0 + 0.4, d: 680, x: (X(riverS0) + X(riverS1)) / 2, z: 260, y: WATER_Y, mode, lights: waterLights, size: TIERS[quality].reflectionSize || undefined });
  add(river.mesh);
  disposers.push(river.dispose);

  // ---- The ferry (a mover), the landmarks' warning lights, steady
  const lane = new THREE.Group();
  lane.rotation.y = -Math.PI / 2; // its lane's x along the promenade, its z across the river
  lane.position.y = WATER_Y;
  const boat = buildBoat(B.boat.seed, { z: B.boat.s, x0: B.boat.a0, x1: B.boat.a1, period: B.boat.period });
  lane.add(boat.object);
  add(lane);
  disposers.push(() => boat.object.userData.dispose?.());
  const tops = [...landmarks.map((l) => new THREE.Vector3(0, l.height + 0.1, 0).add(l.group.position)), ...midTowers.filter((t) => t.h > 20).map((t) => new THREE.Vector3(t.x, t.h + 0.08, t.z))];
  const air = aircraftLights(11, tops);
  air.park();
  add(air.object);
  disposers.push(() => air.object.userData.dispose?.());

  // ---- What the planar river reflects (high tier): not the sky, whose
  // horizon at this low eye would fill the whole river with its glow
  if (mode === "planar") reflectIn(...nearTowers, ...farTowers, ...landmarks.map((l) => l.group), bankLand, ...bankTrees, lane, air.object, ...group.children.filter((o) => o.name.startsWith("neon:")));

  // ---- Mobile has no bloom: soft glow sprites on what's lit
  if (mobile) {
    const sprites = glowSprites(glow);
    add(sprites);
    geometries.push(sprites.geometry);
    disposers.push(() => sprites.dispose());
  }

  return {
    group,
    spots,
    movers: [boat],
    dispose: () => {
      geometries.forEach((g) => g.dispose());
      disposers.forEach((d) => d());
    },
  };
}

function ContactScene({ quality, active, still }: SceneProps) {
  const built = useMemo(() => build(quality), [quality]);
  useMovers(built.movers, { active, still });
  useEffect(() => () => built.dispose(), [built]);
  // The clock follows Richmond Hill's hour, redrawn when the minute changes
  const hour = useWorld((s) => s.hour);
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    const minute = Math.floor(hour * 60);
    if (Math.floor(clock.hour * 60) === minute && clockMaterial().userData.drawn) return;
    clock.hour = hour;
    const m = clockMaterial();
    (m.userData.redraw as () => void)();
    m.userData.drawn = true;
    invalidate();
  }, [hour, built, invalidate]);
  return (
    <>
      <primitive object={built.group} />
      <SceneLights id="bund" spots={built.spots} />
    </>
  );
}

export default ContactScene;
