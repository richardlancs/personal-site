"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { projects, skillGroups } from "../../../data/portfolio";
import { at, blob, box, buildBush, buildTree, buildVine, merge, treeKinds, tube } from "../geometry";
import { mesh, paint } from "../paint";
import { M, buildBeam, buildDust, buildSky, mat } from "../props";
import { rng } from "../rng";
import { useWorld, world } from "../store";
import { deadScreen, planks, plaster, textPanel } from "../textures";
import { Hitbox, SunLight, buildRoom, type SceneProps } from "./common";

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

// Where each project's monitor stands on the benches
export const monitorSpots = [
  [-2.4, 0.94, -3.62],
  [1.8, 0.94, -3.62],
] as const;

const SCREEN = { w: 0.86, h: 0.54 };

function screenshotTextures() {
  const loader = new THREE.TextureLoader();
  return projects.map((project) =>
    (project.screenshots ?? []).map((shot) => {
      const t = loader.load(shot.src);
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;
      t.userData.aspect = shot.width / shot.height;
      return t;
    }),
  );
}

// An old flat monitor on a stand. Its picture is two layers: the dark
// glass, and the image, sized to fit inside it.
function buildMonitor() {
  const g = new THREE.Group();
  const shell = mat("monitorShell", () => paint({ color: "#cfc6ae", brush: 0.25, brushScale: 6, grime: 0.5, grimeHeight: 1.4 }));
  g.add(mesh(merge([at(box(SCREEN.w + 0.1, SCREEN.h + 0.1, 0.06), 0, 0.42, 0), at(box(0.5, 0.36, 0.14), 0, 0.42, -0.08), at(box(0.07, 0.3, 0.07), 0, 0.12, -0.08), at(box(0.32, 0.03, 0.22), 0, 0.015, -0.04)]), shell));
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(SCREEN.w, SCREEN.h), mat("screenGlass", () => paint({ map: deadScreen(), brush: 0, emissive: "#0c120e", emissiveIntensity: 1 })));
  glass.position.set(0, 0.42, 0.031);
  g.add(glass);
  const picture = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ toneMapped: false, transparent: true, opacity: 0 }));
  picture.position.set(0, 0.42, 0.034);
  g.add(picture);
  // A power light
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.008, 6, 4), new THREE.MeshBasicMaterial({ color: "#3a4a3a" }));
  lamp.position.set(SCREEN.w / 2 - 0.02, 0.42 - SCREEN.h / 2 - 0.03, 0.032);
  g.add(lamp);
  // Keyboard
  g.add(mesh(at(box(0.62, 0.03, 0.2), 0, 0.015, 0.32, 0, 0.06), shell));
  return { group: g, picture, lamp };
}

function buildBench(seed: number, width: number) {
  const r = rng(seed);
  const g = new THREE.Group();
  g.add(mesh(at(box(width, 0.08, 1.0, 1), 0, 0.9, 0), M.wood()));
  g.add(mesh(at(box(width - 0.2, 0.04, 0.85, 1), 0, 0.28, 0), M.wood()));
  const legs: THREE.BufferGeometry[] = [];
  for (const x of [-width / 2 + 0.08, width / 2 - 0.08]) for (const z of [-0.42, 0.42]) legs.push(at(box(0.08, 0.9, 0.08), x, 0.45, z));
  g.add(mesh(merge(legs), M.darkWood()));
  // What was left on it: papers, a mug, tools, a coil of cable
  const papers: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 5; i++) papers.push(at(new THREE.PlaneGeometry(0.21, 0.3).rotateX(-Math.PI / 2), r.range(-width / 2 + 0.3, width / 2 - 0.3), 0.945 + i * 0.002, r.range(0.1, 0.4), r.range(-0.6, 0.6)));
  g.add(mesh(merge(papers), M.paper(), { cast: false }));
  const clutter = [
    at(new THREE.CylinderGeometry(0.045, 0.04, 0.1, 10), width / 2 - 0.4, 0.99, 0.25),
    at(box(0.28, 0.04, 0.05), -width / 2 + 0.45, 0.96, 0.32, 0.4),
    at(box(0.06, 0.06, 0.2), -width / 2 + 0.7, 0.97, 0.2, -0.3),
    at(new THREE.TorusGeometry(0.11, 0.02, 6, 16).rotateX(Math.PI / 2), width / 2 - 0.7, 0.96, 0.05),
  ];
  g.add(mesh(merge(clutter), mat("clutter", () => paint({ color: "#7b6a55", brush: 0.5, brushScale: 8, rust: 0.4 }))));
  // Boxes underneath
  g.add(mesh(merge([at(box(0.5, 0.35, 0.4), -width / 2 + 0.5, 0.48, 0), at(box(0.4, 0.3, 0.35), width / 2 - 0.6, 0.45, 0.05, 0.2)]), mat("cardboard", () => paint({ color: "#a98a5d", brush: 0.4, brushScale: 4, grime: 0.4 }))));
  return g;
}

// The tool wall: a pegboard with tools hung on it and three tags listing
// the skills (the same lists as the page)
function buildToolWall() {
  const g = new THREE.Group();
  const peg = textPanel("pegboard", 512, 256, { background: "#b99c70", lines: [] });
  g.add(mesh(box(0.05, 2.1, 4.2, 0.5), mat("pegboard", () => paint({ color: "#b99c70", brush: 0.3, brushScale: 3, grime: 0.3 }))));
  void peg;
  const holes: THREE.BufferGeometry[] = [];
  for (let y = 0; y < 14; y++) for (let z = 0; z < 26; z++) holes.push(at(new THREE.CircleGeometry(0.012, 5).rotateY(Math.PI / 2), 0.027, -0.95 + y * 0.145, -2 + z * 0.16));
  g.add(mesh(merge(holes), mat("holes", () => paint({ color: "#3b2a18", brush: 0 })), { cast: false }));
  const tools = [
    tube([v(0.06, 0.75, -1.7), v(0.06, 0.2, -1.7)], () => 0.02, 3, 5),
    at(box(0.06, 0.08, 0.18), 0.06, 0.78, -1.7),
    tube([v(0.06, 0.8, -1.35), v(0.06, 0.25, -1.3)], () => 0.018, 3, 5),
    at(box(0.04, 0.5, 0.24), 0.05, 0.5, -0.95),
    tube([v(0.06, 0.85, 1.55), v(0.06, 0.4, 1.65), v(0.06, 0.35, 1.85)], () => 0.02, 6, 5),
    at(new THREE.TorusGeometry(0.16, 0.025, 6, 18).rotateY(Math.PI / 2), 0.07, 0.62, 1.15),
  ];
  g.add(mesh(merge(tools), M.iron()));
  // A tag for each group of skills
  skillGroups.forEach((group, i) => {
    const tex = textPanel(`skills-${group.category}`, 256, 300, {
      background: "#f4eedc",
      grain: true,
      padding: 18,
      wrap: true,
      lines: [{ text: group.category, size: 26, font: "display", weight: 600, gap: 10 }, ...group.skills.map((s) => ({ text: s, size: 19, color: "#3d4238", gap: 2 }))],
    });
    const tag = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.82), mat(`skillTag-${i}`, () => paint({ map: tex, brush: 0.12, brushScale: 6 })));
    tag.position.set(0.04, -0.38, -1.25 + i * 1.25);
    tag.rotation.set(0, Math.PI / 2, [0.03, -0.02, 0.025][i]);
    tag.castShadow = true;
    g.add(tag);
  });
  return g;
}

// Blueprints pinned to the wall
function blueprint(seed: number) {
  return textPanel(`blueprint-${seed}`, 256, 192, {
    background: "#3d5c7a",
    lines: [{ text: ["CIRCUIT A-2", "BRACKET  R.3", "STAND v2"][seed % 3], size: 16, color: "#dce8f0", weight: 500 }],
  });
}

function buildWorkshopScene(quality: "high" | "low") {
  const root = new THREE.Group();
  const floor = mat("workshopFloor", () => paint({ color: "#9a917e", brush: 0.4, brushScale: 0.8, moss: 0.1, grime: 0.4 }));
  const wall = mat("workshopInnerWall", () => paint({ map: plaster("grey"), brush: 0.2, grime: 0.8, grimeHeight: 1.6, moss: 0.15 }));
  root.add(
    buildRoom({
      w: 14,
      d: 10,
      h: 4.6,
      floor,
      wall,
      ceiling: mat("workshopCeiling", () => paint({ map: planks("dark"), brush: 0.3 })),
      walls: {
        back: { openings: [{ x: -4.6, y: 3.3, w: 2.2, h: 1.5 }, { x: 0, y: 3.3, w: 2.2, h: 1.5 }, { x: 4.6, y: 3.3, w: 2.2, h: 1.5 }] },
        right: { openings: [{ x: -2.2, y: 2.3, w: 2.2, h: 1.9 }, { x: 2.2, y: 2.3, w: 2.2, h: 1.9 }] },
        front: { openings: [{ x: 0, y: 1.6, w: 2.6, h: 3.2 }, { x: -4.5, y: 2.3, w: 2, h: 1.6 }] },
      },
    }),
  );
  // Roof trusses
  const trusses: THREE.BufferGeometry[] = [];
  for (let i = -2; i <= 2; i++) trusses.push(at(box(0.18, 0.25, 10), i * 2.8, 4.45, 0));
  root.add(mesh(merge(trusses), M.darkWood()));
  // Hanging lamps (dead)
  for (const x of [-2.8, 2.8]) {
    root.add(mesh(merge([at(new THREE.CylinderGeometry(0.008, 0.008, 1.1, 4), x, 3.95, -1), at(new THREE.ConeGeometry(0.28, 0.22, 12, 1, true), x, 3.35, -1)]), M.green()));
  }

  // Benches and monitors
  const benchA = buildBench(1, 3.6);
  benchA.position.set(-2.4, 0, -3.6);
  root.add(benchA);
  const benchB = buildBench(2, 3.6);
  benchB.position.set(1.8, 0, -3.6);
  root.add(benchB);
  const monitors = monitorSpots.map(([x, y, z]) => {
    const m = buildMonitor();
    m.group.position.set(x, y, z);
    root.add(m.group);
    return m;
  });
  // Cables from the monitors down behind the benches
  const cables: THREE.BufferGeometry[] = [];
  for (const [x] of monitorSpots) cables.push(tube([v(x, 1.2, -3.78), v(x + 0.2, 0.8, -3.95), v(x + 0.6, 0.05, -3.9), v(x + 1.4, 0.03, -3.4)], () => 0.013, 16, 4));
  cables.push(tube([v(-0.6, 0.03, -3.4), v(0.5, 0.03, -2.6), v(2.2, 0.03, -2.9), v(4, 0.03, -2.2)], () => 0.016, 20, 4));
  root.add(mesh(merge(cables), mat("cable", () => paint({ color: "#2b2b26", brush: 0.1 })), { cast: false }));
  // A third desk with a dead CRT
  const desk = buildBench(3, 1.6);
  desk.position.set(5.2, 0, -3.6);
  root.add(desk);
  const crt = mesh(merge([at(box(0.55, 0.48, 0.45), 0, 0.24, 0), at(box(0.38, 0.34, 0.25), 0, 0.24, -0.3)]), mat("crt", () => paint({ color: "#d4ccb4", brush: 0.3, brushScale: 6, grime: 0.6 })));
  crt.position.set(5.2, 0.94, -3.6);
  root.add(crt);
  const crtGlass = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.34), mat("screenGlass", () => paint({ map: deadScreen() })));
  crtGlass.position.set(5.2, 1.18, -3.37);
  root.add(crtGlass);
  // A stool, knocked over
  const stool = mesh(merge([at(new THREE.CylinderGeometry(0.2, 0.2, 0.05, 14), 0, 0.6, 0), ...[0, 1, 2].map((i) => tube([v(Math.cos(i * 2.1) * 0.15, 0.6, Math.sin(i * 2.1) * 0.15), v(Math.cos(i * 2.1) * 0.24, 0, Math.sin(i * 2.1) * 0.24)], () => 0.018, 2, 4))]), M.iron());
  stool.position.set(-0.4, 0.22, -1.6);
  stool.rotation.set(0, 0.4, 1.35);
  root.add(stool);

  // The tool wall on the left
  const toolwall = buildToolWall();
  toolwall.position.set(-6.97, 1.65, 0.9);
  root.add(toolwall);

  // Shelves by the door
  const shelf = new THREE.Group();
  const shelfParts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 4; i++) shelfParts.push(at(box(1.8, 0.04, 0.45), 0, 0.3 + i * 0.6, 0));
  shelfParts.push(at(box(0.05, 2.3, 0.45), -0.9, 1.15, 0), at(box(0.05, 2.3, 0.45), 0.9, 1.15, 0));
  shelf.add(mesh(merge(shelfParts), M.darkWood()));
  const r = rng(8);
  const boxes: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 4; i++)
    for (let k = 0; k < 3; k++) if (r() < 0.75) boxes.push(at(box(r.range(0.25, 0.5), r.range(0.15, 0.4), 0.35), -0.55 + k * 0.55, 0.32 + i * 0.6 + 0.12, 0, r.range(-0.2, 0.2)));
  shelf.add(mesh(merge(boxes), mat("cardboard", () => paint({ color: "#a98a5d", brush: 0.4, brushScale: 4, grime: 0.4 }))));
  shelf.position.set(5.6, 0, 4.7);
  shelf.rotation.y = Math.PI;
  root.add(shelf);

  // Blueprints on the back wall, between the windows
  [-2.3, 2.3].forEach((x, i) => {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.68), mat(`blueprint-${i}`, () => paint({ map: blueprint(i), brush: 0.2, brushScale: 5 })));
    p.position.set(x, 2.2, -4.98);
    p.rotation.z = i ? 0.04 : -0.03;
    root.add(p);
  });

  // Green coming in: a sapling through the cracked floor, ivy in at the
  // windows, a bush in the corner
  const crack = mesh(blob(rng(4), 0.9, 0.05, 0.4, 1).translate(5.2, 0.005, 1.8), mat("rubble", () => paint({ color: "#5c5a46", brush: 0.5, brushScale: 3, moss: 0.9 })), { cast: false });
  root.add(crack);
  const sapling = buildTree(77, { ...treeKinds.maple, height: 3.4, trunk: 0.07, spread: 1.2, clump: 0.55 });
  sapling.position.set(5.2, 0, 1.8);
  root.add(sapling);
  const bush = buildBush(78, 0.7);
  bush.position.set(6.3, 0, -1.5);
  root.add(bush);
  root.add(buildVine(79, [v(6.95, 3.25, -3.2), v(6.85, 2.6, -2.6), v(6.92, 1.6, -2.4), v(6.9, 0.4, -2.0), v(6.6, 0, -1.6)], 0.32));
  root.add(buildVine(80, [v(-4.6, 4.05, -4.95), v(-4.2, 3.4, -4.9), v(-3.4, 2.9, -4.92), v(-2.9, 2.0, -4.9)], 0.3));
  root.add(buildVine(83, [v(4.6, 4.05, -4.95), v(5.2, 3.0, -4.92), v(5.8, 1.6, -4.9), v(6.6, 0.8, -4.9)], 0.3));
  // Leaves blown in at the door
  const leaves: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 30; i++) leaves.push(blob(r, 0.08, 0.15, 0.5, 0).translate(r.range(-1.5, 1.5), 0.01, r.range(3, 4.9)));
  root.add(mesh(merge(leaves), mat("leafLitter", () => paint({ color: "#b0723c", brush: 0.6, brushScale: 6 })), { cast: false }));

  // Sun through the side windows, and the dust in it
  for (const z of [-2.2, 2.2]) {
    const beam = buildBeam(7, 1.8, "#ffd9a0", 0.16);
    beam.position.set(7, 3.2, z);
    beam.rotation.set(0.15, 0, 0.95);
    root.add(beam);
  }
  root.add(buildDust(quality === "low" ? 40 : 110, [8, 3.5, 8], [2.5, 1.8, 0]));
  // Through the windows: trees and sky
  const outside = buildTree(90, treeKinds.zelkova, { shadows: false });
  outside.position.set(12, 0, -1);
  root.add(outside);
  const sky = buildSky({ top: "#5f94cc", horizon: "#f4e2bc", sun: "#ffd9a0", sunDir: [0.8, 0.35, -0.3] });
  root.add(sky);
  const ground = mesh(new THREE.PlaneGeometry(80, 80).rotateX(-Math.PI / 2).translate(0, -0.05, 0), paint({ color: "#6d7a3c", brush: 0.4, brushScale: 0.2 }), { cast: false });
  root.add(ground);

  return { root, monitors, sky };
}

export default function Workshop({ active, quality }: SceneProps) {
  const built = useMemo(() => buildWorkshopScene(quality), [quality]);
  const shots = useMemo(() => screenshotTextures(), []);
  const sel = useWorld((s) => s.sel);
  const arrived = useWorld((s) => s.arrived);
  const power = useRef(built.monitors.map(() => 0));
  const shown = useRef<(THREE.Texture | null)[]>(built.monitors.map(() => null));
  const flicker = useRef(built.monitors.map(() => 0));

  useFrame(({ camera, clock }, dt) => {
    if (!active) return;
    built.sky.position.copy(camera.position);
    const t = clock.elapsedTime;
    built.monitors.forEach((m, i) => {
      const on = i === sel.project && arrived;
      const tex = shots[i]?.[on ? sel.shot : 0] ?? null;
      if (tex && tex !== shown.current[i]) {
        shown.current[i] = tex;
        (m.picture.material as THREE.MeshBasicMaterial).map = tex;
        (m.picture.material as THREE.MeshBasicMaterial).needsUpdate = true;
        flicker.current[i] = 0.35;
      }
      power.current[i] = THREE.MathUtils.damp(power.current[i], on ? 1 : 0, on ? 3.2 : 6, dt);
      flicker.current[i] = Math.max(0, flicker.current[i] - dt);
      const p = power.current[i];
      // Fit the picture inside the glass
      const aspect = tex?.userData.aspect ?? 1.6;
      const w = Math.min(SCREEN.w, SCREEN.h * aspect);
      const h = w / aspect;
      // Switching on: a bright line opens into the picture
      const open = THREE.MathUtils.smoothstep(p, 0.15, 0.75);
      m.picture.scale.set(w * Math.min(1, p * 4), Math.max(0.004, h * open), 1);
      const mat = m.picture.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.min(1, p * 3);
      const jitter = flicker.current[i] > 0 ? 0.7 + 0.3 * Math.abs(Math.sin(t * 60)) : 1;
      mat.color.setScalar((1 + (1 - open) * 1.6) * jitter);
      (m.lamp.material as THREE.MeshBasicMaterial).color.set(on ? "#7fe08a" : "#3a4a3a");
    });
  });

  const choose = (i: number) => {
    world.select("project", i);
    world.select("shot", 0);
    world.set({ focus: `monitor-${i}` });
  };

  return (
    <group visible={active}>
      <primitive object={built.root} />
      <SunLight active={active} position={[22, 16, -6]} target={[0, 0, 0]} color="#ffd39a" intensity={3.2} size={12} quality={quality} />
      <hemisphereLight args={["#f3e2c2", "#6a5440", 1.5]} />
      <pointLight position={[0, 3.6, 1]} color="#ffcf8f" intensity={7} distance={14} decay={1.3} />
      <pointLight position={[-4.5, 3, 2.5]} color="#ffd8a8" intensity={4} distance={10} decay={1.4} />
      <pointLight position={[-2, 1.6, -2.2]} color="#9fc8b0" intensity={sel.project === 0 && arrived ? 1.2 : 0} distance={3} />
      <pointLight position={[1.8, 1.6, -2.2]} color="#9fc8b0" intensity={sel.project === 1 && arrived ? 1.2 : 0} distance={3} />
      {active && (
        <>
          {monitorSpots.map(([x, y, z], i) => (
            <Hitbox key={i} id={`workshop:monitor-${i}`} position={[x, y + 0.42, z]} size={[1.1, 0.9, 0.6]} onSelect={() => choose(i)} />
          ))}
          <Hitbox id="workshop:toolwall" position={[-6.8, 1.65, 0.9]} size={[0.4, 2.2, 4.2]} onSelect={() => world.set({ focus: "toolwall" })} />
        </>
      )}
    </group>
  );
}
