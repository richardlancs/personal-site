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
// - glowOn: 1, or 0 under `prefers-contrast: more` (written by City3D.tsx:
//   Contrast, live); multiplies every added glow that isn't the thing
//   itself: the mobile tier's glow sprites (kit/neon.ts: glowSprites) and
//   the signs' wash on walls (kit/glow.ts: wash). Bloom goes in Post.tsx.
export const glowOn = { value: 1 };

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

// Light after dark on the surfaces round a lamp, a lantern or a sign
// (kit/glow.ts: pools, common.tsx: useGlowPools), added in the city's lit
// surface (kit/surface.ts) as light, not drawn by a light: a fixed number
// of pools, so every place compiles the same program. The showing place
// writes its pools (world positions, reach, colour × strength); the
// atmosphere writes uPoolsOn (0 by day .. 1 at night, × glowOn).
export const POOLS = 12;
export const poolUniforms = {
  uPools: { value: Array.from({ length: POOLS }, () => new THREE.Vector4(0, -1e4, 0, 0)) }, // xyz world, w reach (0: none)
  uPoolTones: { value: Array.from({ length: POOLS }, () => new THREE.Color(0, 0, 0)) }, // linear colour × strength
  uPoolEnds: { value: Array.from({ length: POOLS }, () => new THREE.Vector4(0, 0, 0, 0)) }, // a line pool's other end, xyz world, w 1 (0: a point pool)
  uPoolsOn: { value: 0 },
};

// The shade the day plates paint without a shadow map (kit/glow.ts:
// shade, common.tsx: useDayShade): one pattern per place, laid on the lit
// surface where the place says, by day only. uShadeOn is the atmosphere's
// (the sun's share of the light: none at night or under cloud); the rest
// the showing place's.
export const shadeUniforms = {
  uShadeOn: { value: 0 },
  // kind (0 none, 1 stripes, 2 dapple, 3 edge, 4 lattice), depth (0..1), period, duty
  uShade: { value: new THREE.Vector4() },
  // the region, world x0, z0, x1, z1
  uShadeBox: { value: new THREE.Vector4() },
  // the pattern's direction across the ground (x, z), the highest y it
  // reaches, and how much of it falls on walls (0 only what faces up .. 1)
  uShadeDir: { value: new THREE.Vector4(1, 0, 0, 0) },
  // a lattice's second period (across `dir`), and the sunlit share's warm
  // tint (rgb, multiplied in; 1, 1, 1: none)
  uShadeMore: { value: new THREE.Vector4(1, 1, 1, 1) },
};

// A day fill on the side away from the sun (SceneDef.bounce): the light the
// sky and the sunlit walls opposite throw into a lane's shade, which the
// world's hemisphere light is too even to give. Written by the
// atmosphere for the showing place (its colour × strength × the sun's
// share of the light, so it blends with the hour and the weather; none
// at night); read by the lit surface (surface.ts).
export const bounceUniforms = {
  uBounce: { value: new THREE.Color(0, 0, 0) }, // linear colour × strength × the sun's share
  uBounceDir: { value: new THREE.Vector3(0, 1, 0) }, // toward the sun, world, unit length
};

// The one naming scheme for a shared material, used both as its key in
// kit/materials.ts (equal materials are one object) and as its
// customProgramCacheKey (so equal shaders are one program): the kind of
// material, then its variant, colon-separated, lower case, e.g.
// materialKey("win", "far") === "win:far", materialKey("neon", "cyan:day").
export function materialKey(kind: string, variant: string): string {
  return `${kind}:${variant}`.toLowerCase();
}
