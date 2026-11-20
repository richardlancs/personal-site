"use client";

import { useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { cityPath } from "../../lib/cityRoutes";
import { section, type SectionId } from "../../sections/registry";
import { anchors } from "./anchors";
import { Hitbox, type SceneProps } from "./common";
import { buildJinMao, buildPearlTower, buildShanghaiTower, buildWorldFinancialCenter } from "./kit/landmarks";
import { rng } from "./rng";

// Home, the riverside, in grey boxes: the layout to judge before anything
// detailed is built on it (Task 12 turns it into the scene). The camera
// stands at a railing at the back of a small bay (districts/lujiazui.def.ts:
// home, at [0, 2, 10]) and looks across the river at the skyline; one unit
// is ten metres. The five sections' signs stand at fixed bearings from the
// camera, left to right, each as wide as 0.11 of its distance so it is
// about as wide on screen as the others:
//
//   About       -18°  26 units  near bank, left: a cluster of low lane roofs
//   Experience   -9°  42        over the river, left: on a viaduct
//   Projects     +1°  64        far bank: before the three tall towers
//   Interests  +9.5°  32        near bank, right: a street mouth between two facades
//   Contact     +18°  24        near bank, far right: on a clock tower
//
// Nothing stands on a line from the camera to a sign
// (docs/city/scripts/visibility.mjs checks). Every sign carries its
// section's title from the registry, and an HTML tag (City3D.tsx: Tags)
// is pinned over it at the anchor `sign:<id>`.

const EYE = new THREE.Vector3(0, 2, 10);
const deg = THREE.MathUtils.degToRad;

type SignSpec = { id: Exclude<SectionId, "home">; bearing: number; distance: number; y: number; tone: keyof typeof BOARD_TONES };

export const SIGNS: SignSpec[] = [
  { id: "about", bearing: -18, distance: 26, y: 3.2, tone: "gold" },
  { id: "experience", bearing: -9, distance: 42, y: 5.4, tone: "cyan" },
  { id: "projects", bearing: 1, distance: 64, y: 7.6, tone: "cyan" },
  { id: "interests", bearing: 9.5, distance: 32, y: 4.4, tone: "rose" },
  { id: "contact", bearing: 18, distance: 24, y: 6.4, tone: "gold" },
];

// The night plates' three neon tones (Task 7's kit/neon.ts names them
// SCENE_TONES; until then, here). Flat, darkened toward the ground so the
// white title reads on them.
const BOARD_TONES = { cyan: "#4fd8ee", rose: "#f062b4", gold: "#ffb454" } as const;

// Where a sign stands: on the ground under its bearing and distance
const spot = (s: SignSpec) => ({
  x: EYE.x + s.distance * Math.sin(deg(s.bearing)),
  z: EYE.z - s.distance * Math.cos(deg(s.bearing)),
  w: 0.11 * s.distance,
  h: 0.11 * s.distance * 0.34,
});

// The greys: ground, water, and four tones for what stands
const GROUND = "#1b1e24";
const WATER = "#3a4757";
const TONES = ["#3a3f48", "#4a505a", "#5c636e", "#737a86"] as const;

// The board's face: the tone, darkened, and the title in white, in the
// site's display face (redrawn once the face has loaded)
function boardTexture(title: string, tone: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = Math.round(512 * 0.34);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  const css = getComputedStyle(document.documentElement);
  const family = css.getPropertyValue("--font-display").trim() || "sans-serif";
  const draw = () => {
    const g = canvas.getContext("2d")!;
    const { width: w, height: h } = canvas;
    g.fillStyle = new THREE.Color(tone).lerp(new THREE.Color("#08090c"), 0.55).getStyle();
    g.fillRect(0, 0, w, h);
    g.strokeStyle = tone;
    g.lineWidth = 8;
    g.strokeRect(4, 4, w - 8, h - 8);
    let size = 104;
    g.font = `700 ${size}px ${family}`;
    while (g.measureText(title).width > w * 0.84 && size > 24) g.font = `700 ${(size -= 4)}px ${family}`;
    g.fillStyle = "#ffffff";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(title, w / 2, h / 2 + size * 0.04);
    texture.needsUpdate = true;
  };
  draw();
  return { texture, redraw: () => document.fonts?.load(`700 64px ${family}`).then(draw, () => {}) };
}

type Built = {
  group: THREE.Group;
  signs: { id: SignSpec["id"]; center: THREE.Vector3; size: [number, number, number]; ry: number; anchor: THREE.Vector3; foot: THREE.Vector3; redraw: () => Promise<void> | undefined }[];
  dispose: () => void;
};

function build(): Built {
  const group = new THREE.Group();
  const disposables: { dispose(): void }[] = [];
  const lambert = (color: string) => {
    const m = new THREE.MeshLambertMaterial({ color });
    disposables.push(m);
    return m;
  };
  const tones = TONES.map(lambert);
  const add = (geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number, name = "") => {
    disposables.push(geometry);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.name = name;
    group.add(mesh);
    return mesh;
  };
  const block = (x: number, z: number, w: number, d: number, h: number, tone: number, name = "") => add(new THREE.BoxGeometry(w, h, d), tones[tone], x, h / 2, z, name);

  // The ground, and the river: a small bay in front of the railing (x -5
  // to 4) opening into the channel, whose far bank is at z = -50
  const ground = add(new THREE.PlaneGeometry(900, 900), lambert(GROUND), 0, 0, -200, "ground");
  ground.rotation.x = -Math.PI / 2;
  const water = lambert(WATER);
  const bay = add(new THREE.PlaneGeometry(9, 30.5), water, -0.5, 0.03, -9.75, "river");
  bay.rotation.x = -Math.PI / 2;
  const channel = add(new THREE.PlaneGeometry(900, 25), water, 0, 0.03, -37.5, "river");
  channel.rotation.x = -Math.PI / 2;

  // The railing at the water's edge, in front of the camera
  block(-0.5, 5.2, 9.4, 0.08, 0.55, 3, "railing");

  // About: a cluster of low lane roofs on the left bank, behind its sign
  const lanes = rng(11);
  for (let i = 0; i < 9; i++) block(-8.5 - lanes.range(0, 9), -16 - lanes.range(0, 8), lanes.range(1.6, 2.6), lanes.range(1.4, 2.2), lanes.range(1.4, 2.4), i % 3);

  // Experience: a viaduct over the river's left part, piers every 8 units
  block(-36.4, -31.5, 67, 1.2, 0.6, 2, "viaduct").position.y = 2.9;
  for (let x = -66; x <= -6; x += 8) block(x, -31.5, 0.6, 0.8, 2.6, 1);

  // Interests: a street mouth between two facades, behind its sign
  block(3.5, -25, 1.0, 4, 4, 2, "facade");
  block(7.4, -25, 1.2, 4, 4.5, 2, "facade");

  // Contact: a clock tower on the right bank, its sign on its face
  const contact = spot(SIGNS[4]);
  block(contact.x + 0.4, contact.z - 1.5, 1.8, 1.8, 9.5, 3, "tower");

  // The far bank: the skyline, about 60 boxes in two rings, clear of the
  // four tall towers and of the bank's edge before Projects' sign
  const towers = rng(23);
  const keepOut = [
    { x: -12.0, z: -104.4, r: 6 },
    { x: 8.7, z: -114.7, r: 5 },
    { x: 13.4, z: -107.2, r: 5 },
    { x: 20.0, z: -116.4, r: 6 },
  ];
  let placed = 0;
  for (let tries = 0; placed < 60 && tries < 400; tries++) {
    const far = placed >= 30;
    const x = towers.range(-90, 90);
    const z = far ? towers.range(-125, -160) : towers.range(-62, -100);
    if (keepOut.some((k) => Math.hypot(k.x - x, k.z - z) < k.r)) continue;
    const h = far ? towers.range(10, 30) : towers.range(4, 18);
    block(x, z, towers.range(2, 5), towers.range(2, 5), h, far ? 0 : 1 + (placed % 3));
    placed++;
  }
  // The far bank's edge: a low embankment
  block(0, -51, 900, 2, 0.5, 0);

  // The four landmarks, at their far detail, in flat grey
  const flat = { body: tones[2], glass: tones[3], lit: tones[3] };
  for (const [builder, x, z] of [
    [buildPearlTower, -12.0, -104.4],
    [buildWorldFinancialCenter, 8.7, -114.7],
    [buildJinMao, 13.4, -107.2],
    [buildShanghaiTower, 20.0, -116.4],
  ] as const) {
    const landmark = builder("far", flat);
    landmark.group.position.set(x, 0, z);
    landmark.group.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) disposables.push((o as THREE.Mesh).geometry);
    });
    group.add(landmark.group);
  }

  // The five signs: a board facing the camera, its frame, and its posts
  const frame = lambert("#22252b");
  const signs: Built["signs"] = [];
  for (const s of SIGNS) {
    const p = spot(s);
    const ry = Math.atan2(EYE.x - p.x, EYE.z - p.z);
    const title = section(s.id).title;
    const { texture, redraw } = boardTexture(title, BOARD_TONES[s.tone]);
    const face = new THREE.MeshBasicMaterial({ map: texture });
    disposables.push(texture, face);
    const back = add(new THREE.BoxGeometry(p.w + 0.16, p.h + 0.16, 0.12), frame, p.x, s.y, p.z);
    back.rotation.y = ry;
    const board = add(new THREE.PlaneGeometry(p.w, p.h), face, p.x, s.y, p.z, `sign:${s.id}`);
    board.rotation.y = ry;
    board.translateZ(0.07);
    if (s.id !== "contact" && s.id !== "experience") {
      // Two posts down to the ground
      for (const side of [-1, 1]) {
        const post = add(new THREE.BoxGeometry(0.12, s.y - p.h / 2, 0.12), frame, p.x, (s.y - p.h / 2) / 2, p.z);
        post.rotation.y = ry;
        post.translateX(side * p.w * 0.35);
        post.translateZ(-0.1);
      }
    } else if (s.id === "experience") {
      // A gantry from the viaduct's deck
      for (const side of [-1, 1]) {
        const post = add(new THREE.BoxGeometry(0.12, s.y - 3.2, 0.12), frame, p.x, 3.2 + (s.y - 3.2) / 2, p.z);
        post.rotation.y = ry;
        post.translateX(side * p.w * 0.35);
        post.translateZ(-0.1);
      }
    }
    signs.push({
      id: s.id,
      center: new THREE.Vector3(p.x, s.y, p.z),
      size: [p.w, p.h, 0.3],
      ry,
      anchor: new THREE.Vector3(p.x, s.y + p.h / 2, p.z),
      foot: new THREE.Vector3(p.x, s.y - p.h / 2, p.z),
      redraw,
    });
  }

  return { group, signs, dispose: () => disposables.forEach((d) => d.dispose()) };
}

export default function Riverside({ navigate }: SceneProps) {
  const built = useMemo(() => build(), []);
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    for (const s of built.signs) {
      anchors.set(`sign:${s.id}`, s.anchor);
      anchors.set(`sign:${s.id}:foot`, s.foot);
    }
    // The titles again once the display face has loaded
    Promise.all(built.signs.map((s) => s.redraw())).then(() => invalidate(), () => {});
    return () => {
      for (const s of built.signs) {
        anchors.delete(`sign:${s.id}`);
        anchors.delete(`sign:${s.id}:foot`);
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
        />
      ))}
    </>
  );
}
