import * as THREE from "three";
import { mergeGeometries, mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import { mesh, paint } from "./paint";
import { rng, type Rng } from "./rng";
import { leafCluster, type Palette } from "./textures";

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
  palette: Palette;
  height: number;
  trunk: number; // radius at the base
  spread: number; // how far branches reach out
  levels: number;
  clump: number; // size of the leaf masses
  bark?: THREE.ColorRepresentation;
  inner?: THREE.ColorRepresentation; // the shaded mass inside the leaves
  density?: number;
};

export const treeKinds = {
  zelkova: { palette: "green", height: 9, trunk: 0.38, spread: 4.5, levels: 3, clump: 1.7, bark: "#6b5a48", inner: "#4a6430" },
  ginkgo: { palette: "ginkgo", height: 8, trunk: 0.3, spread: 2.8, levels: 3, clump: 1.4, bark: "#6e5e4c", inner: "#a88a34" },
  maple: { palette: "maple", height: 6, trunk: 0.25, spread: 3.2, levels: 3, clump: 1.3, bark: "#5e4a3c", inner: "#9a4a24" },
  pine: { palette: "bush", height: 10, trunk: 0.32, spread: 3.6, levels: 2, clump: 1.6, bark: "#5a4636", inner: "#2f4224", density: 1.2 },
} satisfies Record<string, TreeKind>;

type Clump = { center: THREE.Vector3; radius: number };

function grow(r: Rng, kind: TreeKind) {
  const wood: THREE.BufferGeometry[] = [];
  const clumps: Clump[] = [];
  const trunkTop = kind.height * r.range(0.42, 0.52);
  const lean = v(r.range(-0.4, 0.4), 0, r.range(-0.4, 0.4));
  const trunkPts = [v(0, -0.2, 0), v(lean.x * 0.2, trunkTop * 0.4, lean.z * 0.2), v(lean.x * 0.6, trunkTop * 0.8, lean.z * 0.6), v(lean.x, trunkTop, lean.z)];
  // Roots flare at the bottom
  wood.push(tube(trunkPts, (t) => kind.trunk * (1 - t * 0.45) * (1 + Math.max(0, 0.18 - t) * 4), 10, 8));

  const branch = (start: THREE.Vector3, dir: THREE.Vector3, length: number, radius: number, depth: number) => {
    const end = start.clone().add(dir.clone().multiplyScalar(length));
    // Branches bend back toward the light
    end.y += length * 0.15 * (depth + 1);
    const mid = start.clone().lerp(end, 0.5).add(v(r.range(-0.3, 0.3), r.range(0, 0.4), r.range(-0.3, 0.3)).multiplyScalar(length * 0.3));
    wood.push(tube([start, mid, end], (t) => radius * (1 - t * 0.6), 6, 5));
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
export function leafCards(r: Rng, clumps: Clump[], density = 1, size = 1) {
  const parts: THREE.BufferGeometry[] = [];
  for (const { center, radius } of clumps) {
    const count = Math.round(radius * radius * 9 * density) + 4;
    for (let i = 0; i < count; i++) {
      const dir = v(r() - 0.5, (r() - 0.35) * 0.9, r() - 0.5).normalize();
      const p = center.clone().add(dir.clone().multiplyScalar(radius * r.range(0.55, 1.0)));
      const s = radius * r.range(0.7, 1.05) * size;
      const plane = new THREE.PlaneGeometry(s, s);
      // Face mostly outward, turned a little at random
      const look = dir.clone().add(v(r() - 0.5, r() - 0.5, r() - 0.5).multiplyScalar(0.9)).normalize();
      plane.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(v(0, 0, 1), look));
      plane.translate(p.x, p.y, p.z);
      // Outward normals, leaning up toward the sky light
      const n = plane.attributes.normal as THREE.BufferAttribute;
      const pos = plane.attributes.position as THREE.BufferAttribute;
      for (let k = 0; k < n.count; k++) {
        const out = v(pos.getX(k), pos.getY(k), pos.getZ(k)).sub(center).normalize().add(v(0, 0.35, 0)).normalize();
        n.setXYZ(k, out.x, out.y, out.z);
      }
      parts.push(plane);
    }
  }
  return merge(parts);
}

const treeMaterials = new Map<string, { wood: THREE.MeshLambertMaterial; inner: THREE.MeshLambertMaterial; leaves: THREE.MeshLambertMaterial }>();

function materialsFor(kind: TreeKind, height: number) {
  const key = `${kind.palette}-${kind.bark}-${kind.inner}-${height}`;
  let m = treeMaterials.get(key);
  if (!m) {
    const wind = { base: height * 0.35, height: height * 0.65 };
    m = {
      wood: paint({ color: kind.bark ?? "#6b5a48", brush: 0.35, brushScale: 2, moss: 0.4, wind: { amp: 0.12, ...wind, flutter: 0 } }),
      inner: paint({ color: kind.inner ?? "#3e5228", brush: 0.3, brushScale: 0.7, wind: { amp: 0.32, ...wind, flutter: 0 } }),
      leaves: paint({
        map: leafCluster(kind.palette),
        alphaTest: 0.45,
        side: THREE.DoubleSide,
        brush: 0.18,
        brushScale: 0.5,
        wind: { amp: 0.34, ...wind, flutter: 1 },
      }),
    };
    treeMaterials.set(key, m);
  }
  return m;
}

// A whole tree: trunk and branches, a dark mass inside the crown so it
// never looks hollow, and leaf cards around it
export function buildTree(seed: number, kind: TreeKind, { shadows = true, scale = 1 } = {}) {
  const r = rng(seed);
  const { wood, clumps } = grow(r, kind);
  const m = materialsFor(kind, kind.height);
  const group = new THREE.Group();
  group.add(mesh(wood, m.wood, { cast: shadows }));
  const inner = merge(clumps.map((c) => blob(r, c.radius * 0.52, 0.8, 0.4, 2).translate(c.center.x, c.center.y, c.center.z)));
  group.add(mesh(inner, m.inner, { cast: shadows }));
  group.add(mesh(leafCards(r, clumps, (kind.density ?? 1) * 1.35, 1.15), m.leaves, { cast: shadows }));
  group.scale.setScalar(scale);
  return group;
}

// A low bush of leaves
export function buildBush(seed: number, size: number, palette: Palette = "bush", inner: THREE.ColorRepresentation = "#3b4d26") {
  const r = rng(seed);
  const clumps: Clump[] = [];
  const n = Math.round(r.range(2, 4));
  for (let i = 0; i < n; i++) clumps.push({ center: v(r.range(-size, size) * 0.6, size * r.range(0.45, 0.7), r.range(-size, size) * 0.6), radius: size * r.range(0.55, 0.8) });
  const m = materialsFor({ palette, height: size * 2, trunk: 0, spread: 0, levels: 0, clump: 0, bark: "#000", inner }, size * 2);
  const group = new THREE.Group();
  group.add(mesh(merge(clumps.map((c) => blob(r, c.radius * 0.62, 0.75, 0.25, 2).translate(c.center.x, c.center.y, c.center.z))), m.inner));
  group.add(mesh(leafCards(r, clumps, 1.5, 1.15), m.leaves));
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
  const m = materialsFor({ palette: "ivy", height: top + 1, trunk: 0, spread: 0, levels: 0, clump: 0, bark: "#4a3a2c", inner: "#2e4220" }, top + 1);
  const group = new THREE.Group();
  group.add(mesh(tube(points, () => 0.02, steps, 4), m.wood, { cast: false }));
  group.add(mesh(leafCards(r, clumps, 1.4, 1.1), m.leaves, { cast: false }));
  return group;
}

// ---------------------------------------------------------------------
// Grass: one blade, instanced thousands of times

export function bladeGeometry() {
  const g = new THREE.PlaneGeometry(0.045, 1, 1, 4);
  g.translate(0, 0.5, 0);
  const p = g.attributes.position as THREE.BufferAttribute;
  const colors: number[] = [];
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    // Taper to a point and lean forward
    p.setX(i, p.getX(i) * (1 - y * 0.85));
    p.setZ(i, y * y * 0.18);
    const c = new THREE.Color().setHSL(0.2 - y * 0.03, 0.42, 0.24 + y * 0.36);
    colors.push(c.r, c.g, c.b);
  }
  g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  g.computeVertexNormals();
  // Grass is lit from above, whatever way the blade faces
  const n = g.attributes.normal as THREE.BufferAttribute;
  for (let i = 0; i < n.count; i++) n.setXYZ(i, 0, 1, 0.2);
  return g;
}

export function grass(
  count: number,
  place: (r: Rng) => { x: number; z: number; h: number } | null,
  seed = 7,
  hues: [number, number] = [0.15, 0.26],
) {
  const r = rng(seed);
  const material = paint({ vertexColors: true, side: THREE.DoubleSide, brush: 0.25, brushScale: 0.4, wind: { amp: 0.32, base: 0, height: 1, flutter: 1 } });
  const blades = new THREE.InstancedMesh(bladeGeometry(), material, count);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const color = new THREE.Color();
  let n = 0;
  let tries = 0;
  while (n < count && tries < count * 6) {
    tries++;
    const spot = place(r);
    if (!spot) continue;
    q.setFromEuler(new THREE.Euler(r.range(-0.15, 0.15), r() * Math.PI * 2, r.range(-0.15, 0.15)));
    m.compose(v(spot.x, 0, spot.z), q, v(r.range(0.7, 1.3), spot.h * r.range(0.55, 1.0), 1));
    blades.setMatrixAt(n, m);
    color.setHSL(r.range(hues[0], hues[1]), r.range(0.35, 0.6), r.range(0.75, 1.1));
    blades.setColorAt(n, color);
    n++;
  }
  blades.count = n;
  blades.receiveShadow = true;
  blades.castShadow = false;
  blades.frustumCulled = false;
  return blades;
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
