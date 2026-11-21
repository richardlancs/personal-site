import * as THREE from "three";
import { rng } from "../rng";
import { merge, outline, prism, shaft } from "./geometry";
import { neonMaterial, SCENE_TONES } from "./neon";
import { windowMaterial, windowVariant, type WindowOptions } from "./windows";

// The bulk of every skyline: towers, instanced, their windows drawn by the
// shader (windows.ts), so sixty towers are at most four draw calls (one per
// style) and no texture; with forms (below), one more per form used, and
// one for the beacons.
//
// Units are the kit's: one unit is ten metres (the landmarks' 1:10), so a
// floor is 0.36 and a bay 0.3 (kit/uniforms.ts: windowUniforms).
//
// The four styles, from the plates (lujiazui-day/-night, towers-*):
//   0 a glass slab: deep blue curtain wall, wide panes
//   1 a stone office with a setback: warm beige, dark glass
//   2 an octagonal glass shaft
//   3 a stepped tower: three tiers, stone and dark glass
//
// A tower's `form` (optional; left out, its style's shape) gives it a
// silhouette of its own, from the plates' skylines, whatever its facade:
//   setback  three tiers stepping in, plant on the roof
//   taper    six tiers, each a little narrower, corners cut
//   twist    ten tiers each turned a little further, corners cut
//   rounded  rounded corners, a crown stepping in
//   chamfer  corners cut deep, a set-back top and a mast (a beacon on it)
//   crown    a plain shaft under a tall pointed crown
//   spire    setbacks to a slender spire (a beacon on it)
//   podium   a broad low podium and a rounded shaft on it, plant on top
// Windows follow every storey of every tier (floors count from the foot);
// crowns, spires, masts and plant have none.
export type TowerForm = "setback" | "taper" | "twist" | "rounded" | "chamfer" | "crown" | "spire" | "podium";
export const TOWER_FORMS: readonly TowerForm[] = ["setback", "taper", "twist", "rounded", "chamfer", "crown", "spire", "podium"];
export type TowerSpec = { x: number; z: number; w: number; d: number; h: number; ry: number; style: 0 | 1 | 2 | 3; seed: number; form?: TowerForm };

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

// Each form's shape on the unit footprint, y 0..1, and where its beacon
// sits (forms with a mast or spire), as a fraction of the height
const BEACON: Partial<Record<TowerForm, number>> = { chamfer: 1, spire: 1 };
function formGeometry(form: TowerForm): THREE.BufferGeometry {
  const sq = (s: number, o: Parameters<typeof outline>[1] = {}) => outline(s, o);
  const plant = (y: number, s: number) => [shaft(sq(s * 0.4), y, y + 0.025, 0, { windows: false }), shaft(sq(s * 0.18), y, y + 0.04, 0, { windows: false })];
  switch (form) {
    case "setback":
      return merge([shaft(sq(1), 0, 0.55, 0), shaft(sq(0.82), 0.55, 0.8, 4), shaft(sq(0.64), 0.8, 0.95, 8), ...plant(0.95, 0.64)]);
    case "taper":
      return merge([...Array.from({ length: 6 }, (_, i) => shaft(sq(1 - 0.075 * i, { cut: 0.12 }), i / 6.4, (i + 1) / 6.4, i * 8)), shaft(sq(0.5, { cut: 0.08 }), 6 / 6.4, 1, 0, { windows: false, top: 0.6 })]);
    case "twist":
      return merge(Array.from({ length: 10 }, (_, i) => shaft(sq(1 - 0.025 * i, { cut: 0.1, turn: i * 0.075 }), i / 10, (i + 1) / 10, i * 8)));
    case "rounded":
      return merge([shaft(sq(1, { round: 0.24, seg: 3 }), 0, 0.88, 0), shaft(sq(0.86, { round: 0.2, seg: 3 }), 0.88, 0.95, 16), shaft(sq(0.86, { round: 0.2, seg: 3 }), 0.95, 1, 0, { windows: false, top: 0.75 })]);
    case "chamfer":
      return merge([shaft(sq(1, { cut: 0.26 }), 0, 0.82, 0), shaft(sq(0.72, { cut: 0.18 }), 0.82, 0.9, 8), shaft(sq(0.08), 0.9, 1, 0, { windows: false, top: 0.5 })]);
    case "crown":
      return merge([shaft(sq(1), 0, 0.8, 0), shaft(sq(1.04), 0.8, 0.82, 0, { windows: false }), shaft(sq(0.96), 0.82, 1, 0, { windows: false, top: 0.04 })]);
    case "spire":
      return merge([shaft(sq(1, { cut: 0.1 }), 0, 0.55, 0), shaft(sq(0.76, { cut: 0.08 }), 0.55, 0.7, 8), shaft(sq(0.52, { cut: 0.06 }), 0.7, 0.8, 16), shaft(sq(0.12, { cut: 0.03 }), 0.8, 1, 0, { windows: false, top: 0.08 })]);
    case "podium":
      return merge([shaft(sq(1), 0, 0.12, 0), shaft(sq(0.68, { round: 0.12, seg: 2 }), 0.12, 0.97, 4), ...plant(0.97, 0.68)]);
  }
}

/**
 * Forms for towers laid out without them (a copy of `specs`, the same
 * places and sizes): from `seed` alone, so the layout never moves. The
 * three tallest get the hero forms, a spire, a twist and a crown; the
 * rest take a form by group (`group(t)`, by default the tower's style):
 * every tower of a group the same form, so the forms cost no draw calls
 * beyond the groups' own (buildTowers makes a mesh per form and facade:
 * group by facade). `keep(t)`: towers that stay as they are (say, ones
 * carrying a lit crown or a screen fitted to a box). `forms`: the forms
 * to choose from (all by default).
 */
export function withForms(specs: TowerSpec[], seed: number, o: { keep?: (t: TowerSpec) => boolean; group?: (t: TowerSpec) => unknown; forms?: readonly TowerForm[] } = {}): TowerSpec[] {
  const keep = o.keep ?? (() => false);
  const group = o.group ?? ((t: TowerSpec) => t.style);
  const pool = o.forms && o.forms.length ? o.forms : TOWER_FORMS;
  const heroes = specs
    .filter((t) => !keep(t))
    .sort((a, b) => b.h - a.h)
    .slice(0, 3);
  const HERO: TowerForm[] = ["spire", "twist", "crown"];
  // each group's form, in the order the groups are first met, from the seed
  const r = rng(seed);
  const chosen = new Map<unknown, TowerForm>();
  return specs.map((t) => {
    if (keep(t)) return t;
    const hero = heroes.indexOf(t);
    if (hero >= 0) return { ...t, form: HERO[hero] };
    const g = group(t);
    if (!chosen.has(g)) chosen.set(g, pool[Math.floor(r() * pool.length)]);
    return { ...t, form: chosen.get(g)! };
  });
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
  // one instanced mesh per group of towers sharing a shape and a facade:
  // a style's own shape (by style), or a form (whatever the style)
  const groups = new Map<string, { look: TowerPalette; style: TowerSpec["style"]; form?: TowerForm; specs: TowerSpec[] }>();
  for (const style of [0, 1, 2, 3] as const)
    for (const t of specs) {
      if (t.style !== style) continue;
      const look = o.palette ? o.palette(t) : TOWER_STYLES[style];
      const key = `${t.form ?? style}|${windowVariant(look)}`;
      if (!groups.has(key)) groups.set(key, { look, style, form: t.form, specs: [] });
      groups.get(key)!.specs.push(t);
    }
  const count = new Map<string, number>();
  for (const { look, style, form, specs: mine } of groups.values()) {
    const geometry = form ? formGeometry(form) : styleGeometry(style);
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
    // towers:<style>[:far][:k] for a style's shape, towers:<form>[:far][:k] for a form
    const base = `towers:${form ?? style}${o.far ? ":far" : ""}`;
    const k = count.get(base) ?? 0;
    count.set(base, k + 1);
    mesh.name = `${base}${k ? `:${k}` : ""}`;
    meshes.push(mesh);
  }
  // the beacons on the masts and spires: a small steady light each, rose,
  // all in one instanced mesh (never blinking: nothing moves by itself)
  const tips = specs.filter((t) => t.form && BEACON[t.form] !== undefined);
  if (tips.length) {
    const geometry = new THREE.OctahedronGeometry(1, 0);
    const mesh = new THREE.InstancedMesh(geometry, neonMaterial(`#${new THREE.Color(SCENE_TONES.rose).multiplyScalar(0.6).getHexString()}`, { dayColor: "#c9c2c4" }), tips.length);
    tips.forEach((t, i) => {
      const r = Math.max(0.12, t.w * 0.03);
      mesh.setMatrixAt(i, m.compose(p.set(t.x, t.h * BEACON[t.form!]! + r * 0.5, t.z), q.identity(), s.set(r, r, r)));
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    mesh.name = `towers:beacons${o.far ? ":far" : ""}`;
    meshes.push(mesh);
  }
  return meshes;
}
