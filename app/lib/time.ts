// Richmond Hill's clock and daylight, as pure functions. Local time and
// date come from Intl with the place's time zone, so daylight-saving
// changes are the platform's job: there are no offsets in this file.
//
// Times: `ms` arguments are milliseconds since the epoch (Date.now());
// sunrise, sunset and readings are Unix seconds (lib/sky.ts).
//
// Value imports stay out of this file (only `import type`), so the tests
// can load it straight into Node.
import type { Daylight, WeatherReading } from "./sky";

export type Sun = { sunrise: number; sunset: number };

// Formatters are built once per time zone: Intl.DateTimeFormat is slow to
// construct and this runs every minute
const timeFormats = new Map<string, Intl.DateTimeFormat>();
const dateFormats = new Map<string, Intl.DateTimeFormat>();

function formatter(cache: Map<string, Intl.DateTimeFormat>, timeZone: string, options: Intl.DateTimeFormatOptions) {
  let f = cache.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-CA", { timeZone, ...options });
    cache.set(timeZone, f);
  }
  return f;
}

// "3:07 PM": the hour without a leading zero. Some engines put a narrow
// no-break space before AM/PM and some write "p.m."; this always gives a
// plain space and "AM"/"PM".
export function localTime(ms: number, timeZone: string): string {
  const parts = formatter(timeFormats, timeZone, { hour: "numeric", minute: "2-digit", hour12: true }).formatToParts(ms);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const hour = String(Number(get("hour")));
  const period = /^a/i.test(get("dayPeriod").trim()) ? "AM" : "PM";
  return `${hour}:${get("minute")} ${period}`;
}

// YYYY-MM-DD on the local calendar
export function localDate(ms: number, timeZone: string): string {
  const parts = formatter(dateFormats, timeZone, { year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(ms);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

// The calendar date `days` after `date` (YYYY-MM-DD; no time zone needed:
// it's arithmetic on the calendar)
export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

// --- The sun without a forecast ------------------------------------------

const RAD = Math.PI / 180;

// Sunrise and sunset on a local date, from the NOAA solar equations
// (https://gml.noaa.gov/grad/solcalc/solareqns.PDF): the equation of time
// and the sun's declination from the fractional year, and the hour angle
// at which the sun's centre is 0.833° below the horizon (refraction and
// the sun's radius). Good to a minute or two at Richmond Hill's latitude,
// which is all the world's daylight needs. Used only when there's no
// reading: it's astronomy, so it never stands in for weather.
export function solarSun(date: string, latitude: number, longitude: number): Sun {
  const [y, m, d] = date.split("-").map(Number);
  const midnightUtc = Date.UTC(y, m - 1, d) / 1000;
  const dayOfYear = Math.round((midnightUtc - Date.UTC(y, 0, 1) / 1000) / 86400) + 1;
  const daysInYear = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0 ? 366 : 365;
  // At local solar noon, where the day's sunrise and sunset fall on either side
  const noonUtcHour = 12 - longitude / 15;
  const g = ((2 * Math.PI) / daysInYear) * (dayOfYear - 1 + (noonUtcHour - 12) / 24);

  const eqTime =
    229.18 *
    (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  const decl =
    0.006918 -
    0.399912 * Math.cos(g) +
    0.070257 * Math.sin(g) -
    0.006758 * Math.cos(2 * g) +
    0.000907 * Math.sin(2 * g) -
    0.002697 * Math.cos(3 * g) +
    0.00148 * Math.sin(3 * g);

  const lat = latitude * RAD;
  const cosHa = Math.cos(90.833 * RAD) / (Math.cos(lat) * Math.cos(decl)) - Math.tan(lat) * Math.tan(decl);
  // Polar day or night can't happen at Richmond Hill; clamp for safety
  const ha = Math.acos(Math.min(1, Math.max(-1, cosHa))) / RAD;

  // Minutes after UTC midnight of the date (sunset can pass 1440: the
  // evening is already the next UTC day)
  const sunriseMin = 720 - 4 * (longitude + ha) - eqTime;
  const sunsetMin = 720 - 4 * (longitude - ha) - eqTime;
  return { sunrise: Math.round(midnightUtc + sunriseMin * 60), sunset: Math.round(midnightUtc + sunsetMin * 60) };
}

// The sun on a local date: the reading's, if it has that date, otherwise
// the astronomical one
export function sunOn(date: string, reading: WeatherReading | null, latitude: number, longitude: number): Sun {
  const day = reading?.sun.find((s) => s.date === date);
  return day ? { sunrise: day.sunrise, sunset: day.sunset } : solarSun(date, latitude, longitude);
}

// --- Daylight ------------------------------------------------------------

// Dawn and dusk run from 40 minutes before to 40 minutes after sunrise and
// sunset: long enough for the sky to change gently, and about what civil
// twilight plus the low-sun golden light last at this latitude
export const TWILIGHT_SECONDS = 40 * 60;

const fraction = (now: number, start: number, end: number) => (end > start ? Math.min(1, Math.max(0, (now - start) / (end - start))) : 0);

// The phase at `nowSec`, and how far through it (0..1). `today` is the sun
// on the current local date; `prevSunset` and `nextSunrise` (the evening
// before and the morning after) only shape the night's progress, and are
// taken as a day away from today's if not given.
export function daylightAt(
  nowSec: number,
  today: Sun,
  prevSunset: number = today.sunset - 86400,
  nextSunrise: number = today.sunrise + 86400,
): { phase: Daylight; progress: number } {
  const dawnStart = today.sunrise - TWILIGHT_SECONDS;
  const dawnEnd = today.sunrise + TWILIGHT_SECONDS;
  const duskStart = today.sunset - TWILIGHT_SECONDS;
  const duskEnd = today.sunset + TWILIGHT_SECONDS;
  if (nowSec < dawnStart) return { phase: "night", progress: fraction(nowSec, prevSunset + TWILIGHT_SECONDS, dawnStart) };
  if (nowSec < dawnEnd) return { phase: "dawn", progress: fraction(nowSec, dawnStart, dawnEnd) };
  if (nowSec < duskStart) return { phase: "day", progress: fraction(nowSec, dawnEnd, duskStart) };
  if (nowSec < duskEnd) return { phase: "dusk", progress: fraction(nowSec, duskStart, duskEnd) };
  return { phase: "night", progress: fraction(nowSec, duskEnd, nextSunrise - TWILIGHT_SECONDS) };
}

// Everything the clock needs at one moment: local time and date, and the
// day's sun and daylight (from the reading where it has the date)
export function richmondHillClock(
  ms: number,
  reading: WeatherReading | null,
  place: { latitude: number; longitude: number; timeZone: string },
) {
  const date = localDate(ms, place.timeZone);
  const today = sunOn(date, reading, place.latitude, place.longitude);
  const yesterday = sunOn(addDays(date, -1), reading, place.latitude, place.longitude);
  const tomorrow = sunOn(addDays(date, 1), reading, place.latitude, place.longitude);
  const { phase, progress } = daylightAt(ms / 1000, today, yesterday.sunset, tomorrow.sunrise);
  return {
    time: localTime(ms, place.timeZone),
    date,
    daylight: { phase, progress, sunrise: today.sunrise, sunset: today.sunset },
  };
}

// Whether to word the weather for day or night ("Sunny" or "Clear"): by
// Richmond Hill's own sun, the same clock the world's daylight follows,
// so the label and the scene agree at sunrise and sunset. The reading's
// is_day is only used when the day's sun isn't known.
export function isDaytime(nowSeconds: number, sun: Sun, fallback: boolean): boolean {
  if (!(sun.sunrise > 0 && sun.sunset > sun.sunrise)) return fallback;
  return nowSeconds >= sun.sunrise && nowSeconds < sun.sunset;
}
