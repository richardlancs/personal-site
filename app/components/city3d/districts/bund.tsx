"use client";

import { useEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useDayShade, useDisposeOnUnmount, useGlowPools, SceneLights, useMovers, type Mover, type SceneProps } from "../common";
import { glassMaterial } from "../kit/glass";
import type { DayShade, GlowPool } from "../kit/glow";
import { blob, box, merge } from "../kit/geometry";
import { buildJinMao, buildPearlTower, buildShanghaiTower, buildWorldFinancialCenter, type Landmark } from "../kit/landmarks";
import { aircraftLights, buildBoat } from "../kit/movers";
import { clockMaterial, glowSprites, litSurface, neonMaterial, SCENE_TONES, type SceneTone } from "../kit/neon";
import { reflectIn, type LightStrip } from "../kit/reflection";
import { buildSkyDome } from "../kit/sky";
import { buildLampRow, buildRailing, glowMaterial } from "../kit/street";
import { surface } from "../kit/surface";
import { pavingTexture, setClockHour } from "../kit/textures";
import { buildTowers, layoutTowers } from "../kit/towers";
import { buildPlanters, buildStreetTrees } from "../kit/trees";
import { buildRiver, wetPaving } from "../kit/water";
import { windowMaterial } from "../kit/windows";
import { rng } from "../rng";
import type { V3 } from "../scenes";
import { useWorld, world } from "../store";
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
//   the railing on stone piers, a lantern post on each, four near the eye
//   carrying the place's four spot lights (scenes.ts: DISTRICT_LIGHTS.bund),
//   the nearer ones' light pooled on the paving and all of them long in it
//   after dark;
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
const PAVING = "#e0cfb0";
const ROAD = "#5d6066";
const STONE = "#f0e2c4";
const STONE_TRIM = "#f6ecd4";
const PIER = "#c9bba0";
const METAL = "#2a3138";
const GLASS_DAY = "#3c4756";

const dim = (tone: SceneTone, k: number) => `#${new THREE.Color(SCENE_TONES[tone]).multiplyScalar(k).getHexString()}`;

// The promenade's paving: square stone slabs a metre across (the kit's
// paving, four to a tile 0.4 units square)
const pavingTiles = (w: number, d: number) => pavingTexture({ seed: 37, kind: "grid", cols: 4, rows: 4, joint: 2, repeat: [w / 0.4, d / 0.4] });

// After dark: the lamps' light on the promenade and the facades' fronts
// near the eye, and the kiosk's cyan on the stones round it (kit/glow.ts:
// pools)
const POOLS: GlowPool[] = [
  ...Array.from({ length: 8 }, (_, i): GlowPool => ({ pos: [X(BUND.lamps.s - 0.22), LAND + BUND.lamps.pier + 0.4, Z(BUND.lamps.from + i * BUND.lamps.step)], reach: 1.65, color: "#ffc98a", strength: 1.2 })),
  // and on down the row, past the eighth lamp: one line pool
  { from: [X(BUND.lamps.s - 0.22), LAND + BUND.lamps.pier + 0.4, Z(BUND.lamps.from + 8 * BUND.lamps.step)], to: [X(BUND.lamps.s - 0.22), LAND + BUND.lamps.pier + 0.4, Z(BUND.lamps.from + 30 * BUND.lamps.step)], reach: 1.4, color: "#ffc98a", strength: 0.7 },
  { pos: [X(BUND.kiosk.s), BUND.kiosk.h * 0.6, Z(BUND.kiosk.a)], reach: 0.6, color: SCENE_TONES.cyan, strength: 0.9 },
  { pos: [X(BUND.front + 0.6), 0.5, Z(BUND.clock.a)], reach: 1.6, color: "#ffd9a0", strength: 0.5 },
];


// The plates' trees: bright yellow-green, leafy, lit warm from below
const TREES = { greens: ["#9cbb48", "#87ad3e", "#a8c454", "#7aa23c"], underGlow: { tone: "#ffc070", strength: 0.75 }, leaves: 0.55 };

// By day: the trees' dappled shade over the near promenade, as the day
// plate paints it (kit/glow.ts: DayShade, no shadow map)
const SHADE: DayShade = { kind: "dapple", box: [X(BUND.promenade.s1), -16, X(BUND.road.s0), 6], depth: 0.32, top: 0.1, period: 0.55, duty: 0.5, walls: 0 };

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
  const tiles = pavingTiles(P.s1 - P.s0, P.a1 - P.a0);
  disposers.push(() => tiles.dispose());
  const pavingPlace = { w: P.s1 - P.s0, d: P.a1 - P.a0, x: (X(P.s0) + X(P.s1)) / 2, z: (Z(P.a0) + Z(P.a1)) / 2 };
  // the plate's promenade after dark: polished stone holding the night
  // sky's blue-grey everywhere (its night glow), the lamps' warmth in their
  // pools, and the lamps and the kiosk long in it as fine strokes (the
  // kit's polish: after dark only, never doubled in rain; one strip a lamp,
  // the nearest sixteen)
  const paving = wetPaving({
    ...pavingPlace,
    y: LAND,
    mode: "fake",
    color: PAVING,
    map: tiles,
    snow: true,
    glow: { tone: "#7d93bd", strength: 0.075 },
    polish: 1,
    lights: [
      ...lampAlong.slice(0, 16).map((a) => ({ x: X(B.lamps.s - 0.1), z: Z(a), w: 0.18, color: "#ffc98a", height: 0.8 })),
      { x: X(B.kiosk.s), z: Z(B.kiosk.a), w: 0.1, color: SCENE_TONES.cyan, height: 0.3 },
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
  mesh(merge([slab(E.s - 0.02, E.s + 0.1, P.a0, P.a1, WATER_Y - 0.2, LAND + 0.06), slab(E.s + 0.1, E.s + 0.18, P.a0, P.a1, WATER_Y - 0.2, LAND - 0.02)]), surface({ color: PIER, grime: 0.6, glow: { tone: "#ffc98a", strength: 0.05 } }), "river-wall");
  const railing = add(buildRailing([new THREE.Vector3(X(E.s + 0.03), LAND + 0.06, Z(P.a0)), new THREE.Vector3(X(E.s + 0.03), LAND + 0.06, Z(P.a1))]));
  geometries.push(railing.geometry);

  // ---- The piers and their lamps: the four nearest are the spot lights
  const L = B.lamps;
  const pierGeo = box(0.11, L.pier, 0.11).translate(0, L.pier / 2, 0);
  const pierCap = box(0.13, 0.015, 0.13).translate(0, L.pier + 0.0075, 0);
  const one = new THREE.Vector3(1, 1, 1);
  const q = new THREE.Quaternion();
  instanced(merge([pierGeo, pierCap]), surface({ color: PIER, grime: 0.4, glow: { tone: "#ffc98a", strength: 0.16 } }), lampAlong.map((a) => new THREE.Matrix4().compose(new THREE.Vector3(X(L.s), LAND, Z(a)), q, one)), "piers");
  // on each pier a lantern post as the plates paint them: the kit's
  // (buildLampRow, head "lantern": a cast-iron post on a fluted base, a
  // collar, a six-sided lantern lit warm, a cap and a finial), a little
  // under its street size, no pool on the pier; the four from L.spots on
  // carry the place's four spot lights, just inside their lanterns, toward
  // the promenade
  const lampRow = buildLampRow(
    lampAlong.map((a) => ({ x: X(L.s), y: LAND + L.pier + 0.015, z: Z(a) })),
    { head: "lantern", size: 0.8, pool: false },
  );
  lampRow.meshes.forEach((m, i) => {
    m.name = i ? "lamps:lanterns" : "lamps:posts";
    add(m);
  });
  disposers.push(lampRow.dispose);
  const heads = lampRow.heads;
  const spots = heads.slice(L.spots, L.spots + 4).map((h) => [h.x + 0.06, h.y - 0.02, h.z] as V3);
  for (const h of heads.slice(0, 27)) glow.push({ pos: h, color: "#ffc98a", size: 0.12 });
  for (const a of lampAlong.slice(0, 20)) waterLights.push({ x: X(L.s + 0.15), z: Z(a), w: 0.1, color: "#ffc98a", height: 0.9 });

  // ---- The facades: stone bodies along the road, their fronts toward
  // the river, each bay a pilaster and a column of windows (instanced),
  // the crowns on top
  const F = B.front;
  const back = 2.6;
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
  // (floodlit after dark; the kit's stone relief carves pilasters, a
  // cornice at every floor and a surround round each window, for the
  // floodlight and the sun to rake across)
  // (floodlit from the foot, brightest over the ground floor, as the
  // plates' facades are, not an even wash)
  const stone = surface({ color: STONE, relief: { kind: "stone", bay: BAY, floor: FLOOR, strength: 0.7 }, glow: { tone: SCENE_TONES.gold, strength: 0.42, base: LAND + 0.1, fade: 2.4 } });
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
    // the bays on the relief's own grid (a bay's middle where z / BAY is a
    // half), so each window sits in its carved surround
    const j0 = Math.ceil(b.a0 / BAY + 0.15);
    const j1 = Math.floor(b.a1 / BAY - 1.15);
    const bays = Math.max(0, j1 - j0 + 1);
    const bw = BAY;
    for (let i = 0; i < bays; i++) {
      const a = (j0 + i + 0.5) * BAY;
      if (i > 0) pilasters.push(new THREE.Matrix4().compose(new THREE.Vector3(X(F + 0.015), (GROUND + b.h - 0.12) / 2, Z(a - BAY / 2)), q, new THREE.Vector3(0.03, b.h - 0.12 - GROUND, 0.05)));
      // the ground floor's tall arched openings
      const door = new THREE.Matrix4().compose(new THREE.Vector3(X(F + 0.004), 0.22, Z(a)), paneTurn, new THREE.Vector3(bw * 0.5, 0.3, 1));
      (wr() < 0.75 ? panesOn : panesOff).push(door);
      for (let f = 1; ; f++) {
        const y = (f + 0.55) * FLOOR;
        if (y > b.h - 0.22) break;
        if (y < GROUND + 0.08) continue;
        const m = new THREE.Matrix4().compose(new THREE.Vector3(X(F + 0.004), y, Z(a)), paneTurn, new THREE.Vector3(bw * 0.44, FLOOR * 0.48, 1));
        (wr() < 0.8 ? panesOn : panesOff).push(m);
      }
    }
    const mid = (b.a0 + b.a1) / 2;
    if (b.crown === "colonnade") {
      // a colonnade of round columns over the first floors, a pediment
      for (let i = 1; i < bays; i++) trims.push(new THREE.CylinderGeometry(0.032, 0.036, b.h - GROUND - 0.55, 8).translate(X(F + 0.07), (GROUND + b.h - 0.55) / 2 + 0.02, Z((j0 + i) * BAY)));
      trims.push(slab(F, F + 0.1, (j0 + 1) * BAY, (j1 + 0) * BAY, b.h - 0.58, b.h - 0.5));
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
  mesh(merge([dome, lantern]), litSurface({ color: "#cbbd9f", tone: "gold", strength: 0.55 }), "dome");
  instanced(box(1, 1, 1), trim, pilasters, "facades:pilasters");
  const pane = new THREE.PlaneGeometry(1, 1);
  instanced(pane, glowMaterial({ day: GLASS_DAY, night: "#ffcd86" }), panesOn, "facades:windows-lit");
  instanced(pane.clone(), glowMaterial({ day: GLASS_DAY, night: "#3a3128" }), panesOff, "facades:windows");
  glow.push({ pos: new THREE.Vector3(domeX, drumY + 0.6, Z(D.a)), color: SCENE_TONES.gold, size: 1.4 });
  glow.push({ pos: new THREE.Vector3(cx, C.top + 0.4, cz), color: SCENE_TONES.gold, size: 1.0 });

  // The clock's two faces
  const faceGeo = new THREE.CircleGeometry(0.3, 40);
  const faces = mesh(merge([faceGeo.clone().rotateY(-Math.PI / 2).translate(X(cs + C.w / 2 + 0.006), C.face, cz), faceGeo.clone().rotateY(Math.PI).translate(cx, C.face, Z(C.a - C.w / 2 - 0.006))]), clockMaterial(world.get().hour), "clock");
  faceGeo.dispose();
  faces.renderOrder = 1;

  // ---- Trees along the road, the big one at the left edge, planters of
  // flowers between them, the bed of hydrangeas near the eye
  const T = B.trees;
  const tr = rng(53);
  const treeSpots: { x: number; z: number; s: number }[] = [];
  for (let a = T.from; a <= T.to; a += T.step) treeSpots.push({ x: X(T.s + tr.range(-0.1, 0.1)), z: Z(a + tr.range(-0.15, 0.15)), s: tr.range(0.8, 0.98) });
  treeSpots.push({ x: X(B.bigTree.s), z: Z(B.bigTree.a), s: B.bigTree.size });
  // (the big one a plane tree against the sky; all the plates' bright
  // yellow-green, leafy, lit from below after dark)
  const trees = buildStreetTrees(29, [...treeSpots.slice(0, -1), { ...treeSpots[treeSpots.length - 1], kind: "plane" }], TREES);
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
  // the planters along the trees: the kit's (a stone box, a shrub, flowers)
  const planterSpots: { x: number; z: number; w: number; d: number; h: number }[] = [];
  for (let a = B.planters.from; a <= B.planters.to; a += B.planters.step) if (a < Bd.a0 - 0.4 || a > Bd.a1 + 0.4) planterSpots.push({ x: X(B.planters.s), z: Z(a), w: 0.24, d: 0.44, h: 0.06 });
  for (const m of buildPlanters(61, planterSpots, { stone: PIER })) {
    geometries.push(m.geometry);
    add(m);
  }
  // (after dark the bed's stone and flowers hold the lamps' and the
  // facades' light, as the night plate paints them: a little glow each)
  mesh(merge(planterParts), surface({ color: PIER, grime: 0.5, snow: true, glow: { tone: "#ffc98a", strength: 0.1 } }), "planters");
  mesh(merge(leaves), surface({ color: "#4d7a3c", snow: true, glow: { tone: "#5f8a3a", strength: 0.08 } }), "planters:leaves");
  mesh(merge(blooms[0]), surface({ color: "#9d8fd8", glow: { tone: "#9d8fd8", strength: 0.22 } }), "planters:hydrangea-blue");
  mesh(merge(blooms[1]), surface({ color: "#d99ac4", glow: { tone: "#d99ac4", strength: 0.22 } }), "planters:hydrangea-pink");

  // ---- The glass kiosk, lit cyan (scenery): a dark frame, glass that
  // glows cyan after dark, a phone inside, a lit strip under its roof
  const K = B.kiosk;
  const kx = X(K.s);
  const kz = Z(K.a);
  // its plinth, and a thin roof that overhangs, deeper toward the promenade
  const frame: THREE.BufferGeometry[] = [box(K.w + 0.02, 0.012, K.d + 0.02).translate(kx, 0.006, kz), box(K.w + 0.07, 0.014, K.d + 0.08).translate(kx, K.h + 0.007, kz - 0.01)];
  for (const [dx, dz] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) frame.push(box(0.012, K.h, 0.012).translate(kx + (dx * K.w) / 2, K.h / 2, kz + (dz * K.d) / 2));
  frame.push(box(K.w, 0.01, 0.006).translate(kx, K.h * 0.55, kz - K.d / 2), box(0.006, 0.01, K.d).translate(kx - K.w / 2, K.h * 0.55, kz));
  frame.push(box(0.045, 0.07, 0.02).translate(kx + 0.02, K.h * 0.55, kz + K.d / 2 - 0.02));
  mesh(merge(frame), surface({ color: METAL }), "kiosk");
  // inside, seen through the glass: the back wall's panel round the phone,
  // the phone's lit screen, and a shelf
  mesh(merge([box(K.w * 0.7, K.h * 0.62, 0.006).translate(kx, K.h * 0.5, kz + K.d / 2 - 0.008), box(K.w * 0.6, 0.006, 0.03).translate(kx, K.h * 0.36, kz + K.d / 2 - 0.02)]), surface({ color: "#4f6a72" }), "kiosk:inside");
  mesh(box(0.026, 0.03, 0.004).translate(kx + 0.02, K.h * 0.6, kz + K.d / 2 - 0.031), neonMaterial(dim("cyan", 0.7), { dayColor: "#9fc4cc" }), "kiosk:screen");
  const glass = [box(K.w - 0.01, K.h - 0.02, 0.004).translate(kx, K.h / 2, kz - K.d / 2), box(K.w - 0.01, K.h - 0.02, 0.004).translate(kx, K.h / 2, kz + K.d / 2), box(0.004, K.h - 0.02, K.d - 0.01).translate(kx - K.w / 2, K.h / 2, kz), box(0.004, K.h - 0.02, K.d - 0.01).translate(kx + K.w / 2, K.h / 2, kz)];
  mesh(merge(glass), glassMaterial({ tint: "#9fcfd6", opacity: 0.15, sky: 0.45, glow: { tone: "cyan", strength: 0.08 }, double: true }), "kiosk:glass");
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
    [buildWorldFinancialCenter, lm.worldFinancialCenter, { body: surface({ color: "#93b0cc", fogScale: 1.1 }), base: "#6f8cab", glass: "#9cc0de", lit: litSurface({ color: "#a7bfd4", tone: "cyan", strength: 1.05 }), tone: "cyan" }],
    [buildJinMao, lm.jinMao, { body: surface({ color: "#bcb096", fogScale: 1.1 }), base: "#8a7f6c", glass: "#45607b", lit: litSurface({ color: "#b9ab8e", tone: "gold", strength: 0.95 }), tone: "gold" }],
    [buildShanghaiTower, lm.shanghaiTower, { body: surface({ color: "#9fbbd4", fogScale: 1.1 }), base: "#7896b2", glass: "#a3c6e2", lit: litSurface({ color: "#a9c0d4", tone: "gold", strength: 1.0 }), tone: "gold" }],
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
    waterLights.push({ x: X(s - 4), z: Z(a), w: 1.1, color: SCENE_TONES[c.tone], height: 14 });
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
      waterLights.push({ x: t.x + t.w / 2, z: t.z, w: t.w * 0.4, color: SCENE_TONES[tone], height: t.h * 0.5 });
      glow.push({ pos: new THREE.Vector3(t.x, y, t.z), color: SCENE_TONES[tone], size: t.w * 0.7 });
    } else if (accents() < 0.45) {
      waterLights.push({ x: t.x + t.w / 2, z: t.z, w: Math.max(0.25, t.w * 0.2), color: accents() < 0.9 ? "#ffc98a" : "#bfe4ff", height: t.h * 0.3 });
    }
  }
  for (const tone of ["cyan", "rose", "gold"] as SceneTone[]) if (crowns[tone].length) mesh(merge(crowns[tone]), neonMaterial(dim(tone, 0.5), { dayColor: dim(tone, 0.7) }), `neon:${tone}`);

  const bankTreeSpots: { x: number; z: number; s: number }[] = [];
  const bt = rng(67);
  for (let a = -20; a <= 280; a += 2.2) bankTreeSpots.push({ x: X(B.bank + 1 + bt.range(0, 1.2)), z: Z(a + bt.range(-0.5, 0.5)), s: bt.range(0.9, 1.3) });
  const bankTrees = buildStreetTrees(31, bankTreeSpots, { greens: TREES.greens });
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
  const invalidate = useThree((s) => s.invalidate);
  useDisposeOnUnmount(built);
  useGlowPools("bund", POOLS, active);
  useDayShade("bund", SHADE, active);
  // The clock follows Richmond Hill's hour, redrawn when the minute changes
  const hour = useWorld((s) => s.hour);
  useEffect(() => {
    if (setClockHour(hour)) invalidate();
  }, [hour, built, invalidate]);
  return (
    <>
      <primitive object={built.group} />
      <SceneLights id="bund" spots={built.spots} />
    </>
  );
}

export default ContactScene;
