// The words of the Richmond Hill display (WeatherClock.tsx), worked out
// from what the hook gives (useRichmondHill, RichmondHillNow in lib/sky.ts).
// Plain functions, no React, so the tests can read every state. Nothing
// here makes a value up: a field the reading doesn't have is left out.
import type { RichmondHillNow, WeatherIconId, WeatherStatus } from "../../lib/sky";

export type ClockText = {
  status: WeatherStatus;
  time: string | null; // "3:07 PM"; null until the clock is known
  temperature: string | null; // "4 °C"; null without a usable reading
  condition: string | null; // "Overcast"
  icon: WeatherIconId | null; // null while loading
  asOf: string | null; // stale only: when the reading was observed
  label: string; // the button's accessible name
  details: {
    date: string | null; // "Tuesday, November 10"
    sunrise: string | null;
    sunset: string | null;
    observed: string | null;
    updated: string | null;
    note: string | null; // the stale or unavailable line
  };
};

// "3:00 PM" in the given time zone, from Unix seconds
export function clockTime(seconds: number, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", minute: "2-digit" }).format(seconds * 1000);
}

// YYYY-MM-DD of a moment in the given time zone
export function localDate(seconds: number, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(seconds * 1000);
}

// "Nov 9" for a reading from another day than today
function shortDate(seconds: number, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", { timeZone, month: "short", day: "numeric" }).format(seconds * 1000);
}

// "Tuesday, November 10" from a local YYYY-MM-DD (read as a calendar date,
// so no time zone can move it to the day before)
export function longDate(date: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return null;
  const utc = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "long", month: "long", day: "numeric" }).format(utc);
}

// "4 °C", "−3 °C" (a true minus sign; never "−0")
export function temperature(celsius: number): string {
  const n = Math.round(celsius);
  return `${n < 0 ? "−" : ""}${Math.abs(n)} °C`;
}

// A time with its AM/PM split off, so the two can be set differently
export function splitMeridiem(time: string): { digits: string; meridiem: string | null } {
  const match = /^(.*?)\s*([AP]M)$/i.exec(time.trim());
  return match ? { digits: match[1], meridiem: match[2].toUpperCase() } : { digits: time, meridiem: null };
}

export function describeNow(now: RichmondHillNow, place: string, timeZone: string): ClockText {
  const time = now.time.trim() || null;
  const reading = now.reading;
  // Only a fresh or stale reading is shown; anything else says so instead
  const status: WeatherStatus = (now.status === "fresh" || now.status === "stale") && !reading ? "unavailable" : now.status;
  const shown = status === "fresh" || status === "stale" ? reading : null;

  const temp = shown ? temperature(shown.temperatureC) : null;
  const condition = shown ? (now.condition?.label ?? null) : null;
  const icon: WeatherIconId | null = status === "loading" ? null : shown ? (now.condition?.icon ?? "unknown") : "unknown";

  const today = now.date || (shown ? localDate(shown.observedAt, timeZone) : "");
  const stamp = (seconds: number) =>
    localDate(seconds, timeZone) === today ? clockTime(seconds, timeZone) : `${shortDate(seconds, timeZone)}, ${clockTime(seconds, timeZone)}`;
  // Sunrise and sunset as the hook works them out for today (the same ones
  // the world's daylight follows); 0 means it doesn't know them yet, and
  // then today's entry in the reading, if there is one
  const { sunrise, sunset } = now.daylight;
  const sun = sunrise > 0 && sunset > 0 ? { sunrise, sunset } : (shown?.sun.find((s) => s.date === today) ?? null);
  const observed = shown ? stamp(shown.observedAt) : null;
  const asOf = status === "stale" ? observed : null;

  const at = time ? `${place}: ${time}` : place;
  const label =
    status === "loading"
      ? time
        ? `${at}, weather loading`
        : `${place}: loading the time and weather`
      : status === "unavailable"
        ? `${at}, weather unavailable`
        : [at, temp, condition].filter(Boolean).join(", ") + (asOf ? `, as of ${asOf} (may be out of date)` : "");

  const note =
    status === "stale"
      ? `Last reading ${observed} · may be out of date`
      : status === "unavailable"
        ? "Weather unavailable: no recent reading could be loaded."
        : status === "loading"
          ? "Loading the weather…"
          : null;

  return {
    status,
    time,
    temperature: temp,
    condition,
    icon,
    asOf,
    label,
    details: {
      date: today ? longDate(today) : null,
      sunrise: sun ? clockTime(sun.sunrise, timeZone) : null,
      sunset: sun ? clockTime(sun.sunset, timeZone) : null,
      observed,
      updated: shown ? stamp(shown.fetchedAt) : null,
      note,
    },
  };
}
