import * as THREE from "three";
import { rng } from "../rng";
import { blob, merge } from "./geometry";
import { shared } from "./materials";
import { FOG_FRAGMENT, surface, WORLD_VARYINGS_VERTEX } from "./surface";
import { envUniforms, materialKey } from "./uniforms";

// Street trees as the plates paint them: soft, rounded masses of green on
// a short trunk, a row along a bank or a street, and at night lit warm from
// below by the lamps and shopfronts. No vegetation system: two canopy
// shapes and a trunk, instanced, so any number of trees is 3 draw calls
// (≈ 260 triangles a tree).
//
// `s` is a tree's size: 1 is about 10 m tall.

// The plates' greens: sage, a deeper green, a warm olive (sRGB)
const GREENS = ["#6f9a4a", "#5c8a40", "#7fa452", "#4f7a3c", "#8aa65a"];
const TRUNK = "#4a3c31";

// The canopy: Lambert, coloured per tree (instanceColor), with the city's
// fog and a warm light from under it after dark (envUniforms.uNight), as
// if from the lamps and shopfronts below
function canopyMaterial() {
  return shared(materialKey("tree", "canopy"), () => {
    const m = new THREE.MeshLambertMaterial({ color: "#ffffff" });
    const uniforms = { uFogScale: { value: 1 }, uUnderGlow: { value: new THREE.Color("#ffb867") } };
    m.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms, { uNight: envUniforms.uNight });
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", "#include <common>\nvarying vec3 vKitWorld;\nvarying vec3 vKitNormal;")
        .replace("#include <project_vertex>", `#include <project_vertex>\n${WORLD_VARYINGS_VERTEX}`);
      shader.fragmentShader = shader.fragmentShader
        .replace("#include <common>", "#include <common>\nvarying vec3 vKitWorld;\nvarying vec3 vKitNormal;\nuniform float uFogScale;\nuniform float uNight;\nuniform vec3 uUnderGlow;")
        .replace(
          "#include <opaque_fragment>",
          `{
  vec3 n = normalize(vKitNormal);
  // lit from below at night: the underside and the lower sides
  float under = smoothstep(0.35, -0.75, n.y);
  outgoingLight += uUnderGlow * diffuseColor.rgb * under * uNight * 0.55;
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

// Two canopy shapes, each a few merged masses so the outline breaks up
// (a broad round one: a body, two side lobes, a lighter crown above; a
// taller one: three masses stacked a little off true); each sits on a
// trunk 0.32 tall (at s = 1)
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

/**
 * Trees at `spots` (each spot's foot, size `s`): three InstancedMeshes
 * (trunks, then the two canopy shapes); every tree differs in shape, turn,
 * lean and green, from `seed`. Their geometries are the caller's to
 * dispose (a scene disposes its meshes' geometry).
 */
export function buildStreetTrees(seed: number, spots: { x: number; z: number; s: number }[]): THREE.InstancedMesh[] {
  const r = rng(seed);
  const trunkGeometry = new THREE.CylinderGeometry(0.022, 0.034, 0.36, 5).translate(0, 0.18, 0);
  const [round, tall] = canopies();
  const kinds = spots.map(() => (r() < 0.35 ? 1 : 0));
  const trunks = new THREE.InstancedMesh(trunkGeometry, surface({ color: TRUNK }), spots.length);
  const crowns = [round, tall].map((g, k) => new THREE.InstancedMesh(g, canopyMaterial(), kinds.filter((x) => x === k).length));
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const c = new THREE.Color();
  const next = [0, 0];
  spots.forEach((p, i) => {
    const turn = r() * Math.PI * 2;
    const lean = (r() - 0.5) * 0.12;
    const s = p.s * (0.9 + r() * 0.2);
    const wide = 0.9 + r() * 0.25;
    trunks.setMatrixAt(i, m.compose(new THREE.Vector3(p.x, 0, p.z), q.setFromEuler(e.set(lean * 0.5, turn, 0)), new THREE.Vector3(s, s, s)));
    const k = kinds[i];
    const mesh = crowns[k];
    const j = next[k]++;
    mesh.setMatrixAt(j, m.compose(new THREE.Vector3(p.x, 0, p.z), q.setFromEuler(e.set(lean, turn, lean * 0.5)), new THREE.Vector3(s * wide, s, s * wide)));
    c.set(r.pick(GREENS)).multiplyScalar(0.9 + r() * 0.2);
    mesh.setColorAt(j, c);
  });
  const all = [trunks, ...crowns].filter((mesh) => mesh.count > 0);
  for (const mesh of all) {
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
    mesh.castShadow = true;
    mesh.receiveShadow = true;
  }
  trunks.name = "trees:trunks";
  crowns.forEach((mesh, k) => (mesh.name = `trees:${k ? "tall" : "round"}`));
  for (const mesh of crowns) if (mesh.count === 0) mesh.geometry.dispose();
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
