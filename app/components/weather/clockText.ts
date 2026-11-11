// The words of the Richmond Hill display (WeatherClock.tsx), worked out
// from what the hook gives (useRichmondHill, RichmondHillNow in lib/sky.ts).
// Plain functions, no React, so the tests can read every state. Nothing
// here makes a value up: a field the reading doesn't have is left out.
import type { RichmondHillNow, WeatherIconId, WeatherStatus } from "../../lib/sky";

export type ClockText = {
  status: WeatherStatus;
  time: string | null; // "3:07 PM"; null until the clock is known
  datetime: string | null; // the same minute for <time>: "2026-11-10T15:07"
  temperature: string | null; // "4 °C"; null without a usable reading
  condition: string | null; // "Overcast"
  icon: WeatherIconId | null; // null while loading
  asOf: string | null; // stale only: when the reading was observed
};

// "3:00 PM" in the given time zone, from Unix seconds
export function clockTime(seconds: number, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", minute: "2-digit" }).format(seconds * 1000);
}

// YYYY-MM-DD of a moment in the given time zone
export function localDate(seconds: number, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(seconds * 1000);
}

// "15:07" in the given time zone, from ms since the epoch (for <time>)
function clockMinute(ms: number, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(ms);
}

// "Nov 9" for a reading from another day than today
function shortDate(seconds: number, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", { timeZone, month: "short", day: "numeric" }).format(seconds * 1000);
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

export function describeNow(now: RichmondHillNow, timeZone: string): ClockText {
  const time = now.time.trim() || null;
  const reading = now.reading;
  // Only a fresh or stale reading is shown; anything else says so instead
  const status: WeatherStatus = (now.status === "fresh" || now.status === "stale") && !reading ? "unavailable" : now.status;
  const shown = status === "fresh" || status === "stale" ? reading : null;

  const temp = shown ? temperature(shown.temperatureC) : null;
  const condition = shown ? (now.condition?.label ?? null) : null;
  const icon: WeatherIconId | null = status === "loading" ? null : shown ? (now.condition?.icon ?? "unknown") : "unknown";

  // An old reading says when it was taken (with its date, if not today's)
  const today = now.date || (shown ? localDate(shown.observedAt, timeZone) : "");
  const stamp = (seconds: number) =>
    localDate(seconds, timeZone) === today ? clockTime(seconds, timeZone) : `${shortDate(seconds, timeZone)}, ${clockTime(seconds, timeZone)}`;
  const asOf = status === "stale" && shown ? stamp(shown.observedAt) : null;

  const datetime = time && now.date && now.now > 0 ? `${now.date}T${clockMinute(now.now, timeZone)}` : null;

  return { status, time, datetime, temperature: temp, condition, icon, asOf };
}
