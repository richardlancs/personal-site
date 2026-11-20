// Which of the 3D city's windows are lit at an hour. The share follows the
// 2D city's paintings (lib/cityLook.ts): the day plates show almost no lit
// windows, the night plates many. Which windows make up that share comes
// from a hash of each window's floor and bay, so a window keeps its state
// from frame to frame, and the lit ones only grow as the share rises.
//
// Pure, deterministic, and only `import type`, so the tests can load it
// straight into Node.
import type { SkyState } from "./sky";

// Formatters are built once per time zone (Intl.DateTimeFormat is slow to
// construct)
const hourFormats = new Map<string, Intl.DateTimeFormat>();

/** The local hour at a moment, 0 up to 24, with the minutes as a fraction. */
export function localHour(ms: number, timeZone: string): number {
  if (!Number.isFinite(ms)) return 0;
  let f = hourFormats.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-CA", { timeZone, hour: "numeric", minute: "numeric", hourCycle: "h23" });
    hourFormats.set(timeZone, f);
  }
  const parts = f.formatToParts(ms);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return (get("hour") % 24) + get("minute") / 60;
}

/** The share moves in steps of 1/16, so the lit windows change a few at a time. */
export const SHARE_STEP = 1 / 16;

// The share through the day, hours on a clock that starts at 06:00 (the
// points after midnight are written past 24). The steepest stretch, the
// evening, climbs 0.036 a quarter hour, under one step.
// Half the windows at the evening's height, not three in four: with
// windows lighting by floors (windowScore, below), that reads as the night
// plate's buildings with lit floors; more read as static (tuned against
// app/assets/city/lujiazui-night.webp, 20 November 2026).
const CURVE: readonly [number, number][] = [
  [6, 0.2],
  [9, 0.06],
  [17, 0.06],
  [19.5, 0.42],
  [21, 0.5],
  [25, 0.32],
  [28, 0.16],
  [30, 0.2],
];

/** The share of windows lit at a local hour; any hour wraps onto the clock (one that isn't a number counts as midnight). */
export function litShare(hour: number): number {
  let h = Number.isFinite(hour) ? ((hour % 24) + 24) % 24 : 0;
  if (h < CURVE[0][0]) h += 24;
  let share = CURVE[CURVE.length - 1][1];
  for (let i = 1; i < CURVE.length; i++) {
    const [h1, s1] = CURVE[i];
    if (h <= h1) {
      const [h0, s0] = CURVE[i - 1];
      share = s0 + ((s1 - s0) * (h - h0)) / (h1 - h0);
      break;
    }
  }
  return Math.round(share / SHARE_STEP) * SHARE_STEP;
}

// The window hash, written once here and once in GLSL (WINDOW_HASH_GLSL
// below, for the towers' shader): both multiply in 32-bit unsigned
// integers, which wrap the same way, and both keep the top 24 bits, which
// a 32-bit float holds exactly. Keep the two in step.
/** A window's own number, 0 up to 1, from its floor, bay and its building's seed. */
export function windowHash(floor: number, bay: number, seed: number): number {
  let h = Math.imul(floor | 0, 0x27d4eb2d) ^ Math.imul(bay | 0, 0x165667b1) ^ Math.imul(seed | 0, 0x9e3779b9);
  h ^= h >>> 16;
  h = Math.imul(h, 0x7feb352d);
  h ^= h >>> 15;
  h = Math.imul(h, 0x846ca68b);
  h ^= h >>> 16;
  return (h >>> 8) / 16777216;
}

/** The GLSL twin of windowHash (GLSL ES 3.0: uint arithmetic wraps mod 2^32). */
export const WINDOW_HASH_GLSL = /* glsl */ `
float windowHash(int floorIndex, int bay, int seed) {
  // the twin of windowHash in app/lib/cityWindows.ts: keep the two in step
  uint h = (uint(floorIndex) * 0x27d4eb2du) ^ (uint(bay) * 0x165667b1u) ^ (uint(seed) * 0x9e3779b9u);
  h ^= h >> 16u;
  h *= 0x7feb352du;
  h ^= h >> 15u;
  h *= 0x846ca68bu;
  h ^= h >> 16u;
  return float(h >> 8u) / 16777216.0;
}
`;

// Lit windows come by floors, not one by one: a city at night reads as
// buildings with lit floors (and a few lit windows on dark ones), not as
// static. A window's score mixes its floor's hash (FLOOR_WEIGHT of it)
// with its own, and is then spread back to an even 0..1 (the exact
// distribution of that sum), so a share still lights that share of the
// windows, the floors whose hash is low first, and a window's state only
// grows with the share. Written once here and once in GLSL
// (WINDOW_LIT_GLSL); keep the two in step.
export const FLOOR_WEIGHT = 0.72;

/** A window's place in the order windows light in, 0 up to 1, evenly spread: its floor's hash mostly, its own a little. */
export function windowScore(floor: number, bay: number, seed: number): number {
  const a = FLOOR_WEIGHT;
  const b = 1 - a;
  const x = a * windowHash(floor, -7, seed) + b * windowHash(floor, bay, seed);
  if (x < b) return (x * x) / (2 * a * b);
  if (x < a) return (x - b / 2) / a;
  return 1 - ((1 - x) * (1 - x)) / (2 * a * b);
}

/** Whether a window is lit when a share of them are. */
export function windowLit(floor: number, bay: number, seed: number, share: number): boolean {
  return windowScore(floor, bay, seed) < share;
}

/** The GLSL twin of windowScore (after WINDOW_HASH_GLSL). */
export const WINDOW_LIT_GLSL = /* glsl */ `
float windowScore(int floorIndex, int bay, int seed) {
  // the twin of windowScore in app/lib/cityWindows.ts: keep the two in step
  const float a = ${FLOOR_WEIGHT.toFixed(4)};
  const float b = 1.0 - a;
  float x = a * windowHash(floorIndex, -7, seed) + b * windowHash(floorIndex, bay, seed);
  if (x < b) return (x * x) / (2.0 * a * b);
  if (x < a) return (x - b / 2.0) / a;
  return 1.0 - ((1.0 - x) * (1.0 - x)) / (2.0 * a * b);
}
`;

const clamp01 = (n: number) => (Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0);

/** The hour a previewed sky stands for, so its windows match it: dawn 05:00 to 06:00, day noon, dusk 18:00 to 20:00, night 22:00. */
export function previewHour(sky: Pick<SkyState, "daylight" | "progress">): number {
  const p = clamp01(sky.progress);
  switch (sky.daylight) {
    case "dawn":
      return 5 + p;
    case "dusk":
      return 18 + 2 * p;
    case "night":
      return 22;
    default:
      return 12;
  }
}
