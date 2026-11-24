import type { Daylight, SkyState, WeatherPreset } from "./sky";

// How the city follows the sky. The panorama is painted twice, a day
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

// The golden hour's warm light (the painted windows' hue; once the
// --lantern token) and the palette's --cyan (docs/city/style.md)
const GOLDEN = "#f4b860";
const CYAN = "#4fd8ee";

// The most a colour grade lies over a plate: the warm one at golden hour,
// the blue one at blue hour
const GRADE_PEAK = 0.35;
const BLUE_PEAK = 0.3;
// Where in dusk the golden hour ends and the blue hour begins (dawn runs
// the other way: blue first, then gold)
const TURN = 0.55;

/** The twilight grade: golden hour, then blue hour (at dusk; the reverse at dawn), each rising and falling on a half sine, so the colour changes only where the grade is nothing. */
export function twilightGrade(daylight: Daylight, progress: number): { color: string; mix: number } {
  if (daylight !== "dawn" && daylight !== "dusk") return { color: CYAN, mix: 0 };
  // How far from day toward night: dusk runs day to night, dawn night to day
  const p = daylight === "dusk" ? clamp01(progress) : 1 - clamp01(progress);
  if (p < TURN) return { color: GOLDEN, mix: GRADE_PEAK * Math.sin((Math.PI * p) / TURN) };
  return { color: CYAN, mix: BLUE_PEAK * Math.sin((Math.PI * (p - TURN)) / (1 - TURN)) };
}

const HAZE: Record<WeatherPreset, number> = { clear: 0, neutral: 0.1, cloudy: 0.45, rain: 0.55, snow: 0.5 };

/** Attributes and variables for <html>. */
export function cityVars(sky: Pick<SkyState, "preset" | "daylight" | "progress">): {
  data: { daylight: Daylight; weather: WeatherPreset };
  vars: { "--city-night": string; "--city-grade": string; "--city-grade-mix": string; "--city-haze": string };
} {
  // Warm at golden hour, cyan at blue hour; nothing over full day or night
  const grade = twilightGrade(sky.daylight, sky.progress);
  const round = (n: number) => String(Math.round(n * 1000) / 1000);
  return {
    data: { daylight: sky.daylight, weather: sky.preset },
    vars: {
      "--city-night": round(nightBlend(sky.daylight, sky.progress)),
      "--city-grade": grade.color,
      "--city-grade-mix": round(grade.mix),
      "--city-haze": String(HAZE[sky.preset] ?? HAZE.neutral),
    },
  };
}
