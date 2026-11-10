// Richmond Hill's weather, as pure functions: the Open-Meteo request, the
// strict reading of its response, what a WMO weather code is called and
// how the world draws it, and how old a reading may be before it's shown
// as stale or not at all. No fetching, React or three.js here; the route
// (app/api/weather/route.ts), the client hook and the tests all use it.
//
// Value imports stay out of this file (only `import type`), so the tests
// can load it straight into Node.
import type { WeatherIconId, WeatherPreset, WeatherReading } from "./sky";

export type Condition = { label: string; preset: WeatherPreset; icon: WeatherIconId };

type Place = { latitude: number; longitude: number; timeZone: string };

// --- The request ---------------------------------------------------------

// Current conditions, and sunrise and sunset from yesterday to the day
// after tomorrow (so the night's progress and tomorrow's dawn are known
// without a second request). Times come back as Unix seconds.
export function forecastUrl(endpoint: string, place: Place): string {
  const params = new URLSearchParams({
    latitude: String(place.latitude),
    longitude: String(place.longitude),
    current: "temperature_2m,weather_code,cloud_cover,is_day",
    daily: "sunrise,sunset",
    timezone: place.timeZone,
    timeformat: "unixtime",
    past_days: "1",
    forecast_days: "3",
  });
  return `${endpoint}?${params}`;
}

// --- Reading the response ------------------------------------------------

const HOUR = 3600;

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const isNumber = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const inRange = (v: unknown, min: number, max: number): v is number => isNumber(v) && v >= min && v <= max;

// Richmond Hill's local date (YYYY-MM-DD) of a Unix time
function dateIn(timeZone: string, unixSeconds: number): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(
    new Date(unixSeconds * 1000),
  );
  const get = (type: string) => parts.find((p) => p.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

// The sun on one day, checked: sunrise before sunset, both on the day
// itself, and a length of day possible this far from the poles (Richmond
// Hill's runs from about 9 to 15.5 hours)
function readSun(timeZone: string, day: unknown, sunrise: unknown, sunset: unknown) {
  if (!isNumber(day) || !isNumber(sunrise) || !isNumber(sunset)) return null;
  const length = sunset - sunrise;
  if (length < 4 * HOUR || length > 20 * HOUR) return null;
  const date = dateIn(timeZone, day);
  if (dateIn(timeZone, sunrise) !== date || dateIn(timeZone, sunset) !== date) return null;
  return { date, sunrise, sunset };
}

// Open-Meteo's response → a reading, or null if anything is missing, of
// the wrong type or out of range. Nothing is guessed or filled in: a
// response that fails any check is "malformed" as a whole.
export function parseForecast(json: unknown, fetchedAt: number, timeZone: string): WeatherReading | null {
  if (!isObject(json) || !isObject(json.current) || !isObject(json.daily)) return null;
  const { time, temperature_2m, weather_code, cloud_cover, is_day } = json.current;

  // The reading's own time: not from the future, and not from days ago
  if (!isNumber(time) || time > fetchedAt + HOUR || time < fetchedAt - 24 * HOUR) return null;
  // Colder than −90 °C or hotter than 60 °C has never been measured anywhere
  if (!inRange(temperature_2m, -90, 60)) return null;
  // WMO codes are whole numbers 0–99 (codes the table doesn't name are
  // shown as "Unknown conditions", not rejected)
  if (!Number.isInteger(weather_code) || !inRange(weather_code, 0, 99)) return null;
  if (!inRange(cloud_cover, 0, 100)) return null;
  if (is_day !== 0 && is_day !== 1) return null;

  const { time: days, sunrise, sunset } = json.daily;
  if (!Array.isArray(days) || !Array.isArray(sunrise) || !Array.isArray(sunset)) return null;
  if (days.length === 0 || days.length > 16 || sunrise.length !== days.length || sunset.length !== days.length) return null;
  const sun: WeatherReading["sun"] = [];
  for (let i = 0; i < days.length; i++) {
    const day = readSun(timeZone, days[i], sunrise[i], sunset[i]);
    if (!day || (sun.length > 0 && day.date <= sun[sun.length - 1].date)) return null;
    sun.push(day);
  }

  return {
    observedAt: time,
    fetchedAt,
    temperatureC: temperature_2m,
    weatherCode: weather_code,
    cloudCover: cloud_cover,
    isDay: is_day === 1,
    sun,
  };
}

// The same checks for a reading that has already been through
// parseForecast, e.g. one the browser gets back from /api/weather
export function isWeatherReading(r: unknown): r is WeatherReading {
  if (!isObject(r)) return false;
  if (!isNumber(r.observedAt) || !isNumber(r.fetchedAt) || r.observedAt > r.fetchedAt + HOUR) return false;
  if (!inRange(r.temperatureC, -90, 60) || !Number.isInteger(r.weatherCode) || !inRange(r.weatherCode, 0, 99)) return false;
  if (!inRange(r.cloudCover, 0, 100) || typeof r.isDay !== "boolean" || !Array.isArray(r.sun)) return false;
  return r.sun.every(
    (d) =>
      isObject(d) &&
      typeof d.date === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(d.date) &&
      isNumber(d.sunrise) &&
      isNumber(d.sunset) &&
      d.sunset - d.sunrise >= 4 * HOUR &&
      d.sunset - d.sunrise <= 20 * HOUR,
  );
}

// --- What the weather is called, and how it's drawn ----------------------

// WMO 4677 codes as Open-Meteo uses them (https://open-meteo.com/en/docs,
// "WMO Weather interpretation codes"). `day`/`night` labels differ only
// for clear skies. Thunderstorms are drawn as rain; fog as cloud. Snow is
// only ever what the code says, never inferred from the temperature.
type Entry = { day: string; night?: string; preset: WeatherPreset; icon: WeatherIconId; nightIcon?: WeatherIconId };

const CODES: Record<number, Entry> = {
  0: { day: "Sunny", night: "Clear", preset: "clear", icon: "sun", nightIcon: "moon" },
  1: { day: "Mainly sunny", night: "Mainly clear", preset: "clear", icon: "partly-sun", nightIcon: "partly-moon" },
  2: { day: "Partly cloudy", preset: "cloudy", icon: "partly-sun", nightIcon: "partly-moon" },
  3: { day: "Overcast", preset: "cloudy", icon: "cloud" },
  45: { day: "Fog", preset: "cloudy", icon: "fog" },
  48: { day: "Freezing fog", preset: "cloudy", icon: "fog" },
  51: { day: "Light drizzle", preset: "rain", icon: "drizzle" },
  53: { day: "Drizzle", preset: "rain", icon: "drizzle" },
  55: { day: "Heavy drizzle", preset: "rain", icon: "drizzle" },
  56: { day: "Light freezing drizzle", preset: "rain", icon: "freezing-rain" },
  57: { day: "Freezing drizzle", preset: "rain", icon: "freezing-rain" },
  61: { day: "Light rain", preset: "rain", icon: "rain" },
  63: { day: "Rain", preset: "rain", icon: "rain" },
  65: { day: "Heavy rain", preset: "rain", icon: "rain" },
  66: { day: "Light freezing rain", preset: "rain", icon: "freezing-rain" },
  67: { day: "Freezing rain", preset: "rain", icon: "freezing-rain" },
  71: { day: "Light snow", preset: "snow", icon: "snow" },
  73: { day: "Snow", preset: "snow", icon: "snow" },
  75: { day: "Heavy snow", preset: "snow", icon: "snow" },
  77: { day: "Snow grains", preset: "snow", icon: "snow" },
  80: { day: "Light rain showers", preset: "rain", icon: "rain" },
  81: { day: "Rain showers", preset: "rain", icon: "rain" },
  82: { day: "Heavy rain showers", preset: "rain", icon: "rain" },
  85: { day: "Snow showers", preset: "snow", icon: "snow" },
  86: { day: "Heavy snow showers", preset: "snow", icon: "snow" },
  95: { day: "Thunderstorm", preset: "rain", icon: "thunder" },
  96: { day: "Thunderstorm with hail", preset: "rain", icon: "thunder" },
  99: { day: "Thunderstorm with heavy hail", preset: "rain", icon: "thunder" },
};

export const UNKNOWN_CONDITION: Condition = { label: "Unknown conditions", preset: "neutral", icon: "unknown" };

export function describeWeather(code: number, isDay: boolean): Condition {
  const entry = Object.hasOwn(CODES, code) ? CODES[code] : undefined;
  if (!entry) return UNKNOWN_CONDITION;
  return {
    label: isDay ? entry.day : (entry.night ?? entry.day),
    preset: entry.preset,
    icon: isDay ? entry.icon : (entry.nightIcon ?? entry.icon),
  };
}

// --- How old a reading may be --------------------------------------------

// Open-Meteo's current conditions cover 15-minute intervals, and the
// server keeps a reading for 15 minutes more, so a reading is normally up
// to about 30 minutes old (a little more while the server refreshes in
// the background). Past 45 minutes at least two refreshes have been
// missed: it's still shown, labelled stale. Past 3 hours it no longer
// says anything useful about now, and isn't shown at all.
export const STALE_AFTER_SECONDS = 45 * 60;
export const UNUSABLE_AFTER_SECONDS = 3 * 60 * 60;

export function readingAge(reading: WeatherReading, nowMs: number): "fresh" | "stale" | "unusable" {
  const age = nowMs / 1000 - reading.observedAt;
  if (age > UNUSABLE_AFTER_SECONDS) return "unusable";
  return age > STALE_AFTER_SECONDS ? "stale" : "fresh";
}
