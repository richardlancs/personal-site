import * as THREE from "three";
import { Reflector } from "three/addons/objects/Reflector.js";
import type { ReflectionMode } from "../tiers";
import { shared } from "./materials";
import { envUniforms, materialKey } from "./uniforms";

// Reflections on the river and on wet paving, the two ways the tiers allow
// (tiers.ts: reflection):
//
// - fake (every tier; low and mobile only use this): each lit thing the
//   water should mirror is a `LightStrip`, and its reflection is a streak
//   on the surface running from the thing's foot toward the eye, as long as
//   a mirror would make it (a light `height` above the water, seen from
//   eye height e at distance D, is mirrored D·h/(e+h) nearer), broken into
//   short horizontal dashes by the ripples, as the night plate paints them.
//   One instanced draw call for every strip of a surface; no extra render.
// - planar (high only, one per scene at most): three's Reflector at 512
//   wide, no multisampling, its camera seeing only REFLECT_LAYER, drawn
//   through the custom shader below (the water's colour, the reflection
//   smeared down the screen by the ripples, fog), with the fake streaks
//   kept on top, fainter, for the painted dashes.
//
// What the planar reflection shows is what a scene puts on REFLECT_LAYER
// (`reflectIn`): the skyline, the sky dome, the landmarks; nothing small.
// Lights must be on that layer too, or the reflected pass would draw with
// fewer lights and compile other programs: the reflector puts every light
// of the scene it draws on the layer itself, each frame (cheap: one
// traversal).
//
// The Reflector makes its own ShaderMaterial (it holds its own render
// target, so it can't be shared); dispose() frees both.

export type { ReflectionMode };

/** Something lit that the water mirrors: its foot (x, z) in the surface's parent frame, its width, colour and height above the water */
export type LightStrip = { x: number; z: number; w: number; color: string; height: number };

/** The layer a planar reflection's camera sees (never 11: postprocessing's selection layer) */
export const REFLECT_LAYER = 2;

/** Puts each object and everything under it on REFLECT_LAYER as well as its own layers */
export function reflectIn(...objects: THREE.Object3D[]) {
  for (const o of objects) o.traverse((c) => c.layers.enable(REFLECT_LAYER));
}

// ---------------------------------------------------------------------
// The water's own colour, shared by the plain river and the reflector

export const WATER_GLSL = /* glsl */ `
float wHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float wNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(wHash(i), wHash(i + vec2(1.0, 0.0)), f.x), mix(wHash(i + vec2(0.0, 1.0)), wHash(i + vec2(1.0, 1.0)), f.x), f.y);
}
// The river's body: blue-grey by day (the day plate's, not a saturated blue), deep blue at night, greyer in rain,
// with pale ripple strokes running across the view that fade with
// distance; fres (out) is how glancing the view is: 0 looking down, 1 at
// the horizon
vec3 waterBody(vec3 world, vec3 toEye, float night, float wet, out float fres) {
  float d = length(toEye);
  vec3 v = toEye / max(d, 1e-4);
  fres = pow(1.0 - clamp(v.y, 0.0, 1.0), 5.0);
  vec3 deep = mix(vec3(0.09, 0.16, 0.25), vec3(0.01, 0.022, 0.07), night);
  float lum = dot(deep, vec3(0.3, 0.5, 0.2));
  deep = mix(deep, vec3(lum) * vec3(0.9, 0.97, 1.05), wet * 0.4);
  float n = wNoise(vec2(world.x * 0.12, world.z * 1.8)) + 0.5 * wNoise(vec2(world.x * 0.4 + 3.0, world.z * 4.5));
  float near = 1.0 - smoothstep(12.0, 40.0, d);
  float crest = smoothstep(0.95, 1.3, n) * near;
  float trough = smoothstep(0.55, 0.2, n) * near;
  vec3 pale = mix(vec3(0.42, 0.55, 0.68), vec3(0.05, 0.07, 0.14), night);
  return deep * (1.0 - trough * 0.25) + pale * crest * (0.22 + wet * 0.12);
}
`;

// ---------------------------------------------------------------------
// The streaks (fake reflections)

const STREAK_VERTEX = /* glsl */ `
attribute vec3 aFoot;  // x, z in the parent frame; a seed
attribute vec2 aStrip; // width, height above the water
attribute vec3 aColor;
attribute vec4 aClip;  // the surface: x0, z0, x1, z1 in the parent frame
uniform float uStretch;
uniform float uFine;
varying vec2 vUv;
varying vec3 vColor;
varying float vLen;
varying float vSeed;
varying vec2 vXZ;
varying vec4 vClip;
#include <fog_pars_vertex>
void main() {
  // this mesh's frame is the parent frame, lifted to the water
  vec3 origin = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  vec3 foot = origin + vec3(aFoot.x, 0.0, aFoot.y);
  vec2 toCam = cameraPosition.xz - foot.xz;
  float D = max(length(toCam), 1e-3);
  vec2 dir = toCam / D;
  vec2 side = vec2(-dir.y, dir.x);
  float e = max(cameraPosition.y - foot.y, 0.05);
  float h = aStrip.y;
  // a light near the eye still streaks (at least a quarter of the way);
  // polished stone's strokes run on nearer the feet
  float len = clamp(D * h / (e + h) * uStretch, 0.0, max(D - mix(1.0, 0.35, uFine), 0.25 * D));
  // (polished stone: a narrower stroke, hardly widening toward the eye)
  float w = aStrip.x * 0.5 * mix(1.0 + position.y * 0.5, 0.55 + position.y * 0.1, uFine);
  vec2 xz = foot.xz + dir * (position.y * len) + side * (position.x * w);
  vec4 mvPosition = viewMatrix * vec4(xz.x, foot.y, xz.y, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  vUv = position.xy;
  vColor = aColor;
  vLen = len;
  vSeed = aFoot.z;
  vXZ = xz - origin.xz;
  vClip = aClip;
  #include <fog_vertex>
}
`;

const STREAK_FRAGMENT = /* glsl */ `
uniform float uStrength;
uniform float uGate;  // 0: always (the river); 1: × uWet (paving)
uniform float uDash;  // ripples per world unit
uniform float uPolish; // dry paving's own shine after dark (0: none; never by day)
uniform float uFine;   // 0: the ripples' broken dashes; 1: long fine strokes (polished stone)
uniform float uNight;
uniform float uWet;
varying vec2 vUv;
varying vec3 vColor;
varying float vLen;
varying float vSeed;
varying vec2 vXZ;
varying vec4 vClip;
#include <fog_pars_fragment>
float sHash(float n) { return fract(sin(n) * 43758.5453); }
void main() {
  if (vXZ.x < vClip.x || vXZ.x > vClip.z || vXZ.y < vClip.y || vXZ.y > vClip.w) discard;
  float t = vUv.y * vLen;
  float k = t * uDash + vSeed * 7.0;
  float id = floor(k);
  float f = fract(k);
  float r1 = sHash(id * 12.9898 + vSeed * 78.233);
  float r2 = sHash(id * 39.346 + vSeed * 11.135);
  float r3 = sHash(id * 73.156 + vSeed * 52.235);
  // each ripple a short horizontal dash, shifted and sized at random
  // (polished stone: long soft segments, hardly shifted, so they run into
  // one stroke with a bright core)
  float x = abs(vUv.x - (r1 - 0.5) * mix(0.7, 0.1, uFine)) / mix(mix(0.3, 1.0, r2), 0.8 + 0.2 * r2, uFine);
  float across = 1.0 - smoothstep(mix(0.5, 0.2, uFine), 1.0, x);
  float dash = smoothstep(0.0, 0.15, f) * (1.0 - smoothstep(0.35, 0.6, f));
  // (polished stone: one unbroken stroke, its brightness rising and
  // falling softly along it, never cut into rungs)
  dash = mix(dash, 0.55 + 0.45 * smoothstep(0.0, 0.35, f) * (1.0 - smoothstep(0.55, 1.0, f)), uFine);
  float along = smoothstep(0.0, 0.05, vUv.y) * (1.0 - smoothstep(mix(0.3, 0.4, uFine), 1.0, vUv.y));
  float a = across * dash * along * mix(0.4, 1.0, r3);
  // wet: by day pale and soft, at night the lights' colours; dry polish:
  // at night only (so no switch at dusk), never doubled in rain, and as
  // strong on high (where the planar mirror stays off while dry) as below
  float level = max(uStrength * mix(0.35, 1.0, uNight) * mix(1.0, uWet, uGate), uPolish * uNight);
  // by day the reflections are soft and pale; at night, the lights' own colours
  vec3 tone = mix(mix(vColor, vec3(0.75, 0.82, 0.9), 0.7), vColor, uNight);
  vec3 col = tone * a * level * 0.65;
  #ifdef USE_FOG
    #ifdef FOG_EXP2
      float fogFactor = 1.0 - exp(-fogDensity * fogDensity * vFogDepth * vFogDepth);
    #else
      float fogFactor = smoothstep(fogNear, fogFar, vFogDepth);
    #endif
    col *= 1.0 - fogFactor;
  #endif
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

export type StreakKind = "river" | "paving";

function streakMaterial(kind: StreakKind, mode: ReflectionMode, polish = 0) {
  // the same program whatever the polish (ShaderMaterials of one source share it)
  return shared(materialKey("water", `streaks:${kind}:${mode}${polish > 0 ? `:${polish}` : ""}`), () => {
    const m = new THREE.ShaderMaterial({
      uniforms: {
        ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
        // (polished stone holds the lights longer than wet paving's puddles)
        uStretch: { value: kind === "river" ? 1.6 : polish > 0 ? 1.7 : 1.1 },
        uStrength: { value: mode === "planar" ? 0.45 : 1 },
        uGate: { value: kind === "river" ? 0 : 1 },
        uDash: { value: kind === "river" ? 1.5 : polish > 0 ? 3 : 4 },
        uPolish: { value: polish },
        uFine: { value: polish > 0 ? 1 : 0 },
      },
      vertexShader: STREAK_VERTEX,
      fragmentShader: STREAK_FRAGMENT,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: true,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    // the shared weather and night, by reference
    m.uniforms.uNight = envUniforms.uNight;
    m.uniforms.uWet = envUniforms.uWet;
    return m;
  });
}

/**
 * The streaks for `lights` on a surface `w` × `d` centred at (x, z) of the
 * parent frame: one InstancedMesh, made to be a child of the surface (its
 * frame is set to the parent's, at the water). Its geometry is the
 * caller's to dispose.
 */
export function buildStreaks(lights: LightStrip[], o: { kind: StreakKind; mode: ReflectionMode; x: number; z: number; w: number; d: number; polish?: number }) {
  const g = new THREE.InstancedBufferGeometry();
  // one quad: x across (-1..1), y along (0 at the foot .. 1 nearest the eye)
  g.setAttribute("position", new THREE.Float32BufferAttribute([-1, 0, 0, 1, 0, 0, 1, 1, 0, -1, 1, 0], 3));
  g.setIndex([0, 1, 2, 0, 2, 3]);
  const n = lights.length;
  const foot = new Float32Array(n * 3);
  const strip = new Float32Array(n * 2);
  const color = new Float32Array(n * 3);
  const clip = new Float32Array(n * 4);
  const c = new THREE.Color();
  lights.forEach((l, i) => {
    foot.set([l.x, l.z, (i * 0.618034 + 0.137) % 1], i * 3);
    strip.set([l.w, l.height], i * 2);
    c.set(l.color);
    color.set([c.r, c.g, c.b], i * 3);
    clip.set([o.x - o.w / 2, o.z - o.d / 2, o.x + o.w / 2, o.z + o.d / 2], i * 4);
  });
  g.setAttribute("aFoot", new THREE.InstancedBufferAttribute(foot, 3));
  g.setAttribute("aStrip", new THREE.InstancedBufferAttribute(strip, 2));
  g.setAttribute("aColor", new THREE.InstancedBufferAttribute(color, 3));
  g.setAttribute("aClip", new THREE.InstancedBufferAttribute(clip, 4));
  g.instanceCount = n;
  const mesh = new THREE.Mesh(g, streakMaterial(o.kind, o.mode, o.kind === "paving" ? (o.polish ?? 0) : 0));
  // placed in the vertex shader, toward the eye: no bounds to cull by
  mesh.frustumCulled = false;
  mesh.renderOrder = 1;
  mesh.visible = n > 0;
  mesh.name = `streaks:${o.kind}`;
  return mesh;
}

// ---------------------------------------------------------------------
// The planar reflection (high tier)

const PLANAR_VERTEX = /* glsl */ `
uniform mat4 textureMatrix;
varying vec4 vUv;
varying vec3 vWorld;
#include <fog_pars_vertex>
void main() {
  vUv = textureMatrix * vec4(position, 1.0);
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  vec4 mvPosition = viewMatrix * w;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`;

const planarFragment = (kind: StreakKind) => /* glsl */ `
uniform vec3 color;
uniform sampler2D tDiffuse;
uniform float uNight;
uniform float uWet;
varying vec4 vUv;
varying vec3 vWorld;
#include <fog_pars_fragment>
${WATER_GLSL}
void main() {
  vec3 toEye = cameraPosition - vWorld;
  float fres;
  vec3 body = waterBody(vWorld, toEye, uNight, uWet, fres);
  vec2 uv = vUv.xy / vUv.w;
  float n = wNoise(vec2(vWorld.x * 0.25, vWorld.z * 2.5));
  uv.x += (n - 0.5) * 0.004;
  // the ripples smear the mirror image down the screen
  vec3 r = vec3(0.0);
  for (int i = 0; i < 5; i++) r += texture2D(tDiffuse, uv + vec2(0.0, (float(i) - 1.5) * 0.008 * (0.5 + n))).rgb;
  // broken into horizontal strokes by the ripples, dark water between
  float band = smoothstep(0.3, 0.75, wNoise(vec2(vWorld.x * 0.5, vWorld.z * 1.6)));
  r *= 0.2 * color * mix(0.35, 1.15, band);
  ${
    kind === "river"
      ? `float amt = mix(0.3, 0.85, fres) * (1.0 - uWet * 0.3) * mix(0.75, 1.0, uNight);
  gl_FragColor = vec4(mix(body, r, amt), 1.0);`
      : `float puddle = smoothstep(0.5, 0.68, wNoise(vWorld.xz * 0.6 + 4.0) * 0.7 + wNoise(vWorld.xz * 2.1) * 0.3);
  float amt = uWet * (0.15 + 0.6 * puddle) * mix(0.4, 1.0, fres);
  gl_FragColor = vec4(r, amt);`
  }
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}
`;

const reflectorShader = (kind: StreakKind) => ({
  name: `water:planar:${kind}`,
  uniforms: {
    ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
    color: { value: null },
    tDiffuse: { value: null },
    textureMatrix: { value: null },
    uNight: { value: 0 },
    uWet: { value: 0 },
  },
  vertexShader: PLANAR_VERTEX,
  fragmentShader: planarFragment(kind),
});

/**
 * A planar reflection `w` × `d` in its own xy plane (face +z: rotate it to
 * lie flat), or null unless `mode` is "planar". `size` is the texture's
 * width (tiers.ts: reflectionSize); `gate` skips the reflected render when
 * there's nothing to show (paving while dry).
 */
export function buildReflection(o: { mode: ReflectionMode; kind: StreakKind; w: number; d: number; size?: number; gate?: () => boolean }): Reflector | null {
  if (o.mode !== "planar") return null;
  const size = o.size || 512;
  const geometry = new THREE.PlaneGeometry(o.w, o.d);
  const reflector = new Reflector(geometry, {
    textureWidth: size,
    textureHeight: Math.round(size * 0.5625),
    clipBias: 0.003,
    color: 0xffffff,
    multisample: 0,
    shader: reflectorShader(o.kind),
  });
  const material = reflector.material as THREE.ShaderMaterial;
  material.fog = true;
  // the Reflector cloned the uniforms; the weather and night are shared, by reference
  material.uniforms.uNight = envUniforms.uNight;
  material.uniforms.uWet = envUniforms.uWet;
  if (o.kind === "paving") {
    material.transparent = true;
    material.depthWrite = false;
  }
  // its camera sees only what a scene put on REFLECT_LAYER
  const camera = reflector.getReflectionCamera.bind(reflector);
  reflector.getReflectionCamera = (c: THREE.Camera) => {
    const r = camera(c);
    r.layers.set(REFLECT_LAYER);
    return r;
  };
  const draw = reflector.onBeforeRender;
  reflector.onBeforeRender = function (renderer, scene, cam, geo, mat, group) {
    if (o.gate && !o.gate()) return;
    // the same lights in both passes, so the same programs
    scene.traverse((c) => {
      if ((c as THREE.Light).isLight) c.layers.enable(REFLECT_LAYER);
    });
    draw.call(this, renderer, scene, cam, geo, mat, group);
  };
  const dispose = reflector.dispose;
  reflector.dispose = () => {
    dispose();
    geometry.dispose();
  };
  reflector.name = `reflector:${o.kind}`;
  return reflector;
}
