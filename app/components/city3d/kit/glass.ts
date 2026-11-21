import * as THREE from "three";
import { shared } from "./materials";
import { toneColor, type SceneTone } from "./neon";
import { FOG_FRAGMENT, WORLD_VARYINGS_VERTEX } from "./surface";
import { materialKey, neonUniforms } from "./uniforms";

// Glass: a kiosk's walls, a platform's glazed canopy, a railing's panes.
// Three's Lambert, transparent, with a little of the sky in it at a
// glancing angle (the hemisphere light's sky colour, as the wet paving's
// sheen takes it) and, if it's lit from inside, the light it holds after
// dark (`glow`: tone × strength, rising with the neon, nothing by day).
//
// One program for every pane ("glass:lit": every option a uniform), drawn
// after the opaque scene, sorted back to front by three, writing no depth;
// single-sided unless `double` (then three draws back faces, then front
// faces: two draw calls a mesh, still sorted). Cheap on every tier: no
// texture, no extra pass, no refraction. Equal options, the same material.

export type GlassOptions = {
  tint: string; // the glass's own colour
  opacity?: number; // 0..1, how much of the tint covers what's behind (0.28 by default)
  sky?: number; // how much of the sky it catches at a glancing angle (0.5 by default)
  glow?: { tone: SceneTone | string; strength: number }; // lit from inside after dark
  double?: boolean; // both faces (a booth seen from round it); single by default
  // a grid of panes in dark glazing bars, in world units: each pane
  // `size[0]` across (along the glass, level) by `size[1]` (up a wall, or
  // across a roof), the bars `bar` wide; none by default (a uniform: the
  // same program). Bars fade out where they'd be finer than a pixel.
  panes?: { size: [number, number]; bar: number };
};

export function glassMaterial(o: GlassOptions): THREE.MeshLambertMaterial {
  const opacity = o.opacity ?? 0.28;
  const sky = o.sky ?? 0.5;
  const glow = o.glow ? toneColor(o.glow.tone) : "#000000";
  const strength = o.glow?.strength ?? 0;
  const panes = o.panes ? [o.panes.size[0], o.panes.size[1], o.panes.bar] : [0, 0, 0];
  const variant = [o.tint, opacity, sky, glow, strength, o.double ? 2 : 1, ...(o.panes ? panes : [])].join("|");
  return shared(materialKey("glass", variant), () => {
    const m = new THREE.MeshLambertMaterial({
      color: o.tint,
      transparent: true,
      opacity,
      depthWrite: false,
      side: o.double ? THREE.DoubleSide : THREE.FrontSide,
    });
    const uniforms = {
      uSkyAmt: { value: sky },
      uGlassGlow: { value: new THREE.Color(glow) },
      uGlassStrength: { value: strength },
      uFogScale: { value: 1 },
      uPanes: { value: new THREE.Vector3(...panes) },
    };
    m.userData.glass = uniforms;
    m.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms, { uNeon: neonUniforms.uNeon });
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", "#include <common>\nvarying vec3 vKitWorld;\nvarying vec3 vKitNormal;")
        .replace("#include <project_vertex>", `#include <project_vertex>\n${WORLD_VARYINGS_VERTEX}`);
      shader.fragmentShader = shader.fragmentShader
        .replace("#include <common>", "#include <common>\nvarying vec3 vKitWorld;\nvarying vec3 vKitNormal;\nuniform float uSkyAmt;\nuniform vec3 uGlassGlow;\nuniform float uGlassStrength;\nuniform float uFogScale;\nuniform float uNeon;\nuniform vec3 uPanes;")
        .replace(
          "#include <opaque_fragment>",
          `float kitBar = 0.0;
if (uPanes.z > 0.0) {
  // the glazing bars: across the glass along its level tangent, and up
  // it (a wall) or across it (a roof: the other level axis)
  vec3 gn = normalize(vKitNormal);
  vec2 tg = normalize(vec2(-gn.z, gn.x) + 1e-5);
  float a = dot(vKitWorld.xz, tg);
  float b = abs(gn.y) > 0.6 ? dot(vKitWorld.xz, vec2(-tg.y, tg.x)) : vKitWorld.y;
  vec2 q = vec2(a / uPanes.x, b / uPanes.y);
  vec2 e = vec2(uPanes.z / uPanes.x, uPanes.z / uPanes.y) * 0.5;
  vec2 d = abs(fract(q + 0.5) - 0.5);
  vec2 fw = fwidth(q);
  vec2 on = 1.0 - smoothstep(e - fw * 0.5, e + fw * 0.5, d);
  vec2 fade = 1.0 - smoothstep(e * 0.6, e * 1.6, fw);
  kitBar = max(on.x * fade.x, on.y * fade.y);
}
{
  float facing = clamp(abs(dot(normalize(normal), normalize(vViewPosition))), 0.0, 1.0);
  float fres = pow(1.0 - facing, 3.0);
  vec3 skyLight = vec3(0.5, 0.58, 0.7);
  #if NUM_HEMI_LIGHTS > 0
    skyLight = hemisphereLights[0].skyColor;
  #endif
  outgoingLight += skyLight * uSkyAmt * (0.12 + 0.6 * fres);
  float lit = smoothstep(0.35, 1.0, uNeon) * uGlassStrength;
  outgoingLight += uGlassGlow * lit;
  // a pane catching the sky, or lit, covers more of what's behind it
  diffuseColor.a = clamp(diffuseColor.a + fres * 0.35 + lit * 0.25, 0.0, 0.95);
  // the bars: dark, nearly opaque, holding none of the sky
  outgoingLight = mix(outgoingLight, vec3(0.035, 0.04, 0.05) + outgoingLight * 0.15, kitBar);
  diffuseColor.a = mix(diffuseColor.a, 0.92, kitBar);
}
#include <opaque_fragment>`,
        )
        .replace("#include <fog_fragment>", FOG_FRAGMENT);
    };
    m.customProgramCacheKey = () => materialKey("glass", "lit");
    return m;
  });
}
