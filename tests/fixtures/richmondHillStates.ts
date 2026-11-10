// Test data for the Richmond Hill display (tests/weather-ui.test.mjs):
// one RichmondHillNow for each state and kind of condition the display
// has to handle. The values are made up for testing and never reach the
// site; the app doesn't import this file.
import type { RichmondHillNow, WeatherIconId, WeatherPreset } from "../../app/lib/sky";

// 10 November 2026 in Richmond Hill (EST, UTC−5)
const at = (h: number, m: number) => Date.UTC(2026, 10, 10, h + 5, m) / 1000;
const sun = [{ date: "2026-11-10", sunrise: at(6, 59), sunset: at(16, 53) }];

const base = (time: string, seconds: number, phase: RichmondHillNow["daylight"]["phase"]): RichmondHillNow => ({
  now: seconds * 1000,
  time,
  date: "2026-11-10",
  status: "loading",
  reading: null,
  condition: null,
  daylight: { phase, progress: 0, sunrise: sun[0].sunrise, sunset: sun[0].sunset },
});

function reading(observed: number, temperatureC: number, weatherCode: number, isDay = true) {
  return { observedAt: observed, fetchedAt: observed + 9 * 60, temperatureC, weatherCode, cloudCover: 80, isDay, sun };
}

function fresh(time: string, seconds: number, temperatureC: number, label: string, icon: WeatherIconId, preset: WeatherPreset, isDay = true): RichmondHillNow {
  return {
    ...base(time, seconds, isDay ? "day" : "night"),
    status: "fresh",
    reading: reading(seconds - 22 * 60, temperatureC, 3, isDay),
    condition: { label, preset, icon },
  };
}

const day = at(15, 7);
const night = at(21, 42);

export const MOCKS = {
  // What the real hook gives on the server and at hydration (its SERVER_SNAPSHOT)
  "loading-ssr": { ...base("", 0, "day"), date: "", daylight: { phase: "day", progress: 0, sunrise: 0, sunset: 0 } },
  loading: { ...base("3:07 PM", day, "day") },
  fresh: fresh("3:07 PM", day, 4, "Overcast", "cloud", "cloudy"),
  night: fresh("9:42 PM", night, -2, "Clear", "moon", "clear", false),
  stale: {
    ...fresh("6:41 PM", at(18, 41), 6, "Light drizzle", "drizzle", "rain"),
    status: "stale",
    reading: reading(at(16, 15), 6, 51),
  },
  "stale-yesterday": {
    ...fresh("9:05 AM", at(9, 5), 1, "Fog", "fog", "cloudy"),
    status: "stale",
    reading: { ...reading(at(-2, 30), 1, 45), observedAt: at(-2, 30) },
  },
  unavailable: { ...base("3:07 PM", day, "day"), status: "unavailable" },
  sun: fresh("12:30 PM", at(12, 30), 12, "Clear", "sun", "clear"),
  "partly-sun": fresh("10:15 AM", at(10, 15), 9, "Partly cloudy", "partly-sun", "cloudy"),
  "partly-moon": fresh("11:58 PM", at(23, 58), 3, "Partly cloudy", "partly-moon", "cloudy", false),
  fog: fresh("7:20 AM", at(7, 20), 2, "Fog", "fog", "cloudy"),
  drizzle: fresh("2:00 PM", at(14, 0), 7, "Light drizzle", "drizzle", "rain"),
  rain: fresh("4:45 PM", at(16, 45), 8, "Moderate rain", "rain", "rain"),
  "freezing-rain": fresh("5:30 AM", at(5, 30), -1, "Freezing rain", "freezing-rain", "rain", false),
  snow: fresh("1:10 PM", at(13, 10), -12, "Heavy snow", "snow", "snow"),
  thunder: fresh("6:05 PM", at(18, 5), 21, "Thunderstorm with hail", "thunder", "rain"),
  unknown: fresh("3:07 PM", day, 4, "Unknown", "unknown", "neutral"),
} satisfies Record<string, RichmondHillNow>;

export type MockKind = keyof typeof MOCKS;

export const mockRichmondHill = (kind: string): RichmondHillNow | null =>
  Object.hasOwn(MOCKS, kind) ? MOCKS[kind as MockKind] : null;
