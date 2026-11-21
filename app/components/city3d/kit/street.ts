import * as THREE from "three";
import { box, merge } from "./geometry";
import { shared } from "./materials";
import { surface } from "./surface";
import { envUniforms, materialKey } from "./uniforms";

// Street furniture: lamps, railings, the viaduct; and `glowMaterial`, the
// kit's plain lit-at-night surface (lamp heads, a train's or a boat's
// windows). One unit is ten metres.
//
// No light is made here (or anywhere in the kit): a scene's lights are
// common.tsx's SceneLights. A lamp built with `light: "spot"` is one of
// those spots: its `head` is where the scene puts it, and it gets no pool
// of its own on the ground (the spot lights the ground). A lamp with
// `light: "none"` fakes its light with a soft warm pool on the ground,
// additive, × the night.

// ---------------------------------------------------------------------
// Lit at night

/**
 * Unlit, its colour `day` by day and `night` at night (envUniforms.uNight);
 * kept under 1.0 so it never blooms. One program for every pair of colours.
 */
export function glowMaterial(o: { day: string; night: string }): THREE.MeshBasicMaterial {
  return shared(materialKey("glow", `${o.day}|${o.night}`), () => {
    const m = new THREE.MeshBasicMaterial({ color: o.day });
    const uniforms = { uDayTone: { value: new THREE.Color(o.day) }, uNightTone: { value: new THREE.Color(o.night) } };
    m.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms, { uNight: envUniforms.uNight });
      shader.fragmentShader = shader.fragmentShader
        .replace("#include <common>", "#include <common>\nuniform vec3 uDayTone;\nuniform vec3 uNightTone;\nuniform float uNight;")
        .replace("#include <color_fragment>", "#include <color_fragment>\ndiffuseColor.rgb = min(mix(uDayTone, uNightTone, uNight), vec3(0.95));");
    };
    m.customProgramCacheKey = () => materialKey("glow", "lit");
    return m;
  });
}

// A lamp's warm light, as a lit window's (uniforms.ts: uWarm)
const LAMP_DAY = "#d8d2c4";
const LAMP_NIGHT = "#ffd49a";
const METAL = "#2b3038";

// The pool of light under a lamp: a disc whose vertex colours fade to its
// rim, added to what's under it at night
function poolMaterial() {
  return shared(materialKey("lamp", "pool"), () => {
    const m = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: LAMP_NIGHT });
    m.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, { uNight: envUniforms.uNight });
      shader.fragmentShader = shader.fragmentShader
        .replace("#include <common>", "#include <common>\nuniform float uNight;")
        .replace("#include <color_fragment>", "#include <color_fragment>\ndiffuseColor.rgb *= 0.32 * uNight;");
    };
    m.customProgramCacheKey = () => materialKey("lamp", "pool");
    m.polygonOffset = true;
    m.polygonOffsetFactor = -2;
    m.polygonOffsetUnits = -2;
    return m;
  });
}

const POLE_H = 0.6;
const HEAD = new THREE.Vector3(0.1, POLE_H + 0.01, 0);
// A lantern post's: the light in the lantern, on top of the post
const LANTERN = new THREE.Vector3(0, POLE_H - 0.02, 0);

export type LampHead = "arm" | "lantern";

// A lantern post as the plates' streets have them: a cast-iron post on a
// fluted base, a collar, a six-sided lantern lit warm, a cap and a finial
function lanternParts() {
  const pole = merge([
    new THREE.CylinderGeometry(0.02, 0.026, 0.06, 8).translate(0, 0.03, 0),
    new THREE.CylinderGeometry(0.008, 0.012, POLE_H - 0.1, 6).translate(0, 0.06 + (POLE_H - 0.1) / 2, 0),
    new THREE.CylinderGeometry(0.016, 0.012, 0.016, 8).translate(0, POLE_H - 0.04 + 0.008, 0),
    new THREE.ConeGeometry(0.036, 0.026, 6).translate(0, LANTERN.y + 0.032 + 0.013, 0),
    new THREE.SphereGeometry(0.008, 6, 4).translate(0, LANTERN.y + 0.032 + 0.034, 0),
  ]);
  const head = new THREE.CylinderGeometry(0.026, 0.018, 0.064, 6).translate(0, LANTERN.y, 0);
  const pool = poolDisc(0);
  return { pole, head, pool };
}

// The pool of light on the ground round `x` (the head's), its vertex
// colours fading to its rim
function poolDisc(x: number) {
  const pool = new THREE.CircleGeometry(0.34, 20).rotateX(-Math.PI / 2).translate(x, 0.004, 0);
  const n = pool.attributes.position.count;
  const colors = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const dx = pool.attributes.position.getX(i) - x;
    const dz = pool.attributes.position.getZ(i);
    const k = 1 - Math.min(1, Math.hypot(dx, dz) / 0.34);
    colors.set([k * k, k * k, k * k], i * 3);
  }
  pool.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  return pool;
}

function lampParts() {
  const pole = merge([
    new THREE.CylinderGeometry(0.008, 0.013, POLE_H, 6).translate(0, POLE_H / 2, 0),
    // a short arm out to the head
    box(0.11, 0.012, 0.014).translate(0.05, POLE_H + 0.03, 0),
    // the head's hood
    new THREE.CylinderGeometry(0.018, 0.034, 0.022, 8).translate(HEAD.x, HEAD.y + 0.015, 0),
  ]);
  // the lit underside of the head
  const head = new THREE.CylinderGeometry(0.03, 0.03, 0.008, 8).translate(HEAD.x, HEAD.y, 0);
  return { pole, head, pool: poolDisc(HEAD.x) };
}

/**
 * A promenade lamp, 6 m, its foot at the group's origin, its head over +x.
 * `head` is where its light comes from (group-local): with `light: "spot"`
 * the scene's SceneLights puts a spot there; with "none" (the default) the
 * lamp has a pool of light on the ground. 2 or 3 draw calls; prefer
 * buildLampRow for more than a couple.
 */
export function buildLamp(o?: { light: "spot" | "none" }): { group: THREE.Group; head: THREE.Vector3; dispose(): void } {
  const spot = o?.light === "spot";
  const { pole, head, pool } = lampParts();
  const group = new THREE.Group();
  group.name = "lamp";
  group.userData.spot = spot;
  const poleMesh = new THREE.Mesh(pole, surface({ color: METAL }));
  poleMesh.castShadow = true;
  group.add(poleMesh, new THREE.Mesh(head, glowMaterial({ day: LAMP_DAY, night: LAMP_NIGHT })));
  if (!spot) group.add(new THREE.Mesh(pool, poolMaterial()));
  return {
    group,
    head: HEAD.clone(),
    dispose() {
      pole.dispose();
      head.dispose();
      pool.dispose();
    },
  };
}

/**
 * A row of lamps at `spots` (feet; `ry` turns each), instanced: 3 draw
 * calls whatever their number. `heads` are where each one's light comes
 * from, in the same frame as the spots. `head`: "arm" (the promenade lamp,
 * its head out over +x; the default) or "lantern" (a lantern post, its
 * light in the lantern on top of the post). `size`: the lamps' scale (1 by
 * default: a 6 m post); `pool: false`: no pool of light at their feet (a
 * lamp on a pier over water), one draw call fewer.
 */
export function buildLampRow(spots: { x: number; y?: number; z: number; ry?: number }[], o?: { light?: "spot" | "none"; head?: LampHead; size?: number; pool?: boolean }) {
  const spot = o?.light === "spot" || o?.pool === false;
  const k = o?.size ?? 1;
  const lantern = o?.head === "lantern";
  const { pole, head, pool } = lantern ? lanternParts() : lampParts();
  const HEAD_AT = lantern ? LANTERN : HEAD;
  const parts: [THREE.BufferGeometry, THREE.Material][] = [
    [pole, surface({ color: METAL })],
    [head, glowMaterial({ day: lantern ? "#e4ddcc" : LAMP_DAY, night: LAMP_NIGHT })],
  ];
  if (!spot) parts.push([pool, poolMaterial()]);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const one = new THREE.Vector3(k, k, k);
  const meshes = parts.map(([g, mat]) => {
    const mesh = new THREE.InstancedMesh(g, mat, spots.length);
    spots.forEach((s, i) => mesh.setMatrixAt(i, m.compose(new THREE.Vector3(s.x, s.y ?? 0, s.z), q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), s.ry ?? 0), one)));
    mesh.computeBoundingSphere();
    return mesh;
  });
  meshes[0].castShadow = true;
  const heads = spots.map((s) => HEAD_AT.clone().multiplyScalar(k).applyAxisAngle(new THREE.Vector3(0, 1, 0), s.ry ?? 0).add(new THREE.Vector3(s.x, s.y ?? 0, s.z)));
  return {
    meshes,
    heads,
    dispose() {
      pole.dispose();
      head.dispose();
      pool.dispose();
    },
  };
}

// ---------------------------------------------------------------------
// Railings and the viaduct

const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

// A box from a to b (centre line), `w` wide and `h` tall, its top at the line
function beam(a: THREE.Vector3, b: THREE.Vector3, w: number, h: number) {
  const len = a.distanceTo(b);
  const g = box(len, h, w);
  const mid = a.clone().add(b).multiplyScalar(0.5);
  const dir = b.clone().sub(a);
  const ry = Math.atan2(-dir.z, dir.x);
  const pitch = Math.atan2(dir.y, Math.hypot(dir.x, dir.z));
  g.applyMatrix4(new THREE.Matrix4().makeRotationZ(pitch));
  g.translate(0, -h / 2, 0);
  g.applyMatrix4(new THREE.Matrix4().makeRotationY(ry));
  g.translate(mid.x, mid.y, mid.z);
  return g;
}

/**
 * A riverside railing along `points` (its foot), 1.1 m: a top rail, a mid
 * rail and posts every 2.5 m, one mesh, dark metal. `post`: the posts'
 * thickness (0.01 by default: 10 cm)
 */
export function buildRailing(points: THREE.Vector3[], o: { post?: number } = {}): THREE.Mesh {
  const post = o.post ?? 0.01;
  const H = 0.11;
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i + 1 < points.length; i++) {
    const a = points[i];
    const b = points[i + 1];
    parts.push(beam(a.clone().setY(a.y + H), b.clone().setY(b.y + H), 0.014, 0.01));
    parts.push(beam(a.clone().setY(a.y + H * 0.5), b.clone().setY(b.y + H * 0.5), 0.006, 0.006));
    const len = a.distanceTo(b);
    const n = Math.max(1, Math.round(len / 0.25));
    for (let k = i === 0 ? 0 : 1; k <= n; k++) {
      const p = a.clone().lerp(b, k / n);
      parts.push(box(post, H, post).translate(p.x, p.y + H / 2, p.z));
    }
  }
  const mesh = new THREE.Mesh(merge(parts), surface({ color: METAL }));
  mesh.name = "railing";
  mesh.castShadow = true;
  return mesh;
}

/**
 * An elevated rail viaduct along `path` (the deck's top, centre line):
 * the deck, a low parapet each side and a pier down to y = 0 about every
 * 80 m, one mesh in pale concrete. A train (movers.ts) runs on the deck.
 */
export function buildViaduct(path: THREE.Vector3[], o: { width: number }): THREE.Mesh {
  const parts: THREE.BufferGeometry[] = [];
  const W = o.width;
  for (let i = 0; i + 1 < path.length; i++) {
    const a = path[i];
    const b = path[i + 1];
    const dir = b.clone().sub(a).setY(0).normalize();
    const side = v3(-dir.z, 0, dir.x).multiplyScalar(W / 2 - 0.02);
    parts.push(beam(a, b, W, 0.14));
    // the deck's underside, narrower: a box girder
    parts.push(beam(a.clone().setY(a.y - 0.14), b.clone().setY(b.y - 0.14), W * 0.6, 0.12));
    for (const s of [side, side.clone().negate()]) parts.push(beam(a.clone().add(s).setY(a.y + 0.07), b.clone().add(s).setY(b.y + 0.07), 0.03, 0.07));
    const len = a.distanceTo(b);
    const n = Math.max(1, Math.round(len / 8));
    for (let k = i === 0 ? 0 : 1; k <= n; k++) {
      const p = a.clone().lerp(b, k / n);
      const h = p.y - 0.26;
      if (h <= 0.05) continue;
      parts.push(box(W * 0.35, h, W * 0.35).translate(p.x, h / 2, p.z));
      // a cap under the deck
      parts.push(box(W * 0.75, 0.08, W * 0.45).translate(p.x, h - 0.04, p.z));
    }
  }
  const mesh = new THREE.Mesh(merge(parts), surface({ color: "#9aa0a8", grime: 0.5 }));
  mesh.name = "viaduct";
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}
