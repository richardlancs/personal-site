import * as THREE from "three";
import { litShare } from "../../../lib/cityWindows";

// The city's only shared, mutable shader state. Every kit material that
// responds to the hour, the weather or the night reads these objects by
// reference (Object.assign(shader.uniforms, …) in onBeforeCompile), and the
// atmosphere writes their `.value`s, so a change reaches every material at
// once without compiling or remounting anything. Nothing else may hold
// shader state that more than one file writes or reads.
//
// Who writes, who reads:
// - neonUniforms: written by atmosphere/Atmosphere.tsx (the look's `neon`,
//   0.3 by day .. 1 at night, ×1.15 in rain or snow); read by kit/neon.ts
//   (neonMaterial: tone × uNeon × NEON_HDR)
// - windowUniforms: uLitShare written by atmosphere/Atmosphere.tsx from
//   the store's `hour` (litShare); uWarm, uCool, uFloor, uBay fixed here;
//   read by kit/windows.ts (windowMaterial)
// - envUniforms (environment.ts): uWet, uSnow, uNight written by
//   atmosphere/Atmosphere.tsx; read by kit/surface.ts, kit/windows.ts and
//   kit/water.ts
export const neonUniforms = {
  uNeon: { value: 0.3 }, // how bright the neon is: 0.3 by day .. 1 at night
};

export const windowUniforms = {
  uLitShare: { value: litShare(12) }, // the share of windows lit (lib/cityWindows.ts)
  uWarm: { value: new THREE.Color("#ffc98a") }, // a lit window's warm tone
  uCool: { value: new THREE.Color("#bfe4ff") }, // a lit window's cool tone
  uFloor: { value: 0.36 }, // one floor's height, world units (3.6 m)
  uBay: { value: 0.3 }, // one window bay's width, world units (3 m)
};

export { envUniforms } from "../environment";

// The one naming scheme for a shared material, used both as its key in
// kit/materials.ts (equal materials are one object) and as its
// customProgramCacheKey (so equal shaders are one program): the kind of
// material, then its variant, colon-separated, lower case, e.g.
// materialKey("win", "far") === "win:far", materialKey("neon", "cyan:day").
export function materialKey(kind: string, variant: string): string {
  return `${kind}:${variant}`.toLowerCase();
}
