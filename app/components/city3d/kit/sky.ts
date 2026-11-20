import * as THREE from "three";
import { rng } from "../rng";
import { shared } from "./materials";
import { materialKey } from "./uniforms";

// The city's sky, from the park's (world3d/props.ts: buildSky): a painted
// gradient from the horizon to the zenith, the sun's glow (the moon's at
// night), a few fixed stars on a clear night, and the plates' clouds:
// thin streaks and wisps by day (lujiazui-day), a grey layer closing over
// with cover. New for the city: the glow of the city on the horizon after
// dark (`uCityGlow`, the look's `cityGlow`), orange low down going violet
// above it, as the night plates paint it.
//
// The dome follows whatever camera draws it (onBeforeRender), so it is
// always at the horizon; `radius` only has to be inside the camera's far
// plane. It is drawn first and writes no depth, and takes no fog.
//
// Its colours are uniforms, and the atmosphere writes them
// (atmosphere/Atmosphere.tsx finds it by `userData.atmos === "sky"`, as
// the park's did; the names are the park's, plus uCityGlow and
// uCityGlowColor): uTop, uHorizon, uSun, uSunDir (the place's own sun
// direction is `userData.sunDir`), uCloudLit, uCloudShade, uCover,
// uSunDisc, uMoon, uStars, uHaze, uHazeAmt, uCityGlow, uCityGlowColor.
// Until it does, the dome is the clear day plate's sky. Nothing in it moves
// (uTime stays 0 unless someone drives it), so still view needs nothing.
//
// One material per seed (materialKey("sky", seed)): a place's dome has
// its own uniforms, and the seed moves its clouds and stars, so two places
// don't share a sky. All domes share one program ("sky:dome").

/** The sky's uniforms, as the atmosphere writes them */
export type SkyUniforms = {
  uTime: { value: number };
  uSeed: { value: THREE.Vector2 };
  uTop: { value: THREE.Color };
  uHorizon: { value: THREE.Color };
  uSun: { value: THREE.Color };
  uSunDir: { value: THREE.Vector3 };
  uCloudLit: { value: THREE.Color };
  uCloudShade: { value: THREE.Color };
  uCover: { value: number };
  uSunDisc: { value: number };
  uMoon: { value: number };
  uStars: { value: number };
  uHaze: { value: THREE.Color };
  uHazeAmt: { value: number };
  uCityGlow: { value: number };
  uCityGlowColor: { value: THREE.Color };
};

/** The clear day plate's sky (lujiazui-day), until the atmosphere says otherwise */
export const SKY_DEFAULTS = {
  top: "#2c64c6",
  horizon: "#a4cdee",
  sun: "#fff1d6",
  sunDir: [0.35, 0.55, -0.75] as [number, number, number],
  cloudLit: "#f4f6fb",
  cloudShade: "#9fb3d6",
  cityGlowColor: "#ff9a52",
};

const VERTEX = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const FRAGMENT = /* glsl */ `
uniform float uTime;
uniform vec2 uSeed;
uniform vec3 uTop;
uniform vec3 uHorizon;
uniform vec3 uSun;
uniform vec3 uSunDir;
uniform vec3 uCloudLit;
uniform vec3 uCloudShade;
uniform float uCover;
uniform float uSunDisc;
uniform float uMoon;
uniform float uStars;
uniform vec3 uHaze;
uniform float uHazeAmt;
uniform float uCityGlow;
uniform vec3 uCityGlowColor;
varying vec3 vDir;
float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n2(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 p) { float s = 0.0; float a = 0.5; for (int i = 0; i < 5; i++) { s += a * n2(p); p *= 2.07; a *= 0.5; } return s; }
void main() {
  vec3 d = normalize(vDir);
  float h = clamp(d.y, -0.2, 1.0);
  vec3 col = mix(uHorizon, uTop, pow(smoothstep(-0.02, 0.5, h), 0.55));
  // the painting's grain: the blue laid on in strokes, never a flat fill
  vec2 flat2 = d.xz / (max(d.y, 0.0) + 0.3);
  col *= 1.0 + (n2(flat2 * 9.0 + uSeed * 3.0) - 0.5) * 0.05 + (n2(vec2(flat2.x * 40.0, flat2.y * 6.0) + uSeed) - 0.5) * 0.025;
  float s = max(dot(d, normalize(uSunDir)), 0.0);
  // the sun's glow; at night a smaller, cooler glow and the moon's disc
  col += uSun * (pow(s, 6.0) * 0.14 * (1.0 - uMoon * 0.6) + pow(s, 90.0) * 0.7 * (1.0 - uMoon)) * uSunDisc;
  col = mix(col, uSun * 1.05, smoothstep(0.99935, 0.9996, s) * uMoon * uSunDisc);
  // a few stars on a clear night, fixed (they don't twinkle); fewer near the lit horizon
  if (uStars > 0.001) {
    vec2 sg = d.xz / (max(d.y, 0.0) + 0.35) * 42.0 + uSeed * 17.0;
    vec2 cell = floor(sg);
    vec2 jitter = vec2(h21(cell + 3.1), h21(cell + 7.7)) * 0.6 + 0.2;
    float star = step(0.982, h21(cell)) * smoothstep(0.16, 0.0, length(fract(sg) - jitter));
    col += vec3(0.85, 0.88, 1.0) * star * uStars * smoothstep(0.12, 0.4, h) * 0.5;
  }
  // the city's glow on the horizon after dark: orange low, violet above it
  float glowLow = exp(-max(h, 0.0) * 22.0);
  float glowHigh = exp(-max(h, 0.0) * 6.0);
  float glowVary = 0.75 + 0.5 * n2(vec2(atan(d.z, d.x) * 3.0, 0.0) + uSeed);
  col += (uCityGlowColor * glowLow * 0.55 + vec3(0.2, 0.1, 0.36) * glowHigh * 0.3) * uCityGlow * glowVary;
  // clouds: streaks and wisps stretched along one wind, in a band above the
  // skyline; with more cover they thicken, and a grey layer closes over
  float over = smoothstep(0.62, 1.0, uCover);
  vec2 drift = vec2(uTime * 0.004, uTime * 0.0015);
  vec2 uv = d.xz / (max(d.y, 0.0) + 0.18) * 0.5 + drift + uSeed;
  vec2 streakUv = vec2(uv.x * 0.55 + uv.y * 0.25, uv.y * 2.4 - uv.x * 0.4);
  float c = fbm(streakUv * 1.3) + 0.25 * fbm(uv * 5.0);
  float band = smoothstep(0.06, 0.2, h) * smoothstep(1.0, 0.35, h);
  float thr = 0.78 - uCover * 0.32;
  float cloud = smoothstep(thr, thr + 0.12, c) * band * (1.0 - over * 0.5);
  float lit = clamp(0.35 + 0.65 * smoothstep(thr, thr + 0.35, c) - (1.0 - h) * 0.15, 0.0, 1.0);
  vec3 cloudCol = mix(uCloudShade, uCloudLit, lit);
  cloudCol += uSun * pow(s, 3.0) * 0.15 * uSunDisc;
  // after dark, clouds low down take the city's light from below
  cloudCol += uCityGlowColor * uCityGlow * exp(-max(h, 0.0) * 5.0) * 0.12;
  col = mix(col, mix(uCloudLit, uCloudShade, 0.35 + 0.4 * smoothstep(0.0, 0.8, h)), over * 0.82 * smoothstep(-0.15, 0.12, h));
  col = mix(col, cloudCol, cloud * 0.9);
  // in haze the sky low down is the air's own colour
  col = mix(col, uHaze, uHazeAmt * (1.0 - smoothstep(-0.02, 0.32, h)));
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

/** The sky dome for one place. The caller disposes its geometry; the material is shared (materials.ts). */
export function buildSkyDome(o: { seed: number; radius: number }): THREE.Mesh {
  const sunDir = new THREE.Vector3(...SKY_DEFAULTS.sunDir).normalize();
  const material = shared(materialKey("sky", `dome:${o.seed}`), () => {
    const r = rng(o.seed);
    const uniforms: SkyUniforms = {
      uTime: { value: 0 },
      uSeed: { value: new THREE.Vector2(r() * 50, r() * 50) },
      uTop: { value: new THREE.Color(SKY_DEFAULTS.top) },
      uHorizon: { value: new THREE.Color(SKY_DEFAULTS.horizon) },
      uSun: { value: new THREE.Color(SKY_DEFAULTS.sun) },
      uSunDir: { value: sunDir.clone() },
      uCloudLit: { value: new THREE.Color(SKY_DEFAULTS.cloudLit) },
      uCloudShade: { value: new THREE.Color(SKY_DEFAULTS.cloudShade) },
      uCover: { value: 0.35 },
      uSunDisc: { value: 1 },
      uMoon: { value: 0 },
      uStars: { value: 0 },
      uHaze: { value: new THREE.Color(SKY_DEFAULTS.horizon) },
      uHazeAmt: { value: 0 },
      uCityGlow: { value: 0 },
      uCityGlowColor: { value: new THREE.Color(SKY_DEFAULTS.cityGlowColor) },
    };
    const m = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    });
    m.customProgramCacheKey = () => materialKey("sky", "dome");
    return m;
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(o.radius, 32, 16), material);
  sky.renderOrder = -1;
  sky.frustumCulled = false;
  sky.name = "sky";
  sky.userData.atmos = "sky";
  sky.userData.sunDir = sunDir; // the place's own, which the sun's height is measured against
  // always centred on the camera drawing it, so it's always at the horizon
  sky.onBeforeRender = (_renderer, _scene, camera) => {
    sky.position.setFromMatrixPosition(camera.matrixWorld);
    if (sky.parent) sky.parent.worldToLocal(sky.position);
    sky.updateMatrixWorld();
  };
  return sky;
}
