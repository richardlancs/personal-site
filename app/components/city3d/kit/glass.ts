import * as THREE from "three";
import { shared } from "./materials";
import { toneColor, type SceneTone } from "./neon";
import { FOG_FRAGMENT } from "./surface";
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
};

export function glassMaterial(o: GlassOptions): THREE.MeshLambertMaterial {
  const opacity = o.opacity ?? 0.28;
  const sky = o.sky ?? 0.5;
  const glow = o.glow ? toneColor(o.glow.tone) : "#000000";
  const strength = o.glow?.strength ?? 0;
  const variant = [o.tint, opacity, sky, glow, strength, o.double ? 2 : 1].join("|");
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
    };
    m.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms, { uNeon: neonUniforms.uNeon });
      shader.fragmentShader = shader.fragmentShader
        .replace("#include <common>", "#include <common>\nuniform float uSkyAmt;\nuniform vec3 uGlassGlow;\nuniform float uGlassStrength;\nuniform float uFogScale;\nuniform float uNeon;")
        .replace(
          "#include <opaque_fragment>",
          `{
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
}
#include <opaque_fragment>`,
        )
        .replace("#include <fog_fragment>", FOG_FRAGMENT);
    };
    m.customProgramCacheKey = () => materialKey("glass", "lit");
    return m;
  });
}
