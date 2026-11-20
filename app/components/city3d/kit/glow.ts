import * as THREE from "three";
import { world } from "../store";
import { glowOn, poolUniforms, POOLS, shadeUniforms } from "./uniforms";

// Light after dark that isn't a light: the street lamps' beams in the
// air, and the wash a sign or a screen throws on the wall round it.
//
// - A lamp is a real spotlight at its bulb, aimed straight down
//   (street.ts: buildLamp). What shows in the air is `lampBeam`: the light
//   scattered by the air inside its cone, worked out per pixel along the
//   view ray (no cone outline: the edge is where the ray's path through
//   the light goes to nothing), brightest just under the lens, fading
//   toward the ground and into the fog
// - Neon, screens and signs are unlit surfaces (neon.ts, signs.ts); their
//   light on the walls is `wash`, below: additive, far dimmer than they are
// - The hour and the weather set how much of this shows, through
//   `glowUniforms` (atmosphere/Atmosphere.tsx). Nothing flickers.

export const glowUniforms = {
  uLamps: { value: 0 }, // the beams in the air: 0 by day .. 1 at night (more in rain and mist)
  uSigns: { value: 0 }, // the signs' light on walls: 0 by day .. 1 at night
  uHaze: { value: 0 }, // rain, snow or mist outdoors: light spreads a little wider and softer
};

// A street lamp's light, warm (the same tone as a lit window's warm
// light, uniforms.ts: windowUniforms.uWarm)
const LAMP = "#ffc98a";

const mobile = () => world.get().quality === "mobile";

// The fog, faded out of what's added on top of the scene (additive light
// shouldn't glow through the mist from far away)
const FOG = /* glsl */ `
uniform float fogNear;
uniform float fogFar;
float glowFog(float depth) { return 1.0 - smoothstep(fogNear, fogFar, depth); }
`;
const fogUniforms = () => THREE.UniformsUtils.clone(THREE.UniformsLib.fog);

// ---------------------------------------------------------------------
// The beam under a street lamp

// The beam's shape, in the lamp's own metres: a cone from a point just
// above the lens (so it leaves the lens as wide as the lens), visible to
// about where the spotlight's pool ends on the ground
export const BEAM = {
  apexAboveLens: 0.32,
  tan: 0.6, // the visible profile's spread (radius per metre down)
  bound: 0.74, // the mesh around it, a little wider, where the profile has gone to nothing
};

const beamMats = new Map<string, THREE.ShaderMaterial>();
function beamMaterial(steps: number) {
  const key = `beam-${steps}`;
  let m = beamMats.get(key);
  if (m) return m;
  m = new THREE.ShaderMaterial({
    uniforms: {
      ...fogUniforms(),
      uLamps: glowUniforms.uLamps,
      uColor: { value: new THREE.Color(LAMP) },
      uTan: { value: BEAM.tan },
      uBound: { value: BEAM.bound },
    },
    defines: { STEPS: steps },
    vertexShader: /* glsl */ `
      varying vec3 vWorld;
      varying vec3 vApex;
      varying float vDepth;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vWorld = w.xyz;
        vApex = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
        vec4 mv = viewMatrix * w;
        vDepth = -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      ${FOG}
      uniform float uLamps;
      uniform vec3 uColor;
      uniform float uTan;
      uniform float uBound;
      uniform float uTop;
      uniform float uLength;
      varying vec3 vWorld;
      varying vec3 vApex;
      varying float vDepth;
      void main() {
        if (uLamps < 0.002) discard;
        // The view ray, from the apex's point of view; h is depth below it
        vec3 ro = cameraPosition - vApex;
        vec3 rd = normalize(vWorld - cameraPosition);
        float tn = 0.0;
        float tf = 1e4;
        // Between the lens and the ground
        if (abs(rd.y) > 1e-5) {
          float t0 = (-uTop - ro.y) / rd.y;
          float t1 = (-uLength - ro.y) / rd.y;
          tn = max(tn, min(t0, t1));
          tf = min(tf, max(t0, t1));
        } else if (ro.y > -uTop || ro.y < -uLength) discard;
        // Inside the (bounding) cone: x^2 + z^2 - k y^2 <= 0
        float k = uBound * uBound;
        float a = rd.x * rd.x + rd.z * rd.z - k * rd.y * rd.y;
        float b = 2.0 * (ro.x * rd.x + ro.z * rd.z - k * ro.y * rd.y);
        float c = ro.x * ro.x + ro.z * ro.z - k * ro.y * ro.y;
        float disc = b * b - 4.0 * a * c;
        if (abs(a) < 1e-6) {
          if (abs(b) > 1e-6) {
            float t = -c / b;
            if (b > 0.0) tf = min(tf, t); else tn = max(tn, t);
          } else if (c > 0.0) discard;
        } else if (disc < 0.0) {
          if (a > 0.0) discard;
        } else {
          float s = sqrt(disc);
          float r1 = (-b - s) / (2.0 * a);
          float r2 = (-b + s) / (2.0 * a);
          float lo = min(r1, r2);
          float hi = max(r1, r2);
          if (a > 0.0) { tn = max(tn, lo); tf = min(tf, hi); }
          else if (tn < lo) tf = min(tf, lo);
          else tn = max(tn, hi);
        }
        if (tf <= tn) discard;
        // The light the air throws back along the way: a soft profile
        // across the beam, strongest near the lens, thinning with distance
        float dt = (tf - tn) / float(STEPS);
        float sum = 0.0;
        for (int i = 0; i < STEPS; i++) {
          vec3 p = ro + rd * (tn + (float(i) + 0.5) * dt);
          float h = -p.y;
          float R = h * uTan;
          float q = dot(p.xz, p.xz) / (R * R);
          float across = exp(-2.6 * q);
          float along = 1.0 / (0.6 + h * h) * smoothstep(uTop, uTop + 0.12, h);
          sum += across * along;
        }
        float light = sum * dt * 0.4 * uLamps * glowFog(vDepth);
        gl_FragColor = vec4(uColor * light, 1.0);
      }`,
    side: THREE.FrontSide,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: true,
  });
  beamMats.set(key, m);
  return m;
}

// The beam's mesh: a cone around the light, apex up at the origin. `drop`
// is how far below the apex the ground is.
export function lampBeam(drop: number) {
  const steps = mobile() ? 5 : 8;
  const base = beamMaterial(steps);
  // Same program, its own length (lamps stand on ground of different heights)
  const m = base.clone();
  m.uniforms.uLamps = glowUniforms.uLamps;
  m.uniforms.uTop = { value: BEAM.apexAboveLens };
  m.uniforms.uLength = { value: drop - 0.03 };
  const length = drop - 0.03;
  const geo = new THREE.ConeGeometry(length * BEAM.bound, length, 20, 1, false).translate(0, -length / 2, 0);
  const beam = new THREE.Mesh(geo, m);
  beam.renderOrder = 2;
  beam.castShadow = false;
  beam.receiveShadow = false;
  return beam;
}

// ---------------------------------------------------------------------
// Signs

// What a sign's light does to the wall round it: a soft wash, brightest
// at the sign's edge and gone well before the quad's own edge. `rect` is
// the sign's size; `reach` how far the quad goes past it on each side
// [left, right, top, bottom].
const washMats = new Map<string, THREE.ShaderMaterial>();
export function wash(rect: [number, number], reach: [number, number, number, number], color: string, strength: number, fall = 0.32) {
  const [w, h] = rect;
  const [l, r, t, b] = reach;
  const pw = w + l + r;
  const ph = h + t + b;
  const key = `${color}-${strength}-${fall}`;
  let base = washMats.get(key);
  if (!base) {
    base = new THREE.ShaderMaterial({
      uniforms: {
        ...fogUniforms(),
        uSigns: glowUniforms.uSigns,
        uHaze: glowUniforms.uHaze,
        uGlowOn: glowOn,
        uColor: { value: new THREE.Color(color) },
        uStrength: { value: strength },
        uFall: { value: fall },
        uHalf: { value: new THREE.Vector2() },
        uPlane: { value: new THREE.Vector2() },
        uCentre: { value: new THREE.Vector2() },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        varying float vDepth;
        void main() {
          vUv = uv;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vDepth = -mv.z;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        ${FOG}
        uniform float uSigns;
        uniform float uHaze;
        uniform float uGlowOn;
        uniform vec3 uColor;
        uniform float uStrength;
        uniform float uFall;
        uniform vec2 uHalf;
        uniform vec2 uPlane;
        uniform vec2 uCentre;
        varying vec2 vUv;
        varying float vDepth;
        void main() {
          if (uSigns * uGlowOn < 0.002) discard;
          vec2 p = vUv * uPlane - uCentre;
          vec2 q = abs(p) - uHalf;
          float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);
          float fall = uFall * (1.0 + 0.45 * uHaze);
          float g = exp(-max(d, 0.0) / fall);
          // Gone before the quad's edge, whichever way
          vec2 e = min(vUv, 1.0 - vUv) * uPlane;
          g *= smoothstep(0.0, 0.35, min(e.x, e.y));
          gl_FragColor = vec4(uColor * g * uStrength * uSigns * glowFog(vDepth), 1.0);
        }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: true,
    });
    washMats.set(key, base);
  }
  const m = base.clone();
  m.uniforms.uSigns = glowUniforms.uSigns;
  m.uniforms.uHaze = glowUniforms.uHaze;
  m.uniforms.uGlowOn = glowOn;
  m.uniforms.uHalf.value.set(w / 2, h / 2);
  m.uniforms.uPlane.value.set(pw, ph);
  // The sign's centre, measured in the quad from its lower left corner
  m.uniforms.uCentre.value.set(l + w / 2, b + h / 2);
  const geo = new THREE.PlaneGeometry(pw, ph).translate((r - l) / 2, (t - b) / 2, 0);
  const quad = new THREE.Mesh(geo, m);
  quad.renderOrder = 1;
  return quad;
}


// ---------------------------------------------------------------------
// Light pools: what a lamp, a lantern or a sign does to the walls and the
// paving round it after dark, as light added in the lit surface
// (surface.ts), not as a light: POOLS of them for the showing place, a
// fixed array, so no program changes and no light is counted. A pool is
// brightest at `pos` and gone at `reach`; surfaces facing it take more.
// `strength` about 1 lights a mid-grey wall beside it like a lamp's pool.
// The atmosphere turns them on with the night (uniforms.ts: uPoolsOn).
// Cost: one loop of POOLS in every lit surface's fragment, nothing else.

type V3 = readonly [number, number, number];
export type GlowPool = { pos: V3; reach: number; color: string; strength: number };

let poolOwner: object | null = null;

/** The showing place's pools, in its own coordinates (`offset` is its place in the world); past POOLS, the strongest are kept */
export function setPools(owner: object, pools: readonly GlowPool[], offset: V3) {
  poolOwner = owner;
  const kept = pools.length <= POOLS ? pools : [...pools].sort((a, b) => b.strength * b.reach - a.strength * a.reach).slice(0, POOLS);
  for (let i = 0; i < POOLS; i++) {
    const p = kept[i];
    const v = poolUniforms.uPools.value[i];
    const c = poolUniforms.uPoolTones.value[i];
    if (!p) {
      v.set(0, -1e4, 0, 0);
      c.setRGB(0, 0, 0);
      continue;
    }
    v.set(p.pos[0] + offset[0], p.pos[1] + offset[1], p.pos[2] + offset[2], p.reach);
    c.set(p.color).multiplyScalar(p.strength);
  }
}

/** Takes the pools down, if `owner` still holds them */
export function clearPools(owner: object) {
  if (poolOwner !== owner) return;
  poolOwner = null;
  for (let i = 0; i < POOLS; i++) poolUniforms.uPools.value[i].w = 0;
}

// ---------------------------------------------------------------------
// Day shade: the shadow pattern a day plate paints, without a shadow map,
// laid on the lit surface (surface.ts) inside a box, by day only (the
// atmosphere's uShadeOn: the sun's share of the light). One per place.
// - stripes: bands across `dir`, `period` apart, `duty` of each in shade
//   (a canopy's ribs on a platform)
// - dapple: soft patches `period` across, `duty` the share in sun (trees)
// - edge: shade on the far side of a line `at` along `dir` from the box's
//   first corner (one side of a lane)
// `depth` how dark (0..1), `top` the highest y it reaches, `walls` how
// much falls on what faces sideways (0..1). Cost: a few operations in
// every lit surface's fragment; no texture, no light, no pass.

export type DayShade = {
  kind: "stripes" | "dapple" | "edge";
  box: readonly [number, number, number, number]; // x0, z0, x1, z1, in the place's coordinates
  depth: number;
  top: number;
  dir?: readonly [number, number];
  period?: number;
  duty?: number;
  at?: number;
  walls?: number;
};

const SHADE_KIND = { stripes: 1, dapple: 2, edge: 3 } as const;
let shadeOwner: object | null = null;

export function setShade(owner: object, shade: DayShade, offset: V3) {
  shadeOwner = owner;
  const [x0, z0, x1, z1] = shade.box;
  const u = shadeUniforms;
  const kind = SHADE_KIND[shade.kind];
  u.uShade.value.set(kind, shade.depth, kind === 3 ? (shade.at ?? 0) : (shade.period ?? 1), shade.duty ?? 0.5);
  u.uShadeBox.value.set(Math.min(x0, x1) + offset[0], Math.min(z0, z1) + offset[2], Math.max(x0, x1) + offset[0], Math.max(z0, z1) + offset[2]);
  const [ax, az] = shade.dir ?? [1, 0];
  const len = Math.hypot(ax, az) || 1;
  const dx = ax / len;
  const dz = az / len;
  u.uShadeDir.value.set(dx, dz, shade.top + offset[1], shade.walls ?? 0);
  // an edge is measured from the box's first corner, in the world
  if (kind === 3) u.uShade.value.z = (shade.at ?? 0) + (Math.min(x0, x1) + offset[0]) * dx + (Math.min(z0, z1) + offset[2]) * dz;
}

export function clearShade(owner: object) {
  if (shadeOwner !== owner) return;
  shadeOwner = null;
  shadeUniforms.uShade.value.x = 0;
}
