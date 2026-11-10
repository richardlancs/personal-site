import type { Daylight, SkyState, WeatherPreset } from "../../../lib/sky";

// The development preview's address form (DevSkyPanel.tsx): ?sky=rain-night,
// or with how far into the phase, ?sky=clear-dusk-0.8. Anything else is
// ignored. (The lists are lib/sky.ts's; the tests check they match.)
const PRESETS: readonly WeatherPreset[] = ["clear", "cloudy", "rain", "snow", "neutral"];
const PHASES: readonly Daylight[] = ["dawn", "day", "dusk", "night"];

export function parseSkyParam(value: string | null): SkyState | null {
  if (!value) return null;
  const [preset, daylight = "day", progress = "0.5"] = value.split("-");
  if (!PRESETS.includes(preset as WeatherPreset) || !PHASES.includes(daylight as Daylight)) return null;
  const p = Number(progress);
  return { preset: preset as WeatherPreset, daylight: daylight as Daylight, progress: Number.isFinite(p) ? Math.min(1, Math.max(0, p)) : 0.5, source: "preview" };
}

export const PREVIEW_PRESETS = PRESETS;
export const PREVIEW_PHASES = PHASES;
