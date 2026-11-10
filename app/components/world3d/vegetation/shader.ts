import * as THREE from "three";
import { envUniforms } from "../environment";
import { windUniforms } from "../paint";

// The shading every leaf and blade shares: a lit Lambert material whose
// colour is chosen by how much light reaches it, in three broad bands the
// way a background painter blocks in foliage: a light yellow-green (or the
// autumn colour) where the sun lands, a muted middle, and a deep teal
// shade. The bands follow the scene's real lights and shadows, so a dull
// sky, dusk or night moves the whole tree toward its shade colours rather
// than keeping a baked sunny look. Weather reaches it through the shared
// environment uniforms: rain darkens and sheens, snow settles on what
// faces up, night cools and dims.
//
// Wind moves whole clusters and clumps, not single vertices, so masses
// keep their shape; it runs on the world's wind clock (paint.ts), which
// stops in still view.

export type Ramp = { light: THREE.ColorRepresentation; mid: THREE.ColorRepresentation; shadow: THREE.ColorRepresentation };

const VERTEX = /* glsl */ `
uniform float uTime;
uniform float uGust;
uniform vec2 uGustDir;
uniform float uVegAmp;
uniform float uVegHeight;
// xyz: the point this vertex sways with (its cluster's centre), local;
// w: how open to the sky it is (foliage) or how far up the blade (grass)
attribute vec4 aVeg;
#ifndef VEG_GRASS
// A rim card's corner, in metres, turned to face the eye (zero for the
// solid part of a cluster)
attribute vec2 aCard;
#endif
varying float vVegShade;
varying float vVegUp;
varying vec3 vVegWorld;

vec3 vegWind(vec3 at, float h) {
  float t = uTime;
  // A shared slow breath, a sway, and a gust that travels across the
  // world as a wave; phases come from where things stand, so neighbours
  // move together and distant ones don't
  float breath = sin(t * 0.35 + at.x * 0.05 + at.z * 0.04) * 0.3;
  float sway = sin(t * 0.9 + at.x * 0.31 + at.z * 0.23) * 0.55 + sin(t * 1.7 + at.x * 0.83 - at.z * 0.61) * 0.22;
  float wave = 0.55 + 0.45 * sin(t * 1.1 - dot(at.xz, uGustDir) * 0.18);
  vec2 dir = normalize(uGustDir + vec2(0.25 * sin(t * 0.21), 0.0));
  vec3 d = vec3(dir.x, 0.0, dir.y) * ((sway + breath) * 0.3 + uGust * wave) * uVegAmp * h;
  d.y -= length(d) * 0.3;
  return d;
}
`;

const PROJECT = /* glsl */ `
vec4 mvPosition = vec4(transformed, 1.0);
#ifdef USE_INSTANCING
  mvPosition = instanceMatrix * mvPosition;
#endif
vec4 vegWorld = modelMatrix * mvPosition;
#ifdef VEG_GRASS
  // A clump bends from its root: the tips travel, the base stays put
  vec3 vegAt = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  float vegTall = length(instanceMatrix[1].xyz);
  vegWorld.xyz += vegWind(vegAt, aVeg.w * aVeg.w) * vegTall;
  // Lower in the tuft, less sky
  vVegShade = mix(0.62, 1.0, aVeg.w);
  vVegUp = aVeg.w;
#else
  // A cluster sways as one mass, more toward the top of the tree, and
  // breathes a little around its centre
  vec3 vegAt = (modelMatrix * vec4(aVeg.xyz, 1.0)).xyz;
  float vegH = clamp(aVeg.y / uVegHeight, 0.0, 1.4);
  vegWorld.xyz += vegWind(vegAt, vegH * vegH);
  vegWorld.xyz += (vegWorld.xyz - vegAt) * 0.03 * sin(uTime * 1.9 + vegAt.x * 1.7 + vegAt.z * 1.3) * (0.3 + uGust) * step(0.001, uVegAmp);
  vVegShade = aVeg.w;
  vVegUp = 1.0;
#endif
vVegWorld = vegWorld.xyz;
mvPosition = viewMatrix * vegWorld;
#ifndef VEG_GRASS
  // Rim cards always face the eye, so every outline breaks into leafy lobes
  mvPosition.xy += aCard * length(modelMatrix[0].xyz);
#endif
gl_Position = projectionMatrix * mvPosition;
`;

const FRAGMENT = /* glsl */ `
uniform vec3 uRampLight;
uniform vec3 uRampMid;
uniform vec3 uRampShadow;
uniform vec3 uVegGround;
uniform float uWet;
uniform float uSnow;
uniform float uNight;
varying float vVegShade;
varying float vVegUp;
varying vec3 vVegWorld;
float veg_hash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float veg_noise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(veg_hash(i), veg_hash(i + vec3(1, 0, 0)), f.x), mix(veg_hash(i + vec3(0, 1, 0)), veg_hash(i + vec3(1, 1, 0)), f.x), f.y),
    mix(mix(veg_hash(i + vec3(0, 0, 1)), veg_hash(i + vec3(1, 0, 1)), f.x), mix(veg_hash(i + vec3(0, 1, 1)), veg_hash(i + vec3(1, 1, 1)), f.x), f.y),
    f.z);
}
`;

// The light each band is painted for: light arriving (after Lambert's
// 1/pi) in the park's low sun is about 0.3 in shade and 1 in full sun
const SHADE = /* glsl */ `
{
  vec3 vegBase = max(diffuseColor.rgb, vec3(0.04));
  vec3 vegIrr = outgoingLight / vegBase;
#if NUM_DIR_LIGHTS > 0
  // Against the sun, the outer leaves glow with light coming through them
  float vegBack = pow(saturate(dot(-normalize(vViewPosition), directionalLights[0].direction)), 4.0);
  vegIrr += directionalLights[0].color * RECIPROCAL_PI * vegBack * 0.55 * vVegShade * vVegShade;
#endif
  float vegLum = dot(vegIrr, vec3(0.299, 0.587, 0.114));
  float vegN = veg_noise(vVegWorld * 0.55);
  // Dabs: where light meets shade the edge breaks into leafy patches
  // instead of a clean CG terminator (flat areas of one band are untouched)
  float dab = veg_noise(vVegWorld * 3.1) * 0.65 + veg_noise(vVegWorld * 6.7 + 4.0) * 0.35;
  float s = vegLum * vVegShade * (0.9 + 0.2 * vegN) * (0.78 + 0.44 * dab);
#ifdef VEG_GRASS
  // Patches of grass a shade lighter or darker move between bands as a whole
  s *= dot(vegBase, vec3(0.299, 0.587, 0.114)) * 1.08;
#endif
  float t1 = smoothstep(0.185, 0.245, s);
  float t2 = smoothstep(0.5, 0.58, s);
  vec3 target = mix(mix(uRampShadow, uRampMid, t1), uRampLight, t2);
  float ref = mix(mix(0.19, 0.38, t1), 0.8, t2);
  // The band's colour, in the light's own colour, with the light's
  // strength softened so each band stays one broad tone
  vec3 vegTint = mix(vec3(1.0), vegIrr / max(vegLum, 1e-4), 0.6);
  vec3 col = target * vegBase * vegTint * pow(vegLum / ref, 0.6);
#ifdef VEG_GRASS
  // Roots go into the ground: the base of a blade takes the ground's colour
  col = mix(uVegGround * vegIrr, col, smoothstep(0.0, 0.45, vVegUp));
#endif
  // Dull weather mutes the colour: when the sun's share of the light falls
  // (overcast, rain, snow: the atmosphere dims the sun and lifts the sky),
  // or things are wet, greens and autumn colours lose their saturation and
  // a little brightness, as they do on a grey day. In the park's clear or
  // neutral light the sun is about two thirds of it, and nothing changes.
  float vegMute = uWet;
#if NUM_DIR_LIGHTS > 0 && NUM_HEMI_LIGHTS > 0
  {
    float sunL = dot(directionalLights[0].color, vec3(0.299, 0.587, 0.114));
    float skyL = dot(hemisphereLights[0].skyColor, vec3(0.299, 0.587, 0.114));
    vegMute = max(vegMute, 1.0 - smoothstep(0.36, 0.6, sunL / max(sunL + skyL, 1e-4)));
  }
#endif
#ifdef VEG_GRASS
  // (grass most: it's the largest, most saturated area of colour)
  vec2 vegMuting = vec2(0.42, 0.2);
#else
  vec2 vegMuting = vec2(0.3, 0.08);
#endif
  float vegGrey = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(col, vegGrey * vec3(0.94, 1.0, 1.05), vegMute * vegMuting.x) * (1.0 - vegMute * vegMuting.y);
  vec3 wN = normalize((vec4(normal, 0.0) * viewMatrix).xyz);
  // Rain: darker, and a sheen at grazing angles
  float wet = uWet;
  col *= 1.0 - 0.22 * wet;
  float graze = pow(1.0 - abs(dot(normal, normalize(vViewPosition))), 4.0);
  col += vegIrr * wet * 0.18 * graze * vec3(0.85, 0.95, 1.0);
  // Snow settles on what faces up (and on the tips of the grass)
  float up = smoothstep(0.25, 0.8, wN.y);
#ifdef VEG_GRASS
  up = max(up, smoothstep(0.55, 1.0, vVegUp));
#endif
  float snow = uSnow * up * smoothstep(0.25, 0.6, vegN + uSnow * 0.35);
  col = mix(col, vec3(0.93, 0.96, 1.0) * vegIrr * 1.15, snow * 0.9);
  // Night: dimmer, cooler, less colour
  float grey = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(col, grey * vec3(0.8, 0.95, 1.15), uNight * 0.45) * (1.0 - uNight * 0.15);
  outgoingLight = col;
}
`;

type VegOptions = {
  ramp: Ramp;
  map?: THREE.Texture | null;
  grass?: boolean;
  wind: { amp: number; height: number };
  ground?: THREE.ColorRepresentation;
  coverage?: boolean; // alpha-to-coverage for the cut-out edges (default on)
};

function vegUniforms(o: VegOptions) {
  return {
    uRampLight: { value: new THREE.Color(o.ramp.light) },
    uRampMid: { value: new THREE.Color(o.ramp.mid) },
    uRampShadow: { value: new THREE.Color(o.ramp.shadow) },
    uVegGround: { value: new THREE.Color(o.ground ?? "#6e7a3e") },
    uVegAmp: { value: o.wind.amp },
    uVegHeight: { value: Math.max(o.wind.height, 0.01) },
  };
}

const vertexChunks = (s: string, grass: boolean) =>
  s
    .replace("#include <common>", `#include <common>\n${grass ? "#define VEG_GRASS" : ""}\n${VERTEX}`)
    .replace("#include <project_vertex>", PROJECT);

// The foliage's and the grass's own material
export function vegMaterial(o: VegOptions): THREE.MeshLambertMaterial {
  const material = new THREE.MeshLambertMaterial({
    color: "#ffffff",
    map: o.map ?? null,
    alphaTest: o.map ? 0.5 : 0,
    side: THREE.DoubleSide,
  });
  // Cut-out edges are drawn as soft coverage with the multisampled target
  material.alphaToCoverage = !!o.map && o.coverage !== false;
  const uniforms = vegUniforms(o);
  material.userData.veg = uniforms;
  const grass = !!o.grass;
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms, windUniforms, envUniforms);
    shader.vertexShader = vertexChunks(shader.vertexShader, grass);
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>\n${grass ? "#define VEG_GRASS" : ""}\n${FRAGMENT}`)
      // Both faces of a card or blade are lit as the mass they belong to,
      // not flipped when seen from behind
      .replace("#include <normal_fragment_begin>", "#include <normal_fragment_begin>\nnormal = normalize(vNormal);\nnonPerturbedNormal = normal;")
      .replace("#include <opaque_fragment>", `${SHADE}\n#include <opaque_fragment>`);
  };
  material.customProgramCacheKey = () => `veg:${grass ? "g" : "f"}`;
  return material;
}

// Its shadow moves and is cut the same way
export function vegDepth(source: THREE.MeshLambertMaterial): THREE.MeshDepthMaterial {
  const depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: source.map, alphaTest: source.alphaTest });
  const uniforms = source.userData.veg;
  const grass = source.customProgramCacheKey() === "veg:g";
  depth.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms, windUniforms);
    shader.vertexShader = vertexChunks(shader.vertexShader, grass);
  };
  depth.customProgramCacheKey = () => `vegdepth:${grass ? "g" : "f"}`;
  return depth;
}

export function vegMesh(geometry: THREE.BufferGeometry, material: THREE.MeshLambertMaterial, cast: boolean) {
  const m = new THREE.Mesh(geometry, material);
  m.castShadow = cast;
  m.receiveShadow = true;
  if (cast) m.customDepthMaterial = (material.userData.depth ??= vegDepth(material));
  return m;
}

// For trying the weather's effect on the vegetation from the browser
// console in development (S's atmosphere code drives them for real)
if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
  (window as unknown as { __env: typeof envUniforms }).__env = envUniforms;
}
