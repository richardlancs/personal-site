import * as THREE from "three";
import { mergeGeometries, mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import { mesh, paint } from "./paint";
import { rng, type Rng } from "./rng";
import { leafCluster } from "./textures";
import { crownClusters, foliageGeometry, foliageMaterial, type Foliage } from "./vegetation/foliage";
import { grassField } from "./vegetation/grass";
import { vegMesh } from "./vegetation/shader";

// The modeling toolkit: everything in the world is built from these, from
// seeds, so it comes out the same every time.

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

export const merge = (parts: THREE.BufferGeometry[]) => {
  if (!parts.length) return new THREE.BufferGeometry();
  // Drop attributes not every part has, so they can be merged
  const names = parts.map((p) => new Set(Object.keys(p.attributes)));
  const shared = [...names[0]].filter((n) => names.every((s) => s.has(n)));
  for (const p of parts) {
    for (const n of Object.keys(p.attributes)) if (!shared.includes(n)) p.deleteAttribute(n);
  }
  const indexed = parts.map((p) => (p.index ? p.toNonIndexed() : p));
  return mergeGeometries(indexed, false)!;
};

// A box whose texture keeps the same size per metre on every face
export function box(w: number, h: number, d: number, density = 0.5) {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv as THREE.BufferAttribute;
  const faces = [
    [d, h],
    [d, h],
    [w, d],
    [w, d],
    [w, h],
    [w, h],
  ];
  for (let f = 0; f < 6; f++) {
    for (let k = 0; k < 4; k++) {
      const i = f * 4 + k;
      uv.setXY(i, uv.getX(i) * faces[f][0] * density, uv.getY(i) * faces[f][1] * density);
    }
  }
  return g;
}

export const at = (g: THREE.BufferGeometry, x: number, y: number, z: number, ry = 0, rx = 0, rz = 0) => {
  const m = new THREE.Matrix4().compose(v(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), v(1, 1, 1));
  return g.applyMatrix4(m);
};

// A tube along a curve whose radius changes along it (branches, pipes,
// cords, rails)
export function tube(points: THREE.Vector3[], radius: (t: number) => number, segments = 12, radial = 6) {
  const curve = new THREE.CatmullRomCurve3(points);
  const frames = curve.computeFrenetFrames(segments, false);
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const index: number[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const p = curve.getPointAt(t);
    const r = radius(t);
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      const n = frames.normals[i].clone().multiplyScalar(Math.cos(a)).add(frames.binormals[i].clone().multiplyScalar(Math.sin(a)));
      positions.push(p.x + n.x * r, p.y + n.y * r, p.z + n.z * r);
      normals.push(n.x, n.y, n.z);
      uvs.push(j / radial, t * curve.getLength() * 0.5);
    }
  }
  for (let i = 0; i < segments; i++)
    for (let j = 0; j < radial; j++) {
      const a = i * (radial + 1) + j;
      const b = a + radial + 1;
      index.push(a, b, a + 1, b, b + 1, a + 1);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(index);
  return g;
}

// A wire hanging between two points
export function wire(a: THREE.Vector3, b: THREE.Vector3, sag: number, r = 0.015) {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    pts.push(a.clone().lerp(b, t).add(v(0, -Math.sin(t * Math.PI) * sag, 0)));
  }
  return tube(pts, () => r, 16, 4);
}

// A lumpy ball (a mass of leaves, a rock, a cushion)
export function blob(r: Rng, radius: number, squash = 0.8, lumps = 0.22, detail = 2) {
  // Welded, so the normals come out smooth: soft masses, not facets
  const g = mergeVertices(new THREE.IcosahedronGeometry(radius, detail).deleteAttribute("normal").deleteAttribute("uv"));
  const p = g.attributes.position as THREE.BufferAttribute;
  const seeds = [r(), r(), r()].map((s) => s * 10);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    const n =
      Math.sin(x * 2.1 + seeds[0]) * Math.sin(y * 2.7 + seeds[1]) * Math.sin(z * 2.3 + seeds[2]) +
      0.5 * Math.sin(x * 5.3 + seeds[1]) * Math.sin(z * 4.7 + seeds[0]);
    const k = 1 + n * lumps;
    p.setXYZ(i, x * k, y * k * squash, z * k);
  }
  g.computeVertexNormals();
  return g;
}

// ---------------------------------------------------------------------
// Trees

export type TreeKind = {
  palette: Foliage;
  fall?: THREE.ColorRepresentation; // the colour its leaves take as they fall (multiplies the leaf texture)
  height: number;
  trunk: number; // radius at the base
  spread: number; // how far branches reach out
  levels: number;
  clump: number; // size of the leaf masses
  bark?: THREE.ColorRepresentation;
  squash?: number; // how flat its leaf masses are (pines grow in pads)
  satellites?: number; // smaller masses around each one, for a lobed outline
};

export const treeKinds = {
  zelkova: { fall: "#b8cf72", palette: "green", height: 9, trunk: 0.38, spread: 4.5, levels: 3, clump: 1.55, bark: "#6b5a48", satellites: 2, squash: 0.85 },
  ginkgo: { fall: "#fff08a", palette: "ginkgo", height: 8, trunk: 0.3, spread: 2.8, levels: 3, clump: 1.3, bark: "#6e5e4c", satellites: 2, squash: 0.95 },
  maple: { fall: "#ffffff", palette: "maple", height: 6, trunk: 0.25, spread: 3.2, levels: 3, clump: 1.2, bark: "#5e4a3c", satellites: 2, squash: 0.72 },
  pine: { fall: "#a3b47a", palette: "pine", height: 10, trunk: 0.32, spread: 3.6, levels: 2, clump: 1.55, bark: "#5a4636", satellites: 2, squash: 0.5 },
} satisfies Record<string, TreeKind>;

type Clump = { center: THREE.Vector3; radius: number };

function grow(r: Rng, kind: TreeKind) {
  const wood: THREE.BufferGeometry[] = [];
  const clumps: Clump[] = [];
  const trunkTop = kind.height * r.range(0.42, 0.52);
  const lean = v(r.range(-0.4, 0.4), 0, r.range(-0.4, 0.4));
  const trunkPts = [v(0, -0.2, 0), v(lean.x * 0.2, trunkTop * 0.4, lean.z * 0.2), v(lean.x * 0.6, trunkTop * 0.8, lean.z * 0.6), v(lean.x, trunkTop, lean.z)];
  // Roots flare at the bottom
  wood.push(tube(trunkPts, (t) => kind.trunk * (1 - t * 0.45) * (1 + Math.max(0, 0.18 - t) * 4), 12, 10));

  const branch = (start: THREE.Vector3, dir: THREE.Vector3, length: number, radius: number, depth: number) => {
    const end = start.clone().add(dir.clone().multiplyScalar(length));
    // Branches bend back toward the light
    end.y += length * 0.15 * (depth + 1);
    const mid = start.clone().lerp(end, 0.5).add(v(r.range(-0.3, 0.3), r.range(0, 0.4), r.range(-0.3, 0.3)).multiplyScalar(length * 0.3));
    // Tapering to a twig, so no cut end shows where it meets the leaves
    wood.push(tube([start, mid, end], (t) => radius * (1 - t * 0.78), 8, 6));
    if (depth >= kind.levels - 1) {
      clumps.push({ center: end.clone().add(v(0, kind.clump * 0.3, 0)), radius: kind.clump * r.range(0.8, 1.2) });
      return;
    }
    const children = depth === 0 ? 3 : r() < 0.5 ? 2 : 3;
    for (let i = 0; i < children; i++) {
      const t = r.range(0.55, 1);
      const from = start.clone().lerp(end, t);
      const axis = v(r() - 0.5, r() * 0.3, r() - 0.5).normalize();
      const childDir = dir
        .clone()
        .applyAxisAngle(axis, r.range(0.35, 0.8) * r.sign())
        .add(v(0, 0.25, 0))
        .normalize();
      branch(from, childDir, length * r.range(0.55, 0.75), radius * 0.6, depth + 1);
    }
    if (depth > 0) clumps.push({ center: end.clone(), radius: kind.clump * r.range(0.6, 0.85) });
  };

  const mains = r() < 0.5 ? 3 : 4;
  for (let i = 0; i < mains; i++) {
    const a = (i / mains) * Math.PI * 2 + r.range(-0.4, 0.4);
    const out = r.range(0.5, 0.9);
    const dir = v(Math.cos(a) * out, 1, Math.sin(a) * out).normalize();
    branch(trunkPts[3].clone(), dir, (kind.height - trunkTop) * r.range(0.5, 0.65) + kind.spread * 0.25, kind.trunk * 0.55, 0);
  }
  // A crown on top
  clumps.push({ center: v(lean.x, kind.height * 0.95, lean.z), radius: kind.clump * 1.1 });
  return { wood: merge(wood), clumps, trunkTop };
}

// Leaf cards around each mass. Their normals point out from the mass, so
// the light falls across the whole crown like a painted shape instead of
// across hundreds of separate flat cards.
// The cards are written straight into one buffer (a few hundred per tree,
// dozens of trees): no geometry objects, no merging. The random draws are
// in the same order as before, so every tree still grows the same.
const Z = v(0, 0, 1);
const corner = [
  [-0.5, 0.5],
  [0.5, 0.5],
  [-0.5, -0.5],
  [0.5, -0.5],
];
export function leafCards(r: Rng, clumps: Clump[], density = 1, size = 1) {
  const counts = clumps.map(({ radius }) => Math.round(radius * radius * 9 * density) + 4);
  const cards = counts.reduce((a, b) => a + b, 0);
  const pos = new Float32Array(cards * 12);
  const nor = new Float32Array(cards * 12);
  const uv = new Float32Array(cards * 8);
  const index = cards * 4 > 65535 ? new Uint32Array(cards * 6) : new Uint16Array(cards * 6);
  const q = new THREE.Quaternion();
  const dir = v(0, 0, 0);
  const look = v(0, 0, 0);
  const p = v(0, 0, 0);
  const c = v(0, 0, 0);
  const n = v(0, 0, 0);
  let k = 0;
  clumps.forEach(({ center, radius }, ci) => {
    for (let i = 0; i < counts[ci]; i++) {
      dir.set(r() - 0.5, (r() - 0.35) * 0.9, r() - 0.5).normalize();
      p.copy(center).addScaledVector(dir, radius * r.range(0.55, 1.0));
      const s = radius * r.range(0.7, 1.05) * size;
      // Face mostly outward, turned a little at random
      look.set(r() - 0.5, r() - 0.5, r() - 0.5).multiplyScalar(0.9).add(dir).normalize();
      q.setFromUnitVectors(Z, look);
      for (let j = 0; j < 4; j++) {
        c.set(corner[j][0] * s, corner[j][1] * s, 0).applyQuaternion(q).add(p);
        const o = (k * 4 + j) * 3;
        pos[o] = c.x;
        pos[o + 1] = c.y;
        pos[o + 2] = c.z;
        // Outward normals, leaning up toward the sky light
        n.copy(c).sub(center).normalize();
        n.y += 0.35;
        n.normalize();
        nor[o] = n.x;
        nor[o + 1] = n.y;
        nor[o + 2] = n.z;
        uv[(k * 4 + j) * 2] = j & 1;
        uv[(k * 4 + j) * 2 + 1] = j < 2 ? 1 : 0;
      }
      const a = k * 4;
      index.set([a, a + 2, a + 1, a + 2, a + 3, a + 1], k * 6);
      k++;
    }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  g.setIndex(new THREE.BufferAttribute(index, 1));
  return g;
}

// Ivy keeps its leaf cards: small leaves along a wall, seen close
const vineMaterials = new Map<number, { wood: THREE.MeshLambertMaterial; leaves: THREE.MeshLambertMaterial }>();

function vineMaterialsFor(height: number) {
  let m = vineMaterials.get(height);
  if (!m) {
    const wind = { base: height * 0.35, height: height * 0.65 };
    m = {
      wood: paint({ color: "#4a3a2c", brush: 0.35, brushScale: 2, moss: 0.4, wind: { amp: 0.12, ...wind, flutter: 0 } }),
      leaves: paint({
        map: leafCluster("ivy"),
        // A low cut with alpha-to-coverage: the painted edge of each
        // cluster fades instead of breaking into jagged steps
        alphaTest: 0.12,
        alphaToCoverage: true,
        side: THREE.DoubleSide,
        brush: 0.18,
        brushScale: 0.5,
        wind: { amp: 0.34, ...wind, flutter: 1 },
      }),
    };
    vineMaterials.set(height, m);
  }
  return m;
}

const barkMaterials = new Map<string, THREE.MeshLambertMaterial>();
function barkFor(bark: THREE.ColorRepresentation, height: number) {
  const key = `${bark}-${height}`;
  let m = barkMaterials.get(key);
  if (!m) {
    m = paint({ color: bark, brush: 0.35, brushScale: 2, moss: 0.4, wind: { amp: 0.12, base: height * 0.35, height: height * 0.65, flutter: 0 } });
    barkMaterials.set(key, m);
  }
  return m;
}

// A whole tree: trunk and branches, and its crown of leaf masses
// (vegetation/foliage.ts). `far` trees are built with simpler masses.
export function buildTree(seed: number, kind: TreeKind, { shadows = true, scale = 1, far = false } = {}) {
  const r = rng(seed);
  const { wood, clumps } = grow(r, kind);
  const crown = crownClusters(r, clumps, { satellites: kind.satellites ?? 3, squash: kind.squash ?? 0.85 });
  const group = new THREE.Group();
  group.add(mesh(wood, barkFor(kind.bark ?? "#6b5a48", kind.height), { cast: shadows }));
  group.add(vegMesh(foliageGeometry(r, [crown], { detail: far ? 1 : 2, cards: far ? 0.6 : 1 }), foliageMaterial(kind.palette, kind.height), shadows));
  group.scale.setScalar(scale);
  return group;
}

// The leaf masses of one bush, around its own centre
function bushCrown(r: Rng, size: number) {
  const ends: Clump[] = [];
  const n = Math.round(r.range(2, 4));
  for (let i = 0; i < n; i++) ends.push({ center: v(r.range(-size, size) * 0.6, size * r.range(0.45, 0.7), r.range(-size, size) * 0.6), radius: size * r.range(0.55, 0.8) });
  return crownClusters(r, ends, { satellites: 2, squash: 0.8 });
}

// A low bush of leaves
export function buildBush(seed: number, size: number, palette: "bush" | "maple" = "bush") {
  const r = rng(seed);
  const group = new THREE.Group();
  group.add(vegMesh(foliageGeometry(r, [bushCrown(r, size)]), foliageMaterial(palette, size * 2, 0.14), false));
  return group;
}

// All the bushes of a place at once: the bushes of each palette share one
// mesh, so a park's worth of bushes is a draw or two. Nothing is lost: a
// bush never moves on its own (the wind is in the material).
export function buildBushes(bushes: { seed: number; size: number; palette?: "bush" | "maple"; x: number; z: number }[]) {
  const byPalette = new Map<"bush" | "maple", { crowns: Clump[][]; height: number }>();
  for (const bush of bushes) {
    const palette = bush.palette ?? "bush";
    const crown = bushCrown(rng(bush.seed), bush.size);
    for (const c of crown) c.center.add(v(bush.x, 0, bush.z));
    const entry = byPalette.get(palette) ?? { crowns: [], height: 0 };
    entry.crowns.push(crown);
    entry.height = Math.max(entry.height, bush.size * 2);
    byPalette.set(palette, entry);
  }
  const group = new THREE.Group();
  for (const [palette, entry] of byPalette) {
    group.add(vegMesh(foliageGeometry(rng(entry.crowns.length), entry.crowns), foliageMaterial(palette, entry.height, 0.14), false));
  }
  return group;
}

// Ivy along a path (up a wall, along a fence)
export function buildVine(seed: number, points: THREE.Vector3[], leafSize = 0.35) {
  const r = rng(seed);
  const curve = new THREE.CatmullRomCurve3(points);
  const clumps: Clump[] = [];
  const length = curve.getLength();
  const steps = Math.max(4, Math.round(length / 0.35));
  for (let i = 0; i <= steps; i++) {
    const p = curve.getPointAt(i / steps);
    clumps.push({ center: p.add(v(r.range(-0.08, 0.08), r.range(-0.08, 0.08), r.range(-0.08, 0.08))), radius: leafSize * r.range(0.7, 1.3) });
  }
  const top = Math.max(...points.map((p) => p.y));
  const m = vineMaterialsFor(top + 1);
  const group = new THREE.Group();
  group.add(mesh(tube(points, () => 0.02, steps, 4), m.wood, { cast: false }));
  group.add(mesh(leafCards(r, clumps, 1.4, 1.1), m.leaves, { cast: false }));
  return group;
}

// ---------------------------------------------------------------------
// Grass: tufts of blades, instanced (vegetation/grass.ts). `count` is in
// blades; `far` grass is built with simpler tufts.

export function grass(count: number, place: (r: Rng) => { x: number; z: number; h: number } | null, seed = 7, far = false) {
  return grassField(count, place, seed, far);
}

// Distance from a point to a polyline (for keeping grass off paths)
export function distanceToPath(x: number, z: number, path: [number, number][]) {
  let best = Infinity;
  for (let i = 0; i < path.length - 1; i++) {
    const [ax, az] = path[i];
    const [bx, bz] = path[i + 1];
    const dx = bx - ax;
    const dz = bz - az;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
    best = Math.min(best, Math.hypot(x - (ax + dx * t), z - (az + dz * t)));
  }
  return best;
}

// A paved path: a ribbon along a polyline, textured along its length
export function pathRibbon(points: [number, number][], width: number, y = 0.02) {
  const curve = new THREE.CatmullRomCurve3(points.map(([x, z]) => v(x, y, z)), false, "centripetal");
  const length = curve.getLength();
  const segments = Math.max(4, Math.round(length * 1.5));
  const positions: number[] = [];
  const uvs: number[] = [];
  const index: number[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const p = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t);
    const side = v(-tangent.z, 0, tangent.x).normalize();
    // Edges wander a little, like stones that have shifted
    const wobble = Math.sin(t * length * 1.7) * 0.08;
    for (const s of [-1, 1]) {
      const q = p.clone().add(side.clone().multiplyScalar(s * (width / 2 + wobble * s)));
      positions.push(q.x, y, q.z);
      uvs.push(((s + 1) / 2) * width * 0.35, t * length * 0.35);
    }
  }
  for (let i = 0; i < segments; i++) {
    const a = i * 2;
    index.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(index);
  g.computeVertexNormals();
  return g;
}
