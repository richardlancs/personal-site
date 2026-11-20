// How the city looks for each time of day and each kind of weather: the
// one table to tune (DAYLIGHT, WEATHER), and the arithmetic that turns a
// place's own lighting into what it should be now. Plain numbers, no
// three.js and no React, so the tests can run it.
//
// Daylight and weather are independent: a rainy night is the night's
// light with the rain's muting on top. The colours are the plates'
// (app/assets/city/lujiazui-day.webp and -night.webp, the dusk concept
// docs/city/concepts/lujiazui.webp), sampled where the sky meets the
// skyline: a clear blue day, a deep blue-black night whose light is the
// city's own (windows, neon), a dusk that starts gold at the horizon and
// ends violet. These are the scene's colours, not the interface's tokens.
//
// Everything lit stays under 1.0 (linear, before tone mapping) in every
// look, so only the neon (kit/neon.ts: × NEON_HDR) crosses the bloom's
// threshold: the world's two lights together never pass LIT_LIMIT (tested).
//
// Colours are sRGB, 0..1 (as written in hex); Atmosphere.tsx converts
// them for three.js.

import type { Daylight, WeatherPreset } from "../../../lib/sky";

export type RGB = [number, number, number];

// What the time of day sets. "mix" values move the place's own colour
// toward the table's (0 keeps the place's, 1 replaces it); "scale"
// values multiply the place's own intensity or distance.
export type DaylightLook = {
  sun: RGB; // the directional light (the moon at night)
  sunMix: number;
  sunScale: number;
  hemiSky: RGB; // the hemisphere light: light from the sky...
  hemiGround: RGB; // ...and bounced up from the ground
  hemiMix: number;
  hemiScale: number;
  fog: RGB;
  fogMix: number;
  fogNear: number;
  fogFar: number;
  top: RGB; // the sky dome, at the zenith and the horizon
  horizon: RGB;
  glow: RGB; // the sun's glow in the sky (the moon's at night)
  cloudLit: RGB; // cloud tops and undersides
  cloudShade: RGB;
  sunHeight: number; // how high the sun's disc sits, against the place's own
  night: number; // 0 day .. 1 night: lamps, the moon, stars (envUniforms.uNight)
  neon: number; // how bright the neon is (neonUniforms.uNeon): 0.3 by day .. 1 at night
  cityGlow: number; // the city's own light on the sky low down: 0 by day .. 1 at night
  windows: number; // the least share of windows lit, whatever the clock says (uLitShare)
};

// What the weather sets, on top of the daylight
export type WeatherLook = {
  sunScale: number;
  hemiScale: number;
  grey: number; // how far the light's colour goes toward grey (diffuse, overcast)
  tint: RGB; // and a multiplier on it (cooler for rain and snow)
  skyGrey: number; // how far the sky goes toward its own grey
  skyLift: number; // ...and how light that grey is
  skyTint: RGB;
  fogGrey: number;
  fogLift: number;
  fogNear: number;
  fogFar: number;
  cover: number; // cloud cover, 0 clear .. 1 overcast
  cloudDark: number; // heavier, darker cloud
  sunDisc: number; // how much of the sun's (moon's) glow shows through
  wet: number; // envUniforms.uWet
  snow: number; // envUniforms.uSnow
  rain: number; // falling rain, 0..1 of the full density
  flakes: number; // falling snow, 0..1
  neon: number; // × the daylight's neon: wet air carries it further
  cityGlow: number; // × the daylight's city glow: low cloud holds it
};

const hex = (h: string): RGB => {
  const n = parseInt(h.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

type DaylightRow = { [K in keyof DaylightLook]: DaylightLook[K] extends RGB ? string : number };

// Each phase has a look at its start and at its end, and moves between
// them with the phase's progress (lib/sky.ts: SkyState.progress): dusk
// starts gold and ends violet, dawn starts violet and ends pale gold. Day
// and night hold one look.
//
// The world's two lights (common.tsx: WorldLights) are built at 2.2 each;
// sunScale and hemiScale move them from there. Their sum, after the
// weather, stays under LIT_LIMIT, so a white surface in full sun stays
// under 1.0.
//
// The day plate: a clear deep blue overhead (#307fdb) paling to #abd0f5
// at the skyline, a blue haze on the water, white light
const DAY: DaylightRow = {
  sun: "#fff4e2", sunMix: 0.7, sunScale: 0.75,
  hemiSky: "#cfe2f6", hemiGround: "#4a5560", hemiMix: 0.8, hemiScale: 0.5,
  fog: "#9cbfdf", fogMix: 1, fogNear: 1, fogFar: 1.1,
  top: "#307fdb", horizon: "#abd0f5", glow: "#fff1d8",
  cloudLit: "#f6f8fb", cloudShade: "#b9cade",
  sunHeight: 1.1, night: 0, neon: 0.3, cityGlow: 0, windows: 0,
};

// The night plate: #0d2145 overhead, #394b8c to a violet #61578f behind
// the skyline, the air a deep navy; the moon faint, the hemisphere low
const NIGHT: DaylightRow = {
  sun: "#8fa6dc", sunMix: 1, sunScale: 0.12,
  hemiSky: "#3a4a7a", hemiGround: "#1a1c26", hemiMix: 1, hemiScale: 0.32,
  fog: "#16213d", fogMix: 0.95, fogNear: 0.85, fogFar: 0.8,
  top: "#0d2145", horizon: "#394b8c", glow: "#cdd6f2",
  cloudLit: "#2d3c66", cloudShade: "#151d36",
  sunHeight: 1.5, night: 1, neon: 1, cityGlow: 1, windows: 0.3,
};

export const DAYLIGHT: Record<Daylight, { start: DaylightRow; end: DaylightRow }> = {
  dawn: {
    start: {
      sun: "#c79ab0", sunMix: 0.95, sunScale: 0.2,
      hemiSky: "#58608e", hemiGround: "#23232c", hemiMix: 0.95, hemiScale: 0.36,
      fog: "#4f5579", fogMix: 0.95, fogNear: 0.8, fogFar: 0.8,
      top: "#22396e", horizon: "#c9909a", glow: "#f2b8a6",
      cloudLit: "#a88aa6", cloudShade: "#3e4470",
      sunHeight: 0.1, night: 0.55, neon: 0.8, cityGlow: 0.5, windows: 0.25,
    },
    end: {
      sun: "#ffd9b0", sunMix: 0.8, sunScale: 0.6,
      hemiSky: "#e4dcd6", hemiGround: "#4a4e52", hemiMix: 0.8, hemiScale: 0.45,
      fog: "#b9c3d6", fogMix: 1, fogNear: 0.85, fogFar: 0.95,
      top: "#4a86d0", horizon: "#f2d4b8", glow: "#ffe2bf",
      cloudLit: "#fff1e4", cloudShade: "#c4c8dc",
      sunHeight: 0.35, night: 0.08, neon: 0.35, cityGlow: 0.05, windows: 0.06,
    },
  },
  day: { start: DAY, end: DAY },
  dusk: {
    // The sun low and gold: a warm horizon (#ffb454's family) under a
    // still-blue zenith
    start: {
      sun: "#ffbe8a", sunMix: 0.9, sunScale: 0.45,
      hemiSky: "#c8bfd2", hemiGround: "#3a3c4e", hemiMix: 0.9, hemiScale: 0.5,
      fog: "#b99aa2", fogMix: 1, fogNear: 0.95, fogFar: 1,
      top: "#3a6cc0", horizon: "#ffb477", glow: "#ffb25e",
      cloudLit: "#ffd6a8", cloudShade: "#9c8fb4",
      sunHeight: 0.4, night: 0.15, neon: 0.45, cityGlow: 0.15, windows: 0.12,
    },
    // The concept frame: #1c2f5e overhead, the last warmth (#ac7578) low
    // behind the skyline, the air violet
    end: {
      sun: "#b88a9c", sunMix: 1, sunScale: 0.12,
      hemiSky: "#6a6a9a", hemiGround: "#24263a", hemiMix: 0.95, hemiScale: 0.36,
      fog: "#3e4270", fogMix: 1, fogNear: 0.85, fogFar: 0.85,
      top: "#1c2f5e", horizon: "#ac7578", glow: "#e89070",
      cloudLit: "#9a7088", cloudShade: "#3a3c66",
      sunHeight: 0.06, night: 0.7, neon: 0.9, cityGlow: 0.45, windows: 0.3,
    },
  },
  night: { start: NIGHT, end: NIGHT },
};

const SAME: RGB = [1, 1, 1];

export const WEATHER: Record<WeatherPreset, WeatherLook> = {
  // Unknown or no reading: the plates' own sky
  neutral: {
    sunScale: 1, hemiScale: 1, grey: 0, tint: SAME,
    skyGrey: 0, skyLift: 1, skyTint: SAME,
    fogGrey: 0, fogLift: 1, fogNear: 1, fogFar: 1,
    cover: 0.35, cloudDark: 0, sunDisc: 1,
    wet: 0, snow: 0, rain: 0, flakes: 0, neon: 1, cityGlow: 1,
  },
  // Warm sun, clearer air, fewer clouds
  clear: {
    sunScale: 1.12, hemiScale: 1, grey: 0, tint: [1.02, 1, 0.97],
    skyGrey: -0.08, skyLift: 1, skyTint: SAME,
    fogGrey: 0, fogLift: 1, fogNear: 1.15, fogFar: 1.3,
    cover: 0.15, cloudDark: 0, sunDisc: 1,
    wet: 0, snow: 0, rain: 0, flakes: 0, neon: 1, cityGlow: 1,
  },
  // Diffuse light, a muted sky, gentle haze; low cloud holds the city's glow
  cloudy: {
    sunScale: 0.36, hemiScale: 1.1, grey: 0.45, tint: [1, 0.99, 0.98],
    skyGrey: 0.7, skyLift: 0.98, skyTint: [1.02, 1, 0.97],
    fogGrey: 0.5, fogLift: 0.92, fogNear: 0.8, fogFar: 0.82,
    cover: 0.9, cloudDark: 0.12, sunDisc: 0.2,
    wet: 0, snow: 0, rain: 0, flakes: 0, neon: 1, cityGlow: 1.3,
  },
  // Cooler light, darker cloud, wet streets, a fine rain (never lightning);
  // the wet air carries the neon further
  rain: {
    sunScale: 0.2, hemiScale: 0.84, grey: 0.55, tint: [0.9, 0.97, 1.1],
    skyGrey: 0.85, skyLift: 0.7, skyTint: [0.93, 0.98, 1.08],
    fogGrey: 0.7, fogLift: 0.62, fogNear: 0.55, fogFar: 0.8,
    cover: 1, cloudDark: 0.45, sunDisc: 0.04,
    wet: 1, snow: 0, rain: 1, flakes: 0, neon: 1.15, cityGlow: 1.3,
  },
  // Cool diffuse light, a cold slate-blue sky the flakes show against,
  // snow lying on what faces up
  snow: {
    sunScale: 0.32, hemiScale: 1.0, grey: 0.6, tint: [0.94, 0.99, 1.09],
    skyGrey: 0.8, skyLift: 0.86, skyTint: [0.9, 0.98, 1.16],
    fogGrey: 0.7, fogLift: 1, fogNear: 0.72, fogFar: 0.82,
    cover: 0.95, cloudDark: 0.3, sunDisc: 0.12,
    wet: 0, snow: 1, rain: 0, flakes: 1, neon: 1.15, cityGlow: 1,
  },
};

// The world's two lights as built (common.tsx: WorldLights), and the most
// their sum may reach after the daylight and the weather: a surface lit by
// both at once reflects at most albedo × LIT_LIMIT / π, under 1.0 for any
// albedo up to 1, so nothing lit crosses the bloom's threshold
export const WORLD_LIGHTS = { sun: 2.2, hemi: 2.2 } as const;
export const LIT_LIMIT = 3;

// ---------------------------------------------------------------------
// Looks as flat records of numbers, so they can be blended in place

const DAYLIGHT_KEYS = Object.keys(DAY) as (keyof DaylightLook)[];
const WEATHER_KEYS = Object.keys(WEATHER.neutral) as (keyof WeatherLook)[];

export function newDaylight(): DaylightLook {
  const out = {} as Record<string, number | RGB>;
  for (const k of DAYLIGHT_KEYS) out[k] = typeof DAY[k] === "string" ? [0, 0, 0] : 0;
  return out as unknown as DaylightLook;
}

export function newWeather(): WeatherLook {
  const out = {} as Record<string, number | RGB>;
  for (const k of WEATHER_KEYS) out[k] = Array.isArray(WEATHER.neutral[k]) ? [0, 0, 0] : 0;
  return out as unknown as WeatherLook;
}

// Blends every field of a into b by t, writing into out (no allocation)
function lerpRecord<T extends object>(keys: (keyof T)[], out: T, a: T, b: T, t: number) {
  for (const k of keys) {
    const x = a[k] as unknown;
    const y = b[k] as unknown;
    if (Array.isArray(x)) {
      const o = out[k] as unknown as RGB;
      const yy = y as RGB;
      o[0] = x[0] + (yy[0] - x[0]) * t;
      o[1] = x[1] + (yy[1] - x[1]) * t;
      o[2] = x[2] + (yy[2] - x[2]) * t;
    } else {
      (out[k] as unknown as number) = (x as number) + ((y as number) - (x as number)) * t;
    }
  }
  return out;
}

export const lerpDaylight = (out: DaylightLook, a: DaylightLook, b: DaylightLook, t: number) => lerpRecord(DAYLIGHT_KEYS, out, a, b, t);
export const lerpWeather = (out: WeatherLook, a: WeatherLook, b: WeatherLook, t: number) => lerpRecord(WEATHER_KEYS, out, a, b, t);
export const copyDaylight = (out: DaylightLook, a: DaylightLook) => lerpRecord(DAYLIGHT_KEYS, out, a, a, 0);
export const copyWeather = (out: WeatherLook, a: WeatherLook) => lerpRecord(WEATHER_KEYS, out, a, a, 0);

// The rows, parsed once
const parsed = new Map<DaylightRow, DaylightLook>();
function parse(row: DaylightRow): DaylightLook {
  let look = parsed.get(row);
  if (!look) {
    look = newDaylight();
    for (const k of DAYLIGHT_KEYS) {
      const v = row[k];
      (look as Record<string, unknown>)[k] = typeof v === "string" ? hex(v) : v;
    }
    parsed.set(row, look);
  }
  return look;
}

// The daylight's look at a point in its phase. Progress is taken in
// steps of a twentieth, so a clock that moves on every minute only
// changes the world every few minutes, and only at dawn and dusk.
export const progressStep = (progress: number) => Math.round(Math.min(1, Math.max(0, progress || 0)) * 20) / 20;

export function daylightLook(out: DaylightLook, phase: Daylight, progress: number) {
  const row = DAYLIGHT[phase] ?? DAYLIGHT.day;
  return lerpDaylight(out, parse(row.start), parse(row.end), progressStep(progress));
}

export function weatherLook(out: WeatherLook, preset: WeatherPreset) {
  return copyWeather(out, WEATHER[preset] ?? WEATHER.neutral);
}

// ---------------------------------------------------------------------
// The arithmetic: a place's own value, moved by the daylight and the
// weather

const lum = (c: RGB) => c[0] * 0.299 + c[1] * 0.587 + c[2] * 0.114;
const mixInto = (out: RGB, a: RGB, b: RGB, t: number) => {
  out[0] = a[0] + (b[0] - a[0]) * t;
  out[1] = a[1] + (b[1] - a[1]) * t;
  out[2] = a[2] + (b[2] - a[2]) * t;
  return out;
};
const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const g: RGB = [0, 0, 0];

// Toward its own grey (lifted or lowered, tinted) by an amount
function greyInto(out: RGB, c: RGB, amount: number, lift: number, tint: RGB) {
  const l = lum(c) * lift;
  g[0] = l * tint[0];
  g[1] = l * tint[1];
  g[2] = l * tint[2];
  mixInto(out, c, g, amount);
  out[0] = clamp01(out[0]);
  out[1] = clamp01(out[1]);
  out[2] = clamp01(out[2]);
  return out;
}

// A light's colour: the place's, toward the daylight's, then greyed and
// tinted by the weather
export function lightColor(out: RGB, base: RGB, toward: RGB, mix: number, w: WeatherLook) {
  mixInto(out, base, toward, mix);
  greyInto(out, out, w.grey, 1, SAME);
  out[0] = clamp01(out[0] * w.tint[0]);
  out[1] = clamp01(out[1] * w.tint[1]);
  out[2] = clamp01(out[2] * w.tint[2]);
  return out;
}

export function fogColor(out: RGB, base: RGB, d: DaylightLook, w: WeatherLook) {
  mixInto(out, base, d.fog, d.fogMix);
  return greyInto(out, out, w.fogGrey * nightHold(d.night), nightLift(w.fogLift, d.night), w.skyTint);
}

// At night the weather greys the sky and the air less, and never darker
// than the night itself: a rainy night stays deep blue, not near-black
const nightHold = (night: number) => 1 - 0.5 * night;
const nightLift = (lift: number, night: number) => lift + (Math.max(lift, 1) - lift) * night;

// A place may keep its fog from closing in past a point in any weather
// (`keep`): the riverside's, so the five sections' signs stay readable
// from Home at a rainy dawn (docs/city/scripts/visibility.mjs); the rain
// still shows in the air, the light and the far skyline.
export type FogBase = { near: number; far: number; keep?: { near: number; far: number } };

export function fogRange(out: { near: number; far: number }, base: FogBase, d: DaylightLook, w: WeatherLook) {
  out.near = base.near * d.fogNear * w.fogNear;
  out.far = base.far * d.fogFar * w.fogFar;
  if (base.keep) {
    out.near = Math.max(out.near, base.keep.near);
    out.far = Math.max(out.far, base.keep.far);
  }
  // (never a fog that ends before it starts)
  out.far = Math.max(out.far, out.near + 1);
  return out;
}

// The neon's brightness now (neonUniforms.uNeon)
export const neonLevel = (d: DaylightLook, w: WeatherLook) => d.neon * w.neon;

// The city's glow on the sky low down (the sky dome's uCityGlow)
export const cityGlowLevel = (d: DaylightLook, w: WeatherLook) => d.cityGlow * w.cityGlow;

// The share of windows lit (windowUniforms.uLitShare): the clock's
// (lib/cityWindows.ts: litShare), and never fewer than the daylight's
// least, so a winter evening already dark at five o'clock has its lit
// windows; in steps of SHARE_STEP, so they change a few at a time
export function litShareNow(clockShare: number, d: DaylightLook, step: number) {
  const share = Math.max(clockShare, d.windows);
  return Math.min(1, Math.round(share / step) * step);
}

// Bloom's strength (Post.tsx), from the neon's level: faint by day (only
// neon crosses the threshold, and by day it hardly does), full at night.
// The low tier's bloom is drawn at a quarter of the resolution, which
// spreads it wider; a little less of it reads the same.
export const BLOOM_STRENGTH = { high: 0.85, low: 0.7 } as const;
export function bloomStrength(neon: number, tier: keyof typeof BLOOM_STRENGTH) {
  const k = clamp01((neon - 0.3) / 0.7);
  return BLOOM_STRENGTH[tier] * (0.25 + 0.75 * k);
}

export const hexToRGB = hex;
export { mixInto, clamp01 };

export function skyColor(out: RGB, c: RGB, w: WeatherLook, night = 0) {
  return greyInto(out, c, w.skyGrey * nightHold(night), nightLift(w.skyLift, night), w.skyTint);
}

// Clouds: the daylight's, greyed like the sky, darker in heavy weather
export function cloudColor(out: RGB, c: RGB, w: WeatherLook, night = 0) {
  greyInto(out, c, w.skyGrey * 0.8 * nightHold(night), nightLift(w.skyLift, night), w.skyTint);
  const k = 1 - w.cloudDark * 0.5 * nightHold(night);
  out[0] *= k;
  out[1] *= k;
  out[2] *= k;
  return out;
}
