import type { Daylight, SkyState, WeatherPreset } from "./sky";

// How the 2D city follows the sky. Each district is painted twice, a day
// plate and a night plate of one composition; the clock decides which is
// shown (or how far one has faded into the other), and the weather how
// much haze lies over it. Pure: components/city2d/CityDriver.tsx writes
// the result onto <html>, and city.css does the rest.

export type Plate = "day" | "night";

const clamp01 = (n: number) => (Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0);

/** Night plate opacity, 0 (day) to 1 (night). */
export function nightBlend(phase: Daylight, progress: number): number {
  const p = clamp01(progress);
  if (phase === "day") return 0;
  if (phase === "night") return 1;
  return phase === "dusk" ? p : 1 - p;
}

/** Which plates must be mounted for a blend: both only while they cross. */
export function platesNeeded(blend: number): Plate[] {
  const b = clamp01(blend);
  if (b === 0) return ["day"];
  if (b === 1) return ["night"];
  return ["day", "night"];
}

// docs/city/style.md, "Palette": --amber and --cyan
const AMBER = "#ffb454";
const CYAN = "#4fd8ee";

// The most a colour grade lies over a plate, at the middle of twilight
const GRADE_PEAK = 0.35;

const HAZE: Record<WeatherPreset, number> = { clear: 0, neutral: 0.1, cloudy: 0.45, rain: 0.55, snow: 0.5 };

/** Attributes and variables for <html>. */
export function cityVars(sky: Pick<SkyState, "preset" | "daylight" | "progress">): {
  data: { daylight: Daylight; weather: WeatherPreset };
  vars: { "--city-night": string; "--city-grade": string; "--city-grade-mix": string; "--city-haze": string };
} {
  const twilight = sky.daylight === "dawn" || sky.daylight === "dusk";
  // Warm through dawn and dusk, rising and falling on a half sine so it
  // arrives and leaves without a step; nothing over full day or night
  const mix = twilight ? GRADE_PEAK * Math.sin(Math.PI * clamp01(sky.progress)) : 0;
  const round = (n: number) => String(Math.round(n * 1000) / 1000);
  return {
    data: { daylight: sky.daylight, weather: sky.preset },
    vars: {
      "--city-night": round(nightBlend(sky.daylight, sky.progress)),
      "--city-grade": twilight ? AMBER : CYAN,
      "--city-grade-mix": round(mix),
      "--city-haze": String(HAZE[sky.preset] ?? HAZE.neutral),
    },
  };
}
