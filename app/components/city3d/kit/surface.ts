import * as THREE from "three";
import { shared } from "./materials";
import { envUniforms, glowOn, materialKey, neonUniforms, poolUniforms, POOLS, shadeUniforms } from "./uniforms";

// The city's one lit material: three's Lambert, plus what the park's paint
// (world3d/paint.ts) did for weather and distance, kept plain enough for a
// city:
//
// - fog: three's fog, with the depth scaled per material (`fogScale` > 1:
//   far scenery takes more of it), FOG_FRAGMENT below, shared with the
//   towers' windows (windows.ts)
// - rain and snow (envUniforms, driven by the atmosphere): a wet surface
//   darkens, and what faces up holds shallow puddles and catches a little
//   of the sky at a glancing angle; snow lies in drifts on what faces up
//   (only on materials made with `snow: true`)
// - grime: darker toward the ground and in streaks down the walls
// - a soft colour variation in world space, so no wall is a flat fill (the
//   plates are painted)
//
// One program for every surface: every option is a uniform, never a define,
// so the customProgramCacheKey is the same ("surface:lit") whatever the
// colour, and the weather blending never compiles anything. Equal options
// give the same material (materials.ts: shared).

/** three's fog, with the fog depth scaled by `uFogScale` (from the park's paint.ts) */
export const FOG_FRAGMENT = /* glsl */ `
#ifdef USE_FOG
  #ifdef FOG_EXP2
    float fogFactor = 1.0 - exp(-fogDensity * fogDensity * vFogDepth * vFogDepth * uFogScale * uFogScale);
  #else
    float fogFactor = smoothstep(fogNear, fogFar, vFogDepth * uFogScale);
  #endif
  gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, fogFactor);
#endif
`;

/** World position and world normal into the fragment shader, instancing included (appended after project_vertex) */
export const WORLD_VARYINGS_VERTEX = /* glsl */ `
{
  vec4 kitWorld = vec4(transformed, 1.0);
  vec3 kitN = objectNormal;
  #ifdef USE_INSTANCING
    kitWorld = instanceMatrix * kitWorld;
    mat3 kitIm = mat3(instanceMatrix);
    // the inverse transpose of a rotation × scale: divide by the scale twice
    kitN = kitIm * (kitN / vec3(dot(kitIm[0], kitIm[0]), dot(kitIm[1], kitIm[1]), dot(kitIm[2], kitIm[2])));
  #endif
  kitWorld = modelMatrix * kitWorld;
  vKitWorld = kitWorld.xyz;
  vKitNormal = normalize(mat3(modelMatrix) * kitN);
}
`;

const NOISE = /* glsl */ `
float kit_hash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float kit_noise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(kit_hash(i), kit_hash(i + vec3(1, 0, 0)), f.x), mix(kit_hash(i + vec3(0, 1, 0)), kit_hash(i + vec3(1, 1, 0)), f.x), f.y),
    mix(mix(kit_hash(i + vec3(0, 0, 1)), kit_hash(i + vec3(1, 0, 1)), f.x), mix(kit_hash(i + vec3(0, 1, 1)), kit_hash(i + vec3(1, 1, 1)), f.x), f.y),
    f.z);
}
`;

export type SurfaceOptions = {
  color: string;
  map?: THREE.Texture;
  wet?: number; // how much rain shows: 0 none .. 1 (the default)
  snow?: boolean; // whether snow lies on what faces up
  grime?: number; // 0 (the default) .. 1
  fogScale?: number; // fog as if this many times farther away (far scenery > 1); 1 by default
  relief?: Relief; // a facade's carving, drawn in the shader (below)
  // after dark it glows in `tone` (a colour) × `strength`, rising with the
  // neon (as neon.ts: litSurface does), the relief's carving in the glow:
  // for floodlit stone

  glow?: { tone: string; strength: number };
};

// A facade's relief, drawn in the fragment shader on what faces sideways
// (no geometry, so no triangles): enough for a floodlight or the sun to
// have something to catch.
// - stone: pilasters every `bay` (lighter, edged by a dark seam), a
//   cornice at every `floor` (a lit top, a shadow under it), and a
//   lighter surround round a darker recess between the pilasters
// - brick: courses `course` high of bricks `length` long, staggered,
//   each a little different, in lighter mortar
// All world units; it fades out where it would be finer than a pixel.
// `strength` 0..1 (0.6 by default).
export type Relief = { kind: "stone"; bay: number; floor: number; strength?: number } | { kind: "brick"; course: number; length: number; strength?: number };
const reliefVector = (r?: Relief): [number, number, number, number] =>
  !r ? [0, 0, 0, 0] : r.kind === "stone" ? [1, r.bay, r.floor, r.strength ?? 0.6] : [2, r.length, r.course, r.strength ?? 0.6];

// The relief, the day shade and the light pools, in GLSL: after the
// colour (relief, shade), and added to the outgoing light (pools)
const RELIEF_GLSL = /* glsl */ `
if (uRelief.x > 0.5 && abs(n.y) < 0.5) {
  vec2 tng = normalize(vec2(-n.z, n.x) + 1e-5);
  float s = dot(vKitWorld.xz, tng);
  float y = vKitWorld.y;
  float k = uRelief.w;
  if (uRelief.x < 1.5) {
    float bay = uRelief.y;
    float fl = uRelief.z;
    float fade = 1.0 - smoothstep(0.08, 0.3, fwidth(s) / bay);
    float px = fract(s / bay);
    float edge = min(px, 1.0 - px) * bay;
    float pil = 1.0 - smoothstep(0.05 * bay, 0.07 * bay, edge);
    float seam = smoothstep(0.06 * bay, 0.075 * bay, edge) * (1.0 - smoothstep(0.08 * bay, 0.1 * bay, edge));
    float fy = fract(y / fl);
    float cornice = 1.0 - smoothstep(0.03, 0.06, fy);
    float under = smoothstep(0.9, 0.97, fy);
    vec2 wq = vec2(abs(px - 0.5) / 0.3, abs(fy - 0.55) / 0.26);
    float win = max(wq.x, wq.y);
    float surround = (1.0 - smoothstep(0.98, 1.0, win)) * smoothstep(0.78, 0.82, win);
    float recess = 1.0 - smoothstep(0.76, 0.8, win);
    float lift = pil * 0.16 + cornice * 0.22 + surround * 0.14 - seam * 0.3 - under * 0.32 - recess * 0.12;
    kitRelief = 1.0 + lift * k * fade * 1.6;
    diffuseColor.rgb *= 1.0 + lift * k * fade;
  } else {
    float len = uRelief.y;
    float course = uRelief.z;
    float fade = 1.0 - smoothstep(0.12, 0.45, fwidth(y) / course);
    float row = floor(y / course);
    float bx = s / len + 0.5 * mod(row, 2.0);
    float col = floor(bx);
    float my = fract(y / course);
    float mx = fract(bx);
    float mortar = max(1.0 - smoothstep(0.0, 0.14, min(my, 1.0 - my) * 2.0), 1.0 - smoothstep(0.0, 0.07, min(mx, 1.0 - mx) * 2.0));
    float tone = kit_hash(vec3(col, row, 7.0)) - 0.5;
    vec3 brick = diffuseColor.rgb * (1.0 + tone * 0.22);
    vec3 lime = mix(diffuseColor.rgb, vec3(0.62, 0.6, 0.56), 0.55);
    diffuseColor.rgb = mix(diffuseColor.rgb, mix(brick, lime, mortar), k * fade);
    kitRelief = 1.0 + (tone * 0.3 - mortar * 0.25) * k * fade;
  }
}
if (uShadeOn > 0.001 && uShade.x > 0.5) {
  vec2 xz = vKitWorld.xz;
  vec4 b = uShadeBox;
  if (xz.x > b.x && xz.x < b.z && xz.y > b.y && xz.y < b.w && vKitWorld.y < uShadeDir.z) {
    float along = dot(xz, normalize(uShadeDir.xy));
    float sh;
    if (uShade.x < 1.5) {
      float f = fract(along / uShade.z);
      sh = smoothstep(uShade.w - 0.06, uShade.w + 0.02, f) * (1.0 - smoothstep(0.96, 1.0, f));
    } else if (uShade.x < 2.5) {
      float d = kit_noise(vec3(xz / uShade.z, 1.7)) * 0.7 + kit_noise(vec3(xz / uShade.z * 2.7, 5.1)) * 0.3;
      sh = smoothstep(uShade.w - 0.07, uShade.w + 0.07, d);
    } else {
      sh = smoothstep(-0.03, 0.03, along - uShade.z);
    }
    float onWalls = mix(uShadeDir.w, 1.0, smoothstep(0.35, 0.9, n.y));
    diffuseColor.rgb *= 1.0 - sh * uShade.y * uShadeOn * onWalls;
  }
}`;

const POOLS_GLSL = /* glsl */ `
if (uPoolsOn > 0.001) {
  vec3 pn = normalize(vKitNormal);
  vec3 glowAdd = vec3(0.0);
  for (int i = 0; i < ${POOLS}; i++) {
    vec4 p = uPools[i];
    if (p.w <= 0.0) continue;
    vec3 d = p.xyz - vKitWorld;
    float r = length(d);
    float k = 1.0 - smoothstep(0.0, p.w, r);
    float facing = 0.3 + 0.7 * max(dot(pn, d / max(r, 1e-4)), 0.0);
    glowAdd += uPoolTones[i] * k * k * facing;
  }
  outgoingLight += glowAdd * diffuseColor.rgb * uPoolsOn * uGlowOn;
}`;

export function surface(o: SurfaceOptions): THREE.MeshLambertMaterial {
  const variant = [o.color, o.map?.uuid ?? "", o.wet ?? 1, o.snow ? 1 : 0, o.grime ?? 0, o.fogScale ?? 1, reliefVector(o.relief).join(","), o.glow ? `${o.glow.tone}*${o.glow.strength}` : ""].join("|");
  return shared(materialKey("surface", variant), () => {
    const m = new THREE.MeshLambertMaterial({ color: o.color, map: o.map ?? null });
    const uniforms = {
      uWetAmt: { value: o.wet ?? 1 },
      uSnowAmt: { value: o.snow ? 1 : 0 },
      uGrime: { value: o.grime ?? 0 },
      uFogScale: { value: o.fogScale ?? 1 },
      uRelief: { value: new THREE.Vector4(...reliefVector(o.relief)) },
      uLitTone: { value: new THREE.Color(o.glow?.tone ?? "#000000") },
      uLitStrength: { value: o.glow?.strength ?? 0 },
    };
    m.userData.surface = uniforms;
    m.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms, envUniforms, poolUniforms, shadeUniforms, { uGlowOn: glowOn, uNeon: neonUniforms.uNeon });
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", `#include <common>\nvarying vec3 vKitWorld;\nvarying vec3 vKitNormal;`)
        .replace("#include <project_vertex>", `#include <project_vertex>\n${WORLD_VARYINGS_VERTEX}`);
      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          `#include <common>
varying vec3 vKitWorld;
varying vec3 vKitNormal;
uniform float uWetAmt;
uniform float uSnowAmt;
uniform float uGrime;
uniform float uFogScale;
uniform float uWet;
uniform float uSnow;
uniform float uNight;
uniform vec4 uRelief;
uniform vec3 uLitTone;
uniform float uLitStrength;
uniform float uNeon;
uniform vec4 uPools[${POOLS}];
uniform vec3 uPoolTones[${POOLS}];
uniform float uPoolsOn;
uniform float uGlowOn;
uniform float uShadeOn;
uniform vec4 uShade;
uniform vec4 uShadeBox;
uniform vec4 uShadeDir;
${NOISE}`,
        )
        .replace(
          "#include <color_fragment>",
          `#include <color_fragment>
float kitWet = 0.0;
float kitRelief = 1.0;
{
  vec3 n = normalize(vKitNormal);
  float up = smoothstep(0.35, 0.9, n.y);
  float v1 = kit_noise(vKitWorld * 0.9);
  float v2 = kit_noise(vKitWorld * 4.3 + 3.1);
  diffuseColor.rgb *= 1.0 + (v1 - 0.5) * 0.14 + (v2 - 0.5) * 0.05;
  ${RELIEF_GLSL}
  if (uGrime > 0.0) {
    float low = 1.0 - smoothstep(0.0, 1.2, vKitWorld.y);
    float streak = kit_noise(vec3(vKitWorld.x * 4.0, vKitWorld.y * 0.35, vKitWorld.z * 4.0));
    float g = low * 0.7 + smoothstep(0.55, 0.85, streak) * 0.45 * (1.0 - up);
    diffuseColor.rgb *= 1.0 - clamp(g * uGrime, 0.0, 0.65) * 0.55;
  }
  float wet = uWet * uWetAmt;
  if (wet > 0.0) {
    float puddle = smoothstep(0.56, 0.7, kit_noise(vKitWorld * 0.32 + 4.0)) * up;
    diffuseColor.rgb *= 1.0 - wet * (0.16 + 0.14 * up + 0.14 * puddle);
    kitWet = wet * up * (0.3 + 0.7 * puddle);
  }
  float snow = uSnow * uSnowAmt;
  if (snow > 0.0) {
    float drift = kit_noise(vKitWorld * 0.55 + 13.0) * 0.62 + kit_noise(vKitWorld * 1.4 + 2.0) * 0.3 + (v2 - 0.5) * 0.12;
    float cover = smoothstep(0.5, 0.92, n.y) * smoothstep(0.52 - snow * 0.36, 0.74 - snow * 0.2, drift);
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.86, 0.89, 0.94), cover * 0.88);
  }
}`,
        )
        .replace(
          "#include <opaque_fragment>",
          `${POOLS_GLSL}
if (uLitStrength > 0.0) outgoingLight += uLitTone * uLitStrength * smoothstep(0.35, 1.0, uNeon) * kitRelief;
if (kitWet > 0.0) {
  // a wet surface that faces up catches the sky at a glancing angle: a sheen, not a mirror
  float facing = clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0);
  vec3 skyLight = vec3(0.5, 0.55, 0.62);
  #if NUM_HEMI_LIGHTS > 0
    skyLight = hemisphereLights[0].skyColor;
  #endif
  outgoingLight += skyLight * pow(1.0 - facing, 4.0) * kitWet * 0.22;
}
#include <opaque_fragment>`,
        )
        .replace("#include <fog_fragment>", FOG_FRAGMENT);
    };
    m.customProgramCacheKey = () => materialKey("surface", "lit");
    return m;
  });
}
