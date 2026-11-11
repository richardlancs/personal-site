import * as THREE from "three";
import { at, blob, box, buildBush, buildVine, merge, tube } from "./geometry";
import { NEON, halo, lightbox, neon, neonTube, wash } from "./glow";
import { mesh, paint } from "./paint";
import { M, mat } from "./props";
import { rng } from "./rng";
import { clockFace, facade, plaster, roofTiles, textMask, textPanel, windowPanes } from "./textures";

// Buildings: the places in the park and the empty city around it

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

// The shallow box a lit sign's face sits on, out from the wall at wallZ
// (the face goes 8 cm out)
function signCase(w: number, h: number, x: number, y: number, wallZ: number) {
  return mesh(at(box(w + 0.06, h + 0.06, 0.07), x, y, wallZ + 0.035), M.iron());
}

// A hipped roof with eaves that flare out a little, like old temple and
// park pavilion roofs
export function hipRoof(w: number, d: number, h: number, flare = 0.25) {
  const g = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4, 3, true).rotateY(Math.PI / 4);
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i) + 0.5; // 0 at the eaves, 1 at the top
    const lift = (1 - y) * (1 - y) * flare;
    p.setXYZ(i, p.getX(i) * w, y * h + lift, p.getZ(i) * d);
  }
  g.computeVertexNormals();
  // Texture runs down the slope
  const uv = g.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w * 1.2, uv.getY(i) * h * 1.5);
  return g;
}

export const windowGlow = (strength = 1) =>
  mat(`windowGlow-${strength}`, () => {
    const panes = windowPanes(Math.min(0.85, 0.25 + strength * 0.45));
    return paint({ map: panes, emissive: "#ffb867", emissiveMap: panes, emissiveIntensity: 0.55 * strength, brush: 0.2, brushScale: 6, glow: { night: 2.4 } });
  });

// The pavilion, seen from the park: a reading room on a stone base
export function buildPavilion() {
  const g = new THREE.Group();
  g.add(mesh(box(7.4, 0.5, 5.4, 0.6).translate(0, 0.25, 0), M.stone()));
  g.add(mesh(merge([at(box(2.4, 0.18, 0.5, 0.6), 0, 0.09, 2.95), at(box(2.4, 0.18, 0.5, 0.6), 0, 0.27, 2.75)]), M.stone()));
  // Posts
  const posts: THREE.BufferGeometry[] = [];
  for (const x of [-3.4, -1.2, 1.2, 3.4]) for (const z of [-2.4, 2.4]) posts.push(at(box(0.22, 3, 0.22), x, 2, z));
  for (const z of [-0.8, 0.8]) for (const x of [-3.4, 3.4]) posts.push(at(box(0.22, 3, 0.22), x, 2, z));
  posts.push(at(box(7.2, 0.22, 0.22), 0, 3.4, 2.4), at(box(7.2, 0.22, 0.22), 0, 3.4, -2.4), at(box(0.22, 0.22, 4.9), 3.4, 3.4, 0), at(box(0.22, 0.22, 4.9), -3.4, 3.4, 0));
  g.add(mesh(merge(posts), M.darkWood()));
  // Walls set back from the posts, with windows and a door
  const walls = mesh(merge([at(box(6.6, 2.8, 0.15), 0, 1.9, -2.2), at(box(0.15, 2.8, 4.4), -3.2, 1.9, 0), at(box(0.15, 2.8, 4.4), 3.2, 1.9, 0), at(box(2.1, 2.8, 0.15), -2.15, 1.9, 2.2), at(box(2.1, 2.8, 0.15), 2.15, 1.9, 2.2), at(box(2.2, 0.6, 0.15), 0, 3.0, 2.2)]), M.plaster());
  g.add(walls);
  // Windows, lit from inside: all the panes in one mesh, all the frames
  // in another
  const panes: THREE.BufferGeometry[] = [];
  const frames: THREE.BufferGeometry[] = [];
  for (const [x, z, ry] of [
    [-2.1, 2.29, 0],
    [2.1, 2.29, 0],
    [3.29, -0.6, Math.PI / 2],
    [3.29, 0.9, Math.PI / 2],
  ]) {
    panes.push(at(new THREE.PlaneGeometry(1.0, 0.9), x, 2.0, z, ry));
    frames.push(at(merge([at(box(1.12, 0.07, 0.06), 0, 0.48, 0), at(box(1.12, 0.07, 0.06), 0, -0.48, 0), at(box(0.06, 0.9, 0.06), 0, 0, 0), at(box(1.12, 0.05, 0.05), 0, 0, 0)]), x, 2.0, z, ry));
  }
  g.add(new THREE.Mesh(merge(panes), windowGlow(1)));
  g.add(mesh(merge(frames), M.darkWood()));
  // The door, ajar, warm light behind it
  const door = mesh(box(1.0, 2.3, 0.07, 1), M.redWood());
  door.position.set(-0.75, 1.65, 2.6);
  door.rotation.y = -0.9;
  g.add(door);
  const inside = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 2.3), windowGlow(0.7));
  inside.position.set(0, 1.65, 2.15);
  g.add(inside);
  // The roof
  const roof = mesh(hipRoof(9.2, 7.2, 2.4, 0.5), mat("pavilionRoof", () => paint({ map: roofTiles("grey"), moss: 0.8, brush: 0.25, side: THREE.DoubleSide })));
  roof.position.y = 3.5;
  g.add(roof);
  g.add(mesh(at(box(1.2, 0.3, 0.3), 0, 5.95, 0), mat("ridge", () => paint({ color: "#4b4f50", moss: 0.6 }))));
  const light = new THREE.PointLight("#ffbf75", 3, 9, 1.5);
  light.position.set(0, 2.4, 1.2);
  light.userData.atmos = "window"; // brighter at night (atmosphere/Atmosphere.tsx)
  g.add(light);
  // Ivy up the posts and over the eaves
  g.add(buildVine(51, [v(-3.55, 0.4, 2.55), v(-3.5, 1.8, 2.6), v(-3.6, 3.3, 2.55), v(-2.6, 3.6, 2.9), v(-1.8, 3.4, 3.1)], 0.3));
  g.add(buildVine(52, [v(3.55, 0.4, -2.5), v(3.55, 2.2, -2.55), v(3.6, 3.4, -2.2), v(3.9, 3.5, -0.8)], 0.3));
  return { group: g, light };
}

// The workshop: a long shed with a sawtooth roof of north lights
export function buildWorkshop() {
  const g = new THREE.Group();
  g.add(mesh(box(13, 4.6, 8, 0.35).translate(0, 2.3, 0), mat("workshopWall", () => paint({ map: plaster("grey"), grime: 0.9, grimeHeight: 2.5, moss: 0.25 }))));
  // Sawtooth roof: four teeth with glass on their steep side (the teeth
  // in one mesh, the glass in another)
  const teeth = 4;
  const toothParts: THREE.BufferGeometry[] = [];
  const roofPanes: THREE.BufferGeometry[] = [];
  for (let i = 0; i < teeth; i++) {
    const x0 = -6.5 + (i * 13) / teeth;
    const w = 13 / teeth;
    const shape = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(w, 0), new THREE.Vector2(w, 1.6)]);
    toothParts.push(new THREE.ExtrudeGeometry(shape, { depth: 8.2, bevelEnabled: false }).translate(x0, 4.6, -4.1));
    roofPanes.push(at(new THREE.PlaneGeometry(1.5, 8), x0 + w + 0.01, 5.4, 0, Math.PI / 2));
  }
  g.add(mesh(merge(toothParts), mat("workshopRoof", () => paint({ map: roofTiles("rust"), moss: 0.7, rust: 0.4 }))));
  g.add(new THREE.Mesh(merge(roofPanes), windowGlow(0.35)));
  // Big windows along the front and a sliding door, open
  const panes: THREE.BufferGeometry[] = [];
  const frames: THREE.BufferGeometry[] = [];
  for (const x of [-4.6, -2.6, 2.6, 4.6]) {
    panes.push(at(new THREE.PlaneGeometry(1.6, 1.5), x, 2.6, 4.01));
    frames.push(at(box(1.7, 0.08, 0.08), x, 3.36, 4.03), at(box(1.7, 0.08, 0.08), x, 1.84, 4.03), at(box(0.06, 1.5, 0.06), x, 2.6, 4.03));
  }
  g.add(new THREE.Mesh(merge(panes), windowGlow(0.55)));
  g.add(mesh(merge(frames), M.iron()));
  const doorway = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 3.2), mat("darkDoor", () => paint({ color: "#2a2118", emissive: "#3a2410", emissiveIntensity: 0.6, brush: 0.3, glow: { night: 2.2 } })));
  doorway.position.set(0, 1.6, 4.01);
  g.add(doorway);
  g.add(mesh(at(box(1.4, 3.3, 0.1, 0.5), 1.9, 1.65, 4.1), M.iron()));
  const sign = textPanel("workshop-sign", 512, 128, {
    background: "#e2d5b8",
    padding: 12,
    valign: "middle",
    lines: [{ text: "工坊  WORKSHOP", size: 58, font: "display", color: "#3b2a1a", weight: 600, align: "center" }],
  });
  // A lit box: the painted face glows, framed in baby-blue neon
  const board = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 0.9), mat("workshopSign", () => lightbox(sign, { brush: 0.3, grime: 0.4 })));
  board.position.set(0, 3.95, 4.08);
  g.add(board);
  g.add(signCase(3.6, 0.9, 0, 3.95, 4.0));
  const frame = new THREE.Mesh(neonTube(3.78, 1.06, 0.032), mat("neonBlue", () => neon(NEON.blue)));
  frame.position.set(0, 3.95, 4.1);
  g.add(frame);
  g.add(wash([3.8, 1.08], [1.1, 1.1, 0.5, 0.95], NEON.blue, 0.3).translateY(3.95).translateZ(4.012));
  g.add(buildVine(61, [v(-6.6, 0, 4.1), v(-6.55, 2, 4.15), v(-6.2, 4.4, 4.1), v(-4, 4.5, 4.12), v(-3.6, 3.6, 4.15)], 0.4));
  g.add(buildVine(62, [v(6.6, 0, 3.4), v(6.62, 2.6, 3.2), v(6.6, 4.4, 2)], 0.4));
  return g;
}

// The station, with its clock tower
export function buildStation() {
  const g = new THREE.Group();
  const wall = mat("stationWall", () => paint({ map: plaster("cream"), grime: 0.8, grimeHeight: 3, moss: 0.3 }));
  g.add(mesh(box(16, 5.5, 6, 0.3).translate(0, 2.75, 0), wall));
  g.add(mesh(hipRoof(17.5, 7.4, 2, 0.3).translate(0, 5.5, 0), mat("stationRoof", () => paint({ map: roofTiles("rust"), moss: 0.6, side: THREE.DoubleSide }))));
  // The tower
  g.add(mesh(box(3.2, 17, 3.2, 0.3).translate(0, 8.5, 2), wall));
  g.add(mesh(box(3.6, 0.4, 3.6, 0.3).translate(0, 14.2, 2), M.concrete()));
  g.add(mesh(hipRoof(4.6, 4.6, 3.4, 0.4).translate(0, 17, 2), mat("towerRoof", () => paint({ map: roofTiles("grey"), moss: 0.9, side: THREE.DoubleSide }))));
  // The four clock faces in one mesh
  const faces: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    faces.push(at(new THREE.CircleGeometry(1.2, 32), Math.sin(a) * 1.62, 15.6, 2 + Math.cos(a) * 1.62, a));
  }
  g.add(new THREE.Mesh(merge(faces), mat("clock", () => paint({ map: clockFace(), brush: 0.1, emissive: "#fff2d0", emissiveIntensity: 0.12 }))));
  // Windows of the station hall, in one mesh
  const panes: THREE.BufferGeometry[] = [];
  for (let i = -3; i <= 3; i++) {
    if (i === 0) continue;
    panes.push(at(new THREE.PlaneGeometry(1.3, 2.2), i * 2.1, 2.4, 3.01));
  }
  g.add(new THREE.Mesh(merge(panes), windowGlow(0.35)));
  const sign = textPanel("station-sign", 512, 128, {
    background: "#f0e8d6",
    padding: 12,
    valign: "middle",
    lines: [{ text: "光明公园站", size: 64, font: "display", color: "#22392b", weight: 600, align: "center" }],
  });
  // A lit box, framed in baby-blue neon, across the tower's foot; its
  // light falls on the tower and on the hall's wall behind its ends
  const board = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 1.1), mat("stationSignBoard", () => lightbox(sign, { brush: 0.2, grime: 0.3 })));
  board.position.set(0, 4.6, 3.68);
  g.add(board);
  g.add(signCase(4.6, 1.1, 0, 4.6, 3.6));
  const frame = new THREE.Mesh(neonTube(4.78, 1.26, 0.034), mat("neonBlue", () => neon(NEON.blue)));
  frame.position.set(0, 4.6, 3.7);
  g.add(frame);
  g.add(wash([3.2, 1.28], [0, 0, 1.2, 1.2], NEON.blue, 0.3).translateY(4.6).translateZ(3.606));
  g.add(wash([4.8, 1.28], [0.9, 0.9, 0.3, 1.1], NEON.blue, 0.2).translateY(4.6).translateZ(3.012));
  g.add(buildVine(71, [v(-1.65, 0, 3.65), v(-1.7, 4, 3.66), v(-1.6, 9, 3.65), v(-0.8, 12.5, 3.66)], 0.5));
  return g;
}

// The arcade: a shopfront with a faded sign and the shutter half down
export function buildArcade() {
  const g = new THREE.Group();
  g.add(mesh(box(10, 6.5, 8, 0.3).translate(0, 3.25, 0), mat("arcadeWall", () => paint({ map: plaster("green"), grime: 0.9, grimeHeight: 2.5, moss: 0.3 }))));
  g.add(mesh(box(10.4, 0.3, 8.4).translate(0, 6.6, 0), M.concrete()));
  const signText = {
    background: "#2f3a3c",
    padding: 10,
    valign: "middle" as const,
    lines: [{ text: "游戏厅", size: 64, font: "display" as const, color: "#e6a2a0", weight: 600, align: "center" as const }],
  };
  const sign = textPanel("arcade-sign", 512, 128, signText);
  // Neon letters on the dark board: only the letters glow (their own
  // mask), with a soft pink halo round them, and the board framed in
  // baby blue like the others. Steady: it no longer hums.
  const signMat = mat("arcadeSign", () =>
    paint({ map: sign, emissive: NEON.pink, emissiveMap: textMask("arcade-sign", 512, 128, signText), emissiveIntensity: 2.4, brush: 0.25, grime: 0.4, glow: { day: 0.16, night: 1 } }),
  );
  const board = new THREE.Mesh(new THREE.PlaneGeometry(7, 1.6), signMat);
  board.position.set(0, 5.2, 4.08);
  g.add(board);
  g.add(signCase(7, 1.6, 0, 5.2, 4.0));
  const letters = halo(textMask("arcade-sign", 512, 128, signText, 9), [7, 1.6], NEON.pink, 0.5);
  letters.position.set(0, 5.2, 4.1);
  g.add(letters);
  const frame = new THREE.Mesh(neonTube(7.18, 1.78, 0.036, 0.16), mat("neonBlue", () => neon(NEON.blue)));
  frame.position.set(0, 5.2, 4.11);
  g.add(frame);
  g.add(wash([7.2, 1.8], [1.0, 1.0, 0.42, 0.9], NEON.pink, 0.15, 0.26).translateY(5.2).translateZ(4.012));
  // Shopfront: glass, and a shutter part way down
  const glow = windowGlow(0.45);
  const front = new THREE.Mesh(new THREE.PlaneGeometry(7.4, 3.2), glow);
  front.position.set(0, 1.9, 4.01);
  g.add(front);
  const shutter = mesh(box(7.6, 1.6, 0.1, 1).translate(0, 2.75, 4.08), mat("shutter", () => paint({ color: "#8e938a", brush: 0.35, brushScale: 3, rust: 0.6, grime: 0.6 })));
  g.add(shutter);
  g.add(buildVine(81, [v(-5.05, 0, 4.1), v(-5, 3, 4.12), v(-4.6, 6.4, 4.1), v(-2, 6.6, 4.2), v(-1.2, 5.6, 4.15)], 0.45));
  g.add(buildVine(82, [v(5.05, 0, 3.5), v(5.08, 3.2, 3.2), v(5.06, 6.3, 2.5)], 0.45));
  return { group: g, signMat };
}

// The empty city around the park: tall blocks, some broken at the top,
// gardens gone wild on their roofs, all merged by facade so it draws fast
export function buildCity(seed: number, spots: { x: number; z: number; w: number; d: number; h: number }[]) {
  const r = rng(seed);
  const byFacade: THREE.BufferGeometry[][] = [[], [], [], []];
  const roofs: THREE.BufferGeometry[] = [];
  const greens: THREE.BufferGeometry[] = [];
  for (const s of spots) {
    const k = Math.floor(r() * 4);
    const ry = r.range(-0.15, 0.15);
    byFacade[k].push(at(box(s.w, s.h, s.d, 1 / 12.8), s.x, s.h / 2, s.z, ry));
    roofs.push(at(box(s.w + 0.4, 0.4, s.d + 0.4), s.x, s.h + 0.2, s.z, ry));
    if (r() < 0.35) {
      // Broken: a jagged last storey
      byFacade[k].push(at(box(s.w * 0.6, 3.5, s.d * 0.7, 1 / 12.8), s.x + s.w * 0.15, s.h + 1.75, s.z, ry, 0, r.range(-0.08, 0.08)));
    } else if (r() < 0.5) {
      roofs.push(at(new THREE.CylinderGeometry(0.9, 0.9, 1.6, 8), s.x - s.w * 0.25, s.h + 1.2, s.z + s.d * 0.2));
    }
    if (r() < 0.6) {
      for (let i = 0; i < 4; i++) greens.push(blob(r, r.range(1.2, 2.4), 0.6, 0.3, 1).translate(s.x + r.range(-0.4, 0.4) * s.w, s.h + 0.6, s.z + r.range(-0.4, 0.4) * s.d));
    }
  }
  const g = new THREE.Group();
  byFacade.forEach((parts, k) => {
    if (!parts.length) return;
    const tex = facade(k);
    tex.repeat.set(1, 0.5);
    g.add(mesh(merge(parts), mat(`city-${k}`, () => paint({ map: tex, brush: 0.18, brushScale: 0.2, grime: 0.5, grimeHeight: 6 })), { cast: false }));
  });
  g.add(mesh(merge(roofs), M.concrete(), { cast: false }));
  if (greens.length) g.add(mesh(merge(greens), mat("roofGreen", () => paint({ color: "#56703a", brush: 0.4, brushScale: 0.4 })), { cast: false }));
  return g;
}

// Low hills far off, blue with distance
export function buildHills() {
  const r = rng(91);
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 9; i++) {
    const a = -Math.PI * 0.95 + (i / 8) * Math.PI * 0.9;
    const d = r.range(230, 300);
    parts.push(blob(r, r.range(40, 70), 0.35, 0.2, 2).translate(Math.cos(a) * d, -8, Math.sin(a) * d));
  }
  return mesh(merge(parts), mat("hills", () => paint({ color: "#8a8f8a", brush: 0.3, brushScale: 0.03, fog: true })), { cast: false, receive: false });
}

// An iron railing along a line (the park's edge)
export function buildRailing(points: THREE.Vector3[]) {
  const parts: THREE.BufferGeometry[] = [];
  const curve = new THREE.CatmullRomCurve3(points);
  const length = curve.getLength();
  for (const h of [0.95, 0.5]) parts.push(tube(points.map((p) => p.clone().add(v(0, h, 0))), () => 0.03, Math.round(length * 2), 5));
  const posts = Math.round(length / 1.4);
  for (let i = 0; i <= posts; i++) {
    const p = curve.getPointAt(i / posts);
    parts.push(at(new THREE.CylinderGeometry(0.035, 0.04, 1.0, 5), p.x, 0.5, p.z));
  }
  return mesh(merge(parts), M.rust());
}

export { buildBush };
