import * as THREE from "three";
import type { Quality } from "../tiers";
import { shared } from "./materials";
import { plateUniforms } from "./plate";
import { materialKey } from "./uniforms";

// The flight's two materials (Flight.tsx; docs/superpowers/plans/2026-11-
// 21-city-painted-25d.md, Task 3), both painted in the shader from noise
// with fixed offsets (nothing random, no pictures):
// - the veil: the clouds the camera passes through between a place and the
//   aerial painting, one quad over the whole view. They close in from the
//   view's edges toward its middle (the place's subject) as `uVeil` goes
//   from 0 to 1, and are whole cloud at 1, never a flat colour.
// - a cloud layer: thin, broken cloud lying over the aerial painting, under
//   the camera, fading out as the camera comes near it, so a climb or a
//   descent passes through it without a pop.
// Day and night, rain and the city's glow under them are the plates'
// uniforms (kit/plate.ts: plateUniforms), so nothing recompiles. The
// phones' tier draws fewer octaves of noise.

const OCTAVES: Record<Quality, number> = { high: 5, low: 4, mobile: 3 };

// The haze a flight passes through (City3D.tsx: the iris's colour, and the
// veil's clouds are tinted toward it), by the hour: by day a soft blue-grey
// about as light as a day place's middle tones (never a white flash), at
// night a slate navy about as light as a night place's (never a dip to
// black). The veil's clouds are never more than VEIL_MAX opaque: the iris
// in this colour closes over the cut between the air and a place.
export const HAZE_DAY = "#8193a3";
export const HAZE_NIGHT = "#43506b";
export const VEIL_MAX = 0.6;
const vec3 = (hex: string) => {
  const c = new THREE.Color(hex);
  return `vec3(${c.r.toFixed(4)}, ${c.g.toFixed(4)}, ${c.b.toFixed(4)})`;
};

const NOISE = /* glsl */ `
float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), u.x), mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float a = 0.5;
  float s = 0.0;
  float w = 0.0;
  for (int i = 0; i < OCTAVES; i++) {
    s += a * vnoise(p);
    w += a;
    p = p * 2.03 + vec2(1.7, 9.2);
    a *= 0.5;
  }
  return s / w;
}
// A cloud's colour: lit from the upper left, cool in its shade; after dark
// moonlit grey-blue with the city's warm light on its underside; greyer in
// rain. Linear colour, kept under the bloom's threshold.
vec3 cloudColour(float lit, float under) {
  // (by day a soft warm grey at most, about 200 of 255: no white flash)
  vec3 dayLit = vec3(0.56, 0.56, 0.54);
  vec3 dayShade = vec3(0.32, 0.38, 0.48);
  vec3 nightLit = vec3(0.17, 0.19, 0.29);
  vec3 nightShade = vec3(0.045, 0.06, 0.11);
  vec3 glow = vec3(0.42, 0.22, 0.12);
  vec3 day = mix(dayShade, dayLit, lit);
  vec3 night = mix(nightShade, nightLit, lit) + glow * under * 0.4;
  vec3 col = mix(night, day, smoothstep(0.0, 1.0, uDay));
  vec3 grey = vec3(dot(col, vec3(0.2126, 0.7152, 0.0722)));
  return mix(col, grey * 0.9, 0.55 * uRain);
}
`;

const VEIL_VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

const VEIL_FRAGMENT = /* glsl */ `
uniform float uVeil;
uniform vec2 uCenter;
uniform float uAspect;
uniform float uTime;
uniform vec2 uDrift;
uniform float uDay;
uniform float uRain;
varying vec2 vUv;
${NOISE}
void main() {
  // How far from the subject (the view's middle where the camera looks),
  // 0 there .. about 1 at the farthest corner
  vec2 q = vec2((vUv.x - uCenter.x) * uAspect, vUv.y - uCenter.y);
  float r = length(q) / (0.5 * length(vec2(uAspect, 1.0)));
  vec2 p = vec2(vUv.x * uAspect, vUv.y) * vec2(1.6, 2.4) + uDrift + vec2(uTime * 0.025, 0.0);
  float n = fbm(p);
  // Closing from the edges: the dense parts of the cloud and the edges first
  float field = n * 0.62 + min(r, 1.3) * 0.45;
  float thr = mix(1.3, -0.25, uVeil);
  float a = smoothstep(thr, thr + 0.2, field);
  if (a < 0.002) discard;
  // lit from the upper left, the dense parts brighter: a painted mass, not a fog
  float lit = clamp(0.45 + (n - fbm(p + vec2(-0.06, 0.08))) * 9.0 + (n - 0.5) * 0.9, 0.0, 1.0);
  vec3 col = cloudColour(lit * lit * (3.0 - 2.0 * lit), 1.0 - n);
  // tinted toward the hour's haze, and never closed: the iris does that
  vec3 haze = mix(${vec3(HAZE_NIGHT)}, ${vec3(HAZE_DAY)}, smoothstep(0.0, 1.0, uDay));
  gl_FragColor = vec4(mix(col, haze, 0.5), a * ${VEIL_MAX.toFixed(2)});
  #include <colorspace_fragment>
}`;

const CLOUD_VERTEX = /* glsl */ `
varying vec2 vUv;
varying float vDepth;
void main() {
  vUv = uv;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vDepth = -mv.z;
  gl_Position = projectionMatrix * mv;
}`;

const CLOUD_FRAGMENT = /* glsl */ `
uniform float uOpacity;
uniform float uCover;
uniform vec2 uSeed;
uniform vec2 uScale;
uniform vec2 uNear;
uniform float uTime;
uniform float uDay;
uniform float uRain;
varying vec2 vUv;
varying float vDepth;
${NOISE}
void main() {
  vec2 p = vUv * uScale + uSeed + vec2(uTime * 0.012, uTime * 0.004);
  float n = fbm(p);
  // thin and broken: only the densest parts, a little more in rain
  float cover = uCover - 0.06 * uRain;
  float a = smoothstep(cover, cover + 0.14, n);
  // softened at the layer's edges, and gone as the camera comes near it
  vec2 e = min(vUv, 1.0 - vUv);
  a *= smoothstep(0.0, 0.08, min(e.x, e.y));
  a *= smoothstep(uNear.x, uNear.y, vDepth);
  a *= uOpacity * ${VEIL_MAX.toFixed(2)};
  if (a < 0.002) discard;
  float lit = clamp(0.55 + (n - fbm(p + vec2(-0.05, 0.07))) * 6.0, 0.0, 1.0);
  gl_FragColor = vec4(cloudColour(lit, 1.0 - n), a);
  #include <colorspace_fragment>
}`;

const defines = (quality: Quality) => ({ OCTAVES: OCTAVES[quality] });

// The veil, one per tier
export function veilMaterial(quality: Quality): THREE.ShaderMaterial {
  return shared(materialKey("flight-veil", quality), () => {
    const m = new THREE.ShaderMaterial({
      vertexShader: VEIL_VERTEX,
      fragmentShader: VEIL_FRAGMENT,
      defines: defines(quality),
      uniforms: {
        uVeil: { value: 0 },
        uCenter: { value: new THREE.Vector2(0.5, 0.5) },
        uAspect: { value: 1 },
        uTime: { value: 0 },
        uDrift: { value: new THREE.Vector2() },
        uDay: plateUniforms.uDay,
        uRain: plateUniforms.uRain,
      },
      transparent: true,
      depthTest: false,
      depthWrite: false,
      fog: false,
      toneMapped: false,
    });
    const key = materialKey("flight-veil", quality);
    m.customProgramCacheKey = () => key;
    return m;
  });
}

// A cloud layer: `layer` 0 the lower (every tier), 1 the upper (desktop)
export type CloudLayer = { cover: number; seed: [number, number]; scale: [number, number]; near: [number, number] };
export function cloudMaterial(quality: Quality, layer: number, opts: CloudLayer): THREE.ShaderMaterial {
  return shared(materialKey("flight-cloud", `${quality}:${layer}`), () => {
    const m = new THREE.ShaderMaterial({
      vertexShader: CLOUD_VERTEX,
      fragmentShader: CLOUD_FRAGMENT,
      defines: defines(quality),
      uniforms: {
        uOpacity: { value: 0 },
        uCover: { value: opts.cover },
        uSeed: { value: new THREE.Vector2(...opts.seed) },
        uScale: { value: new THREE.Vector2(...opts.scale) },
        uNear: { value: new THREE.Vector2(...opts.near) },
        uTime: { value: 0 },
        uDay: plateUniforms.uDay,
        uRain: plateUniforms.uRain,
      },
      transparent: true,
      depthWrite: false,
      fog: false,
      toneMapped: false,
    });
    // (every layer of a tier is one program)
    const key = materialKey("flight-cloud", quality);
    m.customProgramCacheKey = () => key;
    return m;
  });
}
