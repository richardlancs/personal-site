"use client";

import { useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { experience } from "../../../data/portfolio";
import { sortNewestFirst } from "../../../lib/experience";
import { useDayShade, useDisposeOnUnmount, useGlowPools, Hitbox, SceneLights, useMovers, type Mover, type SceneProps } from "../common";
import { glassMaterial } from "../kit/glass";
import type { DayShade, GlowPool } from "../kit/glow";
import { box, merge } from "../kit/geometry";
import { buildJinMao, buildPearlTower, buildShanghaiTower, buildWorldFinancialCenter, type Landmark } from "../kit/landmarks";
import { buildTrain, trainLength } from "../kit/movers";
import { glowSprites, litSurface, neonMaterial, SCENE_TONES, screenMaterial, type SceneTone } from "../kit/neon";
import type { LightStrip } from "../kit/reflection";
import { buildMarkSign, disposeSign, glowPoints } from "../kit/signs";
import { buildSkyDome } from "../kit/sky";
import { buildLampRow, buildRailing, buildViaduct } from "../kit/street";
import { surface } from "../kit/surface";
import { fit, fonts, fontsReady, pavingTexture } from "../kit/textures";
import { buildTowers, layoutTowers } from "../kit/towers";
import { buildPlanters, buildStreetTrees } from "../kit/trees";
import { wetPaving } from "../kit/water";
import { windowMaterial } from "../kit/windows";
import { rng } from "../rng";
import { useWorld, world } from "../store";
import type { Quality } from "../tiers";
import { METRO } from "./metro.def";

// Experience: an elevated metro platform under a curved glass canopy,
// composed as its paintings (app/assets/city/metro-day.webp, -night.webp;
// where everything stands is data, metro.def.ts: METRO). One unit is ten
// metres; the ground is y = 0, the platform's top METRO.deck.
//
//   overhead, the canopy: steel arches on columns, purlins between them
//   (the glass is clear: the kit has no glass, so the sky shows through
//   the frame), warm lamps along the arches;
//   left, the track on its viaduct and a train at the platform, which
//   arrives, waits 20 s and leaves once a minute (a kit mover, parked in
//   still view; the canvas idles when it is out of view);
//   middle, the departures board, the only words in the scene: each
//   experience entry (role, organisation, dates, from app/data/portfolio.ts,
//   newest first) on a row of flaps, the chosen line (store: sel.line,
//   chosen in the panel's row of keys or by clicking its row here) in gold;
//   right, the platform's paving (the lamps streak it in the rain), the
//   tactile strip and the edge lights, benches and planters, the railing;
//   past it the trees below, a road viaduct curving away, and the far
//   skyline with the four landmarks.
//
// Lights: exactly three spot lights (scenes.ts: DISTRICT_LIGHTS.metro)
// under the canopy, dark by day; every other light is a lit surface.

const D = METRO.deck;
const LINES = sortNewestFirst(experience);
const dates = (e: (typeof LINES)[number]) => (e.endDate ? `${e.startDate} – ${e.endDate}` : e.startDate);

// Colours, from the plates
const STEEL = "#a2aab4";
const CONCRETE = "#d4d0c6";
const PAVING = "#a4adb7";
const BALLAST = "#6a6863";
const RAIL = "#5d6066";
const TACTILE = "#c9a24c";
const BENCH = "#8b9199";
const PLANTER = "#a6a39a";
const GROUND = "#5a6650";
const LAMP = "#ffd9a8";
const TRAIN = "#bcc5cf";

// A tone at a fraction of its strength (kit/neon.ts: × NEON_HDR at night)
const dim = (c: string, k: number) => `#${new THREE.Color(c).multiplyScalar(k).getHexString()}`;

// ---------------------------------------------------------------------
// The departures board: one row per entry, its role over its organisation
// and dates, each character on its own flap; the chosen row in gold. The
// chosen line is module state, so whichever build of the scene painted
// the (shared) material repaints the same.
const board = { line: 0 };

function flaps(g: CanvasRenderingContext2D, text: string, x: number, y: number, room: number, cellH: number, ink: string, tile: string) {
  const cell = Math.min(cellH * 0.6, room / Math.max(1, text.length));
  const display = fonts().display;
  g.textAlign = "center";
  g.textBaseline = "middle";
  fit(g, "W", (px) => `600 ${px}px ${display}`, Math.round(cellH * 0.8), cell * 1.05, 8);
  for (let i = 0; i < text.length; i++) {
    const cx = x + i * cell;
    g.fillStyle = tile;
    g.fillRect(cx + cell * 0.06, y, cell * 0.88, cellH);
    // the flap's hinge
    g.fillStyle = "rgba(0,0,0,0.55)";
    g.fillRect(cx + cell * 0.06, y + cellH / 2 - 1, cell * 0.88, 2);
    if (text[i] === " ") continue;
    g.fillStyle = ink;
    g.fillText(text[i], cx + cell / 2, y + cellH * 0.53);
  }
}

function drawBoard(g: CanvasRenderingContext2D, w: number, h: number) {
  g.fillStyle = "#0e1116";
  g.fillRect(0, 0, w, h);
  const pad = h * 0.07;
  const rowH = (h - pad * 2) / Math.max(1, LINES.length);
  const room = w - pad * 3.2;
  LINES.forEach((e, i) => {
    const chosen = i === board.line;
    const y = pad + i * rowH;
    if (chosen) {
      g.fillStyle = "rgba(255,180,84,0.16)";
      g.fillRect(pad * 0.5, y + rowH * 0.04, w - pad, rowH * 0.92);
      g.fillStyle = SCENE_TONES.gold;
      g.fillRect(pad * 0.55, y + rowH * 0.12, pad * 0.35, rowH * 0.76);
    }
    flaps(g, e.role, pad * 1.6, y + rowH * 0.1, room, rowH * 0.42, chosen ? "#ffc46b" : "#efe6d2", chosen ? "#2a2218" : "#1b1f26");
    flaps(g, `${e.organization} · ${dates(e)}`, pad * 1.6, y + rowH * 0.58, room, rowH * 0.3, chosen ? "#f2c27a" : "#b4bac4", chosen ? "#241e16" : "#171a20");
  });
}

// ---------------------------------------------------------------------
// The train: the kit's (kit/movers.ts: buildTrain), timed as a stop. It
// comes in from `reach` units off, slowing to a stand with its nose at
// METRO.train.nose, waits `dwell` seconds, pulls away the way it was
// going, and the line is empty until the next, every `cycle` seconds.
// The kit's train runs one pass along its object's +x; the stop is told
// to it as the moment of that pass that puts the cars where they are.
function stoppingTrain(): { mover: Mover; length: number } {
  const o = METRO.train;
  const period = o.cycle;
  // the kit's cars in a paler shell that the platform's lamps warm after
  // dark, a calmer teal stripe, posts between the windows, and a tapered
  // nose with a dark windscreen and headlamps lit after dark
  const train = buildTrain(o.cars, {
    span: o.reach * 2,
    period,
    nose: "round",
    snout: o.snout,
    windows: "framed",
    shell: { color: TRAIN, grime: 0.1, glow: { tone: "#c8d4e4", strength: 0.075 } },
    stripe: { day: "#2f8fb0", night: "#2f8c9c" },
  });
  train.park();
  // buffer to buffer, the flat cab's glass at the back included
  const length = trainLength(o.cars) + 0.02;
  const travel = o.reach * 2 + length;
  // the kit's time that puts the train's middle at `u` (0: at the stop)
  const at = (u: number) => ((u + travel / 2) / travel) * 0.7 * period;
  const gone = 0.9 * period;
  return {
    length,
    mover: {
      object: train.object,
      update(t) {
        const s = ((t % o.cycle) + o.cycle) % o.cycle;
        const leaving = o.arrive + o.dwell;
        let kit = gone;
        if (s < o.arrive) kit = at(-o.reach * (1 - s / o.arrive) ** 2);
        else if (s < leaving) kit = at(0);
        else if (s < leaving + o.leave) kit = at(o.reach * ((s - leaving) / o.leave) ** 2);
        train.update(kit);
      },
      park: () => train.park(),
      // at its stop through the dwell, and gone from view between trains:
      // the canvas needn't draw for it
      resting(t) {
        const s = ((t % o.cycle) + o.cycle) % o.cycle;
        return (s >= o.arrive && s < o.arrive + o.dwell) || s >= o.arrive + o.dwell + o.leave;
      },
    },
  };
}

// ---------------------------------------------------------------------

type Row = { line: number; position: [number, number, number]; size: [number, number, number] };
type Built = { group: THREE.Group; movers: Mover[]; rows: Row[]; board: THREE.Material; dispose: () => void };

function build(quality: Quality): Built {
  const group = new THREE.Group();
  group.name = "metro";
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
  const slab = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number) => box(x1 - x0, y1 - y0, Math.abs(z1 - z0)).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  const P = METRO.platform;
  const T = METRO.track;
  const C = METRO.canopy;
  const lights: LightStrip[] = [];
  const glow: { pos: THREE.Vector3; color: string; size: number }[] = [];

  // ---- The sky and the ground below the viaduct
  const sky = add(buildSkyDome({ seed: 151, radius: 900 }));
  geometries.push(sky.geometry);
  mesh(new THREE.PlaneGeometry(1600, 1600).rotateX(-Math.PI / 2), surface({ color: GROUND, grime: 0.2, snow: true, fogScale: 1.2 }), "ground");

  // ---- The platform: its slab, the paving (fake reflections of the
  // lamps and the board, × the rain), the tactile strip, the edge lights
  mesh(slab(P.x0, P.x1, D - 0.42, D - 0.004, P.z0, P.z1), surface({ color: CONCRETE, grime: 0.4 }), "platform");
  mesh(merge([slab(P.x0 + 0.07, P.x0 + 0.115, D, D + 0.003, P.z0, P.z1)]), surface({ color: TACTILE, wet: 0.6 }), "tactile");
  const edge: THREE.BufferGeometry[] = [];
  for (let z = P.z0 - 0.2; z > P.z1; z -= 0.42) {
    edge.push(box(0.012, 0.004, 0.06).translate(P.x0 + 0.025, D + 0.002, z));
    if (glow.length < 40 && z > -6) glow.push({ pos: new THREE.Vector3(P.x0 + 0.025, D + 0.01, z), color: SCENE_TONES.cyan, size: 0.05 });
  }
  mesh(merge(edge), neonMaterial(dim(SCENE_TONES.cyan, 0.5), { dayColor: "#a3a5a6" }), "neon:edge");

  // ---- The track: the bed, sleepers and rails, on a viaduct that runs on
  // past both ends of the platform; a parapet and railing beyond it
  mesh(slab(T.x0, T.x1, D - 0.3, D - 0.13, 30, -100), surface({ color: BALLAST, grime: 0.5 }), "trackbed");
  const sleepers: THREE.BufferGeometry[] = [];
  for (let z = 8; z > -40; z -= 0.065) sleepers.push(box(0.25, 0.014, 0.028).translate(T.x, D - 0.123, z));
  mesh(merge(sleepers), surface({ color: "#6d6862", grime: 0.5 }), "sleepers");
  mesh(merge([-1, 1].map((s) => box(0.012, 0.016, 130).translate(T.x + (s * T.gauge) / 2, D - T.rail - 0.008 - 0.0, -35))), surface({ color: RAIL }), "rails");
  const viaduct = add(buildViaduct([new THREE.Vector3(-0.6, D - 0.16, 40), new THREE.Vector3(-0.6, D - 0.16, -150)], { width: 2.1 }));
  geometries.push(viaduct.geometry);
  mesh(slab(T.x0, T.x0 + 0.06, D - 0.13, D + 0.02, P.z0, P.z1), surface({ color: CONCRETE, grime: 0.4 }), "parapet");
  for (const [x, y] of [
    [T.x0 + 0.03, D + 0.02],
    [P.x1 - 0.03, D],
  ] as const) {
    const rail = add(buildRailing([new THREE.Vector3(x, y, P.z0), new THREE.Vector3(x, y, P.z1)]));
    geometries.push(rail.geometry);
  }
  // glass panes in both railings, facing the platform
  const paneLength = P.z0 - P.z1;
  mesh(
    merge([
      new THREE.PlaneGeometry(paneLength, 0.1).rotateY(-Math.PI / 2).translate(P.x1 - 0.032, D + 0.055, (P.z0 + P.z1) / 2),
      new THREE.PlaneGeometry(paneLength, 0.1).rotateY(Math.PI / 2).translate(T.x0 + 0.032, D + 0.075, (P.z0 + P.z1) / 2),
    ]),
    glassMaterial({ tint: "#9cc0d2", opacity: 0.16, sky: 0.7 }),
    "glass:railing",
  );

  // ---- The canopy: arches, purlins between them, the edge beams, the
  // columns; lamps under the arches
  const mx = (C.x0 + C.x1) / 2;
  const hw = (C.x1 - C.x0) / 2;
  const arch = (t: number) => new THREE.Vector3(mx - hw * Math.cos(t * Math.PI), D + C.spring + C.rise * Math.sin(t * Math.PI), 0);
  const ribs: THREE.BufferGeometry[] = [];
  const posts: THREE.BufferGeometry[] = [];
  const lampParts: THREE.BufferGeometry[] = [];
  const archPoints = Array.from({ length: 11 }, (_, i) => arch(i / 10));
  const zs: number[] = [];
  for (let z = C.z0; z >= C.z1 - 1e-6; z -= C.step) zs.push(z);
  zs.forEach((z, i) => {
    // a deep box-section arch, a straight piece between each two points
    for (let k = 0; k < archPoints.length - 1; k++) {
      const a = archPoints[k];
      const b = archPoints[k + 1];
      const l = a.distanceTo(b) * 1.04;
      ribs.push(box(l, 0.07, 0.05).rotateZ(Math.atan2(b.y - a.y, b.x - a.x)).translate((a.x + b.x) / 2, (a.y + b.y) / 2, z));
    }
    // a light glazing bar halfway to the next arch: the panes between
    if (z - C.step / 2 > C.z1) for (let k = 0; k < archPoints.length - 1; k++) {
      const a = archPoints[k];
      const b = archPoints[k + 1];
      ribs.push(box(a.distanceTo(b) * 1.04, 0.014, 0.012).rotateZ(Math.atan2(b.y - a.y, b.x - a.x)).translate((a.x + b.x) / 2, (a.y + b.y) / 2 + 0.03, z - C.step / 2));
    }
    // the arch runs on past the columns over the railing, a little down
    ribs.push(box(0.36, 0.04, 0.04).translate(C.x1 + 0.16, D + C.spring - 0.01, z));
    if (i % C.columnsEvery === 1) {
      for (const [x, foot] of [
        [C.x1 - 0.02, D],
        [C.x0 + 0.03, D + 0.02],
      ] as const) {
        const h = D + C.spring - foot;
        posts.push(box(0.075, h, 0.075).translate(x, foot + h / 2, z));
        posts.push(box(0.11, 0.05, 0.11).translate(x, D + C.spring - 0.02, z));
      }
    }
    // lamps under the arch, over the track and the platform
    for (const t of [0.28, 0.6, 0.8]) {
      const p = arch(t);
      lampParts.push(box(0.05, 0.014, 0.034).translate(p.x, p.y - 0.044, z));
      if (p.x > P.x0) lights.push({ x: p.x, z, w: 0.06, color: LAMP, height: p.y - D - 0.03 });
      if (z > -6) glow.push({ pos: new THREE.Vector3(p.x, p.y - 0.04, z), color: LAMP, size: 0.09 });
    }
  });
  const len = Math.abs(C.z1 - C.z0) + 0.1;
  const zc = (C.z0 + C.z1) / 2;
  for (let i = 1; i < 26; i++) {
    const t = i / 26;
    const p = arch(t);
    const q = arch(t + 0.01);
    const angle = Math.atan2(q.y - p.y, q.x - p.x);
    ribs.push(box(0.014, 0.016, len).rotateZ(angle).translate(p.x, p.y + 0.03, zc));
  }
  // the edge beams along each side, at the arches' feet
  for (const x of [C.x0 + 0.03, C.x1 - 0.02]) ribs.push(box(0.05, 0.06, len).translate(x, D + C.spring, zc));
  ribs.push(box(0.03, 0.04, len).translate(C.x1 + 0.33, D + C.spring - 0.03, zc));
  // (after dark the lamps light them from below: a faint warm glow)
  mesh(merge(ribs), surface({ color: STEEL, grime: 0.15, glow: { tone: LAMP, strength: 0.03 } }), "canopy");
  mesh(merge(posts), surface({ color: CONCRETE, grime: 0.3, glow: { tone: LAMP, strength: 0.025 } }), "columns");
  mesh(merge(lampParts), neonMaterial(dim(LAMP, 0.42), { dayColor: "#d9dcdf" }), "neon:lamps");
  // the glazing over the arches: one curved sheet, the arch's profile run
  // the canopy's length (the kit's glass, both faces)
  {
    const segs = mobile ? 10 : 18;
    const pos: number[] = [];
    const idx: number[] = [];
    for (let i = 0; i <= segs; i++) {
      const p = arch(i / segs);
      pos.push(p.x, p.y + 0.04, C.z0, p.x, p.y + 0.04, C.z1);
      if (i < segs) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
    }
    const sheet = new THREE.BufferGeometry();
    sheet.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    sheet.setIndex(idx);
    sheet.computeVertexNormals();
    mesh(sheet, glassMaterial({ tint: "#2c4766", opacity: 0.55, sky: 0.9, glow: { tone: "#7d97b8", strength: 0.06 }, double: true }), "glass:canopy");
  }

  // ---- The departures board, hanging from the canopy on two rods
  const B = METRO.board;
  const [cw, ch] = mobile ? [1024, 336] : [1536, 504];
  const face = screenMaterial(drawBoard, { w: cw, h: ch, key: `metro:board:${cw}x${ch}` });
  const top = arch((B.x - C.x0) / (C.x1 - C.x0)).y;
  mesh(
    merge([
      box(B.w + 0.035, B.h + 0.035, 0.04).translate(B.x, B.y, B.z - 0.005),
      ...[-1, 1].map((s) => box(0.008, top - B.y - B.h / 2, 0.008).translate(B.x + s * B.w * 0.36, (top + B.y + B.h / 2) / 2, B.z)),
    ]),
    surface({ color: "#2a2e35" }),
    "board-frame",
  );
  mesh(new THREE.PlaneGeometry(B.w, B.h).translate(B.x, B.y, B.z + 0.0165), face, "board");
  lights.push({ x: B.x, z: B.z, w: B.w * 0.6, color: SCENE_TONES.gold, height: B.y - D });
  const pad = B.h * 0.07;
  const rowH = (B.h - pad * 2) / Math.max(1, LINES.length);
  const rows: Row[] = LINES.map((_, i) => ({ line: i, position: [B.x, B.y + B.h / 2 - pad - (i + 0.5) * rowH, B.z + 0.03], size: [B.w * 0.96, rowH * 0.94, 0.04] }));

  // ---- Decorative boards (marks only, no words): one on each of the two
  // nearest columns, and a smaller one hanging far down the platform
  const marks: THREE.Group[] = [];
  const mark = (seed: number, tone: SceneTone, w: number, h: number, x: number, y: number, z: number, ry: number) => {
    const sign = buildMarkSign({ seed, tone, w, h, kind: "board" });
    sign.position.set(x, y, z);
    sign.rotation.y = ry;
    marks.push(add(sign));
  };
  const columnZ = zs.filter((_, i) => i % C.columnsEvery === 1);
  mark(11, "cyan", 0.2, 0.07, C.x1 - 0.065, D + 0.3, columnZ[0], -Math.PI / 2);
  mark(12, "rose", 0.2, 0.07, C.x1 - 0.065, D + 0.3, columnZ[2], -Math.PI / 2);
  mark(13, "gold", 0.42, 0.12, 0.4, D + 0.62, -7.4, 0);
  disposers.push(() => marks.forEach(disposeSign));

  // ---- Benches and planters along the railing side
  const seats: THREE.BufferGeometry[] = [];
  for (const z of METRO.benches) {
    seats.push(box(0.05, 0.008, 0.17).translate(0.8, D + 0.045, z));
    seats.push(box(0.008, 0.045, 0.17).translate(0.826, D + 0.072, z).rotateZ(0));
    for (const s of [-1, 1]) seats.push(box(0.045, 0.042, 0.01).translate(0.8, D + 0.021, z + s * 0.07));
  }
  mesh(merge(seats), surface({ color: BENCH, wet: 0.5 }), "benches");
  // planters with flowers round each tree (the kit's)
  for (const p of buildPlanters(
    87,
    METRO.planters.map((z) => ({ x: 0.9, z, w: 0.13, d: 0.13, h: 0.085, y: D })),
    { stone: PLANTER },
  )) {
    geometries.push(p.geometry);
    add(p);
  }
  const shrubs = buildStreetTrees(
    81,
    METRO.planters.map((z) => ({ x: 0.9, z, s: 0.17 })),
  );
  for (const s of shrubs) {
    geometries.push(s.geometry);
    s.position.y = D + 0.075;
    add(s);
  }

  // ---- Outside: trees below, the road viaduct curving away with its
  // lamps
  const tr = rng(83);
  const treeSpots: { x: number; z: number; s: number }[] = [];
  const count = mobile ? 70 : 130;
  for (let i = 0; i < count * 4 && treeSpots.length < count; i++) {
    const side = tr() < 0.55 ? 1 : -1;
    const x = side > 0 ? tr.range(1.6, 14) : tr.range(-12, -1.9);
    const z = tr.range(-60, 9);
    // not on the road's line
    if (METRO.road.path.some(([rx, rz]) => Math.hypot(rx - x, rz - z) < 1.1)) continue;
    treeSpots.push({ x, z, s: tr.range(0.95, 1.35) });
  }
  for (const t of buildStreetTrees(85, treeSpots)) {
    geometries.push(t.geometry);
    add(t);
  }
  const R = METRO.road;
  const curve = new THREE.CatmullRomCurve3(R.path.map(([x, z]) => new THREE.Vector3(x, R.y, z)));
  const road = add(buildViaduct(curve.getSpacedPoints(14), { width: R.width }));
  geometries.push(road.geometry);
  const roadLamps = buildLampRow(
    curve.getSpacedPoints(16).map((p, i, all) => {
      const next = all[Math.min(i + 1, all.length - 1)];
      const prev = all[Math.max(i - 1, 0)];
      const dir = next.clone().sub(prev).normalize();
      return { x: p.x - dir.z * (R.width / 2 - 0.05), y: R.y, z: p.z + dir.x * (R.width / 2 - 0.05), ry: Math.atan2(dir.x, dir.z) };
    }),
  );
  roadLamps.meshes.forEach((m) => add(m));
  disposers.push(roadLamps.dispose);

  // ---- The far skyline: two bands of towers and the four landmarks
  const L = METRO.landmarks;
  // (none on a landmark's foot, nor on the line from the platform to it)
  const eye = METRO.eye;
  const keepOut = Object.values(L).flatMap(([x, z]) => [{ x, z, r: 6 }, ...Array.from({ length: 16 }, (_, i) => 0.3 + i * 0.04).map((k) => ({ x: eye[0] + (x - eye[0]) * k, z: eye[2] + (z - eye[2]) * k, r: 5 }))]);
  const area = (a: { x0: number; x1: number; z0: number; z1: number }) => ({ x0: a.x0, x1: a.x1, z0: Math.min(a.z0, a.z1), z1: Math.max(a.z0, a.z1) });
  const S = METRO.skyline;
  const near = layoutTowers(S.near.seed, area(S.near.area), mobile ? 45 : S.near.count, S.near.height, keepOut);
  const far = layoutTowers(S.far.seed, area(S.far.area), mobile ? 90 : S.far.count, S.far.height, keepOut);
  for (const t of [...buildTowers(near, { far: false, fogScale: 1.1 }), ...buildTowers(far, { far: true, fogScale: 1.5 })]) {
    geometries.push(t.geometry);
    add(t);
  }
  type Maker = (d: "near" | "far", m: { body: THREE.Material; glass: THREE.Material; lit: THREE.Material }) => Landmark;
  const LANDMARKS: [Maker, readonly [number, number], { body: THREE.Material; base: string; glass: string; lit: THREE.Material }][] = [
    [buildPearlTower, L.pearl, { body: litSurface({ color: "#d6ccc8", tone: "rose", strength: 0.22 }), base: "#bfb2ad", glass: "#8a6f88", lit: litSurface({ color: "#b4728f", tone: "rose", strength: 1.1 }) }],
    [buildWorldFinancialCenter, L.worldFinancialCenter, { body: surface({ color: "#7a93ad", fogScale: 1.1 }), base: "#5f7a95", glass: "#86aacb", lit: litSurface({ color: "#a7bfd4", tone: "cyan", strength: 1.05 }) }],
    [buildJinMao, L.jinMao, { body: surface({ color: "#a69a83", fogScale: 1.1 }), base: "#7a705f", glass: "#45607b", lit: litSurface({ color: "#b9ab8e", tone: "gold", strength: 0.95 }) }],
    [buildShanghaiTower, L.shanghaiTower, { body: surface({ color: "#86a0b8", fogScale: 1.1 }), base: "#6b88a4", glass: "#8db3d3", lit: litSurface({ color: "#a9c0d4", tone: "gold", strength: 1.0 }) }],
  ];
  for (const [builder, [x, z], c] of LANDMARKS) {
    const landmark = builder("far", { body: c.body, glass: windowMaterial({ base: c.base, glass: c.glass, far: true, fogScale: 1.1 }), lit: c.lit });
    landmark.group.position.set(x, 0, z);
    landmark.group.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) geometries.push((o as THREE.Mesh).geometry);
    });
    add(landmark.group);
  }

  // ---- The paving, last of the platform, with every light that falls on it
  // (square tiles 1.2 m across, the kit's paving)
  const tiles = pavingTexture({ seed: 37, kind: "grid", joint: 2, repeat: [(P.x1 - P.x0) / 0.48, (P.z0 - P.z1) / 0.48] });
  // (the stone is polished: the lamps and the board shine in it dry as
  // well, after dark only: the kit's polish)
  const paving = wetPaving({ w: P.x1 - P.x0, d: P.z0 - P.z1, x: (P.x0 + P.x1) / 2, z: (P.z0 + P.z1) / 2, y: D, mode: "fake", color: PAVING, lights, map: tiles, polish: 0.75 });
  add(paving.mesh);
  disposers.push(paving.dispose, () => tiles.dispose());

  // ---- The train, stopped at the platform (a mover), its headlamps lit
  // after dark
  const { mover: train, length } = stoppingTrain();
  train.object.rotation.y = -Math.PI / 2; // its +x along +z: toward the camera
  train.object.position.set(T.x, D - 0.07, METRO.train.nose - length / 2);
  // (its parts are the kit's, named: buildTrain's `parts`)
  add(train.object);
  disposers.push(() => train.object.userData.dispose?.());

  // ---- The mobile tier has no bloom: soft glow sprites stand in for it
  if (mobile) {
    const sprites = glowSprites([...glow, ...glowPoints(group)]);
    add(sprites);
    geometries.push(sprites.geometry);
    disposers.push(() => sprites.dispose());
  }

  return {
    group,
    movers: [train],
    rows,
    board: face,
    dispose: () => {
      geometries.forEach((g) => g.dispose());
      disposers.forEach((d) => d());
    },
  };
}

// After dark the canopy's lamps light the platform all the way down, and
// the board's light falls on the paving under it (kit/glow.ts: pools)
const LAMP_LINE = 0.3;
const POOLS: GlowPool[] = [
  // a pool under every lamp, right to the foreground: one line pool down
  // the platform, and the nearest lamps' own pools on top of it
  { from: [LAMP_LINE, METRO.deck + 0.16, 2.4], to: [LAMP_LINE, METRO.deck + 0.16, -12.4], reach: 0.6, color: "#ffd9a8", strength: 0.45 },
  ...[2.15, 0.9, -0.35, -1.6, -2.85, -4.1, -5.35, -6.6, -7.85, -9.1].map((z): GlowPool => ({ pos: [LAMP_LINE, METRO.deck + 0.14, z], reach: 0.72, color: "#ffd9a8", strength: 1.1 })),
  { pos: [METRO.board.x, METRO.board.y - 0.2, METRO.board.z], reach: 0.6, color: "#ffc98a", strength: 0.6 },
];
// By day the canopy's arches and purlins lay their stripes on the platform
// (and the glazing between the purlins, a grid of sunlit panes, a little warm)
const SHADE: DayShade = {
  kind: "lattice",
  box: [METRO.platform.x0, METRO.platform.z1, METRO.platform.x1, METRO.platform.z0],
  dir: [0.6, 1],
  period: METRO.canopy.step / 2,
  period2: 0.24,
  duty: 0.62,
  depth: 0.5,
  top: METRO.deck + 0.05,
  warm: "#fff3e0",
};

function choose(line: number) {
  world.select("line", line);
  world.set({ focus: `line-${line}` });
}

function ExperienceScene({ quality, active, still }: SceneProps) {
  const built = useMemo(() => build(quality), [quality]);
  useMovers(built.movers, { active, still });
  useGlowPools("metro", POOLS, active);
  useDayShade("metro", SHADE, active);
  const invalidate = useThree((s) => s.invalidate);
  const line = useWorld((s) => s.sel.line);
  useDisposeOnUnmount(built);
  // The board shows the chosen line (and again once the display face is in)
  useEffect(() => {
    let live = true;
    board.line = line;
    const redraw = () => {
      if (!live) return;
      (built.board.userData.redraw as () => void)();
      invalidate();
    };
    redraw();
    fontsReady().then(redraw, () => {});
    return () => {
      live = false;
    };
  }, [built, line, invalidate]);
  return (
    <>
      <primitive object={built.group} />
      <SceneLights id="metro" spots={METRO.spots} distance={1.4} angle={0.95} night={0.9} />
      {built.rows.map((r) => (
        <Hitbox key={r.line} id={`metro:line-${r.line}`} position={r.position} size={r.size} onSelect={() => choose(r.line)} />
      ))}
    </>
  );
}

export default ExperienceScene;
