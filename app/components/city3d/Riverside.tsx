"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { cityPath } from "../../lib/cityRoutes";
import { section, type SectionId } from "../../sections/registry";
import { anchors } from "./anchors";
import { Hitbox, useMovers, type Mover, type SceneProps } from "./common";
import { RIVERSIDE } from "./districts/lujiazui.def";
import { box, merge } from "./kit/geometry";
import { buildJinMao, buildPearlTower, buildShanghaiTower, buildWorldFinancialCenter, type Landmark } from "./kit/landmarks";
import { aircraftLights, buildBoat, buildTrain } from "./kit/movers";
import { glowSprites, neonMaterial, SCENE_TONES, screenArt, screenMaterial, type SceneTone } from "./kit/neon";
import { reflectIn, type LightStrip } from "./kit/reflection";
import { buildMarkSign, buildSign, disposeSign, glowPoints } from "./kit/signs";
import { buildSkyDome } from "./kit/sky";
import { buildLampRow, buildRailing, buildViaduct, glowMaterial } from "./kit/street";
import { surface } from "./kit/surface";
import { buildTowers, layoutTowers, type TowerSpec } from "./kit/towers";
import { buildStreetTrees } from "./kit/trees";
import { windowMaterial } from "./kit/windows";
import { buildRiver, wetPaving } from "./kit/water";
import { rng } from "./rng";
import { RIVERSIDE_EYE, signPlace, type SceneId } from "./scenes";
import { TIERS, type Quality } from "./tiers";

// Home, the riverside: the camera stands on a promenade at the back of a
// small bay (districts/lujiazui.def.ts: home) and looks across the river
// at the skyline, as the two riverside paintings do
// (app/assets/city/lujiazui-day.webp, -night.webp). One unit is ten
// metres. Where everything stands is data (lujiazui.def.ts: RIVERSIDE, and
// each section's def: sign); this file only builds it, from the kit:
//
//   the sky dome; the river (a planar reflection on the high tier, painted
//   streaks of the lights on every tier); the promenade, its railing and
//   lamps; two quays reaching into the river either side of the bay; the
//   far bank's embankment, trees and lamps; the skyline in two rings of
//   instanced towers whose windows light by the hour, rising to the four
//   landmarks; a few neon crowns and screens on the towers as accents; and
//   the five sections' boards with what stands round each:
//
//   About       near bank, left: before a cluster of low lane houses
//   Experience  over the river, left: on a gantry on the viaduct
//   Projects    far bank, raised clear of the first ring of towers, over a
//               lit walkway ring
//   Interests   near bank, right: over a street mouth between two facades
//   Contact     near bank, far right: beside a clock tower
//
// Each board keeps a clear zone: nothing stands directly behind its word
// from the home view (a tower that would is kept lower than the board's
// foot, the landmarks stand together between Projects and Interests), and
// nothing stands on a line from the camera to a sign
// (docs/city/scripts/visibility.mjs checks both). Every board carries its
// section's title from the registry (kit/signs.ts: buildSign), the only
// words in the scene; the page pins one link over each (City3D.tsx: Tags),
// its hit area and focus ring. A ferry crosses the channel, a train stands
// on the viaduct and the tallest roofs carry red warning lights: movers,
// parked in still view (common.tsx: useMovers). The riverside has no spot
// lights (scenes.ts: DISTRICT_LIGHTS): its lamps are lit surfaces.

const EYE = new THREE.Vector3(...RIVERSIDE_EYE);
const L = RIVERSIDE;

// Left to right
const SIGNED: Exclude<SectionId, "home">[] = ["about", "experience", "projects", "interests", "contact"];
const placeOf = (id: Exclude<SectionId, "home">) => section(id).district as Exclude<SceneId, "lujiazui">;

// The land's top, over the water
const LAND = 0.25;
const WATER_Y = 0.02;

// Colours, from the plates
const PAVING = "#3b3f47";
const QUAY = "#9c9b95";
const BANK = "#4f5a4c";
const LANE_WALL = "#a39684";
const LANE_ROOF = "#3c3f45";
const FACADE = "#b2a48d";
const CLOCK_STONE = "#c0b49f";
const POST = "#22252b";

// How brightly an accent's neon burns at night, of the full tone (kit/neon.ts:
// NEON_HDR × this crosses the bloom threshold, so it glows, but softly)
const dim = (tone: SceneTone, k: number) => `#${new THREE.Color(SCENE_TONES[tone]).multiplyScalar(k).getHexString()}`;

// The boards: where each stands (scenes.ts: signPlace) and the bearings
// (left/right edges, foot) seen from the eye, for the clear zones
type Board = ReturnType<typeof signPlace> & { id: Exclude<SectionId, "home">; dist: number; bearing: number; half: number; foot: number };
const boards: Board[] = SIGNED.map((id) => {
  const p = signPlace(placeOf(id));
  const dist = Math.hypot(p.x - EYE.x, p.z - EYE.z);
  return {
    ...p,
    id,
    dist,
    bearing: Math.atan2(p.x - EYE.x, EYE.z - p.z),
    // widened by a tenth either side, as the visibility check is
    half: Math.atan(((p.w / 2) * 1.1) / dist),
    foot: Math.atan((p.y - (p.h / 2) * 1.1 - EYE.y) / dist),
  };
});

// The tallest a thing at (x, z), `w` across, may stand without rising
// behind a board's word (seen from the eye); Infinity where no board is
// in front of it
function heightAllowed(x: number, z: number, w: number) {
  const d = Math.hypot(x - EYE.x, z - EYE.z);
  const bearing = Math.atan2(x - EYE.x, EYE.z - z);
  let most = Infinity;
  for (const b of boards) {
    if (d <= b.dist) continue;
    if (Math.abs(bearing - b.bearing) >= b.half + Math.atan(w / 2 / d) + 0.004) continue;
    // under the board's foot, with a little room
    most = Math.min(most, EYE.y + d * Math.tan(b.foot - 0.006));
  }
  return most;
}
// Whether (x, z) is within `margin` radians of a board's bearing (no neon there: its glow would reach the word)
const nearABoard = (x: number, z: number, margin: number) => {
  const bearing = Math.atan2(x - EYE.x, EYE.z - z);
  return boards.some((b) => Math.abs(bearing - b.bearing) < b.half + margin);
};

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
  // A box with its foot at y, in one merged geometry's parts list
  const slab = (x0: number, x1: number, z0: number, z1: number, y0: number, y1: number) => box(x1 - x0, y1 - y0, z1 - z0).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);

  // ---- The sky
  const sky = add(buildSkyDome({ seed: 101, radius: 900 }));
  geometries.push(sky.geometry);

  // ---- The land: the quays and the far bank (the promenade is wet paving, below)
  const quays = mesh(merge(L.quays.map((q) => slab(q.x0, q.x1, q.z0, q.z1, -0.4, LAND))), surface({ color: QUAY, grime: 0.4, snow: true }), "quays");
  quays.receiveShadow = true;
  const bank = mesh(merge([slab(-L.water.width / 2, L.water.width / 2, -420, L.water.far, -0.4, LAND), slab(-L.water.width / 2, L.water.width / 2, L.water.far - 0.4, L.water.far + 0.05, -0.4, LAND + 0.15)]), surface({ color: BANK, grime: 0.3, snow: true, fogScale: 1.2 }), "bank");

  // ---- The skyline
  const lm = L.landmarks;
  const keepOut = Object.values(lm).map(([x, z]) => ({ x, z, r: L.landmarkKeepOut }));
  const crest = (x: number) => L.skyline.crest.least + (1 - L.skyline.crest.least) * Math.exp(-(((x - L.skyline.crest.x) / L.skyline.crest.spread) ** 2));
  // Shaped to rise toward the landmarks, and kept under every board's foot
  const shape = (specs: TowerSpec[]) =>
    specs
      .map((t) => ({ ...t, h: Math.min(t.h * crest(t.x), heightAllowed(t.x, t.z, Math.hypot(t.w, t.d))) }))
      .filter((t) => t.h >= 1.6);
  const coreRing = shape(layoutTowers(L.skyline.core.seed, L.skyline.core.area, L.skyline.core.count, L.skyline.core.height, keepOut));
  const nearRing = [...shape(layoutTowers(L.skyline.near.seed, L.skyline.near.area, L.skyline.near.count, L.skyline.near.height, [...keepOut, ...coreRing.map((t) => ({ x: t.x, z: t.z, r: Math.hypot(t.w, t.d) / 2 }))])), ...coreRing];
  const farRing = shape(layoutTowers(L.skyline.far.seed, L.skyline.far.area, L.skyline.far.count, L.skyline.far.height, keepOut));
  const nearTowers = buildTowers(nearRing, { far: false });
  const farTowers = buildTowers(farRing, { far: true, fogScale: L.skyline.far.fogScale });
  for (const t of [...nearTowers, ...farTowers]) {
    geometries.push(t.geometry);
    add(t);
  }

  // ---- The four landmarks: real proportions, the plates' colours; their
  // lit parts are neon (the Pearl's spheres rose, the others' bands gold
  // and the World Financial Center's edge cyan), dimmed so they glow softly
  const detail = mobile ? "far" : "near";
  const LANDMARKS: [(d: "near" | "far", m: { body: THREE.Material; glass: THREE.Material; lit: THREE.Material }) => Landmark, readonly [number, number], { body: string; base: string; glass: string; tone: SceneTone; day: string; k: number }][] = [
    [buildPearlTower, lm.pearl, { body: "#d4cbc6", base: "#bfb2ad", glass: "#8a6f88", tone: "rose", day: "#c56f9f", k: 0.5 }],
    [buildWorldFinancialCenter, lm.worldFinancialCenter, { body: "#7a93ad", base: "#5f7a95", glass: "#86aacb", tone: "cyan", day: "#a7bfd4", k: 0.4 }],
    [buildJinMao, lm.jinMao, { body: "#a69a83", base: "#7a705f", glass: "#45607b", tone: "gold", day: "#b9ab8e", k: 0.42 }],
    [buildShanghaiTower, lm.shanghaiTower, { body: "#86a0b8", base: "#6b88a4", glass: "#8db3d3", tone: "gold", day: "#a9c0d4", k: 0.36 }],
  ];
  const landmarks: Landmark[] = [];
  const landmarkGlow: { pos: THREE.Vector3; color: string; size: number }[] = [];
  for (const [builder, [x, z], c] of LANDMARKS) {
    const landmark = builder(detail, {
      body: surface({ color: c.body, fogScale: 1.1 }),
      glass: windowMaterial({ base: c.base, glass: c.glass, fogScale: 1.1 }),
      lit: neonMaterial(dim(c.tone, c.k), { dayColor: c.day }),
    });
    landmark.group.position.set(x, 0, z);
    landmark.group.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) geometries.push((o as THREE.Mesh).geometry);
    });
    add(landmark.group);
    landmarks.push(landmark);
    for (const m of landmark.lit) {
      m.geometry.computeBoundingSphere();
      const s = m.geometry.boundingSphere!;
      landmarkGlow.push({ pos: s.center.clone().add(landmark.group.position), color: SCENE_TONES[c.tone], size: Math.min(4, s.radius * 0.9) });
    }
  }

  // ---- Accents: neon crowns on a few towers' roofs, and screens on a
  // few fronts, never near a board's bearing (their glow would reach the word)
  const accents = rng(41);
  const crownParts: Record<SceneTone, THREE.BufferGeometry[]> = { cyan: [], rose: [], gold: [] };
  const crownGlow: { pos: THREE.Vector3; color: string; size: number }[] = [];
  const screens: { t: TowerSpec; seed: number }[] = [];
  const candidates = nearRing.filter((t) => t.h > 9 && !nearABoard(t.x, t.z, 0.05)).sort((a, b) => a.seed - b.seed);
  candidates.forEach((t, i) => {
    if (i % 3 === 0 && screens.length < 3 && t.style !== 2) {
      screens.push({ t, seed: t.seed });
      return;
    }
    if (accents() > 0.55) return;
    const tone = accents.pick(["rose", "rose", "cyan", "gold"] as SceneTone[]);
    const band = 0.22;
    const y = t.h - band / 2 - 0.05;
    const parts = [box(t.w + 0.04, band, 0.05).translate(0, 0, t.d / 2 + 0.02), box(t.w + 0.04, band, 0.05).translate(0, 0, -t.d / 2 - 0.02), box(0.05, band, t.d).translate(t.w / 2 + 0.02, 0, 0), box(0.05, band, t.d).translate(-t.w / 2 - 0.02, 0, 0)];
    for (const p of parts) {
      p.rotateY(t.ry).translate(t.x, y, t.z);
      crownParts[tone].push(p);
    }
    crownGlow.push({ pos: new THREE.Vector3(t.x, y, t.z + t.d / 2), color: SCENE_TONES[tone], size: t.w * 0.9 });
  });
  for (const tone of ["cyan", "rose", "gold"] as SceneTone[]) {
    if (!crownParts[tone].length) continue;
    mesh(merge(crownParts[tone]), neonMaterial(dim(tone, 0.55), { dayColor: dim(tone, 0.8) }), `crowns:${tone}`);
  }
  for (const { t, seed } of screens) {
    const w = t.w * 0.78;
    const h = Math.min(t.h * 0.18, w * 0.6);
    const material = screenMaterial(screenArt(seed % 9973), { w: 256, h: 160, key: `riverside:screen:${seed}`, glow: 1.25 });
    const screen = mesh(new THREE.PlaneGeometry(w, h), material, "screen");
    screen.position.set(t.x, t.h * 0.62, t.z);
    screen.rotation.y = t.ry;
    screen.translateZ(t.d / 2 + 0.03);
  }

  // ---- The river, reflecting the skyline's lights
  const lights: LightStrip[] = [];
  const warm = ["#ffc98a", "#ffc98a", "#ffd9a6", "#bfe4ff"];
  const lr = rng(53);
  for (const t of nearRing) lights.push({ x: t.x, z: t.z + t.d / 2, w: Math.max(0.35, t.w * 0.3), color: lr.pick(warm), height: t.h * 0.6 });
  for (const [, [x, z], c] of LANDMARKS) lights.push({ x, z: z + 2, w: 0.9, color: SCENE_TONES[c.tone], height: 22 });
  for (const t of screens) lights.push({ x: t.t.x, z: t.t.z + t.t.d / 2, w: t.t.w * 0.5, color: SCENE_TONES.rose, height: t.t.h * 0.62 });
  for (let x = L.bank.lamps.from; x <= L.bank.lamps.to; x += L.bank.lamps.step) lights.push({ x, z: L.water.far + 0.4, w: 0.22, color: "#ffc98a", height: 0.8 });
  const riverDepth = L.water.near - L.water.far;
  const river = buildRiver({ w: L.water.width, d: riverDepth, x: 0, z: (L.water.near + L.water.far) / 2, y: WATER_Y, mode, lights, size: TIERS[quality].reflectionSize || undefined });
  add(river.mesh);
  disposers.push(river.dispose);

  // ---- The promenade: wet paving (streaks of its lamps in the rain), its
  // railing along the water, two lamps either side of the bay
  const prom = wetPaving({
    w: L.water.width,
    d: L.promenade.z1 - L.promenade.z0,
    x: 0,
    z: (L.promenade.z0 + L.promenade.z1) / 2,
    y: LAND,
    mode: "fake",
    color: PAVING,
    lights: L.promenadeLamps.map(([x, z]) => ({ x, z, w: 0.2, color: "#ffc98a", height: 0.6 })),
  });
  add(prom.mesh);
  disposers.push(prom.dispose);
  mesh(merge([slab(-L.water.width / 2, L.water.width / 2, L.promenade.z0, L.promenade.z1, -0.4, LAND - 0.01)]), surface({ color: PAVING }), "promenade");
  const railing = add(buildRailing([new THREE.Vector3(L.railing.x0, LAND, L.railing.z), new THREE.Vector3(L.railing.x1, LAND, L.railing.z)]));
  geometries.push(railing.geometry);
  const promLamps = buildLampRow(L.promenadeLamps.map(([x, z]) => ({ x, y: LAND, z })));
  promLamps.meshes.forEach((m) => add(m));
  disposers.push(promLamps.dispose);

  // ---- The far bank: trees and lamps along the embankment
  const tr = rng(61);
  const bankTreeSpots: { x: number; z: number; s: number }[] = [];
  for (let x = L.bank.trees.from; x <= L.bank.trees.to; x += L.bank.trees.step) bankTreeSpots.push({ x: x + tr.range(-0.5, 0.5), z: L.bank.z - tr.range(0, 1.2), s: tr.range(0.85, 1.25) });
  const bankTrees = buildStreetTrees(17, bankTreeSpots);
  const quayTrees = buildStreetTrees(19, L.quayTrees.map(([x, z]) => ({ x, z, s: 0.9 })));
  for (const t of [...bankTrees, ...quayTrees]) {
    geometries.push(t.geometry);
    t.position.y = LAND;
    add(t);
  }
  const bankLampSpots: { x: number; y: number; z: number }[] = [];
  for (let x = L.bank.lamps.from; x <= L.bank.lamps.to; x += L.bank.lamps.step) bankLampSpots.push({ x, y: LAND, z: L.water.far - 0.3 });
  const bankLamps = buildLampRow(bankLampSpots);
  bankLamps.meshes.forEach((m) => add(m));
  disposers.push(bankLamps.dispose);

  // ---- About: low lane houses on the left quay, one upstairs window lit
  const lanes = rng(L.lanes.seed);
  const walls: THREE.BufferGeometry[] = [];
  const roofs: THREE.BufferGeometry[] = [];
  for (let i = 0; i < L.lanes.count; i++) {
    const x = lanes.range(L.lanes.x[0], L.lanes.x[1]);
    const z = lanes.range(L.lanes.z[0], L.lanes.z[1]);
    const w = lanes.range(1.4, 2.2);
    const d = lanes.range(1.2, 1.8);
    const h = lanes.range(0.9, 1.4);
    // never behind the board's word
    const top = Math.min(h + d * 0.3, heightAllowed(x, z, Math.hypot(w, d)) - LAND);
    if (top < 0.8) continue;
    const wallH = Math.min(h, top - d * 0.3);
    walls.push(box(w, wallH, d).translate(x, LAND + wallH / 2, z));
    // a gable roof: a three-sided prism along x
    const roof = new THREE.CylinderGeometry(d * 0.6, d * 0.6, w + 0.1, 3, 1).rotateY(Math.PI / 2).rotateZ(Math.PI / 2);
    roof.scale(1, 0.5, 1);
    roofs.push(roof.translate(x, LAND + wallH + d * 0.15, z));
  }
  mesh(merge(walls), surface({ color: LANE_WALL, grime: 0.6, snow: true }), "lanes");
  mesh(merge(roofs), surface({ color: LANE_ROOF, snow: true }), "lane-roofs");
  const lit = mesh(new THREE.PlaneGeometry(0.28, 0.2), glowMaterial({ day: "#3b3833", night: "#ffbf6e" }), "lane-window");
  lit.position.set(L.lanes.litWindow[0], LAND + 0.75, L.lanes.litWindow[1]);

  // ---- Experience: the viaduct across the river's left part, a train on it
  const viaduct = add(buildViaduct([new THREE.Vector3(L.viaduct.x0, L.viaduct.y, L.viaduct.z), new THREE.Vector3(L.viaduct.x1, L.viaduct.y, L.viaduct.z)], { width: L.viaduct.width }));
  geometries.push(viaduct.geometry);
  const train = buildTrain(4, { span: L.viaduct.x1 - L.viaduct.x0 - 4, period: 75 });
  train.object.position.set((L.viaduct.x0 + L.viaduct.x1) / 2, L.viaduct.y, L.viaduct.z);
  add(train.object);

  // ---- Interests: a street mouth between two old facades, mark blades on them
  mesh(merge(L.street.facades.map(([x, z, w, d, h]) => box(w, h, d).translate(x, LAND + h / 2, z))), surface({ color: FACADE, grime: 0.6, snow: true }), "facades");
  L.street.facades.forEach(([x, z, w, d], i) => {
    const blade = buildMarkSign({ seed: 300 + i, tone: i ? "gold" : "rose", w: 0.32, h: 1.1, kind: "blade" });
    const side = i ? -1 : 1;
    blade.position.set(x + side * (w / 2 + 0.45), LAND + 1.4, z + d / 2 - 0.4);
    if (side < 0) blade.rotation.y = Math.PI;
    add(blade);
    disposers.push(() => disposeSign(blade));
  });

  // ---- Projects: a lit walkway ring on the far bank, under its board
  const projects = boards.find((b) => b.id === "projects")!;
  const ring = mesh(new THREE.TorusGeometry(2.6, 0.05, 6, 48), neonMaterial(dim("cyan", 0.5), { dayColor: "#9fd9e6" }), "walkway");
  ring.rotation.x = Math.PI / 2;
  ring.position.set(projects.x, LAND + 0.9, projects.z - 2.2);

  // ---- Contact: the clock tower beside its board (never behind its word)
  const contact = boards.find((b) => b.id === "contact")!;
  const towerAt = (contact.w / 2) * 1.1 + L.clockTower.offset;
  const cx = contact.x + Math.cos(contact.ry) * towerAt;
  const cz = contact.z - Math.sin(contact.ry) * towerAt - L.clockTower.back;
  const ct = L.clockTower;
  mesh(merge([box(ct.size, ct.height, ct.size).translate(cx, LAND + ct.height / 2, cz), box(ct.size * 0.7, 1.2, ct.size * 0.7).translate(cx, LAND + ct.height + 0.6, cz)]), surface({ color: CLOCK_STONE, grime: 0.5, snow: true }), "clock-tower");
  const face = mesh(new THREE.CircleGeometry(ct.size * 0.32, 32), glowMaterial({ day: "#ece6d6", night: "#ffe0a6" }), "clock-face");
  face.position.set(cx, LAND + ct.height - 1.1, cz + ct.size / 2 + 0.01);
  const hands = mesh(merge([box(0.05, ct.size * 0.24, 0.01).translate(0, ct.size * 0.1, 0), box(ct.size * 0.18, 0.05, 0.01).translate(ct.size * 0.08, 0, 0)]), surface({ color: "#22252b" }), "clock-hands");
  hands.position.set(cx, LAND + ct.height - 1.1, cz + ct.size / 2 + 0.03);

  // ---- The boards: each section's title (buildSign), on two posts down to
  // the ground (Experience: to the viaduct's deck). The face is named
  // sign:<id>, its frame, edge and posts mount:<id> (visibility.mjs lets a
  // board's own mount stand behind its edge)
  const signs: Built["signs"] = [];
  for (const b of boards) {
    const id = b.id;
    const title = section(id).title;
    const { group: sign, face: signFace, anchor } = buildSign({ text: title, tone: "cyan", w: b.w, h: b.h, kind: "board" });
    sign.position.set(b.x, b.y, b.z);
    sign.rotation.y = b.ry;
    signFace.name = `sign:${b.id}`;
    sign.traverse((o) => {
      if ((o as THREE.Mesh).isMesh && o !== signFace) o.name = `mount:${b.id}`;
    });
    add(sign);
    disposers.push(() => disposeSign(sign));
    const from = b.id === "experience" ? L.viaduct.y + 0.3 : LAND;
    const postH = b.y - b.h / 2 - from;
    const posts = mesh(merge([-1, 1].map((side) => box(0.12, postH, 0.12).translate(side * b.w * 0.35, -b.h / 2 - postH / 2, -0.1))), surface({ color: POST }), `mount:${b.id}`);
    posts.position.copy(sign.position);
    posts.rotation.y = b.ry;
    sign.updateMatrixWorld(true);
    const at = (dx: number, dy: number) => sign.localToWorld(new THREE.Vector3(dx, dy, anchor.z));
    signs.push({
      id: b.id,
      center: at(0, 0),
      size: [b.w, b.h, 0.3],
      ry: b.ry,
      corners: { top: at(0, b.h / 2), foot: at(0, -b.h / 2), left: at(-b.w / 2, 0), right: at(b.w / 2, 0) },
    });
  }

  // ---- Movers: the ferry, the train, the roofs' warning lights
  const boat = buildBoat(L.boat.seed, { z: L.boat.z, x0: L.boat.x0, x1: L.boat.x1, period: L.boat.period });
  boat.object.position.y = WATER_Y;
  add(boat.object);
  const tops = [
    ...landmarks.map((l) => new THREE.Vector3(0, l.height + 0.1, 0).add(l.group.position)),
    ...nearRing.filter((t) => t.h > 18).map((t) => new THREE.Vector3(t.x, t.h + 0.08, t.z)),
  ];
  const air = aircraftLights(7, tops);
  add(air.object);
  const movers: Mover[] = [boat, train, air];
  for (const m of movers) disposers.push(() => m.object.userData.dispose?.());

  // ---- What the planar river reflects (high tier): the sky, the
  // skyline, the far bank, the viaduct and what moves on the water
  if (mode === "planar") reflectIn(sky, ...nearTowers, ...farTowers, ...landmarks.map((l) => l.group), bank, ...bankTrees, ...bankLamps.meshes, viaduct, boat.object, air.object);

  // ---- The mobile tier has no bloom: soft glow sprites stand in for it
  // on the neon (the mark blades, the crowns, the landmarks' lit parts)
  if (mobile) {
    const sprites = glowSprites([...glowPoints(group), ...crownGlow, ...landmarkGlow]);
    add(sprites);
    geometries.push(sprites.geometry);
    disposers.push(() => sprites.dispose());
  }

  return {
    group,
    signs,
    movers,
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
const boardsLive = () => document.documentElement.dataset.cityTags === "over";

export default function Riverside({ navigate, quality, active, still }: SceneProps) {
  const built = useMemo(() => build(quality), [quality]);
  useMovers(built.movers, { active, still });
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
      built.dispose();
    };
  }, [built]);
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
