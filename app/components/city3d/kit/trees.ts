import * as THREE from "three";
import { rng } from "../rng";
import { blob, merge } from "./geometry";
import { shared } from "./materials";
import { FOG_FRAGMENT, surface, WORLD_VARYINGS_VERTEX } from "./surface";
import { envUniforms, materialKey } from "./uniforms";

// Street trees as the plates paint them: soft, rounded masses of green on
// a short trunk, a row along a bank or a street, and at night lit warm from
// below by the lamps and shopfronts. No vegetation system: a few canopy
// shapes and a trunk, instanced, so any number of round and tall trees is
// 3 draw calls (≈ 260 triangles a tree; a plane tree ≈ 420, a leafy clump
// ≈ 280).
//
// `s` is a tree's size: 1 is about 10 m tall.

// The plates' greens: sage, a deeper green, a warm olive (sRGB)
const GREENS = ["#6f9a4a", "#5c8a40", "#7fa452", "#4f7a3c", "#8aa65a"];
const TRUNK = "#4a3c31";
// a plane tree's pale mottled bark
const PLANE_BARK = "#8a7e6c";

// The canopy: Lambert, coloured per tree (instanceColor), with the city's
// fog and a warm light from under it after dark (envUniforms.uNight), as
// if from the lamps and shopfronts below. Per material, as uniforms (one
// program, "tree:canopy", whatever the options):
// - `underGlow`: that light's tone and strength (#ffb867 × 0.55 by default)
// - `leaves` (0 by default .. 1): the masses broken into leaf clusters, a
//   light tip and a dark gap each, in world space (about 0.4 m), fading
//   out where they'd be finer than a pixel: a leafier tree, no triangles
export type CanopyOptions = { underGlow?: { tone: string; strength: number }; leaves?: number };
function canopyMaterial(o: CanopyOptions = {}) {
  const tone = o.underGlow?.tone ?? "#ffb867";
  const strength = o.underGlow?.strength ?? 0.55;
  const leaves = o.leaves ?? 0;
  const variant = tone === "#ffb867" && strength === 0.55 && leaves === 0 ? "canopy" : `canopy:${tone}:${strength}:${leaves}`;
  return shared(materialKey("tree", variant), () => {
    const m = new THREE.MeshLambertMaterial({ color: "#ffffff" });
    const uniforms = { uFogScale: { value: 1 }, uUnderGlow: { value: new THREE.Color(tone) }, uUnderStrength: { value: strength }, uLeaves: { value: leaves } };
    m.userData.canopy = uniforms;
    m.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms, { uNight: envUniforms.uNight });
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", "#include <common>\nvarying vec3 vKitWorld;\nvarying vec3 vKitNormal;")
        .replace("#include <project_vertex>", `#include <project_vertex>\n${WORLD_VARYINGS_VERTEX}`);
      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          "#include <common>\nvarying vec3 vKitWorld;\nvarying vec3 vKitNormal;\nuniform float uFogScale;\nuniform float uNight;\nuniform vec3 uUnderGlow;\nuniform float uUnderStrength;\nuniform float uLeaves;\nfloat leafHash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }",
        )
        .replace(
          "#include <color_fragment>",
          `#include <color_fragment>
float kitLeaf = 0.0;
if (uLeaves > 0.0) {
  // leaf clusters: cells about 0.04 across, each a lit dome round a seeded
  // point, darker between
  vec3 q = vKitWorld / 0.04;
  vec3 i = floor(q);
  vec3 f = fract(q);
  float best = 9.0;
  for (int k = 0; k < 8; k++) {
    vec3 o = vec3(float(k & 1), float((k >> 1) & 1), float((k >> 2) & 1));
    vec3 c = o + vec3(leafHash(i + o), leafHash(i + o + 17.0), leafHash(i + o + 31.0)) * 0.8 - 0.4;
    best = min(best, length(f - c));
  }
  float fade = 1.0 - smoothstep(0.25, 0.8, length(fwidth(q)));
  kitLeaf = (smoothstep(0.8, 0.15, best) - 0.5) * uLeaves * fade;
  diffuseColor.rgb *= 1.0 + kitLeaf * 0.4;
}`,
        )
        .replace(
          "#include <opaque_fragment>",
          `{
  vec3 n = normalize(vKitNormal);
  // lit from below at night: the underside and the lower sides
  float under = smoothstep(0.35, -0.75, n.y);
  outgoingLight += uUnderGlow * diffuseColor.rgb * under * uNight * uUnderStrength * (1.0 + max(kitLeaf, 0.0));
  // the painted masses: light caught round the top (a little warmer), the
  // underside in their own shade
  float top = smoothstep(0.25, 1.0, n.y);
  outgoingLight *= (1.0 + top * 0.3 * (1.0 - uNight)) * (1.0 - smoothstep(-0.1, -0.85, n.y) * 0.2 * (1.0 - uNight));
  outgoingLight += vec3(0.05, 0.05, 0.0) * top * diffuseColor.rgb * (1.0 - uNight);
}
#include <opaque_fragment>`,
        )
        .replace("#include <fog_fragment>", FOG_FRAGMENT);
    };
    m.customProgramCacheKey = () => materialKey("tree", "canopy");
    return m;
  });
}

// The canopy shapes, each a few merged masses so the outline breaks up
// - round: a body, two side lobes, a lighter crown above
// - tall: three masses stacked a little off true
// - plane: a plane tree's open crown, high on its trunk: six masses spread
//   wide with sky between them
// - leafy: a low clump of upright leafy masses from near the ground (a
//   potted plant, bamboo), no trunk showing
// each (but leafy) sits on a trunk 0.32 tall (at s = 1); plane on its own
// taller trunk with three branches
function canopies() {
  const r = rng(4242);
  const round = merge([
    blob(r, 0.28, 0.8, 0.2, 1).translate(0, 0.6, 0),
    blob(r, 0.2, 0.82, 0.24, 1).translate(0.22, 0.53, 0.06),
    blob(r, 0.19, 0.82, 0.24, 1).translate(-0.2, 0.55, -0.09),
    blob(r, 0.16, 0.85, 0.22, 1).translate(0.04, 0.8, -0.03),
  ]);
  const tall = merge([
    blob(r, 0.22, 1.0, 0.2, 1).translate(0, 0.6, 0),
    blob(r, 0.18, 1.0, 0.22, 1).translate(0.07, 0.8, 0.04),
    blob(r, 0.13, 1.0, 0.24, 1).translate(-0.04, 0.96, -0.02),
  ]);
  return [round, tall];
}
function planeParts() {
  const r = rng(5151);
  const crown = merge([
    blob(r, 0.2, 0.7, 0.26, 1).translate(0, 0.86, 0),
    blob(r, 0.17, 0.72, 0.28, 1).translate(0.3, 0.76, 0.1),
    blob(r, 0.16, 0.72, 0.28, 1).translate(-0.29, 0.78, -0.08),
    blob(r, 0.15, 0.75, 0.28, 1).translate(0.1, 0.74, -0.3),
    blob(r, 0.14, 0.75, 0.28, 1).translate(-0.12, 0.72, 0.29),
    blob(r, 0.13, 0.8, 0.25, 1).translate(0.16, 1.02, 0.08),
  ]);
  const branch = (x: number, z: number, y0: number, y1: number) => {
    const dir = new THREE.Vector3(x, y1 - y0, z);
    const g = new THREE.CylinderGeometry(0.012, 0.02, dir.length(), 5).translate(0, dir.length() / 2, 0);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize()));
    return g.translate(0, y0, 0);
  };
  const trunk = merge([
    new THREE.CylinderGeometry(0.026, 0.042, 0.58, 6).translate(0, 0.29, 0),
    branch(0.26, 0.08, 0.52, 0.76),
    branch(-0.25, -0.07, 0.5, 0.76),
    branch(0.06, -0.26, 0.54, 0.72),
  ]);
  return { crown, trunk };
}
function leafyClump() {
  const r = rng(6262);
  return merge([
    blob(r, 0.14, 1.5, 0.3, 1).translate(0, 0.22, 0),
    blob(r, 0.11, 1.6, 0.32, 1).translate(0.1, 0.3, 0.05),
    blob(r, 0.11, 1.6, 0.32, 1).translate(-0.09, 0.27, -0.06),
    blob(r, 0.09, 1.7, 0.3, 1).translate(0.02, 0.44, -0.02),
  ]);
}

export type TreeKind = "round" | "tall" | "plane" | "leafy";
const KIND_INDEX: Record<TreeKind, number> = { round: 0, tall: 1, plane: 2, leafy: 3 };

/**
 * Trees at `spots` (each spot's foot, size `s`): InstancedMeshes, trunks
 * first, then a canopy mesh per shape used; every tree differs in shape,
 * turn, lean and green, from `seed`. A spot's `kind` picks its shape;
 * left out, the seed picks round or tall (as before kinds existed, the
 * same trees from the same seed). Round and tall share one trunk mesh,
 * plane has its own (with branches), leafy none: three draw calls for
 * round and tall, two more for plane, one for leafy.
 * - `greens`: the canopies' colours (sRGB; the plates' sage greens by default)
 * - `underGlow`, `leaves`: the canopy's own (canopyMaterial, above)
 * Their geometries are the caller's to dispose (a scene disposes its
 * meshes' geometry).
 */
export function buildStreetTrees(seed: number, spots: { x: number; z: number; s: number; kind?: TreeKind }[], o: { greens?: readonly string[] } & CanopyOptions = {}): THREE.InstancedMesh[] {
  const r = rng(seed);
  const greens = o.greens && o.greens.length ? o.greens : GREENS;
  const trunkGeometry = new THREE.CylinderGeometry(0.022, 0.034, 0.36, 5).translate(0, 0.18, 0);
  const [round, tall] = canopies();
  const usePlane = spots.some((p) => p.kind === "plane");
  const useLeafy = spots.some((p) => p.kind === "leafy");
  const plane = usePlane ? planeParts() : null;
  const leafy = useLeafy ? leafyClump() : null;
  // the seed's pick is drawn for every spot, kind or not, so a spot's own
  // kind never changes the trees around it
  const kinds = spots.map((p) => {
    const picked = r() < 0.35 ? 1 : 0;
    return p.kind ? KIND_INDEX[p.kind] : picked;
  });
  const count = (k: number) => kinds.filter((x) => x === k).length;
  const canopy = canopyMaterial(o);
  const trunks = new THREE.InstancedMesh(trunkGeometry, surface({ color: TRUNK }), count(0) + count(1));
  const planeTrunks = plane ? new THREE.InstancedMesh(plane.trunk, surface({ color: PLANE_BARK }), count(2)) : null;
  const shapes = [round, tall, plane?.crown ?? null, leafy];
  const crowns = shapes.map((g, k) => (g ? new THREE.InstancedMesh(g, canopy, count(k)) : null));
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const c = new THREE.Color();
  const next = [0, 0, 0, 0];
  let nt = 0;
  let np = 0;
  spots.forEach((p, i) => {
    const turn = r() * Math.PI * 2;
    const lean = (r() - 0.5) * 0.12;
    const s = p.s * (0.9 + r() * 0.2);
    const wide = 0.9 + r() * 0.25;
    const k = kinds[i];
    const trunkAt = m.compose(new THREE.Vector3(p.x, 0, p.z), q.setFromEuler(e.set(lean * 0.5, turn, 0)), new THREE.Vector3(s, s, s));
    if (k < 2) trunks.setMatrixAt(nt++, trunkAt);
    else if (k === 2) planeTrunks!.setMatrixAt(np++, trunkAt);
    const mesh = crowns[k]!;
    const j = next[k]++;
    mesh.setMatrixAt(j, m.compose(new THREE.Vector3(p.x, 0, p.z), q.setFromEuler(e.set(lean, turn, lean * 0.5)), new THREE.Vector3(s * wide, s, s * wide)));
    c.set(r.pick(greens)).multiplyScalar(0.9 + r() * 0.2);
    mesh.setColorAt(j, c);
  });
  const built: THREE.InstancedMesh[] = [trunks];
  if (planeTrunks) built.push(planeTrunks);
  for (const mesh of crowns) if (mesh) built.push(mesh);
  const all = built.filter((mesh) => mesh.count > 0);
  for (const mesh of all) {
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
    mesh.castShadow = true;
    mesh.receiveShadow = true;
  }
  trunks.name = "trees:trunks";
  if (planeTrunks) planeTrunks.name = "trees:plane-trunks";
  const NAMES = ["round", "tall", "plane", "leafy"];
  crowns.forEach((mesh, k) => mesh && (mesh.name = `trees:${NAMES[k]}`));
  for (const mesh of built) if (mesh.count === 0) mesh.geometry.dispose();
  return all;
}

// Planters as four of the plates paint them: a low stone box, a shrub
// in it and a scatter of flowers. `spots` give each one's middle (foot at
// y, 0 by default), size w × d (world units; 0.12 is 1.2 m), the box's
// height h (0.045 by default) and turn.
// Three draw calls whatever the count (boxes, shrubs, flowers),
// about 400 triangles a planter. Geometry is the caller's to
// dispose (its meshes'); materials the kit's.
const FLOWERS = ["#f2a7b8", "#f6e3a1", "#f4f1ea", "#e07a8a", "#c9a7e8"];
export function buildPlanters(seed: number, spots: { x: number; z: number; w: number; d: number; h?: number; y?: number; ry?: number }[], o: { stone?: string } = {}): THREE.InstancedMesh[] {
  const r = rng(seed);
  const boxGeometry = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
  const shrubGeometry = blob(rng(seed + 1), 0.5, 0.6, 0.25, 1);
  const flowerGeometry = new THREE.IcosahedronGeometry(0.012, 0);
  const boxes = new THREE.InstancedMesh(boxGeometry, surface({ color: o.stone ?? "#9a958c", grime: 0.4 }), spots.length);
  const shrubs = new THREE.InstancedMesh(shrubGeometry, canopyMaterial(), spots.length);
  const per = 10;
  const flowers = new THREE.InstancedMesh(flowerGeometry, canopyMaterial(), spots.length * per);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const c = new THREE.Color();
  const v = new THREE.Vector3();
  spots.forEach((p, i) => {
    const y = p.y ?? 0;
    const ry = p.ry ?? 0;
    const H = p.h ?? 0.045;
    q.setFromEuler(e.set(0, ry, 0));
    boxes.setMatrixAt(i, m.compose(v.set(p.x, y, p.z), q, new THREE.Vector3(p.w, H, p.d)));
    shrubs.setMatrixAt(i, m.compose(v.set(p.x, y + H + 0.012, p.z), q, new THREE.Vector3(p.w * 0.85, Math.min(p.w, p.d) * 0.9, p.d * 0.85)));
    shrubs.setColorAt(i, c.set(r.pick(GREENS)).multiplyScalar(0.85 + r() * 0.2));
    for (let k = 0; k < per; k++) {
      const a = r() * Math.PI * 2;
      const rad = 0.3 + r() * 0.15;
      const lx = Math.cos(a) * rad * p.w;
      const lz = Math.sin(a) * rad * p.d;
      const wx = p.x + lx * Math.cos(ry) + lz * Math.sin(ry);
      const wz = p.z - lx * Math.sin(ry) + lz * Math.cos(ry);
      const s = 0.8 + r() * 0.6;
      flowers.setMatrixAt(i * per + k, m.compose(v.set(wx, y + H + 0.01 + r() * Math.min(p.w, p.d) * 0.35, wz), q, new THREE.Vector3(s, s, s)));
      flowers.setColorAt(i * per + k, c.set(r.pick(FLOWERS)));
    }
  });
  const all = [boxes, shrubs, flowers];
  for (const mesh of all) {
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
    mesh.receiveShadow = true;
  }
  boxes.name = "planters:boxes";
  shrubs.name = "planters:shrubs";
  flowers.name = "planters:flowers";
  return all;
}
