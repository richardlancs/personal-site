"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { interests, type Interest } from "../../../data/portfolio";
import { STILL_FRAME, attractScreen } from "./arcadeGames";
import { timed } from "../idle";
import { at, blob, box, buildBush, buildVine, merge, tube } from "../geometry";
import { mesh, paint } from "../paint";
import { M, buildBeam, buildDust, buildSky, mat } from "../props";
import { rng, type Rng } from "../rng";
import { useWorld, world } from "../store";
import { deadScreen, planks, plaster, softDot, textPanel } from "../textures";
import { buildTorch, carvedSign, signFrame, TORCH } from "../torch";
import { HEMI, Hitbox, NEON_LIGHT, SunLight, buildRoom, type SceneProps } from "./common";

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
export const cabinetX = [-3.6, -1.2, 1.2, 3.6];
const CAB_Z = -3.3;
const hues = [18, 200, 140, 330];

// A cabinet's body: slanted sides, the control panel with its stick and
// buttons, the coin door. The working cabinets and the dead ones share it.
function cabinetShell(body: THREE.MeshLambertMaterial, buttons: THREE.MeshLambertMaterial) {
  const g = new THREE.Group();
  // Side panels with a slanted front, from a profile
  const side = new THREE.Shape([
    new THREE.Vector2(-0.4, 0),
    new THREE.Vector2(0.38, 0),
    new THREE.Vector2(0.38, 0.95),
    new THREE.Vector2(0.18, 1.05),
    new THREE.Vector2(0.12, 1.55),
    new THREE.Vector2(0.2, 1.62),
    new THREE.Vector2(0.2, 1.85),
    new THREE.Vector2(-0.4, 1.85),
  ]);
  for (const x of [-0.37, 0.33]) {
    const s = new THREE.ExtrudeGeometry(side, { depth: 0.04, bevelEnabled: false }).rotateY(-Math.PI / 2).translate(x + 0.04, 0, 0);
    g.add(mesh(s, body));
  }
  g.add(mesh(merge([at(box(0.7, 0.95, 0.04), 0, 0.475, 0.37), at(box(0.7, 1.85, 0.04), 0, 0.925, -0.4), at(box(0.7, 0.04, 0.6), 0, 1.84, -0.1)]), body));
  // Control panel with a stick and buttons
  const panel = mesh(at(box(0.7, 0.05, 0.28), 0, 1.0, 0.27, 0, -0.35), mat("cabPanel", () => paint({ color: "#2a2a2e", brush: 0.3, grime: 0.3 })));
  g.add(panel);
  g.add(mesh(merge([at(new THREE.CylinderGeometry(0.012, 0.012, 0.12, 6), -0.18, 1.07, 0.27), at(new THREE.SphereGeometry(0.035, 10, 8), -0.18, 1.14, 0.27)]), mat("stick", () => paint({ color: "#b8352c", brush: 0.2 }))));
  g.add(mesh(merge([0, 1, 2].map((k) => at(new THREE.CylinderGeometry(0.03, 0.03, 0.03, 10), 0.02 + k * 0.1, 1.04, 0.26 - k * 0.01))), buttons));
  // Coin door
  g.add(mesh(merge([at(box(0.26, 0.3, 0.02), 0, 0.5, 0.39), at(box(0.04, 0.07, 0.022), -0.05, 0.56, 0.392), at(box(0.04, 0.07, 0.022), 0.05, 0.56, 0.392)]), M.iron()));
  return g;
}

function buildCabinet(i: number, interest: Interest) {
  const hue = hues[i % hues.length];
  const body = mat(`cab-${i}`, () => paint({ color: new THREE.Color().setHSL(hue / 360, 0.28, 0.32).getStyle(), brush: 0.3, brushScale: 4, grime: 0.6, grimeHeight: 0.8, rust: 0.15 }));
  const g = cabinetShell(body, mat(`btn-${i}`, () => paint({ color: new THREE.Color().setHSL(hue / 360, 0.6, 0.55).getStyle(), brush: 0.2 })));
  // The screen
  const screen = attractScreen(interest, hue);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.42), new THREE.MeshBasicMaterial({ map: screen.tex, toneMapped: false }));
  glass.position.set(0, 1.3, 0.15);
  glass.rotation.x = -0.2;
  g.add(glass);
  // The marquee with the interest's name
  const marqueeTex = textPanel(`marquee-${interest.name}`, 256, 64, {
    background: `hsl(${hue},45%,38%)`,
    padding: 6,
    valign: "middle",
    lines: [{ text: interest.name, size: 34, font: "display", weight: 600, color: "#fff1d6", align: "center" }],
  });
  const marquee = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.16), paint({ map: marqueeTex, emissive: "#ffffff", emissiveMap: marqueeTex, emissiveIntensity: 0.15, brush: 0.15 }));
  marquee.position.set(0, 1.735, 0.205);
  g.add(marquee);
  return { group: g, screen, marquee: marquee.material as THREE.MeshLambertMaterial, glass };
}

// A cabinet that never came back on: the same body, faded, its screen
// dark glass, its marquee blank
function deadCabinet() {
  const body = mat("cabDead", () => paint({ color: "#4a4a52", brush: 0.35, brushScale: 4, grime: 0.8, grimeHeight: 1.2, rust: 0.3, moss: 0.1 }));
  const g = cabinetShell(body, mat("btnDead", () => paint({ color: "#7a7468", brush: 0.3 })));
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.42), mat("cabDeadScreen", () => paint({ map: deadScreen(), brush: 0.1 })));
  glass.position.set(0, 1.3, 0.15);
  glass.rotation.x = -0.2;
  g.add(glass);
  g.add(mesh(at(new THREE.PlaneGeometry(0.62, 0.16), 0, 1.735, 0.205), mat("marqueeDead", () => paint({ color: "#8a8478", brush: 0.3, grime: 0.7 })), { cast: false }));
  return g;
}

// What else was left: a row of dead cabinets, the token counter, the prize
// shelf under its sign, a pachinko board, cables along the skirting, a
// ceiling tile come down, and stains where the roof let the rain in. No
// lights of their own.
function buildDressing(r: Rng) {
  const g = new THREE.Group();
  // Dead cabinets against the left wall, clear of its posters
  for (const z of [-3.2, -2.45, 2.25]) {
    const c = deadCabinet();
    c.position.set(-5.5, 0, z);
    c.rotation.y = Math.PI / 2 + r.range(-0.05, 0.05);
    g.add(c);
  }

  // The token counter by the right wall: a counter, a little glass case of
  // tokens, a card with the price
  const counter = new THREE.Group();
  counter.add(mesh(merge([at(box(0.6, 0.95, 1.3), 0, 0.475, 0), at(box(0.7, 0.05, 1.4), 0, 0.975, 0)]), M.darkWood()));
  counter.add(mesh(at(box(0.3, 0.22, 0.4), 0, 1.11, -0.25), M.glass(), { cast: false, receive: false }));
  const tokens: THREE.BufferGeometry[] = [];
  for (let k = 0; k < 14; k++) tokens.push(at(new THREE.CylinderGeometry(0.02, 0.02, 0.006, 10), r.range(-0.1, 0.1), 1.005 + (k % 4) * 0.007, -0.25 + r.range(-0.15, 0.15), 0, r.range(-0.3, 0.3)));
  counter.add(mesh(merge(tokens), mat("tokens", () => paint({ color: "#b89a5a", brush: 0.2, rust: 0.4 })), { cast: false }));
  const card = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.15), carvedSign("arcade-tokens", [128, 96], [{ text: "Tokens", size: 26, gap: 4 }, { text: "5 for $1", size: 20 }], { padding: 8, grime: 0.3 }));
  card.position.set(-0.31, 1.07, 0.3);
  card.rotation.set(0, -Math.PI / 2, 0);
  card.rotateX(-0.3);
  counter.add(card);
  counter.position.set(5.45, 0, -2.0);
  g.add(counter);

  // The prize shelf in the corner: three boards of things nobody won
  const shelf = new THREE.Group();
  const boards: THREE.BufferGeometry[] = [];
  for (const y of [0.5, 1.1, 1.7]) boards.push(at(box(1.3, 0.04, 0.32), 0, y, 0));
  for (const x of [-0.63, 0.63]) boards.push(at(box(0.04, 2.0, 0.32), x, 1.0, 0));
  shelf.add(mesh(merge(boards), M.wood()));
  const prizes: THREE.BufferGeometry[] = [];
  const boxes: THREE.BufferGeometry[] = [];
  for (const y of [0.52, 1.12, 1.72])
    for (let k = 0; k < 4; k++) {
      const x = -0.45 + k * 0.3 + r.range(-0.04, 0.04);
      if (r() < 0.55) prizes.push(blob(r, r.range(0.08, 0.12), 0.9, 0.2, 1).translate(x, y + 0.1, r.range(-0.03, 0.05)));
      else if (r() < 0.7) boxes.push(at(box(r.range(0.14, 0.2), r.range(0.12, 0.22), 0.14), x, y + 0.1, 0, r.range(-0.2, 0.2)));
    }
  shelf.add(mesh(merge(prizes), mat("plush", () => paint({ color: "#e7c8b8", brush: 0.6, brushScale: 6 }))));
  shelf.add(mesh(merge(boxes), mat("prizeBox", () => paint({ color: "#b98b6a", brush: 0.4, brushScale: 5, grime: 0.5 }))));
  shelf.position.set(5.15, 0, -3.75);
  g.add(shelf);
  // Its sign, a small carved board like the buildings' (torch.ts)
  const signBoard = new THREE.Group();
  signBoard.add(signFrame(1.1, 0.28, 0.05, 0.05));
  const signFace = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.28), carvedSign("arcade-prizes-en", [256, 64], [{ text: "Prizes", size: 40 }], { padding: 6, grime: 0.3 }));
  signFace.position.z = 0.026;
  signBoard.add(signFace);
  signBoard.position.set(5.15, 2.95, -3.96);
  g.add(signBoard);

  // A pachinko board between the middle cabinets: pins, a tray of steel
  // balls at its foot
  const pach = new THREE.Group();
  pach.add(mesh(box(0.62, 1.5, 0.14).translate(0, 1.15, 0), mat("pachBody", () => paint({ color: "#6b4a3a", brush: 0.3, grime: 0.6, rust: 0.2 }))));
  const face = textPanel("arcade-pachinko", 128, 256, { background: "#e9dcc0", padding: 10, lines: [{ text: "LUCKY", size: 24, font: "display", weight: 600, color: "#8a3b2c", gap: 2 }, { text: "STAR", size: 24, font: "display", weight: 600, color: "#8a3b2c" }] });
  pach.add(new THREE.Mesh(new THREE.PlaneGeometry(0.5, 1.0).translate(0, 1.3, 0.072), mat("pachFace", () => paint({ map: face, brush: 0.15, grime: 0.5 }))));
  const pins: THREE.BufferGeometry[] = [];
  for (let row = 0; row < 9; row++)
    for (let col = 0; col < 6; col++) pins.push(at(new THREE.CylinderGeometry(0.004, 0.004, 0.03, 4).rotateX(Math.PI / 2), -0.2 + col * 0.08 + (row % 2) * 0.04, 1.0 + row * 0.07, 0.085));
  pach.add(mesh(merge(pins), M.iron(), { cast: false }));
  pach.add(mesh(box(0.5, 0.06, 0.12).translate(0, 0.62, 0.12), M.iron()));
  const balls: THREE.BufferGeometry[] = [];
  for (let k = 0; k < 10; k++) balls.push(new THREE.SphereGeometry(0.013, 8, 6).translate(r.range(-0.2, 0.2), 0.665, 0.12 + r.range(-0.03, 0.03)));
  pach.add(mesh(merge(balls), mat("steelBall", () => paint({ color: "#c8c6bc", brush: 0.1 })), { cast: false }));
  pach.position.set(0, 0, -3.88);
  g.add(pach);

  // Cables along the skirting, and one from each cabinet to the wall
  const cables: THREE.BufferGeometry[] = [tube([v(-5.8, 0.03, -3.92), v(-3, 0.05, -3.9), v(0, 0.03, -3.93), v(3, 0.05, -3.9), v(5.8, 0.03, -3.92)], () => 0.014, 40, 4)];
  for (const x of cabinetX) cables.push(tube([v(x + 0.2, 0.3, CAB_Z - 0.42), v(x + 0.35, 0.05, CAB_Z - 0.5), v(x + 0.6, 0.03, -3.9)], () => 0.012, 8, 4));
  g.add(mesh(merge(cables), mat("cable", () => paint({ color: "#2b2b26", brush: 0.1 })), { cast: false }));

  // A ceiling tile come down: the dark gap it left, the tile on the floor
  g.add(mesh(new THREE.PlaneGeometry(0.6, 0.6).rotateX(Math.PI / 2).translate(2.4, 3.99, 1.0), mat("ceilingGap", () => paint({ color: "#1b1816", brush: 0 })), { cast: false }));
  g.add(mesh(at(box(0.6, 0.025, 0.6), 2.15, 0.11, 1.35, 0.5, 0.28), mat("ceilingTile", () => paint({ color: "#6a625b", brush: 0.4, brushScale: 3, grime: 0.6 }))));

  // Water stains high on the back wall, where the roof let the rain in
  const stain = mat("waterStain", () => paint({ map: softDot(), color: "#7a6248", transparent: true, opacity: 0.5, depthWrite: false, brush: 0.2 }));
  for (const [x, y, sx, sy] of [
    [-0.6, 3.45, 1.7, 1.2],
    [4.4, 3.6, 1.0, 1.3],
    [-4.2, 3.55, 1.3, 0.9],
  ]) {
    const st = new THREE.Mesh(new THREE.PlaneGeometry(sx, sy), stain);
    st.position.set(x, y, -3.985);
    g.add(st);
  }
  return g;
}

// Posters for games that never existed
function poster(i: number) {
  const titles = [
    ["STAR RALLY", "#2f4a6b", "#f3c46a"],
    ["NEKO RACE", "#8a3b2c", "#f6e3c4"],
    ["MOON GARDEN", "#3c5a3e", "#e8d7a6"],
    ["SKY POST", "#5a3d62", "#f1c9d8"],
  ][i % 4];
  return textPanel(`poster-${i}`, 256, 360, {
    background: titles[1],
    grain: true,
    padding: 20,
    lines: [
      { text: titles[0], size: 34, font: "display", weight: 600, color: titles[2], gap: 200 },
      { text: "1 PLAYER  ·  2 PLAYERS", size: 14, color: titles[2] },
    ],
  });
}

function buildArcadeScene(quality: "high" | "low") {
  const root = new THREE.Group();
  const r = rng(91);
  root.add(
    buildRoom({
      w: 12,
      d: 8,
      h: 4,
      floor: mat("arcadeFloor", () => paint({ map: planks("red"), brush: 0.3, brushScale: 1.2, grime: 0.6, moss: 0.15 })),
      wall: mat("arcadeWallIn", () => paint({ map: plaster("green"), brush: 0.2, grime: 0.8, grimeHeight: 1.4, moss: 0.2 })),
      ceiling: mat("arcadeCeiling", () => paint({ color: "#4a4440", brush: 0.4, brushScale: 1.5, grime: 0.3 })),
      walls: {
        right: { openings: [{ x: 0.5, y: 2.1, w: 2.6, h: 1.8 }] },
        front: { openings: [{ x: 0, y: 1.5, w: 2.4, h: 3 }] },
      },
    }),
  );
  root.add(buildDressing(rng(95))); // its own seed, so the rest of the room is as it was
  const cabinets = interests.map((interest, i) => {
    const c = buildCabinet(i, interest);
    c.group.position.set(cabinetX[i], 0, CAB_Z);
    c.group.rotation.y = r.range(-0.04, 0.04);
    root.add(c.group);
    return c;
  });
  // Posters on the side walls, peeling
  [
    [-5.97, 2.2, -1.5, Math.PI / 2],
    [-5.97, 2.1, 1.0, Math.PI / 2],
    [2.6, 2.3, -3.97, 0],
    [-2.4, 2.4, -3.97, 0],
  ].forEach(([x, y, z, ry], i) => {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 1.05), mat(`poster-${i}`, () => paint({ map: poster(i), brush: 0.25, brushScale: 4, side: THREE.DoubleSide })));
    p.position.set(x, i > 1 ? 3.3 : y, z);
    p.rotation.set(0, ry, r.range(-0.05, 0.05));
    if (i > 1) p.scale.setScalar(0.65);
    root.add(p);
  });
  // The arcade's name on the left wall, carved, with a torch beside it
  // whose light falls on the wall (torch.ts)
  const sign = new THREE.Group();
  sign.add(signFrame(1.7, 0.5, 0.06, 0.06));
  const gameFace = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.5), carvedSign("arcade-game-en", [512, 150], [{ text: "GAME", size: 92 }], { grime: 0.5 }));
  gameFace.position.z = 0.031;
  sign.add(gameFace);
  sign.add(buildTorch(0.4, { light: 0.5, reach: 1.0 }).translateX(1.25).translateY(-0.15).translateZ(-0.03));
  sign.position.set(-5.93, 3.35, 0.8);
  sign.rotation.y = Math.PI / 2;
  root.add(sign);
  // The claw machine in the corner, a few prizes still inside
  const claw = new THREE.Group();
  claw.add(mesh(merge([at(box(1.1, 0.9, 1.1), 0, 0.45, 0), at(box(1.1, 0.25, 1.1), 0, 2.2, 0)]), mat("clawBody", () => paint({ color: "#d9a35c", brush: 0.3, grime: 0.6, rust: 0.2 }))));
  claw.add(mesh(merge([at(new THREE.PlaneGeometry(1.05, 1.15), 0, 1.5, 0.53), at(new THREE.PlaneGeometry(1.05, 1.15), 0.53, 1.5, 0, Math.PI / 2), at(new THREE.PlaneGeometry(1.05, 1.15), -0.53, 1.5, 0, Math.PI / 2)]), M.glass(), { cast: false }));
  const plush: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 9; i++) plush.push(blob(r, 0.13, 0.9, 0.2, 1).translate(r.range(-0.35, 0.35), 1.0 + r() * 0.12, r.range(-0.35, 0.35)));
  claw.add(mesh(merge(plush), mat("plush", () => paint({ color: "#e7c8b8", brush: 0.6, brushScale: 6 }))));
  claw.add(mesh(merge([at(new THREE.CylinderGeometry(0.006, 0.006, 0.5, 4), 0.1, 1.83, 0.1), at(new THREE.ConeGeometry(0.08, 0.12, 4), 0.1, 1.55, 0.1)]), M.iron()));
  claw.position.set(5.0, 0, 2.6);
  claw.rotation.y = -0.6;
  root.add(claw);
  // A bench of stools, a change machine
  root.add(mesh(merge([at(box(0.5, 1.4, 0.4), 0, 0.7, 0)]), mat("changer", () => paint({ color: "#7e8a8c", brush: 0.3, rust: 0.4, grime: 0.6 }))).translateX(-5.4).translateZ(3.2));
  for (const [x, z] of [
    [-3.4, -1.9],
    [1.5, -2.0],
  ]) {
    const stool = mesh(merge([at(new THREE.CylinderGeometry(0.18, 0.18, 0.06, 12), 0, 0.62, 0), at(new THREE.CylinderGeometry(0.03, 0.03, 0.6, 6), 0, 0.3, 0), at(new THREE.CylinderGeometry(0.2, 0.22, 0.03, 12), 0, 0.015, 0)]), M.rust());
    stool.position.set(x, 0, z);
    root.add(stool);
  }
  // Plants in at the broken window, moss along the skirting
  const bush = buildBush(92, 0.9);
  bush.position.set(5.4, 0, 0.6);
  root.add(bush);
  root.add(buildVine(93, [v(5.95, 3.0, -0.5), v(5.9, 3.7, 0.4), v(4.5, 3.95, 0.8), v(2.6, 3.95, 0.3), v(0.4, 3.95, 1.2)], 0.32));
  root.add(buildVine(94, [v(5.95, 3.0, 1.6), v(5.92, 2.0, 2.0), v(5.9, 0.6, 2.2), v(5.6, 0, 2.6)], 0.3));
  const debris: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 26; i++) debris.push(blob(r, r.range(0.03, 0.08), 0.4, 0.4, 0).translate(r.range(-5, 5), 0.01, r.range(-2, 3.6)));
  root.add(mesh(merge(debris), mat("debris", () => paint({ color: "#8a6b4a", brush: 0.5, brushScale: 6 })), { cast: false }));
  // Tubes of the ceiling lights, long dead
  const fittings: THREE.BufferGeometry[] = [];
  for (const z of [-1.5, 1.5]) for (const x of [-3, 0, 3]) fittings.push(at(box(1.2, 0.06, 0.16), x, 3.92, z));
  root.add(mesh(merge(fittings), mat("fitting", () => paint({ color: "#d8d2c2", brush: 0.3, grime: 0.4 }))));
  // Sun through the window
  const beam = buildBeam(6, 2.2, "#ffd9a0", 0.15);
  beam.position.set(6, 3, 0.5);
  beam.rotation.set(0, 0, 0.9);
  root.add(beam);
  root.add(buildDust(quality === "low" ? 30 : 90, [7, 3, 6], [1, 1.8, 0]));
  const sky = buildSky({ top: "#4fbde8", horizon: "#fff1dc", sun: "#ffe4bd", sunDir: [0.8, 0.3, 0.2] });
  root.add(sky);
  root.add(mesh(new THREE.PlaneGeometry(80, 80).rotateX(-Math.PI / 2).translate(0, -0.05, 0), paint({ color: "#6d7a3c", brush: 0.4, brushScale: 0.2 }), { cast: false }));
  return { root, cabinets, sky };
}

export default function Arcade({ active, quality }: SceneProps) {
  const built = useMemo(() => timed("arcade", () => buildArcadeScene(quality)), [quality]);
  const interest = useWorld((s) => s.sel.interest);
  const arrived = useWorld((s) => s.arrived);
  const power = useRef(built.cabinets.map(() => 0));
  const lastDraw = useRef(0);

  useFrame(({ camera, clock }, dt) => {
    if (!active) return;
    built.sky.position.copy(camera.position);
    const t = clock.elapsedTime;
    // The screens loop for as long as a cabinet is on, so still view (WCAG
    // 2.2.2: pause, stop, hide) holds each one on a single frame of its
    // game, and the cabinets switch on and off without fading
    const still = world.get().still;
    // (the clock restarts from 0 whenever the frame loop is paused, e.g.
    // a hidden tab: then draw again rather than wait for the old time)
    const redraw = still || t - lastDraw.current > 1 / 12 || t < lastDraw.current;
    if (redraw) lastDraw.current = t;
    built.cabinets.forEach((c, i) => {
      const on = i === interest && arrived;
      power.current[i] = still ? (on ? 1 : 0) : THREE.MathUtils.damp(power.current[i], on ? 1 : 0, 4, dt);
      const p = power.current[i];
      const shown = p > 0.3;
      if (still ? c.screen.tex.userData.still !== shown : redraw && (p > 0.02 || c.screen.tex.userData.wasOn)) {
        c.screen.draw(still ? STILL_FRAME : t, shown);
        c.screen.tex.userData.wasOn = p > 0.02;
      }
      c.screen.tex.userData.still = still ? shown : undefined;
      (c.glass.material as THREE.MeshBasicMaterial).color.setScalar(0.45 + p * 0.75);
      c.marquee.emissiveIntensity = 0.15 + p * 0.55;
    });
    // (The torch's light is steady: lights in the world don't flicker)
  });

  return (
    <group visible={active}>
      <primitive object={built.root} />
      <SunLight active={active} position={[18, 9, 4]} target={[0, 0, 0]} color="#ffcf92" intensity={2.6} size={10} quality={quality} />
      <hemisphereLight userData={HEMI} args={["#ecd8c0", "#5a4438", 1.4]} />
      <pointLight position={[0, 3.2, 0.5]} color="#ffbf86" intensity={6} distance={12} decay={1.3} />
      {/* The torch's light on the wall and the floor below it, stronger after dark */}
      <pointLight userData={NEON_LIGHT} position={[-5.4, 3.2, -0.45]} color={TORCH.light} intensity={1.2} distance={4} />
      {cabinetX.map((x, i) => (
        <pointLight key={i} position={[x, 1.5, -2.6]} color={`hsl(${hues[i]},60%,70%)`} intensity={i === interest && arrived ? 1.6 : 0} distance={2.5} />
      ))}
      {active &&
        cabinetX.map((x, i) => (
          <Hitbox
            key={i}
            id={`arcade:cabinet-${i}`}
            position={[x, 0.95, CAB_Z]}
            size={[0.8, 1.9, 0.9]}
            onSelect={() => {
              world.select("interest", i);
              world.set({ focus: `cabinet-${i}` });
            }}
          />
        ))}
    </group>
  );
}
