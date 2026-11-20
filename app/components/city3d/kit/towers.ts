import * as THREE from "three";
import { rng } from "../rng";
import { merge, prism } from "./geometry";
import { windowMaterial, windowVariant, type WindowOptions } from "./windows";

// The bulk of every skyline: plain towers, instanced, their windows drawn
// by the shader (windows.ts), so sixty towers are at most four draw calls
// (one per style) and no texture.
//
// Units are the kit's: one unit is ten metres (the landmarks' 1:10), so a
// floor is 0.36 and a bay 0.3 (kit/uniforms.ts: windowUniforms).
//
// The four styles, from the plates (lujiazui-day/-night, towers-*):
//   0 a glass slab: deep blue curtain wall, wide panes
//   1 a stone office with a setback: warm beige, dark glass
//   2 an octagonal glass shaft
//   3 a stepped tower: three tiers, stone and dark glass
export type TowerSpec = { x: number; z: number; w: number; d: number; h: number; ry: number; style: 0 | 1 | 2 | 3; seed: number };

export const TOWER_STYLES: readonly Omit<WindowOptions, "far">[] = [
  { base: "#3f5a7a", glass: "#6f9cc9" },
  { base: "#cdbb9c", glass: "#33506f" },
  { base: "#7f97b0", glass: "#4a79aa" },
  { base: "#b9a68a", glass: "#2c4664" },
];

// Each style's shape, on a unit footprint (-0.5..0.5) from y 0 to 1; the
// instance's scale is the tower's width, height and depth
function styleGeometry(style: TowerSpec["style"]): THREE.BufferGeometry {
  const Q = Math.PI / 4;
  switch (style) {
    case 1:
      return merge([prism(4, 1, 1, 0, 0.7, Q, 0), prism(4, 0.78, 0.78, 0.7, 1, Q, 4)]);
    case 2:
      return prism(8, 1, 1, 0, 1, Math.PI / 8);
    case 3:
      return merge([prism(4, 1, 1, 0, 0.5, Q, 0), prism(4, 0.8, 0.8, 0.5, 0.8, Q, 4), prism(4, 0.6, 0.6, 0.8, 1, Q, 8)]);
    default:
      return prism(4, 1, 1, 0, 1, Q, 0);
  }
}

/**
 * Towers scattered over an area from a seed: the same seed gives the same
 * towers. Heights lean low (a few tall ones), no two footprints overlap, and
 * none stands within a keep-out circle (a landmark's foot, a sign's line of
 * sight). Returns fewer than `count` if the area is too crowded to fit them.
 */
export function layoutTowers(
  seed: number,
  area: { x0: number; x1: number; z0: number; z1: number },
  count: number,
  height: [number, number],
  keepOut: { x: number; z: number; r: number }[] = [],
): TowerSpec[] {
  const r = rng(seed);
  const out: TowerSpec[] = [];
  const radius = (t: TowerSpec) => 0.5 * Math.hypot(t.w, t.d);
  const [h0, h1] = height;
  for (let attempt = 0; attempt < count * 80 && out.length < count; attempt++) {
    const t = r();
    const h = h0 + (h1 - h0) * t * t;
    const w = r.range(2.4, 4.4) * (0.85 + 0.3 * t);
    const d = w * r.range(0.7, 1.25);
    const x = r.range(Math.min(area.x0 + w / 2, area.x1), Math.max(area.x1 - w / 2, area.x0));
    const z = r.range(Math.min(area.z0 + d / 2, area.z1), Math.max(area.z1 - d / 2, area.z0));
    const ry = (r() - 0.5) * 0.5;
    const pick = r();
    // the tall ones are mostly glass, the low ones mostly stone
    const style = (t > 0.55 ? (pick < 0.45 ? 0 : pick < 0.8 ? 2 : 3) : pick < 0.25 ? 0 : pick < 0.6 ? 1 : pick < 0.75 ? 2 : 3) as TowerSpec["style"];
    const towerSeed = Math.floor(r() * 1_000_000);
    const rad = 0.5 * Math.hypot(w, d);
    if (keepOut.some((k) => Math.hypot(x - k.x, z - k.z) < k.r + rad)) continue;
    if (out.some((o) => Math.hypot(x - o.x, z - o.z) < (rad + radius(o)) * 0.92)) continue;
    out.push({ x, z, w, d, h, ry, style, seed: towerSeed });
  }
  return out;
}

/** A tower's facade: its window material's colours and light (windows.ts), all but `far` and `fogScale` */
export type TowerPalette = Omit<WindowOptions, "far" | "fogScale">;

/**
 * The towers as instanced meshes, one per style used (at most four draw
 * calls), each instance carrying its size (`aSize`, vec3) and seed (`aSeed`)
 * for the window shader. `far`: the averaged windows (windows.ts) and no
 * shadows. `palette` dresses each tower in a facade of its own (by default
 * its style's, TOWER_STYLES): one mesh per style and facade used, so a
 * scene's palettes cost a draw call each per shape, nothing else. The
 * caller owns (and disposes) the geometries; the materials are the kit's
 * shared ones.
 */
export function buildTowers(specs: TowerSpec[], o: { far: boolean; fogScale?: number; palette?: (t: TowerSpec) => TowerPalette }): THREE.InstancedMesh[] {
  const meshes: THREE.InstancedMesh[] = [];
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const p = new THREE.Vector3();
  const s = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  for (const style of [0, 1, 2, 3] as const) {
    // this style's towers, by facade, in the order first met (fixed by the specs)
    const groups = new Map<string, { look: TowerPalette; specs: TowerSpec[] }>();
    for (const t of specs) {
      if (t.style !== style) continue;
      const look = o.palette ? o.palette(t) : TOWER_STYLES[style];
      const key = windowVariant(look);
      if (!groups.has(key)) groups.set(key, { look, specs: [] });
      groups.get(key)!.specs.push(t);
    }
    let k = 0;
    for (const { look, specs: mine } of groups.values()) {
      const geometry = styleGeometry(style);
      const size = new Float32Array(mine.length * 3);
      const seeds = new Float32Array(mine.length);
      const material = windowMaterial({ ...look, far: o.far, fogScale: o.fogScale });
      const mesh = new THREE.InstancedMesh(geometry, material, mine.length);
      mine.forEach((t, i) => {
        m.compose(p.set(t.x, 0, t.z), q.setFromAxisAngle(up, t.ry), s.set(t.w, t.h, t.d));
        mesh.setMatrixAt(i, m);
        size.set([t.w, t.h, t.d], i * 3);
        seeds[i] = t.seed;
      });
      geometry.setAttribute("aSize", new THREE.InstancedBufferAttribute(size, 3));
      geometry.setAttribute("aSeed", new THREE.InstancedBufferAttribute(seeds, 1));
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingBox();
      mesh.computeBoundingSphere();
      mesh.castShadow = !o.far;
      mesh.receiveShadow = !o.far;
      mesh.name = `towers:${style}${o.far ? ":far" : ""}${k ? `:${k}` : ""}`;
      meshes.push(mesh);
      k++;
    }
  }
  return meshes;
}
