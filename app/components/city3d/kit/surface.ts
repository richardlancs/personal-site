import * as THREE from "three";
import { shared } from "./materials";
import { envUniforms, materialKey } from "./uniforms";

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
};

export function surface(o: SurfaceOptions): THREE.MeshLambertMaterial {
  const variant = [o.color, o.map?.uuid ?? "", o.wet ?? 1, o.snow ? 1 : 0, o.grime ?? 0, o.fogScale ?? 1].join("|");
  return shared(materialKey("surface", variant), () => {
    const m = new THREE.MeshLambertMaterial({ color: o.color, map: o.map ?? null });
    const uniforms = {
      uWetAmt: { value: o.wet ?? 1 },
      uSnowAmt: { value: o.snow ? 1 : 0 },
      uGrime: { value: o.grime ?? 0 },
      uFogScale: { value: o.fogScale ?? 1 },
    };
    m.userData.surface = uniforms;
    m.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms, envUniforms);
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
${NOISE}`,
        )
        .replace(
          "#include <color_fragment>",
          `#include <color_fragment>
float kitWet = 0.0;
{
  vec3 n = normalize(vKitNormal);
  float up = smoothstep(0.35, 0.9, n.y);
  float v1 = kit_noise(vKitWorld * 0.9);
  float v2 = kit_noise(vKitWorld * 4.3 + 3.1);
  diffuseColor.rgb *= 1.0 + (v1 - 0.5) * 0.14 + (v2 - 0.5) * 0.05;
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
          `if (kitWet > 0.0) {
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
