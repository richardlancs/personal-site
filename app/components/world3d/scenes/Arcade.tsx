"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { interests, type Interest } from "../../../data/portfolio";
import { at, blob, box, buildBush, buildVine, merge, tube } from "../geometry";
import { mesh, paint } from "../paint";
import { M, buildBeam, buildDust, buildSky, mat } from "../props";
import { rng } from "../rng";
import { useWorld, world } from "../store";
import { fonts, planks, plaster, textPanel } from "../textures";
import { Hitbox, SunLight, buildRoom, type SceneProps } from "./common";

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
export const cabinetX = [-3.6, -1.2, 1.2, 3.6];
const CAB_Z = -3.3;
const hues = [18, 200, 140, 330];

// The cabinet's screen: a little game that plays the interest, drawn
// live on a canvas while the cabinet is on
function attractScreen(interest: Interest, hue: number) {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 200;
  const g = c.getContext("2d")!;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const draw = (t: number, on: boolean) => {
    const f = fonts();
    g.fillStyle = on ? "#141a22" : "#0b0d0c";
    g.fillRect(0, 0, 256, 200);
    if (!on) {
      g.fillStyle = "rgba(160,190,170,0.06)";
      g.fillRect(20, 20, 216, 160);
      tex.needsUpdate = true;
      return;
    }
    const ink = `hsl(${hue},70%,72%)`;
    g.strokeStyle = ink;
    g.fillStyle = ink;
    g.lineWidth = 3;
    // The floor line
    g.globalAlpha = 0.4;
    g.fillRect(20, 150, 216, 3);
    g.globalAlpha = 1;
    const s = interest.scene;
    if (s === "basketball") {
      // A hoop, and the ball bouncing toward it
      g.strokeRect(196, 52, 26, 4);
      g.beginPath();
      g.moveTo(222, 30);
      g.lineTo(222, 150);
      g.stroke();
      const p = (t * 0.6) % 1;
      const x = 40 + p * 160;
      const y = 140 - Math.abs(Math.sin(p * Math.PI * 3)) * (90 - p * 40);
      g.beginPath();
      g.arc(x, y, 10, 0, Math.PI * 2);
      g.fill();
    } else if (s === "badminton") {
      g.fillRect(126, 95, 4, 55);
      g.globalAlpha = 0.5;
      for (let k = 0; k < 5; k++) g.fillRect(118, 95 + k * 6, 20, 1);
      g.globalAlpha = 1;
      const p = (Math.sin(t * 1.4) + 1) / 2;
      const x = 40 + p * 176;
      const y = 140 - Math.sin(p * Math.PI) * 110;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x - 8, y - 12);
      g.lineTo(x + 8, y - 12);
      g.closePath();
      g.fill();
    } else if (s === "chess") {
      for (let row = 0; row < 4; row++)
        for (let col = 0; col < 8; col++) {
          g.globalAlpha = (row + col) % 2 ? 0.55 : 0.15;
          g.fillRect(28 + col * 25, 50 + row * 25, 25, 25);
        }
      g.globalAlpha = 1;
      const step = Math.floor(t * 0.8) % 4;
      const hop = (t * 0.8) % 1;
      const x = 40 + step * 50 + hop * 25;
      const y = 120 - Math.sin(hop * Math.PI) * 30 - step * 0;
      g.fillStyle = "#fff3d6";
      g.beginPath();
      g.moveTo(x - 9, y + 12);
      g.lineTo(x + 9, y + 12);
      g.lineTo(x + 6, y - 6);
      g.lineTo(x - 2, y - 12);
      g.lineTo(x - 9, y - 4);
      g.closePath();
      g.fill();
    } else {
      // Cards dealt one after another
      const n = Math.floor(t * 1.2) % 6;
      for (let k = 0; k < Math.min(n, 5); k++) {
        g.fillStyle = "#f3ecdc";
        g.fillRect(34 + k * 40, 70, 30, 44);
        g.fillStyle = k % 2 ? "#c2493c" : "#22262a";
        g.font = `700 18px ${f.text}`;
        g.fillText(["A", "K", "Q", "J", "10"][k], 39 + k * 40, 92);
      }
    }
    g.fillStyle = "#fff3d6";
    g.font = `700 20px ${f.text}`;
    g.textAlign = "center";
    g.fillText(interest.name.toUpperCase(), 128, 34);
    if (Math.floor(t * 2) % 2) {
      g.font = `500 12px ${f.text}`;
      g.fillText("INSERT COIN", 128, 182);
    }
    g.textAlign = "left";
    // Scanlines
    g.fillStyle = "rgba(0,0,0,0.18)";
    for (let y = 0; y < 200; y += 3) g.fillRect(0, y, 256, 1);
    tex.needsUpdate = true;
  };
  draw(0, false);
  return { tex, draw };
}

function buildCabinet(i: number, interest: Interest) {
  const g = new THREE.Group();
  const hue = hues[i % hues.length];
  const body = mat(`cab-${i}`, () => paint({ color: new THREE.Color().setHSL(hue / 360, 0.28, 0.32).getStyle(), brush: 0.3, brushScale: 4, grime: 0.6, grimeHeight: 0.8, rust: 0.15 }));
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
  g.add(mesh(merge([0, 1, 2].map((k) => at(new THREE.CylinderGeometry(0.03, 0.03, 0.03, 10), 0.02 + k * 0.1, 1.04, 0.26 - k * 0.01))), mat(`btn-${i}`, () => paint({ color: new THREE.Color().setHSL(hue / 360, 0.6, 0.55).getStyle(), brush: 0.2 }))));
  // Coin door
  g.add(mesh(merge([at(box(0.26, 0.3, 0.02), 0, 0.5, 0.39), at(box(0.04, 0.07, 0.022), -0.05, 0.56, 0.392), at(box(0.04, 0.07, 0.022), 0.05, 0.56, 0.392)]), M.iron()));
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
  // A broken neon sign on the left wall
  const neonMat = paint({ color: "#d98a96", emissive: "#e07a8a", emissiveIntensity: 0.6, brush: 0 });
  const neon = new THREE.Group();
  const letters = [
    [v(0, 0, 0), v(0, 0.5, 0), v(0.3, 0.5, 0)],
    [v(0, 0, 0), v(0.3, 0, 0), v(0.3, 0.25, 0), v(0.15, 0.25, 0)],
    [v(0.45, 0, 0), v(0.6, 0.5, 0), v(0.75, 0, 0)],
    [v(0.9, 0, 0), v(0.9, 0.5, 0), v(1.05, 0.25, 0), v(1.2, 0.5, 0), v(1.2, 0, 0)],
    [v(1.35, 0, 0), v(1.35, 0.5, 0), v(1.6, 0.5, 0)],
    [v(1.35, 0.25, 0), v(1.55, 0.25, 0)],
    [v(1.35, 0, 0), v(1.6, 0, 0)],
  ];
  neon.add(new THREE.Mesh(merge(letters.map((pts) => tube(pts, () => 0.018, 10, 5))), neonMat));
  neon.position.set(-5.95, 3.1, 1.6);
  neon.rotation.y = Math.PI / 2;
  root.add(neon);
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
  const sky = buildSky({ top: "#86a6c2", horizon: "#f3d1a0", sun: "#ffd29a", sunDir: [0.8, 0.3, 0.2] });
  root.add(sky);
  root.add(mesh(new THREE.PlaneGeometry(80, 80).rotateX(-Math.PI / 2).translate(0, -0.05, 0), paint({ color: "#6d7a3c", brush: 0.4, brushScale: 0.2 }), { cast: false }));
  return { root, cabinets, sky, neonMat };
}

export default function Arcade({ active, quality }: SceneProps) {
  const built = useMemo(() => buildArcadeScene(quality), [quality]);
  const interest = useWorld((s) => s.sel.interest);
  const arrived = useWorld((s) => s.arrived);
  const power = useRef(built.cabinets.map(() => 0));
  const lastDraw = useRef(0);

  useFrame(({ camera, clock }, dt) => {
    if (!active) return;
    built.sky.position.copy(camera.position);
    const t = clock.elapsedTime;
    const redraw = t - lastDraw.current > 1 / 12;
    if (redraw) lastDraw.current = t;
    built.cabinets.forEach((c, i) => {
      const on = i === interest && arrived;
      power.current[i] = THREE.MathUtils.damp(power.current[i], on ? 1 : 0, 4, dt);
      const p = power.current[i];
      if (redraw && (p > 0.02 || c.screen.tex.userData.wasOn)) {
        c.screen.draw(t, p > 0.3);
        c.screen.tex.userData.wasOn = p > 0.02;
      }
      (c.glass.material as THREE.MeshBasicMaterial).color.setScalar(0.45 + p * 0.75);
      c.marquee.emissiveIntensity = 0.15 + p * 0.55;
    });
    // The neon buzzes and drops out
    built.neonMat.emissiveIntensity = Math.sin(t * 0.7) > 0.93 ? 0.1 : 0.6 + Math.sin(t * 50) * 0.04;
  });

  return (
    <group visible={active}>
      <primitive object={built.root} />
      <SunLight active={active} position={[18, 9, 4]} target={[0, 0, 0]} color="#ffcf92" intensity={2.6} size={10} quality={quality} />
      <hemisphereLight args={["#ecd8c0", "#5a4438", 1.4]} />
      <pointLight position={[0, 3.2, 0.5]} color="#ffbf86" intensity={6} distance={12} decay={1.3} />
      <pointLight position={[-5.4, 3, 1.6]} color="#e07a8a" intensity={1.2} distance={4} />
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
