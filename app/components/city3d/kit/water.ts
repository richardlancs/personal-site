import * as THREE from "three";
import { shared } from "./materials";
import { buildReflection, buildStreaks, WATER_GLSL, type LightStrip, type ReflectionMode } from "./reflection";
import { surface, type SurfaceOptions } from "./surface";
import { envUniforms, materialKey } from "./uniforms";

// The river and the wet paving (reflection.ts says how they reflect).
//
// Both are built where they lie: `x`, `z` (the middle) and `y` (the
// surface's height) in the parent's frame, the same frame as the
// LightStrips. Move or offset the parent, never the mesh itself (the
// streaks are placed in the parent's frame). The parent may be translated
// (a scene's offset), not rotated.
//
// Per tier: `mode` is tiers.ts's `reflection` (planar on high, fake on low
// and mobile); `size` its `reflectionSize`. Draw calls: the river is 2 (the
// water, the streaks); planar adds the reflected render (what's on
// REFLECT_LAYER, drawn once more into a 512 × 288 half-float target,
// 1.8 MB with its depth). Wet paving is 2 fake (paving, streaks) and 3
// planar, whose reflected render is skipped while the paving is dry.

export type { LightStrip, ReflectionMode };

type Place = { x?: number; z?: number; y?: number };

const RIVER_VERTEX = /* glsl */ `
varying vec3 vWorld;
#include <fog_pars_vertex>
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  vec4 mvPosition = viewMatrix * w;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`;

// The fake river: the water's body, and at a glancing angle the colour of
// the haze over it (the fog's colour, which the atmosphere sets from the
// sky's horizon), as the far water in the plates takes the sky's
const RIVER_FRAGMENT = /* glsl */ `
uniform float uNight;
uniform float uWet;
varying vec3 vWorld;
#include <fog_pars_fragment>
${WATER_GLSL}
void main() {
  vec3 toEye = cameraPosition - vWorld;
  float fres;
  vec3 col = waterBody(vWorld, toEye, uNight, uWet, fres);
  vec3 sky = mix(vec3(0.3, 0.45, 0.65), vec3(0.02, 0.03, 0.07), uNight);
  #ifdef USE_FOG
    sky = fogColor;
  #endif
  col = mix(col, sky * 0.75, fres * mix(0.22, 0.4, uNight));
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}
`;

function riverMaterial() {
  return shared(materialKey("water", "river"), () => {
    const m = new THREE.ShaderMaterial({
      uniforms: { ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog) },
      vertexShader: RIVER_VERTEX,
      fragmentShader: RIVER_FRAGMENT,
      fog: true,
    });
    m.uniforms.uNight = envUniforms.uNight;
    m.uniforms.uWet = envUniforms.uWet;
    return m;
  });
}

// Lays a surface flat at its place, and gives it the streaks as a child
// whose frame is the parent's, at the surface's height
function lay(mesh: THREE.Mesh, streaks: THREE.Mesh, x: number, y: number, z: number) {
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, y, z);
  // parent · child = a lift to y: the child undoes the turn and the x/z shift
  streaks.rotation.x = Math.PI / 2;
  streaks.position.set(-x, z, 0);
  mesh.add(streaks);
}

/** The river, `w` × `d`, reflecting `lights` (planar on the high tier, fake otherwise) */
export function buildRiver(o: { w: number; d: number; mode: ReflectionMode; lights: LightStrip[]; size?: number } & Place): { mesh: THREE.Mesh; dispose(): void } {
  const { x = 0, z = 0, y = 0 } = o;
  const reflector = buildReflection({ mode: o.mode, kind: "river", w: o.w, d: o.d, size: o.size });
  const geometry = reflector ? null : new THREE.PlaneGeometry(o.w, o.d);
  const mesh: THREE.Mesh = reflector ?? new THREE.Mesh(geometry!, riverMaterial());
  mesh.name = "river";
  const streaks = buildStreaks(o.lights, { kind: "river", mode: o.mode, x, z, w: o.w, d: o.d });
  lay(mesh, streaks, x, y, z);
  return {
    mesh,
    // GPU resources only: the mesh stays where it is (a scene that is
    // still showing, e.g. after development's double effect, draws it
    // again, re-uploaded); common.tsx: useDisposeOnUnmount
    dispose() {
      streaks.geometry.dispose();
      geometry?.dispose();
      reflector?.dispose();
    },
  };
}

/**
 * Paving that shines in rain: the kit's surface (its own puddles and
 * sheen), and the `lights` streaked on it × the rain (envUniforms.uWet);
 * on the high tier a planar reflection over it in the puddles, drawn only
 * while it's wet.
 * - `polish` (0..1, 0 by default): polished stone that carries the lights
 *   when dry too, after dark only: the same streaks, as long fine strokes,
 *   at `polish` × the night (never by day; in rain the wetter of the two,
 *   never both). The planar mirror stays off while dry.
 * - `glow`, `snow`, `grime`: passed to the paving's surface (surface.ts)
 */
export function wetPaving(
  o: {
    w: number;
    d: number;
    mode: ReflectionMode;
    lights: LightStrip[];
    map?: THREE.Texture;
    color?: string;
    size?: number;
    polish?: number;
    glow?: SurfaceOptions["glow"];
    snow?: boolean;
    grime?: number;
  } & Place,
): {
  mesh: THREE.Mesh;
  dispose(): void;
} {
  const { x = 0, z = 0, y = 0 } = o;
  const geometry = new THREE.PlaneGeometry(o.w, o.d);
  const mesh = new THREE.Mesh(geometry, surface({ color: o.color ?? "#4b4f57", map: o.map, wet: 1, grime: o.grime ?? 0.3, glow: o.glow, snow: o.snow }));
  mesh.name = "paving";
  mesh.receiveShadow = true;
  const reflector = buildReflection({ mode: o.mode, kind: "paving", w: o.w, d: o.d, size: o.size, gate: () => envUniforms.uWet.value > 0.02 });
  if (reflector) {
    // a hair over the paving, in its plane
    reflector.position.z = 0.002;
    reflector.renderOrder = 1;
    mesh.add(reflector);
  }
  const streaks = buildStreaks(o.lights, { kind: "paving", mode: o.mode, x, z, w: o.w, d: o.d, polish: o.polish });
  lay(mesh, streaks, x, y, z);
  return {
    mesh,
    // GPU resources only: the mesh stays where it is (a scene that is
    // still showing, e.g. after development's double effect, draws it
    // again, re-uploaded); common.tsx: useDisposeOnUnmount
    dispose() {
      geometry.dispose();
      streaks.geometry.dispose();
      reflector?.dispose();
    },
  };
}
