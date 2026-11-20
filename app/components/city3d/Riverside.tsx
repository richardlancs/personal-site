"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { cityPath } from "../../lib/cityRoutes";
import { section, type SectionId } from "../../sections/registry";
import { anchors } from "./anchors";
import { useDisposeOnUnmount, useGlowPools, Hitbox, useMovers, type Mover, type SceneProps } from "./common";
import type { GlowPool } from "./kit/glow";
import lujiazui, { RIVERSIDE } from "./districts/lujiazui.def";
import { box, merge } from "./kit/geometry";
import { buildJinMao, buildPearlTower, buildShanghaiTower, buildWorldFinancialCenter, type Landmark } from "./kit/landmarks";
import { aircraftLights, buildBoat } from "./kit/movers";
import { glowSprites, litSurface, neonMaterial, SCENE_TONES, screenArt, screenMaterial, type SceneTone } from "./kit/neon";
import { reflectIn, type LightStrip } from "./kit/reflection";
import { buildSign, disposeSign } from "./kit/signs";
import { buildSkyDome } from "./kit/sky";
import { glassMaterial } from "./kit/glass";
import { buildLampRow, buildRailing } from "./kit/street";
import { surface } from "./kit/surface";
import { buildTowers, layoutTowers, type TowerSpec } from "./kit/towers";
import { buildPlanters, buildStreetTrees } from "./kit/trees";
import { windowMaterial } from "./kit/windows";
import { buildRiver, wetPaving } from "./kit/water";
import { rng } from "./rng";
import { RIVERSIDE_EYE, signPlace, type SceneId } from "./scenes";
import { TIERS, type Quality } from "./tiers";

// Home, the riverside, composed as the two riverside paintings
// (app/assets/city/lujiazui-day.webp, -night.webp). The camera stands on a
// terrace over a ferry landing (districts/lujiazui.def.ts: home) and looks
// across the river; one unit is ten metres. Top to bottom the frame is:
//
//   the sky dome;
//   the far bank's skyline across the whole width, three layers of
//   instanced towers whose windows light by the hour, rising toward the
//   four landmarks, which stand spread out above it as in the paintings
//   (the Pearl left of the middle, the World Financial Center, Jin Mao
//   and Shanghai Tower to the right with sky between them); restrained
//   neon on it: lit crowns, a few lit corner edges and screens;
//   the river (a planar reflection on the high tier, painted streaks of
//   the skyline's lights on every tier) and a ferry;
//   the near landing, low in the frame, with the five sections' boards
//   along its edge, each word backed by the water, a railing in front of
//   them, lamps between them and trees at either end.
//
// Where everything stands is data (lujiazui.def.ts: RIVERSIDE, and each
// section's def: sign). Every board carries its section's title from the
// registry (kit/signs.ts: buildSign), the only words in the scene; the
// page pins one link over each (City3D.tsx: Tags), its hit area and focus
// ring. Nothing stands behind a board's word or on the line from the
// camera to it (docs/city/scripts/visibility.mjs checks both). The ferry
// is a mover (common.tsx: useMovers: parked in still view, and the canvas
// draws continuously only while it is in view); the roofs' red warning
// lights stand steady. The riverside has no spot lights (scenes.ts:
// DISTRICT_LIGHTS): its lamps are lit surfaces.

const EYE = new THREE.Vector3(...RIVERSIDE_EYE);
// How far up the home view looks
const PITCH = Math.atan2(lujiazui.home.target[1] - lujiazui.home.pos[1], Math.hypot(lujiazui.home.target[0] - lujiazui.home.pos[0], lujiazui.home.target[2] - lujiazui.home.pos[2]));
const L = RIVERSIDE;

// Left to right
const SIGNED: Exclude<SectionId, "home">[] = ["about", "experience", "projects", "interests", "contact"];
const placeOf = (id: Exclude<SectionId, "home">) => section(id).district as Exclude<SceneId, "lujiazui">;

// The land's top, over the water
const LAND = 0.25;
const WATER_Y = 0.02;

// Colours, from the plates
const PAVING = "#6f7276";
const BANK = "#55604f";
const POST = "#22252b";

// A tone at a fraction of its strength (its neon then crosses the bloom's
// threshold by that much: kit/neon.ts, NEON_HDR × this)
const dim = (tone: SceneTone, k: number) => `#${new THREE.Color(SCENE_TONES[tone]).multiplyScalar(k).getHexString()}`;

const boards = SIGNED.map((id) => ({ ...signPlace(placeOf(id)), id }));

type Built = {
  group: THREE.Group;
  signs: { id: Exclude<SectionId, "home">; center: THREE.Vector3; size: [number, number, number]; ry: number; corners: Record<"top" | "foot" | "left" | "right", THREE.Vector3> }[];
  movers: Mover[];
  dispose: () => void;
};

function build(quality: Quality): Built {
  const group = new THREE.Group();
  group.name = "riverside";
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
  const slab = (x0: number, x1: number, z0: number, z1: number, y0: number, y1: number) => box(x1 - x0, y1 - y0, z1 - z0).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  const W = L.water.width / 2;

  // the mobile tier's glow sprites (no bloom there), gathered as we go
  const glow: { pos: THREE.Vector3; color: string; size: number }[] = [];

  // ---- The sky
  const sky = add(buildSkyDome({ seed: 101, radius: 900 }));
  geometries.push(sky.geometry);

  // ---- The far bank
  const bank = mesh(merge([slab(-W, W, -420, L.water.far, -0.4, LAND), slab(-W, W, L.water.far - 0.4, L.water.far + 0.05, -0.4, LAND + 0.15)]), surface({ color: BANK, grime: 0.3, snow: true, fogScale: 1.2 }), "bank");

  // ---- The skyline: three layers, rising toward the landmarks, the
  // front layer kept off the lines to the landmarks' feet
  const lm = L.landmarks;
  const keepOut = Object.values(lm).map(([x, z]) => ({ x, z, r: L.landmarkKeepOut }));
  const sightlines = Object.values(lm).flatMap(([x, z]) =>
    [0.75, 0.82, 0.89, 0.96].map((k) => ({ x: EYE.x + (x - EYE.x) * k, z: EYE.z + (z - EYE.z) * k, r: L.skyline.sightlines })),
  );
  const crest = (x: number) => L.skyline.crest.least + (1 - L.skyline.crest.least) * Math.exp(-(((x - L.skyline.crest.x) / L.skyline.crest.spread) ** 2));
  const shape = (specs: TowerSpec[]) => specs.map((t) => ({ ...t, h: Math.max(2, t.h * crest(t.x)) }));
  const layer = (o: (typeof L.skyline)["front"], extra: { x: number; z: number; r: number }[] = []) => shape(layoutTowers(o.seed, o.area, o.count, o.height, [...keepOut, ...extra]));
  const civic = L.civic;
  const civicOut = [...civic.domes.map(([x, z]) => ({ x, z, r: civic.dome.r + 0.6 })), { x: civic.hall.x, z: civic.hall.z, r: civic.hall.w / 2 }];
  const front = layer(L.skyline.front, [...sightlines, ...civicOut]);
  const mid = layer(L.skyline.mid);
  const far = layer(L.skyline.far);
  // each tower in one of the painting's facades (by its seed: glass towers
  // a glass palette, stone ones a stone palette), one instanced mesh per
  // shape and facade, the kit's window material in that facade's colours
  const dressed = (specs: TowerSpec[], isFar: boolean, fogScale?: number) => {
    const groups = new Map<string, { specs: TowerSpec[]; p: { base: string; glass: string } }>();
    for (const t of specs) {
      const set = isFar ? L.palettes.far : t.style === 0 || t.style === 2 ? L.palettes.glass : L.palettes.stone;
      const p = set[Math.floor(t.seed / 7) % set.length];
      const key = `${p.base}:${p.glass}`;
      if (!groups.has(key)) groups.set(key, { specs: [], p });
      groups.get(key)!.specs.push(t);
    }
    return [...groups.values()].flatMap(({ specs: mine, p }) =>
      buildTowers(mine, { far: isFar, fogScale }).map((m) => {
        m.material = windowMaterial({ base: p.base, glass: p.glass, far: isFar, fogScale });
        return m;
      }),
    );
  };
  const nearTowers = dressed([...front, ...mid], false);
  const farTowers = dressed(far, true, L.skyline.farFog);
  for (const t of [...nearTowers, ...farTowers]) {
    geometries.push(t.geometry);
    add(t);
  }

  // ---- The waterfront's low pale civic buildings, and at the Pearl's foot
  // the glass domes and the colonnaded hall between them; floodlit warm
  // after dark, the domes lit cyan from inside
  const row = civic.row;
  const rr = rng(row.seed);
  const civicParts: THREE.BufferGeometry[][] = [[], []];
  for (let x = row.x0; x < row.x1; ) {
    const w = rr.range(row.w[0], row.w[1]);
    const h = rr.range(row.h[0], row.h[1]) * (0.7 + 0.6 * crest(x));
    const d = rr.range(row.d[0], row.d[1]);
    const cx = x + w / 2;
    if (cx + w / 2 < row.clear[0] || cx - w / 2 > row.clear[1]) civicParts[rr() < 0.65 ? 0 : 1].push(box(w, h, d).translate(cx, LAND + h / 2, row.z - rr.range(0, 0.8)));
    x += w + rr.range(row.gap[0], row.gap[1]);
  }
  const floodlit = { tone: "#ffcf96", strength: 0.14 };
  const civicStone = surface({ color: "#ded5c4", relief: { kind: "stone", bay: 0.5, floor: 0.6, strength: 0.5 }, glow: floodlit, fogScale: 1.1 });
  const civicWarm = surface({ color: "#cdb79a", relief: { kind: "stone", bay: 0.5, floor: 0.6, strength: 0.5 }, glow: floodlit, fogScale: 1.1 });
  civicParts.forEach((parts, k) => parts.length && mesh(merge(parts), k ? civicWarm : civicStone, "civic"));
  const hall = civic.hall;
  mesh(
    merge([
      box(hall.w, hall.h, hall.d).translate(hall.x, LAND + hall.h / 2, hall.z),
      box(hall.w + 0.3, 0.25, hall.d + 0.3).translate(hall.x, LAND + hall.h + 0.12, hall.z),
      box(hall.w * 0.8, 0.5, hall.d * 0.8).translate(hall.x, LAND + hall.h + 0.5, hall.z),
    ]),
    surface({ color: "#e4dccb", relief: { kind: "stone", bay: 0.42, floor: 1.2, strength: 0.8 }, glow: { tone: "#ffcf96", strength: 0.3 }, fogScale: 1.1 }),
    "civic:hall",
  );
  const dm = civic.dome;
  const podiums: THREE.BufferGeometry[] = [];
  for (const [x, z] of civic.domes) {
    podiums.push(new THREE.CylinderGeometry(dm.r * 1.25, dm.r * 1.3, dm.podium, 28).translate(x, LAND + dm.podium / 2, z));
    podiums.push(new THREE.CylinderGeometry(dm.r * 0.92, dm.r * 0.92, dm.drum, 28).translate(x, LAND + dm.podium + dm.drum / 2, z));
    const y = LAND + dm.podium + dm.drum + dm.r * 0.15;
    mesh(new THREE.SphereGeometry(dm.r * 0.96, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.62).translate(x, y, z), surface({ color: "#5d8fae", fogScale: 1.1 }), "civic:dome-core");
    mesh(new THREE.SphereGeometry(dm.r, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.62).translate(x, y, z), glassMaterial({ tint: "#b4dcef", opacity: 0.5, sky: 1, glow: { tone: "cyan", strength: 0.35 } }), "civic:dome");
    glow.push({ pos: new THREE.Vector3(x, y + dm.r * 0.5, z), color: SCENE_TONES.cyan, size: dm.r * 0.9 });
  }
  mesh(merge(podiums), surface({ color: "#d8d2c6", relief: { kind: "stone", bay: 0.4, floor: 0.5, strength: 0.6 }, glow: floodlit, fogScale: 1.1 }), "civic:podiums");

  // ---- The four landmarks: real proportions, the plates' colours. Their
  // lit parts are shaded by day like the rest and glow softly after dark
  // (kit/neon.ts: litSurface): the Pearl's spheres rose glass, the others'
  // bands gold, the World Financial Center's edge cyan; the Pearl's legs
  // and columns take a faint rose too, so they read at night
  const detail = mobile ? "far" : "near";
  type Maker = (d: "near" | "far", m: { body: THREE.Material; glass: THREE.Material; lit: THREE.Material }) => Landmark;
  const LANDMARKS: [Maker, readonly [number, number], { body: THREE.Material; base: string; glass: string; lit: THREE.Material; tone: SceneTone }][] = [
    [buildPearlTower, lm.pearl, { body: litSurface({ color: "#d6ccc8", tone: "rose", strength: 0.22 }), base: "#bfb2ad", glass: "#8a6f88", lit: litSurface({ color: "#dba8c8", tone: "rose", strength: 1.1 }), tone: "rose" }],
    [buildWorldFinancialCenter, lm.worldFinancialCenter, { body: surface({ color: "#9dbcd8", fogScale: 1.1 }), base: "#7f9fbe", glass: "#a8cbe8", lit: litSurface({ color: "#a7bfd4", tone: "cyan", strength: 1.05 }), tone: "cyan" }],
    [buildJinMao, lm.jinMao, { body: surface({ color: "#c7bca7", fogScale: 1.1 }), base: "#a79c87", glass: "#5f7d99", lit: litSurface({ color: "#b9ab8e", tone: "gold", strength: 0.95 }), tone: "gold" }],
    [buildShanghaiTower, lm.shanghaiTower, { body: surface({ color: "#a6c2da", fogScale: 1.1 }), base: "#87a6c2", glass: "#a9cbe6", lit: litSurface({ color: "#a9c0d4", tone: "gold", strength: 1.0 }), tone: "gold" }],
  ];
  const landmarks: Landmark[] = [];
  for (const [builder, [x, z], c] of LANDMARKS) {
    const landmark = builder(detail, { body: c.body, glass: windowMaterial({ base: c.base, glass: c.glass, fogScale: 1.1 }), lit: c.lit });
    landmark.group.position.set(x, 0, z);
    landmark.group.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) geometries.push((o as THREE.Mesh).geometry);
    });
    add(landmark.group);
    landmarks.push(landmark);
    for (const m of landmark.lit) {
      m.geometry.computeBoundingSphere();
      const s = m.geometry.boundingSphere!;
      glow.push({ pos: s.center.clone().add(landmark.group.position), color: SCENE_TONES[c.tone], size: Math.min(3, s.radius * 0.8) });
    }
  }

  // ---- Neon on the skyline, as accents (no words): lit crowns round the
  // roofs of some taller towers, a lit corner edge up a few, and screens
  // on a few fronts; one merged mesh per tone
  const accents = rng(41);
  const tones: readonly SceneTone[] = L.neon.tones;
  const parts: Record<SceneTone, THREE.BufferGeometry[]> = { cyan: [], rose: [], gold: [] };
  const lights: LightStrip[] = [];
  const screens: TowerSpec[] = [];
  const corner = (t: TowerSpec, sx: number, sz: number) => new THREE.Vector3((sx * t.w) / 2, 0, (sz * t.d) / 2).applyAxisAngle(new THREE.Vector3(0, 1, 0), t.ry).add(new THREE.Vector3(t.x, 0, t.z));
  for (const t of [...front, ...mid].sort((a, b) => a.seed - b.seed)) {
    const tone = accents.pick(tones);
    if (t.h > L.neon.crownOver && accents() < L.neon.crowns) {
      const band = 0.32;
      const y = t.h - band / 2 - 0.05;
      for (const p of [box(t.w + 0.04, band, 0.05).translate(0, 0, t.d / 2 + 0.02), box(t.w + 0.04, band, 0.05).translate(0, 0, -t.d / 2 - 0.02), box(0.05, band, t.d).translate(t.w / 2 + 0.02, 0, 0), box(0.05, band, t.d).translate(-t.w / 2 - 0.02, 0, 0)]) parts[tone].push(p.rotateY(t.ry).translate(t.x, y, t.z));
      lights.push({ x: t.x, z: t.z + t.d / 2, w: t.w * 0.5, color: SCENE_TONES[tone], height: t.h });
      glow.push({ pos: new THREE.Vector3(t.x, y, t.z + t.d / 2), color: SCENE_TONES[tone], size: t.w * 0.7 });
    } else if (accents() < L.neon.edges) {
      const c = corner(t, 1, 1);
      parts[tone].push(box(0.06, t.h * 0.85, 0.06).translate(c.x, t.h * 0.5, c.z));
      lights.push({ x: c.x, z: c.z, w: 0.3, color: SCENE_TONES[tone], height: t.h * 0.8 });
    } else if (screens.length < L.neon.screens && t.h > 8 && t.style !== 2 && accents() < 0.25) {
      screens.push(t);
    } else {
      // its windows, warm, in the water
      lights.push({ x: t.x, z: t.z + t.d / 2, w: Math.max(0.3, t.w * 0.28), color: accents() < 0.9 ? "#ffc98a" : "#bfe4ff", height: t.h * 0.55 });
    }
  }
  for (const tone of ["cyan", "rose", "gold"] as SceneTone[]) if (parts[tone].length) mesh(merge(parts[tone]), neonMaterial(dim(tone, 0.5), { dayColor: L.neon.day }), `neon:${tone}`);
  for (const t of screens) {
    const w = t.w * 0.78;
    const h = Math.min(t.h * 0.2, w * 0.62);
    const screen = mesh(new THREE.PlaneGeometry(w, h), screenMaterial(screenArt(t.seed % 9973), { w: 256, h: 160, key: `riverside:screen:${t.seed}`, glow: 1.2 }), "screen");
    screen.position.set(t.x, t.h * 0.66, t.z);
    screen.rotation.y = t.ry;
    screen.translateZ(t.d / 2 + 0.03);
    lights.push({ x: t.x, z: t.z + t.d / 2, w: w * 0.6, color: SCENE_TONES.rose, height: t.h * 0.66 });
  }
  for (const [, [x, z], c] of LANDMARKS) lights.push({ x, z: z + 2, w: 0.9, color: SCENE_TONES[c.tone], height: 24 });
  for (let x = L.bank.lamps.from; x <= L.bank.lamps.to; x += L.bank.lamps.step) lights.push({ x, z: L.water.far + 0.4, w: 0.2, color: "#ffc98a", height: 0.8 });

  // ---- The river, reflecting the skyline's lights
  const river = buildRiver({ w: L.water.width, d: L.water.near - L.water.far, x: 0, z: (L.water.near + L.water.far) / 2, y: WATER_Y, mode, lights, size: TIERS[quality].reflectionSize || undefined });
  add(river.mesh);
  disposers.push(river.dispose);

  // ---- The far bank's trees and lamps
  const tr = rng(61);
  const bankTreeSpots: { x: number; z: number; s: number }[] = [];
  for (let x = L.bank.trees.from; x <= L.bank.trees.to; x += L.bank.trees.step) bankTreeSpots.push({ x: x + tr.range(-0.5, 0.5), z: L.bank.z - tr.range(0, 1.2), s: tr.range(L.bank.trees.size[0], L.bank.trees.size[1]) });
  const bankTrees = buildStreetTrees(17, bankTreeSpots);
  const landingTrees = buildStreetTrees(19, L.trees.map(([x, z]) => ({ x, z, s: 0.8 })));
  for (const t of [...bankTrees, ...landingTrees]) {
    geometries.push(t.geometry);
    t.position.y = LAND;
    add(t);
  }
  const bankLampSpots: { x: number; y: number; z: number }[] = [];
  for (let x = L.bank.lamps.from; x <= L.bank.lamps.to; x += L.bank.lamps.step) bankLampSpots.push({ x, y: LAND, z: L.water.far - 0.3 });
  const bankLamps = buildLampRow(bankLampSpots);
  bankLamps.meshes.forEach((m) => add(m));
  disposers.push(bankLamps.dispose);

  // ---- The landing: wet paving (its lamps streak it in the rain), the
  // railing in front of the boards, lamps between them
  const landing = wetPaving({
    w: L.water.width,
    d: L.landing.z1 - L.landing.z0,
    x: 0,
    z: (L.landing.z0 + L.landing.z1) / 2,
    y: LAND,
    mode: "fake",
    color: PAVING,
    lights: L.lamps.map(([x, z]) => ({ x, z, w: 0.2, color: "#ffc98a", height: 0.6 })),
  });
  add(landing.mesh);
  disposers.push(landing.dispose);
  mesh(merge([slab(-W, W, L.landing.z0, L.landing.z1, -0.4, LAND - 0.01)]), surface({ color: PAVING }), "landing");
  const railing = add(buildRailing([new THREE.Vector3(L.railing.x0, LAND, L.railing.z), new THREE.Vector3(L.railing.x1, LAND, L.railing.z)]));
  geometries.push(railing.geometry);
  for (const p of buildPlanters(71, L.planters.map(([x, z]) => ({ x, z, w: 0.7, d: 0.32, h: 0.07, y: LAND })), { stone: "#8f8a82" })) {
    geometries.push(p.geometry);
    add(p);
  }
  const lamps = buildLampRow(L.lamps.map(([x, z]) => ({ x, y: LAND, z })));
  lamps.meshes.forEach((m) => add(m));
  disposers.push(lamps.dispose);

  // ---- The boards: each section's title (buildSign) on two posts down to
  // the landing, at its edge, the water behind. The face is named
  // sign:<id>, its frame, edge and posts mount:<id> (visibility.mjs lets a
  // board's own mount stand behind its edge)
  const signs: Built["signs"] = [];
  for (const b of boards) {
    const id = b.id;
    const title = section(id).title;
    const { group: sign, face: signFace, anchor } = buildSign({ text: title, tone: "cyan", w: b.w, h: b.h, kind: "board" });
    sign.position.set(b.x, b.y, b.z);
    // parallel to the home view's picture plane (tilted back by the view's
    // pitch), so each board shows as an upright rectangle wherever it
    // stands in the frame, not leaning or skewed toward the corners
    sign.rotation.set(PITCH, 0, 0);
    signFace.name = `sign:${b.id}`;
    sign.traverse((o) => {
      if ((o as THREE.Mesh).isMesh && o !== signFace) o.name = `mount:${b.id}`;
    });
    add(sign);
    disposers.push(() => disposeSign(sign));
    const postH = b.y - b.h / 2 - LAND;
    const posts = mesh(merge([-1, 1].map((side) => box(0.05, postH, 0.05).translate(side * b.w * 0.35, -b.h / 2 - postH / 2, -0.08))), surface({ color: POST }), `mount:${b.id}`);
    posts.position.copy(sign.position);

    sign.updateMatrixWorld(true);
    const at = (dx: number, dy: number) => sign.localToWorld(new THREE.Vector3(dx, dy, anchor.z));
    signs.push({
      id: b.id,
      center: at(0, 0),
      size: [b.w, b.h, 0.3],
      ry: 0,
      corners: { top: at(0, b.h / 2), foot: at(0, -b.h / 2), left: at(-b.w / 2, 0), right: at(b.w / 2, 0) },
    });
  }

  // ---- The ferry (a mover), and the roofs' warning lights, steady
  const boat = buildBoat(L.boat.seed, { z: L.boat.z, x0: L.boat.x0, x1: L.boat.x1, period: L.boat.period });
  boat.object.position.y = WATER_Y;
  add(boat.object);
  disposers.push(() => boat.object.userData.dispose?.());
  const tops = [...landmarks.map((l) => new THREE.Vector3(0, l.height + 0.1, 0).add(l.group.position)), ...mid.filter((t) => t.h > 22).map((t) => new THREE.Vector3(t.x, t.h + 0.08, t.z))];
  const air = aircraftLights(7, tops);
  air.park();
  add(air.object);
  disposers.push(() => air.object.userData.dispose?.());

  // ---- What the planar river reflects (high tier)
  if (mode === "planar") reflectIn(sky, ...nearTowers, ...farTowers, ...landmarks.map((l) => l.group), bank, ...bankTrees, ...bankLamps.meshes, boat.object, air.object, ...group.children.filter((o) => o.name.startsWith("neon:") || o.name.startsWith("civic") || o.name === "screen"));

  // ---- The mobile tier has no bloom: soft glow sprites stand in for it
  // on the neon and the landmarks' lit parts
  if (mobile) {
    const sprites = glowSprites(glow);
    add(sprites);
    geometries.push(sprites.geometry);
    disposers.push(() => sprites.dispose());
  }

  return {
    group,
    signs,
    movers: [boat],
    dispose: () => {
      geometries.forEach((g) => g.dispose());
      disposers.forEach((d) => d());
    },
  };
}

// The boards answer a pointer only while their links stand over them
// (html[data-city-tags="over"]); where the links are a row of keys in the
// sheet instead (a small phone, a phone on its side), the boards are just
// signs
// After dark the landing's lamps light the paving and the boards' posts
// round them (kit/glow.ts: pools); lamp heads 0.61 up, over their +x
const POOLS: GlowPool[] = L.lamps.slice(0, 12).map(([x, z]): GlowPool => ({ pos: [x + 0.1, LAND + 0.6, z], reach: 1.9, color: "#ffc98a", strength: 1.5 }));

const boardsLive = () => document.documentElement.dataset.cityTags === "over";

export default function Riverside({ navigate, quality, active, still }: SceneProps) {
  const built = useMemo(() => build(quality), [quality]);
  useMovers(built.movers, { active, still });
  useGlowPools("lujiazui", POOLS, active);
  useEffect(() => {
    // "sign:<id>", the board's middle, and its four edges' middles
    // ("sign:<id>:top", …), from which the page sizes the board's link
    for (const s of built.signs) {
      anchors.set(`sign:${s.id}`, s.center);
      for (const [k, v] of Object.entries(s.corners)) anchors.set(`sign:${s.id}:${k}`, v);
    }
    return () => {
      for (const s of built.signs) {
        anchors.delete(`sign:${s.id}`);
        for (const k of Object.keys(s.corners)) anchors.delete(`sign:${s.id}:${k}`);
      }
    };
  }, [built]);
  useDisposeOnUnmount(built);
  return (
    <>
      <primitive object={built.group} />
      {built.signs.map((s) => (
        <Hitbox
          key={s.id}
          id={`sign:${s.id}`}
          position={[s.center.x, s.center.y, s.center.z]}
          rotation={s.ry}
          size={s.size}
          onSelect={() => navigate(cityPath(s.id))}
          enabled={boardsLive}
        />
      ))}
    </>
  );
}
