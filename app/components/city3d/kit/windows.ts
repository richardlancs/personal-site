import * as THREE from "three";
import { WINDOW_HASH_GLSL } from "../../../lib/cityWindows";
import { shared } from "./materials";
import { FOG_FRAGMENT, WORLD_VARYINGS_VERTEX } from "./surface";
import { envUniforms, materialKey, windowUniforms } from "./uniforms";

// Towers' windows, drawn in the fragment shader: no textures. A Lambert
// material whose walls are divided into floors (windowUniforms.uFloor) and
// bays (uBay); each floor × bay is one window, and it is lit when its hash
// (lib/cityWindows.ts: WINDOW_HASH_GLSL, the twin of the tested windowHash)
// is under uLitShare, the share the atmosphere sets from Richmond Hill's
// hour. So which windows are lit is the same as windowLit(floor, bay, seed,
// share) says, a window keeps its state, and the lit ones only grow as the
// share rises.
//
// - A lit window glows warm (uWarm) or, one in four or so, cool (uCool), by
//   a second hash, each a little brighter or dimmer by a third; its glow is
//   × envUniforms.uNight, so by day lit windows don't show. It stays under
//   1.0, below the bloom threshold: windows never bloom, neon does.
// - By day the panes are dark glass (`glass`) set in the wall (`base`), a
//   little lighter up the tower where they hold the sky, each pane a shade
//   of its own.
// - Roofs have no windows (and hold snow); the ground floor and the top
//   floor of a tower have none either (lobby, parapet).
// - Where a window gets under about two pixels the grid fades to its
//   average, so a far tower doesn't shimmer. `far: true` is that average
//   everywhere (its own program, "win:far"; the near one is "win:near"):
//   for the skyline across the river.
//
// Two ways to find the grid:
// - instanced (the towers, towers.ts): from the instance's `aSize` (its
//   width, height and depth) and the geometry's `aFace` (geometry.ts:
//   prism): a whole number of floors up the tower and of bays across each
//   face, so no window is cut at a corner; the tower's `aSeed` keeps two
//   towers from lighting alike. Floors count from the tower's own foot.
// - not instanced (a landmark, kit/landmarks.ts): uv.x is the distance
//   round the outline and uv.y the height, both in world units, and the
//   seed is 0.
export type WindowOptions = {
  base: string; // the wall between the windows
  glass: string; // the glass by day
  far?: boolean; // one averaged tone, for the skyline seen from far
  fogScale?: number; // fog as if this many times farther away (FOG_FRAGMENT); 1 by default
};

// How much of a window cell is glass: x across the bay, y up the floor
const PANE = { x0: 0.12, x1: 0.88, y0: 0.2, y1: 0.86 };

const VERTEX_HEAD = /* glsl */ `
varying vec3 vKitWorld;
varying vec3 vKitNormal;
varying vec2 vWinPos;   // across the face and up the tower, world units
varying vec2 vWinSpan;  // the face's width and the tower's height (0: no fitting)
varying float vWinFace; // the face's number; < 0 on a roof
varying float vWinSeed;
#ifdef USE_INSTANCING
  attribute vec3 aFace;
  attribute vec3 aSize;
  attribute float aSeed;
#endif
`;

const VERTEX_BODY = /* glsl */ `
#ifdef USE_INSTANCING
{
  vec3 t = cross(vec3(0.0, 1.0, 0.0), objectNormal);
  float tl = length(t);
  if (aFace.z < 0.0 || tl < 1e-3) {
    vWinFace = -1.0;
    vWinPos = vec2(0.0);
    vWinSpan = vec2(1.0);
  } else {
    t /= tl;
    float along = length(aSize * t);
    vWinPos = vec2((dot(transformed, t) - aFace.x + aFace.y) * along, transformed.y * aSize.y);
    vWinSpan = vec2(2.0 * aFace.y * along, aSize.y);
    vWinFace = aFace.z;
  }
  vWinSeed = aSeed;
}
#else
  vWinPos = uv;
  vWinSpan = vec2(0.0);
  vWinFace = abs(objectNormal.y) > 0.7 ? -1.0 : 0.0;
  vWinSeed = 0.0;
#endif
`;

const FRAGMENT_HEAD = /* glsl */ `
varying vec3 vKitWorld;
varying vec3 vKitNormal;
varying vec2 vWinPos;
varying vec2 vWinSpan;
varying float vWinFace;
varying float vWinSeed;
uniform float uLitShare;
uniform vec3 uWarm;
uniform vec3 uCool;
uniform float uFloor;
uniform float uBay;
uniform vec3 uGlass;
uniform float uFogScale;
uniform float uWet;
uniform float uSnow;
uniform float uNight;
${WINDOW_HASH_GLSL}
`;

// Sets kitPane (how much of this pixel is glass), kitEmit (the lit
// windows' light, before uNight) and kitShade (the pane's own tone).
// Each axis of the grid fades on its own where its cells get under about
// two pixels: a face seen edge-on keeps its floors (each floor lit by its
// own share) after its bays have merged; farther still, the wall is the
// average. Far materials are the average everywhere.
const FRAGMENT_COLOR = /* glsl */ `
float kitPane = 0.0;
vec3 kitEmit = vec3(0.0);
float kitShade = 1.0;
vec3 kitAvgTone = mix(uWarm, uCool, 0.28);
// (the grid and its derivatives outside any branch, so fwidth is defined)
bool fitted = vWinSpan.x > 0.0;
float bays = fitted ? max(1.0, floor(vWinSpan.x / uBay + 0.5)) : 0.0;
float floors = fitted ? max(1.0, floor(vWinSpan.y / uFloor)) : 0.0;
vec2 cellSize = fitted ? vec2(vWinSpan.x / bays, vWinSpan.y / floors) : vec2(uBay, uFloor);
vec2 cell = vWinPos / cellSize;
vec2 fw = fwidth(cell);
float sx = 1.0 - smoothstep(0.35, 0.75, fw.x);
float sy = 1.0 - smoothstep(0.35, 0.75, fw.y);
#ifdef WIN_FAR
  sx = 0.0;
  sy = 0.0;
#endif
if (vWinFace >= 0.0) {
  vec2 idx = floor(cell);
  bool inRange = !fitted || (idx.y >= 1.0 && idx.y < floors - 1.0 && idx.x >= 0.0 && idx.x < bays);
  if (inRange) {
    int fl = int(idx.y);
    int bay = int(idx.x) + int(vWinFace) * 101;
    int seed = int(vWinSeed + 0.5);
    vec2 f = fract(cell);
    vec2 e = clamp(fw, 0.0, 0.5);
    float px = mix(${(PANE.x1 - PANE.x0).toFixed(4)}, smoothstep(${PANE.x0} - e.x, ${PANE.x0} + e.x, f.x) * (1.0 - smoothstep(${PANE.x1} - e.x, ${PANE.x1} + e.x, f.x)), sx);
    float py = mix(${(PANE.y1 - PANE.y0).toFixed(4)}, smoothstep(${PANE.y0} - e.y, ${PANE.y0} + e.y, f.y) * (1.0 - smoothstep(${PANE.y1} - e.y, ${PANE.y1} + e.y, f.y)), sy);
    float sharp = sx * sy;
    // one window: lit by its own hash, the tested rule (windowLit)
    float lit = windowHash(fl, bay, seed) < uLitShare ? 1.0 : 0.0;
    // one floor whose windows have merged: that floor's own share
    float floorShare = clamp(uLitShare * (0.6 + 0.8 * windowHash(fl, -7, seed)), 0.0, 1.0);
    float litNow = mix(mix(uLitShare, floorShare, sy), lit, sharp);
    vec3 tone = mix(kitAvgTone, windowHash(fl, bay, seed + 7919) < 0.72 ? uWarm : uCool, sharp);
    float bright = mix(0.75, 0.55 + 0.4 * windowHash(fl, bay, seed + 15887), sharp);
    kitPane = px * py;
    kitEmit = tone * litNow * bright * kitPane;
    // each pane a shade of its own, and each column of panes holding the sky a little differently
    kitShade = mix(1.0, 0.9 + 0.2 * windowHash(fl, bay, seed + 23011), sharp) * mix(1.0, 0.88 + 0.24 * windowHash(-3, bay, seed), sx);
  }
}
{
  // dark glass in the wall, holding a little more sky up the tower
  float rise = vWinSpan.y > 0.0 ? clamp(vWinPos.y / vWinSpan.y, 0.0, 1.0) : 0.5;
  vec3 glass = uGlass * kitShade * (0.86 + 0.3 * rise) * (1.0 - 0.45 * uNight);
  diffuseColor.rgb = mix(diffuseColor.rgb, glass, kitPane);
  vec3 n = normalize(vKitNormal);
  diffuseColor.rgb *= 1.0 - 0.12 * uWet;
  if (uSnow > 0.0) diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.86, 0.89, 0.94), smoothstep(0.6, 0.95, n.y) * uSnow * 0.85);
}
`;

export function windowMaterial(o: WindowOptions): THREE.MeshLambertMaterial {
  const far = !!o.far;
  const key = materialKey("win", `${far ? "far" : "near"}:${o.base}:${o.glass}:${o.fogScale ?? 1}`);
  return shared(key, () => {
    const m = new THREE.MeshLambertMaterial({ color: o.base });
    const uniforms = {
      uGlass: { value: new THREE.Color(o.glass) },
      uFogScale: { value: o.fogScale ?? 1 },
    };
    m.userData.windows = uniforms;
    m.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms, windowUniforms, envUniforms);
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", `#include <common>\n${VERTEX_HEAD}`)
        .replace("#include <project_vertex>", `#include <project_vertex>\n${WORLD_VARYINGS_VERTEX}\n${VERTEX_BODY}`);
      shader.fragmentShader = shader.fragmentShader
        .replace("#include <common>", `#include <common>\n${far ? "#define WIN_FAR\n" : ""}${FRAGMENT_HEAD}`)
        .replace("#include <color_fragment>", `#include <color_fragment>\n${FRAGMENT_COLOR}`)
        .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>\ntotalEmissiveRadiance += (kitEmit * 0.92 + uGlass * kitShade * kitPane * 0.06) * uNight;`)
        .replace("#include <fog_fragment>", FOG_FRAGMENT);
    };
    // two programs in all: near and far
    m.customProgramCacheKey = () => materialKey("win", far ? "far" : "near");
    return m;
  });
}
