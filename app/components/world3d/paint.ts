import * as THREE from "three";
import { envUniforms } from "./environment";

// The world's one surface: a Lambert material made to look painted.
//
// - brush: soft colour variation in world space, like gouache laid on in
//   patches, so no surface is a flat fill
// - moss: grows on faces that look up, in patches
// - grime: darkens surfaces near the ground and in streaks below ledges
// - light: shadows lean cool and green, lit sides warm, and the shading
//   steps a little, the way a painter blocks in light and shade
// - wind: geometry bends by its height and its place in the world, so
//   each branch, bush and blade moves on its own; gusts travel across the
//   world as waves (see windUniforms)
// - weather and the hour (environment.ts, driven by atmosphere/): wet
//   surfaces darken, and those that face up catch a little of the sky;
//   snow lies in drifts on what faces up; lit windows and lamps glow
//   brighter as night comes (`glow`)

// Shared by every material: time, and the gust coming through
export const windUniforms = {
  uTime: { value: 0 },
  uGust: { value: 0 },
  uGustDir: { value: new THREE.Vector2(0.86, -0.5) },
};

const NOISE = /* glsl */ `
float ph_hash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float ph_noise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(ph_hash(i), ph_hash(i + vec3(1, 0, 0)), f.x), mix(ph_hash(i + vec3(0, 1, 0)), ph_hash(i + vec3(1, 1, 0)), f.x), f.y),
    mix(mix(ph_hash(i + vec3(0, 0, 1)), ph_hash(i + vec3(1, 0, 1)), f.x), mix(ph_hash(i + vec3(0, 1, 1)), ph_hash(i + vec3(1, 1, 1)), f.x), f.y),
    f.z);
}
float ph_fbm(vec3 p) {
  float a = 0.5;
  float s = 0.0;
  for (int i = 0; i < 4; i++) {
    s += a * ph_noise(p);
    p = p * 2.03 + 11.7;
    a *= 0.5;
  }
  return s;
}
`;

const WIND = /* glsl */ `
uniform float uTime;
uniform float uGust;
uniform vec2 uGustDir;
uniform float uWindAmp;
uniform float uWindBase;
uniform float uWindHeight;
uniform float uFlutter;

vec3 ph_wind(vec3 world, float localY) {
  float h = clamp((localY - uWindBase) / uWindHeight, 0.0, 1.6);
  h *= h;
  float t = uTime;
  // A slow breath the whole crown shares, a sway, a secondary, and for
  // leaves and grass a flutter made of two beats that never line up.
  // Phases come from the world position, so no two trees move in step,
  // and branches on one tree lead and lag each other.
  float breath = sin(t * 0.35 + world.x * 0.05 + world.z * 0.04) * 0.3;
  float sway = sin(t * 0.9 + world.x * 0.31 + world.z * 0.23) * 0.55
    + sin(t * 1.7 + world.x * 0.83 - world.z * 0.61) * 0.25
    + sin(t * 2.9 + world.x * 1.9 + world.y * 1.1) * sin(t * 2.3 + world.z * 1.7 - world.y * 0.7) * 0.28 * uFlutter;
  // A gust is a wave moving across the world; it builds, holds and dies
  // away (World3D.tsx), and leans the crown more than the trunk
  float wave = 0.55 + 0.45 * sin(t * 1.1 - dot(world.xz, uGustDir) * 0.18);
  float gust = uGust * wave * (0.7 + 0.3 * h);
  vec2 dir = normalize(uGustDir + vec2(0.25 * sin(t * 0.21), 0.0));
  vec3 d = vec3(dir.x, 0.0, dir.y) * ((sway + breath) * 0.3 + gust) * uWindAmp * h;
  // Leaves lift a little as they turn in the wind, and droop as it drops
  d.y += (sin(t * 1.3 + world.x * 0.9 + world.z * 0.5) * 0.12 * uFlutter - length(d) * 0.3);
  return d;
}
`;

// Replaces three's project_vertex so wind is applied in world space
const PROJECT = /* glsl */ `
vec4 mvPosition = vec4(transformed, 1.0);
#ifdef USE_INSTANCING
  mvPosition = instanceMatrix * mvPosition;
#endif
vec4 ph_world = modelMatrix * mvPosition;
#ifdef PH_WIND
  ph_world.xyz += ph_wind(ph_world.xyz, transformed.y);
#endif
#ifdef PH_PAINT
  vPhWorld = ph_world.xyz;
#endif
mvPosition = viewMatrix * ph_world;
gl_Position = projectionMatrix * mvPosition;
`;

export type PaintOptions = {
  color?: THREE.ColorRepresentation;
  map?: THREE.Texture | null;
  alphaMap?: THREE.Texture | null;
  alphaTest?: number;
  alphaToCoverage?: boolean; // soft cut-out edges, with a multisampled target
  vertexColors?: boolean;
  emissive?: THREE.ColorRepresentation;
  emissiveIntensity?: number;
  emissiveMap?: THREE.Texture | null;
  transparent?: boolean;
  opacity?: number;
  side?: THREE.Side;
  depthWrite?: boolean;
  brush?: number; // 0 to ~0.5
  brushScale?: number; // patches per metre
  moss?: number; // 0 to 1
  grime?: number; // 0 to 1
  grimeHeight?: number; // metres
  rust?: number; // 0 to 1: rust blooms (for painted metal)
  wind?: { amp: number; base?: number; height?: number; flutter?: number };
  fog?: boolean;
  // How strongly the emissive glows by day and at night (a multiplier on
  // emissiveIntensity, following envUniforms.uNight): a lit window is
  // { day: 1, night: 2.4 }, a lamp that's only on at night { day: 0, night: 1 }
  glow?: { day?: number; night?: number };
  // How much rain and snow show on this surface (0 none .. 1, the default)
  wet?: number;
  snow?: number;
};

const mossColor = new THREE.Color("#5f7a3a");

export function paint(options: PaintOptions = {}): THREE.MeshLambertMaterial {
  const material = new THREE.MeshLambertMaterial({
    color: options.color ?? "#ffffff",
    map: options.map ?? null,
    alphaMap: options.alphaMap ?? null,
    alphaTest: options.alphaTest ?? 0,
    vertexColors: options.vertexColors ?? false,
    emissive: options.emissive ?? "#000000",
    emissiveIntensity: options.emissiveIntensity ?? 1,
    emissiveMap: options.emissiveMap ?? null,
    transparent: options.transparent ?? false,
    opacity: options.opacity ?? 1,
    side: options.side ?? THREE.FrontSide,
    depthWrite: options.depthWrite ?? true,
    fog: options.fog ?? true,
  });

  material.alphaToCoverage = options.alphaToCoverage ?? false;

  const uniforms = {
    uBrush: { value: options.brush ?? 0.22 },
    uBrushScale: { value: options.brushScale ?? 0.9 },
    uMoss: { value: options.moss ?? 0 },
    uMossColor: { value: mossColor },
    uGrime: { value: options.grime ?? 0 },
    uGrimeHeight: { value: options.grimeHeight ?? 1.2 },
    uRust: { value: options.rust ?? 0 },
    uWindAmp: { value: options.wind?.amp ?? 0 },
    uWindBase: { value: options.wind?.base ?? 0 },
    uWindHeight: { value: options.wind?.height ?? 1 },
    uFlutter: { value: options.wind?.flutter ?? 0.5 },
    uGlowDay: { value: options.glow?.day ?? 1 },
    uGlowNight: { value: options.glow?.night ?? 1 },
    uWetAmt: { value: options.wet ?? 1 },
    uSnowAmt: { value: options.snow ?? 1 },
  };
  const wind = !!options.wind;
  material.userData.paint = uniforms;

  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms, windUniforms, envUniforms);
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
#define PH_PAINT
${wind ? "#define PH_WIND" : ""}
varying vec3 vPhWorld;
varying vec3 vPhNormal;
${WIND}`,
      )
      .replace("#include <project_vertex>", PROJECT)
      .replace(
        "#include <defaultnormal_vertex>",
        `#include <defaultnormal_vertex>
vPhNormal = normalize(transformedNormal * mat3(viewMatrix));`,
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
varying vec3 vPhWorld;
varying vec3 vPhNormal;
uniform float uBrush;
uniform float uBrushScale;
uniform float uMoss;
uniform vec3 uMossColor;
uniform float uGrime;
uniform float uGrimeHeight;
uniform float uRust;
uniform float uGlowDay;
uniform float uGlowNight;
uniform float uWetAmt;
uniform float uSnowAmt;
uniform float uWet;
uniform float uSnow;
uniform float uNight;
${NOISE}`,
      )
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
totalEmissiveRadiance *= mix(uGlowDay, uGlowNight, uNight);`,
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
float phWet = 0.0;
{
  vec3 p = vPhWorld * uBrushScale;
  float n = ph_fbm(p);
  float n2 = ph_noise(p * 4.7 + 3.1);
  diffuseColor.rgb *= 1.0 + (n - 0.5) * uBrush * 1.6 + (n2 - 0.5) * uBrush * 0.5;
  diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(1.07, 1.0, 0.88), smoothstep(0.5, 0.8, n) * uBrush * 1.5);
  if (uRust > 0.0) {
    float r = ph_fbm(vPhWorld * 3.1 + 5.0);
    float bloom = smoothstep(0.62 - uRust * 0.25, 0.7 - uRust * 0.2, r);
    vec3 rust = mix(vec3(0.3, 0.16, 0.09), vec3(0.48, 0.27, 0.14), n2);
    diffuseColor.rgb = mix(diffuseColor.rgb, rust, bloom * 0.75);
  }
  if (uMoss > 0.0) {
    float up = smoothstep(0.3, 0.85, vPhNormal.y);
    float m = ph_fbm(vPhWorld * 1.4 + 7.0);
    float moss = max(up * smoothstep(0.6 - uMoss * 0.45, 0.72 - uMoss * 0.35, m), smoothstep(0.78 - uMoss * 0.2, 0.84, m) * 0.6);
    diffuseColor.rgb = mix(diffuseColor.rgb, uMossColor * (0.75 + 0.5 * n2), moss * 0.85);
  }
  if (uGrime > 0.0) {
    float low = 1.0 - smoothstep(0.0, uGrimeHeight, vPhWorld.y);
    float streak = ph_noise(vec3(vPhWorld.x * 4.0, vPhWorld.y * 0.35, vPhWorld.z * 4.0));
    float g = low * 0.7 + smoothstep(0.55, 0.85, streak) * 0.45;
    diffuseColor.rgb *= 1.0 - clamp(g * uGrime, 0.0, 0.65) * 0.55;
  }
  // Rain: everything darkens as it soaks; flat ground holds shallow
  // puddles, and what faces up keeps a little sheen (below)
  float wet = uWet * uWetAmt;
  if (wet > 0.0) {
    float up = smoothstep(0.35, 0.9, vPhNormal.y);
    float puddle = smoothstep(0.56, 0.7, ph_noise(vPhWorld * 0.32 + 4.0)) * up;
    diffuseColor.rgb *= 1.0 - wet * (0.16 + 0.12 * up + 0.14 * puddle);
    phWet = wet * up * (0.3 + 0.7 * puddle);
  }
  // Snow: a light cover in drifts on what faces up, thinner where the
  // drift runs out
  float snow = uSnow * uSnowAmt;
  if (snow > 0.0) {
    float up = smoothstep(0.5, 0.92, vPhNormal.y);
    // (two octaves of noise, not four: it covers most of the screen)
    float drift = ph_noise(vPhWorld * 0.55 + 13.0) * 0.62 + ph_noise(vPhWorld * 1.4 + 2.0) * 0.3 + (n2 - 0.5) * 0.12;
    float cover = up * smoothstep(0.62 - snow * 0.3, 0.7 - snow * 0.26, drift);
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.86, 0.89, 0.94), cover * 0.88);
  }
}`,
      )
      .replace(
        "#include <opaque_fragment>",
        `{
  float lum = dot(outgoingLight, vec3(0.299, 0.587, 0.114));
  float base = max(dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114)), 1e-3);
  float shade = lum / base;
  // Light and shade blocked in, the way a background painter lays them:
  // flatter within a band, a soft turn between bands (not a hard step,
  // which drew rings round every lamp's pool and sign's glow)
  float bands = shade * 3.0;
  float stepped = mix(shade, (floor(bands) + smoothstep(0.3, 0.7, fract(bands))) / 3.0, 0.3);
  outgoingLight *= stepped / max(shade, 1e-3);
  // Shade is never grey: it leans blue-green, and holds its colour.
  // Sunlit sides warm up and lift a little.
  vec3 cool = outgoingLight * vec3(0.72, 0.9, 1.14) + diffuseColor.rgb * vec3(0.02, 0.05, 0.09);
  vec3 warm = outgoingLight * vec3(1.1, 1.03, 0.86);
  outgoingLight = mix(cool, warm, smoothstep(0.3, 1.05, shade));
  float grey = dot(outgoingLight, vec3(0.299, 0.587, 0.114));
  outgoingLight = mix(vec3(grey), outgoingLight, 1.12);
  // A wet surface that faces up catches the sky at a glancing angle:
  // restrained, a sheen and not a mirror
  if (phWet > 0.0) {
    float facing = clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0);
    float sheen = pow(1.0 - facing, 4.0);
    vec3 skyLight = vec3(0.5, 0.55, 0.62);
    #if NUM_HEMI_LIGHTS > 0
      skyLight = hemisphereLights[0].skyColor;
    #endif
    outgoingLight += skyLight * sheen * phWet * 0.2;
  }
}
#include <opaque_fragment>`,
      );
  };
  material.customProgramCacheKey = () => `paint:${wind ? "w" : ""}`;
  return material;
}

// The shadow of something that moves in the wind (or is cut out with an
// alpha map) has to move and be cut the same way
export function paintDepth(source: THREE.MeshLambertMaterial): THREE.MeshDepthMaterial {
  const uniforms = source.userData.paint;
  const depth = new THREE.MeshDepthMaterial({
    depthPacking: THREE.RGBADepthPacking,
    alphaMap: source.alphaMap,
    alphaTest: source.alphaTest,
    map: source.alphaMap ? null : source.map,
  });
  const wind = uniforms.uWindAmp.value > 0;
  depth.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms, windUniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>\n${wind ? "#define PH_WIND" : ""}\n${WIND}`)
      .replace("#include <project_vertex>", PROJECT);
  };
  depth.customProgramCacheKey = () => `paintdepth:${wind ? "w" : ""}`;
  return depth;
}

// A mesh in the painted world: material, shadows, and a matching shadow
// for anything that sways or is cut out
export function mesh(
  geometry: THREE.BufferGeometry,
  material: THREE.MeshLambertMaterial,
  { cast = true, receive = true }: { cast?: boolean; receive?: boolean } = {},
): THREE.Mesh {
  const m = new THREE.Mesh(geometry, material);
  m.castShadow = cast;
  m.receiveShadow = receive;
  if (cast && (material.alphaMap || material.alphaTest > 0 || material.userData.paint?.uWindAmp.value > 0)) {
    m.customDepthMaterial = paintDepth(material);
  }
  return m;
}

// For checking the wind from the browser console in development
if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
  (window as unknown as { __wind: typeof windUniforms }).__wind = windUniforms;
}
