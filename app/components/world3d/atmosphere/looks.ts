// How the world looks for each time of day and each kind of weather: the
// one table to tune (DAYLIGHT, WEATHER), and the arithmetic that turns a
// place's own lighting into what it should be now. Plain numbers, no
// three.js and no React, so the tests can run it.
//
// Daylight and weather are independent: a rainy night is the night's
// light with the rain's muting on top. Each place keeps its own colours
// (the workshop's warm fog, the park's blue one); the table says how far
// to move them, so neutral weather by day is the park as it has always
// been, the late-afternoon light of the painting.
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
  night: number; // 0 day .. 1 night: windows and lamps, the moon, stars
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
  cover: number; // cloud cover, 0 clear .. 1 overcast (0.5: the painting's sky)
  cloudDark: number; // heavier, darker cloud
  sunDisc: number; // how much of the sun's (moon's) glow shows through
  wet: number; // envUniforms.uWet
  snow: number; // envUniforms.uSnow
  rain: number; // falling rain, 0..1 of the full density
  flakes: number; // falling snow, 0..1
};

const hex = (h: string): RGB => {
  const n = parseInt(h.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

type DaylightRow = { [K in keyof DaylightLook]: DaylightLook[K] extends RGB ? string : number };

// Each phase has a look at its start and at its end, and moves between
// them with the phase's progress (lib/sky.ts: SkyState.progress): dusk
// starts warm and ends cool, dawn starts lavender and ends gold. Day and
// night hold one look.
const DAY: DaylightRow = {
  sun: "#ffe2b8", sunMix: 0.3, sunScale: 1.05,
  hemiSky: "#fbe9c9", hemiGround: "#6a6f42", hemiMix: 0.25, hemiScale: 1.06,
  fog: "#d9e6ee", fogMix: 0.25, fogNear: 1, fogFar: 1.05,
  top: "#4fbde8", horizon: "#fff2df", glow: "#ffe6c2",
  cloudLit: "#fffbf3", cloudShade: "#d7ddf1", // the painting's (props.ts: buildSky)
  sunHeight: 1.1, night: 0,
};

const NIGHT: DaylightRow = {
  sun: "#8fa3dc", sunMix: 1, sunScale: 0.22,
  hemiSky: "#5c6699", hemiGround: "#24242f", hemiMix: 0.9, hemiScale: 0.46,
  fog: "#394068", fogMix: 0.92, fogNear: 0.8, fogFar: 0.85,
  top: "#172048", horizon: "#3b4574", glow: "#cdd6f2",
  cloudLit: "#6d74a0", cloudShade: "#3a3e66",
  sunHeight: 1.5, night: 1,
};

export const DAYLIGHT: Record<Daylight, { start: DaylightRow; end: DaylightRow }> = {
  dawn: {
    start: {
      sun: "#e9b4a6", sunMix: 0.85, sunScale: 0.4,
      hemiSky: "#b9bfdc", hemiGround: "#454a4e", hemiMix: 0.7, hemiScale: 0.62,
      fog: "#c9cde0", fogMix: 0.8, fogNear: 0.55, fogFar: 0.7,
      top: "#7b9fcf", horizon: "#f2cfc6", glow: "#ffd0b8",
      cloudLit: "#f6dcd8", cloudShade: "#b5bad8",
      sunHeight: 0.12, night: 0.5,
    },
    end: {
      sun: "#ffd6a6", sunMix: 0.6, sunScale: 0.8,
      hemiSky: "#eadfd0", hemiGround: "#5a5e48", hemiMix: 0.45, hemiScale: 0.9,
      fog: "#e4e3e0", fogMix: 0.65, fogNear: 0.6, fogFar: 0.75,
      top: "#78b6e0", horizon: "#fbe6cf", glow: "#ffe2b8",
      cloudLit: "#fff6ea", cloudShade: "#cfd5ec",
      sunHeight: 0.35, night: 0.08,
    },
  },
  day: { start: DAY, end: DAY },
  dusk: {
    start: {
      sun: "#ff9a4c", sunMix: 0.85, sunScale: 0.95,
      hemiSky: "#f8c294", hemiGround: "#5e4e34", hemiMix: 0.55, hemiScale: 0.86,
      fog: "#f0cdb0", fogMix: 0.6, fogNear: 0.95, fogFar: 1,
      top: "#5a98cf", horizon: "#ffb27a", glow: "#ffac66",
      cloudLit: "#ffe2c0", cloudShade: "#c6b6d4",
      sunHeight: 0.45, night: 0.12,
    },
    end: {
      sun: "#d9786a", sunMix: 0.9, sunScale: 0.4,
      hemiSky: "#9c92ba", hemiGround: "#3e3a40", hemiMix: 0.75, hemiScale: 0.56,
      fog: "#9e97b4", fogMix: 0.8, fogNear: 0.8, fogFar: 0.85,
      top: "#34417f", horizon: "#d99098", glow: "#f29a7c",
      cloudLit: "#e8b0ac", cloudShade: "#7e78a4",
      sunHeight: 0.08, night: 0.65,
    },
  },
  night: { start: NIGHT, end: NIGHT },
};

const SAME: RGB = [1, 1, 1];

export const WEATHER: Record<WeatherPreset, WeatherLook> = {
  // Unknown or no reading: the painting's own sky
  neutral: {
    sunScale: 1, hemiScale: 1, grey: 0, tint: SAME,
    skyGrey: 0, skyLift: 1, skyTint: SAME,
    fogGrey: 0, fogLift: 1, fogNear: 1, fogFar: 1,
    cover: 0.5, cloudDark: 0, sunDisc: 1,
    wet: 0, snow: 0, rain: 0, flakes: 0,
  },
  // Warm sun, clearer air, fewer clouds, a little more gold
  clear: {
    sunScale: 1.12, hemiScale: 1, grey: 0, tint: [1.035, 1, 0.95],
    skyGrey: -0.08, skyLift: 1, skyTint: SAME,
    fogGrey: 0, fogLift: 1, fogNear: 1.15, fogFar: 1.3,
    cover: 0.3, cloudDark: 0, sunDisc: 1,
    wet: 0, snow: 0, rain: 0, flakes: 0,
  },
  // Diffuse light, a muted sky, gentle haze: a soft warm grey, so it never
  // reads as snow's cold one
  cloudy: {
    sunScale: 0.36, hemiScale: 1.1, grey: 0.45, tint: [1, 0.99, 0.98],
    skyGrey: 0.7, skyLift: 0.98, skyTint: [1.03, 1, 0.95],
    fogGrey: 0.5, fogLift: 0.92, fogNear: 0.8, fogFar: 0.82,
    cover: 0.9, cloudDark: 0.12, sunDisc: 0.2,
    wet: 0, snow: 0, rain: 0, flakes: 0,
  },
  // Cooler light, darker cloud, wet ground, a fine rain (never lightning)
  rain: {
    sunScale: 0.2, hemiScale: 0.84, grey: 0.55, tint: [0.9, 0.97, 1.1],
    skyGrey: 0.85, skyLift: 0.7, skyTint: [0.93, 0.98, 1.08],
    fogGrey: 0.7, fogLift: 0.62, fogNear: 0.55, fogFar: 0.8,
    cover: 1, cloudDark: 0.45, sunDisc: 0.04,
    wet: 1, snow: 0, rain: 1, flakes: 0,
  },
  // Cool diffuse light, a cold slate-blue sky the flakes show against,
  // pale air low down, snow lying on what faces up
  snow: {
    sunScale: 0.32, hemiScale: 1.0, grey: 0.6, tint: [0.94, 0.99, 1.09],
    skyGrey: 0.8, skyLift: 0.86, skyTint: [0.9, 0.98, 1.16],
    fogGrey: 0.7, fogLift: 1, fogNear: 0.72, fogFar: 0.82,
    cover: 0.95, cloudDark: 0.3, sunDisc: 0.12,
    wet: 0, snow: 1, rain: 0, flakes: 1,
  },
};

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

// Indoors the weather and the hour reach the room's air less than they
// reach the sky outside its windows
const INDOOR_FOG = 0.3;

export function fogColor(out: RGB, base: RGB, d: DaylightLook, w: WeatherLook, indoor: boolean) {
  const k = indoor ? INDOOR_FOG : 1;
  mixInto(out, base, d.fog, d.fogMix * k);
  return greyInto(out, out, w.fogGrey * k * nightHold(d.night), nightLift(w.fogLift, d.night), w.skyTint);
}

// At night the weather greys the sky and the air less, and never darker
// than the night itself: a rainy night stays blue-indigo, not near-black
// (the corner controls and the words sit on it)
const nightHold = (night: number) => 1 - 0.5 * night;
const nightLift = (lift: number, night: number) => lift + (Math.max(lift, 1) - lift) * night;

// A place may keep its fog from closing in past a point in any weather
// (`keep`): the park's, so its places stay readable from the steps at a
// rainy dawn; the rain still shows in the air, the light and the far city.
export type FogBase = { near: number; far: number; keep?: { near: number; far: number } };

export function fogRange(out: { near: number; far: number }, base: FogBase, d: DaylightLook, w: WeatherLook, indoor: boolean) {
  const k = indoor ? INDOOR_FOG * 0.8 : 1;
  out.near = base.near * (1 + (d.fogNear - 1) * k) * (1 + (w.fogNear - 1) * k);
  out.far = base.far * (1 + (d.fogFar - 1) * k) * (1 + (w.fogFar - 1) * k);
  if (base.keep) {
    out.near = Math.max(out.near, base.keep.near);
    out.far = Math.max(out.far, base.keep.far);
  }
  return out;
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

// Which places are out of doors: rain falls and things get wet there.
// Indoors, the day and the weather come in through the windows.
export const OUTDOORS = new Set(["park", "station", "booth"]);
