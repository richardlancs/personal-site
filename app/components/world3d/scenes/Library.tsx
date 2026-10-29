"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { about, profile } from "../../../data/portfolio";
import { at, blob, box, buildBush, buildVine, merge, tube } from "../geometry";
import { mesh, paint } from "../paint";
import { M, buildBeam, buildDust, buildSky, mat } from "../props";
import { rng } from "../rng";
import { useWorld, world } from "../store";
import { planks, plaster, textPanel } from "../textures";
import { Hitbox, SunLight, buildRoom, type SceneProps } from "./common";

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
export const NOTEBOOK = { x: 1.2, y: 0.8, z: -1.3 };
const PAGE = { w: 0.26, h: 0.34 };

// The notebook's pages: the same text as the About page
export const notebookPages = [...about, `Where to find me: GitHub (${profile.githubUrl.replace("https://", "")}), LinkedIn, and the phone booth for email. My projects are at the workshop.`];

function pageTexture(i: number) {
  const text = notebookPages[i];
  return textPanel(`page-${i}`, 384, 500, {
    background: i < 0 || !text ? "#f4efdf" : "#f6f1e1",
    grain: true,
    rule: "rgba(74,110,140,0.16)",
    padding: 30,
    wrap: true,
    lines: text ? [{ text, size: i === 0 ? 25 : 22, font: i === 0 ? "display" : "text", color: "#2b2f27", weight: 500 }] : [],
  });
}

// A page that turns: a strip bent over the spine as it goes
function turningPage() {
  const geo = new THREE.PlaneGeometry(PAGE.w, PAGE.h, 16, 1).rotateX(-Math.PI / 2).translate(PAGE.w / 2, 0, 0);
  const base = Float32Array.from(geo.attributes.position.array);
  const front = new THREE.MeshLambertMaterial({ side: THREE.FrontSide });
  const back = new THREE.MeshLambertMaterial({ side: THREE.BackSide });
  const group = new THREE.Group();
  const a = new THREE.Mesh(geo, front);
  const b = new THREE.Mesh(geo, back);
  group.add(a, b);
  // Mirror the back so its text reads the right way when it lands
  back.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace("#include <map_fragment>", "vec4 sampledDiffuseColor = texture2D(map, vec2(1.0 - vMapUv.x, vMapUv.y));\ndiffuseColor *= sampledDiffuseColor;");
  };
  const set = (turn: number) => {
    // turn 0: lying on the right; 1: lying on the left
    const p = geo.attributes.position as THREE.BufferAttribute;
    const angle = turn * Math.PI;
    const curl = Math.sin(turn * Math.PI) * 0.9;
    for (let i = 0; i < p.count; i++) {
      const x0 = base[i * 3];
      const s = x0 / PAGE.w; // 0 at the spine
      const a2 = angle + curl * s * s * (turn < 0.5 ? -1 : 1) * 0.6;
      p.setXYZ(i, Math.cos(a2) * x0, Math.sin(a2) * x0 + 0.002, base[i * 3 + 2]);
    }
    p.needsUpdate = true;
    geo.computeVertexNormals();
  };
  set(0);
  return { group, front, back, set };
}

function buildNotebook() {
  const g = new THREE.Group();
  const leather = mat("leather", () => paint({ color: "#6b4630", brush: 0.35, brushScale: 10, grime: 0.2 }));
  g.add(mesh(merge([at(box(PAGE.w + 0.02, 0.012, PAGE.h + 0.02), -PAGE.w / 2 - 0.005, 0.006, 0, 0, 0, 0.04), at(box(PAGE.w + 0.02, 0.012, PAGE.h + 0.02), PAGE.w / 2 + 0.005, 0.006, 0, 0, 0, -0.04)]), leather));
  const block = mat("pageBlock", () => paint({ color: "#efe8d4", brush: 0.15, brushScale: 20 }));
  g.add(mesh(merge([at(box(PAGE.w, 0.02, PAGE.h), -PAGE.w / 2, 0.022, 0, 0, 0, 0.035), at(box(PAGE.w, 0.02, PAGE.h), PAGE.w / 2, 0.022, 0, 0, 0, -0.035)]), block));
  const left = new THREE.Mesh(new THREE.PlaneGeometry(PAGE.w, PAGE.h).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial());
  left.position.set(-PAGE.w / 2, 0.034, 0);
  left.rotation.z = 0.035;
  const right = new THREE.Mesh(new THREE.PlaneGeometry(PAGE.w, PAGE.h).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial());
  right.position.set(PAGE.w / 2, 0.034, 0);
  right.rotation.z = -0.035;
  left.receiveShadow = right.receiveShadow = true;
  g.add(left, right);
  const turning = turningPage();
  turning.group.position.set(0, 0.04, 0);
  turning.group.visible = false;
  g.add(turning.group);
  // A pencil in the gutter
  g.add(mesh(at(new THREE.CylinderGeometry(0.005, 0.005, 0.18, 6), 0.02, 0.045, 0.02, 0.3, Math.PI / 2), mat("pencil", () => paint({ color: "#c9a14a", brush: 0.2 }))));
  return { group: g, left, right, turning };
}

// Shelves full of books: sizes, colours and the odd one leaning
function buildShelves(seed: number, width: number, height: number, depth: number) {
  const r = rng(seed);
  const g = new THREE.Group();
  const parts: THREE.BufferGeometry[] = [at(box(width, height, 0.04), 0, height / 2, -depth / 2 + 0.02)];
  const levels = Math.round(height / 0.42);
  for (let i = 0; i <= levels; i++) parts.push(at(box(width, 0.04, depth), 0, i * (height / levels), 0));
  for (const x of [-width / 2, width / 2]) parts.push(at(box(0.04, height, depth), x, height / 2, 0));
  g.add(mesh(merge(parts), M.darkWood()));
  const books: THREE.BufferGeometry[] = [];
  const colors: number[] = [];
  const palette = ["#7a3b2e", "#3e5a44", "#2f4a63", "#8c6a3a", "#5b3f52", "#a08a5c", "#6e2f2a", "#47505a", "#c2a878"];
  for (let i = 0; i < levels; i++) {
    let x = -width / 2 + 0.05;
    const y = i * (height / levels) + 0.02;
    while (x < width / 2 - 0.08) {
      if (r() < 0.08) {
        x += r.range(0.08, 0.25); // a gap where books were taken
        continue;
      }
      const w = r.range(0.025, 0.06);
      const h = r.range(0.22, Math.min(0.36, height / levels - 0.05));
      const lean = r() < 0.06 ? r.range(0.2, 0.35) : 0;
      const b = at(box(w, h, r.range(0.16, 0.24)), x + w / 2 + lean * h * 0.5, y + h / 2, 0.02, 0, 0, -lean);
      const c = new THREE.Color(r.pick(palette)).multiplyScalar(r.range(0.75, 1.1));
      const n = b.attributes.position.count;
      for (let k = 0; k < (b.index ? b.toNonIndexed().attributes.position.count : n); k++) colors.push(c.r, c.g, c.b);
      books.push(b.index ? b.toNonIndexed() : b);
      x += w + 0.004 + lean * h * 0.6;
    }
  }
  const geo = merge(books);
  geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  g.add(mesh(geo, mat("books", () => paint({ vertexColors: true, brush: 0.3, brushScale: 12, grime: 0.2 }))));
  return g;
}

// Old photographs: little paintings of the park's places
function photo(i: number) {
  return textPanel(`photo-${i}`, 128, 160, {
    background: ["#b9a27a", "#8fa0a8", "#a8a07a"][i],
    lines: [],
  });
}

function buildLibraryScene(quality: "high" | "low") {
  const root = new THREE.Group();
  const r = rng(12);
  root.add(
    buildRoom({
      w: 8,
      d: 7,
      h: 3.6,
      floor: mat("libraryFloor", () => paint({ map: planks("light"), brush: 0.25, brushScale: 1.2, grime: 0.3 })),
      wall: mat("libraryWall", () => paint({ map: plaster("cream"), brush: 0.2, grime: 0.5, grimeHeight: 1.2, moss: 0.1 })),
      ceiling: mat("libraryCeiling", () => paint({ map: planks("dark"), brush: 0.3 })),
      walls: {
        right: { openings: [{ x: 1.2, y: 1.9, w: 1.6, h: 1.6 }] },
        front: { openings: [{ x: 0.4, y: 1.15, w: 1.1, h: 2.3 }, { x: -2.4, y: 1.9, w: 1.3, h: 1.3 }] },
      },
    }),
  );
  // Beams
  const beams: THREE.BufferGeometry[] = [];
  for (const x of [-2.5, 0, 2.5]) beams.push(at(box(0.2, 0.22, 7), x, 3.48, 0));
  root.add(mesh(merge(beams), M.darkWood()));
  // Bookshelves along the back and the left
  const back = buildShelves(1, 7.6, 2.6, 0.32);
  back.position.set(0, 0, -3.3);
  root.add(back);
  const side = buildShelves(2, 4.4, 2.2, 0.32);
  side.position.set(-3.82, 0, -0.4);
  side.rotation.y = Math.PI / 2;
  root.add(side);
  // The desk, chair and lamp
  const desk = new THREE.Group();
  desk.add(mesh(at(box(1.7, 0.06, 0.85, 1), 0, 0.77, 0), M.wood()));
  const legs: THREE.BufferGeometry[] = [];
  for (const x of [-0.78, 0.78]) for (const z of [-0.36, 0.36]) legs.push(at(box(0.06, 0.74, 0.06), x, 0.37, z));
  legs.push(at(box(0.5, 0.5, 0.75), -0.55, 0.47, 0));
  desk.add(mesh(merge(legs), M.darkWood()));
  desk.position.set(NOTEBOOK.x - 0.1, 0, NOTEBOOK.z - 0.05);
  root.add(desk);
  const chair = mesh(merge([at(box(0.45, 0.05, 0.45), 0, 0.46, 0), at(box(0.45, 0.5, 0.05), 0, 0.72, 0.22), ...[-0.2, 0.2].flatMap((x) => [-0.2, 0.2].map((z) => at(box(0.04, 0.46, 0.04), x, 0.23, z)))]), M.darkWood());
  chair.position.set(NOTEBOOK.x, 0, NOTEBOOK.z + 0.75);
  chair.rotation.y = 0.25;
  root.add(chair);
  const lampShade = paint({ color: "#e8d3a4", emissive: "#ffcf86", emissiveIntensity: 0.9, brush: 0.2, side: THREE.DoubleSide });
  root.add(mesh(merge([at(new THREE.CylinderGeometry(0.08, 0.1, 0.03, 12), 0, 0.81, 0), tube([v(0, 0.81, 0), v(0.02, 1.15, 0), v(0.12, 1.25, 0.05)], () => 0.01, 8, 4)]), M.iron()).translateX(NOTEBOOK.x - 0.65).translateZ(NOTEBOOK.z - 0.2));
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.14, 14, 1, true), lampShade);
  shade.position.set(NOTEBOOK.x - 0.53, 1.2, NOTEBOOK.z - 0.15);
  root.add(shade);
  // The notebook, open
  const notebook = buildNotebook();
  notebook.group.position.set(NOTEBOOK.x, NOTEBOOK.y, NOTEBOOK.z);
  notebook.group.rotation.y = -0.12;
  root.add(notebook.group);
  // A cup, a stack of books, two photographs
  root.add(mesh(at(new THREE.CylinderGeometry(0.04, 0.035, 0.09, 12), NOTEBOOK.x + 0.48, 0.845, NOTEBOOK.z - 0.1), mat("cup", () => paint({ color: "#d9d2c0", brush: 0.2 }))));
  root.add(mesh(merge([0, 1, 2].map((k) => at(box(0.22, 0.04, 0.3), NOTEBOOK.x + 0.55, 0.82 + k * 0.042, NOTEBOOK.z + 0.18, k * 0.2))), mat("stackBooks", () => paint({ color: "#6e4a3a", brush: 0.5, brushScale: 10 }))));
  [0, 1, 2].forEach((i) => {
    const frame = new THREE.Group();
    frame.add(mesh(box(0.16, 0.2, 0.015), M.darkWood()));
    const picture = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.16), mat(`photo-${i}`, () => paint({ map: photo(i), brush: 0.6, brushScale: 30 })));
    picture.position.z = 0.009;
    frame.add(picture);
    if (i < 2) {
      frame.position.set(NOTEBOOK.x - 0.35 + i * 0.2, 0.9, NOTEBOOK.z - 0.33);
      frame.rotation.set(-0.15, 0.2 - i * 0.3, 0);
    } else {
      frame.position.set(-1.6, 1.75, -3.12);
      frame.scale.setScalar(2.2);
    }
    root.add(frame);
  });
  // A rug
  root.add(mesh(new THREE.PlaneGeometry(2.4, 1.6).rotateX(-Math.PI / 2).translate(0.3, 0.005, 0.6), mat("rug", () => paint({ color: "#8a4a3a", brush: 0.5, brushScale: 3, grime: 0.4 })), { cast: false }));
  // Plants: in through the window and up the wall, and a pot gone wild
  root.add(buildVine(70, [v(3.95, 2.7, 0.4), v(3.9, 3.3, 0.9), v(3.0, 3.5, 1.2), v(1.6, 3.5, 1.0), v(0.2, 3.45, 1.5)], 0.3));
  root.add(buildVine(71, [v(3.95, 1.1, 2.0), v(3.92, 0.5, 2.3), v(3.9, 0, 2.6)], 0.26));
  root.add(buildVine(72, [v(-3.7, 2.6, -2.8), v(-2.8, 2.65, -3.1), v(-1.8, 2.3, -3.14), v(-1.2, 1.6, -3.14)], 0.24));
  const pot = mesh(at(new THREE.CylinderGeometry(0.22, 0.17, 0.35, 12), 0, 0.175, 0), mat("pot", () => paint({ color: "#a0583a", brush: 0.3, moss: 0.4 })));
  pot.position.set(3.3, 0, -2.6);
  root.add(pot);
  const potBush = buildBush(73, 0.6);
  potBush.position.set(3.3, 0.3, -2.6);
  root.add(potBush);
  // Leaves come in under the door
  const leaves: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 18; i++) leaves.push(blob(r, 0.07, 0.15, 0.5, 0).translate(r.range(-0.6, 1.4), 0.01, r.range(2.6, 3.4)));
  root.add(mesh(merge(leaves), mat("leafLitter", () => paint({ color: "#b0723c", brush: 0.6, brushScale: 6 })), { cast: false }));
  // The window's light across the desk
  const beam = buildBeam(4, 1.5, "#ffd9a0", 0.18);
  beam.position.set(4, 2.6, 1.2);
  beam.rotation.set(0, 0, 0.85);
  root.add(beam);
  root.add(buildDust(quality === "low" ? 25 : 70, [4, 2.5, 3], [2, 1.6, 0]));
  const sky = buildSky({ top: "#8fb0c8", horizon: "#f3d4a2", sun: "#ffd29a", sunDir: [0.9, 0.3, 0.2] });
  root.add(sky);
  root.add(mesh(new THREE.PlaneGeometry(80, 80).rotateX(-Math.PI / 2).translate(0, -0.05, 0), paint({ color: "#6d7a3c", brush: 0.4, brushScale: 0.2 }), { cast: false }));
  return { root, notebook, sky, lampShade };
}

export default function Library({ active, quality }: SceneProps) {
  const built = useMemo(() => buildLibraryScene(quality), [quality]);
  const page = useWorld((s) => s.sel.page);
  const state = useRef({ shown: -1, turn: 0, dir: 1, from: 0 });

  useFrame(({ camera }, dt) => {
    if (!active) return;
    built.sky.position.copy(camera.position);
    const nb = built.notebook;
    const st = state.current;
    // The spread showing: pages (2k, 2k + 1)
    const spread = page - (page % 2);
    if (st.shown === -1) {
      st.shown = spread;
      (nb.left.material as THREE.MeshLambertMaterial).map = pageTexture(spread);
      (nb.right.material as THREE.MeshLambertMaterial).map = pageTexture(spread + 1);
      (nb.left.material as THREE.MeshLambertMaterial).needsUpdate = (nb.right.material as THREE.MeshLambertMaterial).needsUpdate = true;
    } else if (st.shown !== spread && st.turn === 0) {
      // Start a turn: forward lifts the right page over to the left
      st.dir = spread > st.shown ? 1 : -1;
      st.from = st.shown;
      st.turn = 0.0001;
      nb.turning.group.visible = true;
      const forward = st.dir > 0;
      nb.turning.front.map = pageTexture(forward ? st.from + 1 : spread + 1);
      nb.turning.back.map = pageTexture(forward ? spread : st.from);
      nb.turning.front.needsUpdate = nb.turning.back.needsUpdate = true;
      // What's underneath the turning page
      if (forward) (nb.right.material as THREE.MeshLambertMaterial).map = pageTexture(spread + 1);
      else (nb.left.material as THREE.MeshLambertMaterial).map = pageTexture(spread);
      (nb.left.material as THREE.MeshLambertMaterial).needsUpdate = (nb.right.material as THREE.MeshLambertMaterial).needsUpdate = true;
      st.shown = spread;
    }
    if (st.turn > 0) {
      st.turn = Math.min(1, st.turn + dt * 1.6);
      const e = st.turn < 0.5 ? 2 * st.turn * st.turn : 1 - Math.pow(-2 * st.turn + 2, 2) / 2;
      nb.turning.set(st.dir > 0 ? e : 1 - e);
      if (st.turn >= 1) {
        st.turn = 0;
        nb.turning.group.visible = false;
        (nb.left.material as THREE.MeshLambertMaterial).map = pageTexture(st.shown);
        (nb.right.material as THREE.MeshLambertMaterial).map = pageTexture(st.shown + 1);
        (nb.left.material as THREE.MeshLambertMaterial).needsUpdate = (nb.right.material as THREE.MeshLambertMaterial).needsUpdate = true;
      }
    }
  });

  return (
    <group visible={active}>
      <primitive object={built.root} />
      <SunLight active={active} position={[16, 9, 4]} target={[1, 0.8, -1]} color="#ffd29a" intensity={2.8} size={8} quality={quality} />
      <hemisphereLight args={["#f3e2c2", "#6a5440", 1.3]} />
      <pointLight position={[NOTEBOOK.x - 0.5, 1.15, NOTEBOOK.z - 0.1]} color="#ffc77a" intensity={2.4} distance={4} decay={1.6} />
      <pointLight position={[0, 3, 1]} color="#ffcf8f" intensity={1.6} distance={9} decay={1.5} />
      {active && (
        <Hitbox
          id="library:notebook"
          position={[NOTEBOOK.x, NOTEBOOK.y + 0.05, NOTEBOOK.z]}
          size={[0.65, 0.2, 0.45]}
          onSelect={() => {
            if (world.get().focus !== "notebook") world.set({ focus: "notebook" });
            else world.select("page", Math.min(world.get().sel.page + 2, notebookPages.length - 1 - ((notebookPages.length - 1) % 2)));
          }}
        />
      )}
    </group>
  );
}
