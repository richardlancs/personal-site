// How much the 3D city's renderer does on this device, and the numbers
// each tier is held to (docs/superpowers/plans/2026-11-19-shanghai-3d.md,
// "Renderer tiers and budgets"). Pure: no three.js, and nothing here reads
// `window` or `navigator` when the module loads, so the tests can load it
// straight into Node and the shell can import it before any 3D is fetched.

// The narrow layout's media query, shared with the shell
import { FLAT_QUERY } from "./flat.ts";

export type Quality = "high" | "low" | "mobile";
export type ReflectionMode = "planar" | "fake";

export type TierInput = {
  coarse: boolean; // a coarse pointer (touch screens)
  narrow: boolean; // the narrow layout (the flat query)
  renderer: string | null; // the GPU's name, null when the browser hides it
  cores: number;
  memoryGB: number | null; // navigator.deviceMemory, null where unsupported
  saveData: boolean;
  forced?: Quality | null; // ?tier=
};

const QUALITIES: readonly Quality[] = ["high", "low", "mobile"];

// What readTierInput reads from the browser, injectable for the tests
export type TierEnv = {
  nav?: {
    hardwareConcurrency?: number;
    deviceMemory?: number;
    connection?: { saveData?: boolean };
  };
  matchMedia?: (query: string) => { matches: boolean };
  flatQuery?: string;
};

// What some browsers answer for RENDERER instead of the GPU's name
const MASKED = /^(webkit webgl|mozilla|generic renderer)?$/i;

// WEBGL_debug_renderer_info's UNMASKED_RENDERER_WEBGL
const UNMASKED_RENDERER = 0x9246;

function rendererName(gl: WebGLRenderingContext | WebGL2RenderingContext): string | null {
  // Current Chrome and Firefox answer RENDERER with the (sanitised) GPU
  // name; older ones only through the debug extension
  const plain = gl.getParameter(gl.RENDERER);
  if (typeof plain === "string" && !MASKED.test(plain.trim())) return plain;
  const ext = gl.getExtension("WEBGL_debug_renderer_info");
  if (ext) {
    const unmasked = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL ?? UNMASKED_RENDERER);
    if (typeof unmasked === "string" && !MASKED.test(unmasked.trim())) return unmasked;
  }
  return null;
}

/** Everything pickTier needs, read from a GL context, the query string and (by default) the browser. */
export function readTierInput(gl: WebGLRenderingContext | WebGL2RenderingContext, search: string, env: TierEnv = {}): TierInput {
  const nav = env.nav ?? (typeof navigator !== "undefined" ? (navigator as TierEnv["nav"]) : undefined);
  const media = env.matchMedia ?? (typeof matchMedia !== "undefined" ? (q: string) => matchMedia(q) : undefined);
  const matches = (q: string) => (media ? media(q).matches : false);
  const tier = new URLSearchParams(search).get("tier");
  const cores = nav?.hardwareConcurrency;
  const memory = nav?.deviceMemory;
  return {
    coarse: matches("(pointer: coarse)"),
    narrow: matches(env.flatQuery ?? FLAT_QUERY),
    renderer: rendererName(gl),
    // Unknown counts as plenty, as the park did
    cores: typeof cores === "number" && cores > 0 ? cores : 8,
    memoryGB: typeof memory === "number" && memory > 0 ? memory : null,
    saveData: nav?.connection?.saveData === true,
    forced: QUALITIES.includes(tier as Quality) ? (tier as Quality) : null,
  };
}

// Integrated GPUs: Intel's (not Arc), AMD's APUs ("AMD Radeon(TM)
// Graphics", "Radeon Vega 8 Graphics", "Radeon 780M Graphics"), and
// software renderers
const INTEL = /intel/i;
const ARC = /\barc\b/i;
const AMD_INTEGRATED = /radeon(\(tm\))?( vega \d+| \d{3}m)? graphics/i;
const SOFTWARE = /swiftshader|llvmpipe|softpipe|software|basic render/i;

function integrated(renderer: string): boolean {
  return (INTEL.test(renderer) && !ARC.test(renderer)) || AMD_INTEGRATED.test(renderer) || SOFTWARE.test(renderer);
}

/** The tier: ?tier= wins; touch or the narrow layout get mobile; integrated GPUs, few cores, little memory or Save-Data get low; Apple, discrete and unknown GPUs get high. */
export function pickTier(i: TierInput): Quality {
  if (i.forced && QUALITIES.includes(i.forced)) return i.forced;
  if (i.coarse || i.narrow) return "mobile";
  if (i.saveData || i.cores <= 4 || (i.memoryGB !== null && i.memoryGB <= 4)) return "low";
  if (i.renderer && integrated(i.renderer)) return "low";
  return "high";
}

type Tier = {
  dpr: [number, number];
  msaa: 0 | 2 | 4; // the composer's multisampling
  canvasAntialias: boolean; // off wherever a composer draws
  bloom: null | { scale: number; levels: number; threshold: number; smoothing: number };
  reflection: ReflectionMode;
  reflectionSize: number; // the planar reflection's texture width, 0 when fake
  shadowMap: 0 | 1024 | 2048;
  // Budgets, checked by the perf runs: draw calls in all passes, triangles,
  // texture memory, and the uncapped frame time at the home pose
  drawCalls: number;
  triangles: number;
  textureMB: number;
  frameMs: number;
};

export const TIERS: Record<Quality, Tier> = {
  high: {
    dpr: [1, 1.75],
    msaa: 4,
    canvasAntialias: false,
    bloom: { scale: 0.5, levels: 5, threshold: 1, smoothing: 0.05 },
    reflection: "planar",
    reflectionSize: 512,
    shadowMap: 2048,
    drawCalls: 300,
    triangles: 1_200_000,
    textureMB: 128,
    frameMs: 12,
  },
  low: {
    dpr: [1, 1.5],
    msaa: 2,
    canvasAntialias: false,
    bloom: { scale: 0.25, levels: 4, threshold: 1, smoothing: 0.05 },
    reflection: "fake",
    reflectionSize: 0,
    shadowMap: 1024,
    drawCalls: 220,
    triangles: 700_000,
    textureMB: 96,
    frameMs: 9,
  },
  mobile: {
    dpr: [1, 1.25],
    msaa: 0,
    canvasAntialias: true,
    bloom: null,
    reflection: "fake",
    reflectionSize: 0,
    shadowMap: 0,
    drawCalls: 150,
    triangles: 350_000,
    textureMB: 48,
    frameMs: 8,
  },
};

// How far past its target a tier's p90 may run before high gives way
const STEP_DOWN_FACTOR = 1.5;

/** The runtime step down: high becomes low once its p90 frame passes 1.5× its target; every other case is unchanged. */
export function stepDown(current: Quality, p90Ms: number): Quality {
  if (current === "high" && p90Ms > STEP_DOWN_FACTOR * TIERS.high.frameMs) return "low";
  return current;
}

// What the Save-Data key says the 3D city costs, in MB ("Load the 3D city
// (about N MB)"). A placeholder until the budget run measures it.
export const SAVE_DATA_MB = 2;
