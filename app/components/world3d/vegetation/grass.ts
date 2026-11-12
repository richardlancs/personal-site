import * as THREE from "three";
import { rng, type Rng } from "../rng";
import { vegMaterial } from "./shader";

// Grass in clumps: each instance is a tuft of tapered, gently curved
// blades fanning out from one root. Across the ground, slow noise fields
// make coherent patches: taller and denser here, lower and sparser there,
// combed one way in one place and another way nearby, a little lighter or
// darker in broad areas, never blade by blade. The bases take the ground's
// colour, so the grass grows out of the ground rather than sitting on it.

// A tuft of blades: near ones with more blades and bends, far ones with
// fewer, wider, simpler blades (most of the far grass is a few pixels)
function tuft(seed: number, blades: number, segments: number, width: number, bend = 1) {
  const r = rng(seed);
  const pos: number[] = [];
  const nor: number[] = [];
  const veg: number[] = [];
  const col: number[] = [];
  const index: number[] = [];
  for (let b = 0; b < blades; b++) {
    const a = (b / blades) * Math.PI * 2 + r.range(-0.4, 0.4);
    const ox = Math.cos(a) * r.range(0.02, 0.2);
    const oz = Math.sin(a) * r.range(0.02, 0.2);
    const h = r.range(0.45, 1);
    const lean = r.range(0.15, 0.5) * (1.1 - h * 0.4) * bend;
    const w = width * r.range(0.8, 1.2);
    const dx = Math.cos(a);
    const dz = Math.sin(a);
    // The blade faces across its lean, turned a little
    const turn = a + Math.PI / 2 + r.range(-0.5, 0.5);
    const sx = Math.cos(turn);
    const sz = Math.sin(turn);
    // A tiny difference blade to blade, darker for the short inner ones
    const shade = 0.93 + h * 0.07 + r.range(-0.02, 0.02);
    const start = pos.length / 3;
    for (let s = 0; s <= segments; s++) {
      const f = s / segments;
      // Rises, then curves over along its lean
      const x = ox + dx * lean * f * f * h;
      const y = h * (f - lean * 0.35 * f * f);
      const z = oz + dz * lean * f * f * h;
      const half = (w / 2) * Math.pow(1 - f, 0.9);
      for (const side of s === segments ? [0] : [-1, 1]) {
        pos.push(x + sx * half * side, y, z + sz * half * side);
        // Lit mostly from above, a little from its face
        const nx = -sz * 0.35 + dx * 0.15;
        const nz = sx * 0.35 + dz * 0.15;
        const l = Math.hypot(nx, 1, nz);
        nor.push(nx / l, 1 / l, nz / l);
        veg.push(0, 0, 0, f);
        col.push(shade, shade, shade);
      }
    }
    for (let s = 0; s < segments; s++) {
      const i = start + s * 2;
      if (s === segments - 1) index.push(i, i + 1, i + 2);
      else index.push(i, i + 1, i + 2, i + 1, i + 3, i + 2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute("aVeg", new THREE.Float32BufferAttribute(veg, 4));
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(index);
  return g;
}

const tufts = new Map<string, THREE.BufferGeometry>();
const tuftFor = (far: boolean) => {
  const key = far ? "far" : "near";
  let g = tufts.get(key);
  if (!g) {
    g = far ? tuft(12, 6, 2, 0.08) : tuft(11, 7, 3, 0.07);
    tufts.set(key, g);
  }
  return g;
};

let material: THREE.MeshLambertMaterial | null = null;
export function grassMaterial() {
  if (!material) {
    material = vegMaterial({
      grass: true,
      ramp: { light: "#a8c96a", mid: "#6e9e4c", shadow: "#2d5e55" },
      ground: "#67753c",
      wind: { amp: 0.32, height: 1 },
    });
    material.vertexColors = true;
  }
  return material;
}

// Smooth value noise over the ground, 0..1
function field(seed: number, scale: number) {
  const r = rng(seed);
  const perm = Array.from({ length: 256 }, () => r());
  const at = (x: number, z: number) => perm[(((x * 73856093) ^ (z * 19349663)) >>> 0) & 255];
  return (x: number, z: number) => {
    x *= scale;
    z *= scale;
    const ix = Math.floor(x);
    const iz = Math.floor(z);
    let fx = x - ix;
    let fz = z - iz;
    fx = fx * fx * (3 - 2 * fx);
    fz = fz * fz * (3 - 2 * fz);
    const a = at(ix, iz) + (at(ix + 1, iz) - at(ix, iz)) * fx;
    const b = at(ix, iz + 1) + (at(ix + 1, iz + 1) - at(ix, iz + 1)) * fx;
    return a + (b - a) * fz;
  };
}

// `count` is in blades, as before; they come in tufts. `place` picks a
// spot and its height (null: nothing there).
export function grassField(count: number, place: (r: Rng) => { x: number; z: number; h: number } | null, seed = 7, far = false) {
  const r = rng(seed);
  const geometry = tuftFor(far);
  const per = far ? 3 : 4;
  const n = Math.max(1, Math.round(count / per));
  const mesh = new THREE.InstancedMesh(geometry, grassMaterial(), n);
  const tall = field(seed + 1, 0.12);
  const thick = field(seed + 2, 0.18);
  const comb = field(seed + 3, 0.07);
  const tone = field(seed + 4, 0.09);
  const m = new THREE.Matrix4();
  const shear = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const at = new THREE.Vector3();
  const size = new THREE.Vector3();
  const color = new THREE.Color();
  let k = 0;
  let tries = 0;
  while (k < n && tries < n * 8) {
    tries++;
    const spot = place(r);
    if (!spot) continue;
    // Thinner in some patches
    if (r() > 0.35 + 0.75 * thick(spot.x, spot.z)) continue;
    const t = tall(spot.x, spot.z);
    const h = spot.h * (0.6 + 0.8 * t) * r.range(0.85, 1.1);
    // Combed one way in a patch, each tuft a little its own way
    const dir = comb(spot.x, spot.z) * Math.PI * 4 + r.range(-0.5, 0.5);
    const lean = 0.25 + 0.35 * t;
    shear.makeShear(0, 0, Math.cos(dir) * lean, Math.sin(dir) * lean, 0, 0);
    q.setFromEuler(e.set(0, r() * Math.PI * 2, 0));
    const wide = far ? 1.6 : 1.15;
    m.compose(at.set(spot.x, 0, spot.z), q, size.set(wide * r.range(0.8, 1.2), h, wide * r.range(0.8, 1.2)));
    m.premultiply(shear.setPosition(0, 0, 0));
    m.setPosition(spot.x, 0, spot.z);
    mesh.setMatrixAt(k, m);
    // Broad patches a shade lighter or darker, a touch warmer or cooler
    const c = tone(spot.x, spot.z);
    color.setRGB(0.8 + 0.3 * c, 0.84 + 0.24 * c, 0.9 + 0.1 * (1 - c));
    mesh.setColorAt(k, color);
    k++;
  }
  mesh.count = k;
  mesh.receiveShadow = true;
  mesh.castShadow = false;
  mesh.frustumCulled = false;
  return mesh;
}

// Tufts just where they're put, with no noise fields: the grass and the
// reeds growing in the fountain's basin (props.ts: buildFountain). Reeds
// are tall, narrow and nearly upright, straw and olive in autumn, and sway
// less than the grass; both share the grass's shader (no new program).
let reedGeometry: THREE.BufferGeometry | null = null;
let reedMat: THREE.MeshLambertMaterial | null = null;
function reedMaterial() {
  if (!reedMat) {
    reedMat = vegMaterial({
      grass: true,
      ramp: { light: "#d2c47e", mid: "#8f9550", shadow: "#36564c" },
      ground: "#4d5634",
      wind: { amp: 0.14, height: 1 },
    });
    reedMat.vertexColors = true;
  }
  return reedMat;
}

export function tuftsAt(spots: { x: number; y: number; z: number; h: number }[], kind: "grass" | "reeds", seed = 5) {
  const geometry = kind === "reeds" ? (reedGeometry ??= tuft(13, 9, 4, 0.032, 0.35)) : tuftFor(false);
  const mesh = new THREE.InstancedMesh(geometry, kind === "reeds" ? reedMaterial() : grassMaterial(), spots.length);
  const r = rng(seed);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const color = new THREE.Color();
  spots.forEach((s, i) => {
    const wide = kind === "reeds" ? r.range(0.5, 0.75) : r.range(0.8, 1.1);
    m.compose(new THREE.Vector3(s.x, s.y, s.z), q.setFromEuler(e.set(r.range(-0.08, 0.08), r() * Math.PI * 2, r.range(-0.08, 0.08))), new THREE.Vector3(wide, s.h, wide));
    mesh.setMatrixAt(i, m);
    const c = r.range(-0.06, 0.06);
    mesh.setColorAt(i, color.setRGB(0.95 + c, 0.95 + c, 0.92 + c));
  });
  mesh.receiveShadow = true;
  mesh.castShadow = false;
  return mesh;
}
