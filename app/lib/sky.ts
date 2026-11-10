// The shared vocabulary of Richmond Hill's weather and daylight: what the
// server sends (/api/weather), what the corner display shows, and what the
// 3D world is told to look like. Plain types and constants, no React and no
// three.js, so the server, the pages, the world and the tests can all read
// it.

// What the scene looks like for the weather (not what the label says: a
// thunderstorm is labelled "Thunderstorm" and drawn as rain)
export type WeatherPreset = "clear" | "cloudy" | "rain" | "snow" | "neutral";

// Time of day, from Richmond Hill's clock and that date's sunrise and
// sunset. Independent of the weather: a rainy night is "rain" + "night".
export type Daylight = "dawn" | "day" | "dusk" | "night";

export const WEATHER_PRESETS: readonly WeatherPreset[] = ["clear", "cloudy", "rain", "snow", "neutral"];
export const DAYLIGHTS: readonly Daylight[] = ["dawn", "day", "dusk", "night"];

// One reading, as /api/weather returns it. Every time is Unix seconds
// (UTC); Richmond Hill's local time is derived with America/Toronto, so
// daylight-saving changes are handled by the platform, never by hand.
export type WeatherReading = {
  observedAt: number; // Open-Meteo's `current.time`: the reading's own time
  fetchedAt: number; // when our server fetched it from Open-Meteo
  temperatureC: number;
  weatherCode: number; // WMO code
  cloudCover: number; // percent
  isDay: boolean;
  // Today's and the next days' sun, by local date (YYYY-MM-DD in Toronto)
  sun: { date: string; sunrise: number; sunset: number }[];
};

export type WeatherResponse =
  | { ok: true; reading: WeatherReading }
  | { ok: false; error: "timeout" | "upstream" | "malformed" };

// What the world is told (world3d/store.ts: `sky`). `source` says where
// it came from: the live reading, the development preview controls, or a
// fallback before any reading (or when there is none).
export type SkyState = {
  preset: WeatherPreset;
  daylight: Daylight;
  // 0..1 through the current phase where it matters for blending (e.g.
  // how far into dusk); 0 when unknown
  progress: number;
  source: "live" | "preview" | "fallback";
};

// The icons the display can show (components/weather/WeatherIcon.tsx)
export type WeatherIconId =
  | "sun"
  | "moon"
  | "partly-sun"
  | "partly-moon"
  | "cloud"
  | "fog"
  | "drizzle"
  | "rain"
  | "freezing-rain"
  | "snow"
  | "thunder"
  | "unknown";

// How the display should treat what it has: still waiting for the first
// reading; a reading recent enough to show as is; an older one, shown
// and labelled stale; or none usable ("Weather unavailable").
export type WeatherStatus = "loading" | "fresh" | "stale" | "unavailable";

// What the client hook (components/weather/useRichmondHill.ts) gives the
// display and the world driver. The clock part changes once a minute; the
// weather part only when a reading arrives, so a tick never refetches.
export type RichmondHillNow = {
  now: number; // ms since the epoch, at the last minute boundary
  time: string; // Richmond Hill's local time, e.g. "3:07 PM"
  date: string; // Richmond Hill's local date, YYYY-MM-DD
  status: WeatherStatus;
  reading: WeatherReading | null;
  condition: { label: string; preset: WeatherPreset; icon: WeatherIconId } | null;
  daylight: { phase: Daylight; progress: number; sunrise: number; sunset: number };
};
