"use client";

import { useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { cityPath } from "../../lib/cityRoutes";
import { section, type SectionId } from "../../sections/registry";
import { anchors } from "./anchors";
import { Hitbox, type SceneProps } from "./common";
import { buildJinMao, buildPearlTower, buildShanghaiTower, buildWorldFinancialCenter } from "./kit/landmarks";
import { screenMaterial } from "./kit/neon";
import { surface } from "./kit/surface";
import { rng } from "./rng";
import { RIVERSIDE_EYE, signPlace, type SceneId } from "./scenes";

// Home, the riverside, in grey boxes: the layout to judge before anything
// detailed is built on it (Task 12 turns it into the scene). The camera
// stands at the back of a small bay (districts/lujiazui.def.ts: home, at
// [0, 2, 10]) and looks across the river at the skyline; one unit is ten
// metres. The five sections' signs stand left to right, About, Experience,
// Projects, Interests, Contact, where each section's def puts them
// (districts/<id>.def.ts: sign; scenes.ts: signPlace):
//
//   About       near bank, left: before a cluster of low lane roofs
//   Experience  over the river, left: on a gantry on the viaduct
//   Projects    far bank, raised clear of the first ring of towers
//   Interests   near bank, right: over a street mouth between two facades
//   Contact     near bank, far right: on posts beside a clock tower
//
// Each board keeps a clear zone: nothing stands directly behind its word
// from the home view (the skyline's towers leave a gap behind every board,
// the four tall landmarks stand together between Projects and Interests),
// and nothing stands on a line from the camera to a sign
// (docs/city/scripts/visibility.mjs checks both). Every sign carries its
// section's title from the registry; the page pins one link over each
// board (City3D.tsx: Tags), its hit area and focus ring.

const EYE = new THREE.Vector3(...RIVERSIDE_EYE);

// Left to right
const SIGNED: Exclude<SectionId, "home">[] = ["about", "experience", "projects", "interests", "contact"];
const placeOf = (id: Exclude<SectionId, "home">) => section(id).district as Exclude<SceneId, "lujiazui">;

// The greys: ground, water, and four tones for what stands
const GROUND = "#1b1e24";
const WATER = "#3a4757";
const TONES = ["#3a3f48", "#4a505a", "#5c636e", "#737a86"] as const;

// The boards: soft black (--panel), the title in --text, a thin --cyan
// edge; the same sRGB hex the interface uses, painted straight onto the
// canvas, so the word on the board measures as the tokens do (14:1)
const BOARD = "#181b23";
const WORD = "#e6e9ee";
const EDGE = "#4fd8ee";

// A board's face, in the site's display face (painted again once the face
// has loaded: the material's redraw)
const paintBoard = (title: string) => (g: CanvasRenderingContext2D, w: number, h: number) => {
  const family = getComputedStyle(document.documentElement).getPropertyValue("--font-display").trim() || "sans-serif";
  g.fillStyle = BOARD;
  g.fillRect(0, 0, w, h);
  g.strokeStyle = EDGE;
  g.lineWidth = 4;
  g.strokeRect(2, 2, w - 4, h - 4);
  let size = 104;
  g.font = `700 ${size}px ${family}`;
  while (g.measureText(title).width > w * 0.84 && size > 24) g.font = `700 ${(size -= 4)}px ${family}`;
  g.fillStyle = WORD;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(title, w / 2, h / 2 + size * 0.04);
};

type Built = {
  group: THREE.Group;
  signs: { id: Exclude<SectionId, "home">; center: THREE.Vector3; size: [number, number, number]; ry: number; corners: Record<"top" | "foot" | "left" | "right", THREE.Vector3>; redraw: () => Promise<void> | undefined }[];
  dispose: () => void;
};

// Whether a tower at (x, z), `w` wide and `h` tall, would stand behind a
// board (inside its bearing, widened by a tenth either side, and taller,
// seen from the eye, than the board's foot): the skyline leaves a gap there
const behindABoard = (x: number, z: number, w: number, h: number) =>
  SIGNED.some((id) => {
    const s = signPlace(placeOf(id));
    const d = Math.hypot(x - EYE.x, z - EYE.z);
    const sd = Math.hypot(s.x - EYE.x, s.z - EYE.z);
    if (d <= sd) return false;
    const bearing = Math.atan2(x - EYE.x, EYE.z - z);
    const signBearing = Math.atan2(s.x - EYE.x, EYE.z - s.z);
    const half = Math.atan(((s.w / 2) * 1.1) / sd) + Math.atan(w / 2 / d);
    const top = Math.atan((h - EYE.y) / d);
    const foot = Math.atan((s.y - (s.h / 2) * 1.1 - EYE.y) / sd);
    return Math.abs(bearing - signBearing) < half && top > foot;
  });

function build(): Built {
  const group = new THREE.Group();
  const geometries: THREE.BufferGeometry[] = [];
  // (materials are the kit's, shared and disposed centrally: kit/materials.ts)
  const tones = TONES.map((color) => surface({ color }));
  const add = (geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number, name = "") => {
    geometries.push(geometry);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.name = name;
    group.add(mesh);
    return mesh;
  };
  const block = (x: number, z: number, w: number, d: number, h: number, tone: number, name = "") => add(new THREE.BoxGeometry(w, h, d), tones[tone], x, h / 2, z, name);

  // The ground, and the river: past the promenade's paving, a small bay
  // (x -5 to 4, from z = 1) opening into the channel, whose far bank is
  // at z = -50
  const ground = add(new THREE.PlaneGeometry(900, 900), surface({ color: GROUND }), 0, 0, -200, "ground");
  ground.rotation.x = -Math.PI / 2;
  const water = surface({ color: WATER });
  const bay = add(new THREE.PlaneGeometry(9, 26), water, -0.5, 0.03, -12, "river");
  bay.rotation.x = -Math.PI / 2;
  const channel = add(new THREE.PlaneGeometry(900, 25), water, 0, 0.03, -37.5, "river");
  channel.rotation.x = -Math.PI / 2;

  // The railing, just in front of the camera and under the view on every
  // screen (at the water's edge it read as a broken slab where the frame
  // cut it): the foreground is the promenade's dark paving, then the
  // water; Task 12 makes the promenade its own band
  block(-0.5, 8.2, 9.4, 0.08, 0.55, 3, "railing");

  const signs = Object.fromEntries(SIGNED.map((id) => [id, signPlace(placeOf(id))])) as Record<(typeof SIGNED)[number], ReturnType<typeof signPlace>>;

  // About: a cluster of low lane roofs on the left bank, behind and under
  // its sign
  const lanes = rng(11);
  for (let i = 0; i < 9; i++) block(-8.5 - lanes.range(0, 9), -16 - lanes.range(0, 8), lanes.range(1.6, 2.6), lanes.range(1.4, 2.2), lanes.range(1.4, 2.4), i % 3);

  // Experience: a viaduct over the river's left part, piers every 8 units
  block(-36.4, -31.5, 67, 1.2, 0.6, 2, "viaduct").position.y = 2.9;
  for (let x = -66; x <= -6; x += 8) block(x, -31.5, 0.6, 0.8, 2.6, 1);

  // Interests: a street mouth between two facades, under its sign
  block(4.4, -25, 1.0, 4, 4, 2, "facade");
  block(9.0, -25, 1.2, 4, 4.5, 2, "facade");

  // Contact: a clock tower on the right bank, beside its sign (never
  // behind its word)
  const contact = signs.contact;
  const towerAt = (contact.w / 2) * 1.1 + 2.6;
  block(contact.x + Math.cos(contact.ry) * towerAt, contact.z - Math.sin(contact.ry) * towerAt - 2, 1.8, 1.8, 9.5, 3, "tower");

  // The four landmarks, at their far detail, in flat grey: together on the
  // far bank between Projects and Interests, the Pearl in front
  const LANDMARKS = [
    [buildPearlTower, 7.0, -101.8],
    [buildWorldFinancialCenter, 9.4, -117.7],
    [buildJinMao, 10.9, -107.5],
    [buildShanghaiTower, 13.1, -123.4],
  ] as const;
  const flat = { body: tones[2], glass: tones[3], lit: tones[3] };
  for (const [builder, x, z] of LANDMARKS) {
    const landmark = builder("far", flat);
    landmark.group.position.set(x, 0, z);
    landmark.group.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) geometries.push((o as THREE.Mesh).geometry);
    });
    group.add(landmark.group);
  }

  // The far bank: the skyline, about 60 boxes in two rings, clear of the
  // landmarks and leaving a gap behind every board
  const towers = rng(23);
  const keepOut = LANDMARKS.map(([, x, z]) => ({ x, z, r: 6 }));
  let placed = 0;
  for (let tries = 0; placed < 60 && tries < 900; tries++) {
    const far = placed >= 30;
    const x = towers.range(-90, 90);
    const z = far ? towers.range(-125, -160) : towers.range(-62, -100);
    const w = towers.range(2, 5);
    const d = towers.range(2, 5);
    const h = far ? towers.range(10, 30) : towers.range(4, 18);
    if (keepOut.some((k) => Math.hypot(k.x - x, k.z - z) < k.r) || behindABoard(x, z, Math.max(w, d) * 1.42, h)) continue;
    block(x, z, w, d, h, far ? 0 : 1 + (placed % 3));
    placed++;
  }
  // The far bank's edge: a low embankment
  block(0, -51, 900, 2, 0.5, 0);

  // The five signs: a board facing the camera, its frame, and what holds
  // it up (named mount:<id>, the board's own: visibility.mjs lets it stand
  // behind the board's edge)
  const frame = surface({ color: "#22252b" });
  const built: Built["signs"] = [];
  for (const id of SIGNED) {
    const p = signs[id];
    const title = section(id).title;
    const face = screenMaterial(paintBoard(title), { w: 512, h: Math.round(512 * 0.34), key: `sign:${id}` });
    const back = add(new THREE.BoxGeometry(p.w + 0.16, p.h + 0.16, 0.12), frame, p.x, p.y, p.z, `mount:${id}`);
    back.rotation.y = p.ry;
    const board = add(new THREE.PlaneGeometry(p.w, p.h), face, p.x, p.y, p.z, `sign:${id}`);
    board.rotation.y = p.ry;
    board.translateZ(0.07);
    // Two posts: down to the ground, or (Experience) to the viaduct's deck
    const from = id === "experience" ? 3.2 : 0;
    for (const side of [-1, 1]) {
      const post = add(new THREE.BoxGeometry(0.12, p.y - p.h / 2 - from, 0.12), frame, p.x, from + (p.y - p.h / 2 - from) / 2, p.z, `mount:${id}`);
      post.rotation.y = p.ry;
      post.translateX(side * p.w * 0.35);
      post.translateZ(-0.1);
    }
    const at = (dx: number, dy: number) => new THREE.Vector3(dx, dy, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), p.ry).add(new THREE.Vector3(p.x, p.y, p.z));
    built.push({
      id,
      center: new THREE.Vector3(p.x, p.y, p.z),
      size: [p.w, p.h, 0.3],
      ry: p.ry,
      corners: { top: at(0, p.h / 2), foot: at(0, -p.h / 2), left: at(-p.w / 2, 0), right: at(p.w / 2, 0) },
      redraw: () => document.fonts?.load(`700 64px ${getComputedStyle(document.documentElement).getPropertyValue("--font-display").trim() || "sans-serif"}`).then(() => (face.userData.redraw as () => void)(), () => {}),
    });
  }

  return { group, signs: built, dispose: () => geometries.forEach((g) => g.dispose()) };
}

// The boards answer a pointer only while their links stand over them
// (html[data-city-tags="over"]); where the links are a row of keys in the
// sheet instead (a small phone, a phone on its side), the boards are just
// signs
const boardsLive = () => document.documentElement.dataset.cityTags === "over";

export default function Riverside({ navigate }: SceneProps) {
  const built = useMemo(() => build(), []);
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    // "sign:<id>", the board's middle, and its four edges' middles
    // ("sign:<id>:top", …), from which the page sizes the board's link
    for (const s of built.signs) {
      anchors.set(`sign:${s.id}`, s.center);
      for (const [k, v] of Object.entries(s.corners)) anchors.set(`sign:${s.id}:${k}`, v);
    }
    // The titles again once the display face has loaded
    Promise.all(built.signs.map((s) => s.redraw())).then(() => invalidate(), () => {});
    return () => {
      for (const s of built.signs) {
        anchors.delete(`sign:${s.id}`);
        for (const k of Object.keys(s.corners)) anchors.delete(`sign:${s.id}:${k}`);
      }
      built.dispose();
    };
  }, [built, invalidate]);
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
