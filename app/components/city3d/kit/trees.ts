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
  // a little light caught round the top, as the painted masses have
  outgoingLight *= 1.0 + smoothstep(0.4, 1.0, n.y) * 0.12 * (1.0 - uNight);
}
#include <opaque_fragment>`,
        )
        .replace("#include <fog_fragment>", FOG_FRAGMENT);
    };
    m.customProgramCacheKey = () => materialKey("tree", "canopy");
    return m;
  });
}

// Two canopy shapes: a broad round one of three lumps, and a taller one of
// two; each sits on a trunk 0.32 tall (at s = 1)
function canopies() {
  const r = rng(4242);
  const round = merge([
    blob(r, 0.3, 0.82, 0.18, 1).translate(0, 0.62, 0),
    blob(r, 0.22, 0.85, 0.2, 1).translate(0.2, 0.55, 0.05),
    blob(r, 0.2, 0.85, 0.2, 1).translate(-0.17, 0.57, -0.08),
  ]);
  const tall = merge([blob(r, 0.24, 1.05, 0.18, 1).translate(0, 0.66, 0), blob(r, 0.18, 1, 0.2, 1).translate(0.05, 0.86, 0.03)]);
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
