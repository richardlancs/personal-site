"use client";

import { useSyncExternalStore } from "react";
import { richmondHill, WEATHER_CACHE_SECONDS } from "../../data/weather";
import type { RichmondHillNow, WeatherReading } from "../../lib/sky";
import { isDaytime, richmondHillClock } from "../../lib/time";
import { describeWeather, isWeatherReading, readingAge } from "../../lib/weather";

// Richmond Hill's time and weather for the page: one store for the whole
// page, however many components read it. While anything reads it there is
// one clock timer, ticking on each minute boundary, and one weather
// timer, asking /api/weather about every 15 minutes while the tab is
// visible (and on coming back to it, if a refresh is due). A clock tick
// never fetches, except once on a new Richmond Hill date if the reading
// doesn't have that day's sun. When nothing reads the store, both stop;
// what it knows is kept, so a remount doesn't fetch again early.
//
// On the server, and while the page hydrates, the snapshot is
// SERVER_SNAPSHOT: no time (`now` 0, `time` ""), status "loading". The
// time only ever renders in the browser, so the server and the first
// client render agree; the display reserves the space.

const REFRESH_MS = WEATHER_CACHE_SECONDS * 1000;
// How long to wait for /api/weather (the server gives Open-Meteo 4.5 s)
const FETCH_TIMEOUT_MS = 8000;
// When the server answers from a cache it's refreshing in the background
// (its reading fetched more than 16 minutes ago), ask once more shortly
const FOLLOW_UP_MS = 20_000;
const retryDelay = (failures: number) => Math.min(REFRESH_MS, 60_000 * 2 ** (failures - 1));

export const SERVER_SNAPSHOT: RichmondHillNow = {
  now: 0,
  time: "",
  date: "",
  status: "loading",
  reading: null,
  condition: null,
  daylight: { phase: "day", progress: 0, sunrise: 0, sunset: 0 },
};

let reading: WeatherReading | null = null; // the newest good reading, never replaced by a failure
let settled = false; // at least one fetch has finished, well or not
let failures = 0;
let followedUp = false;
let inFlight = false;
let nextFetchAt = 0; // ms; 0 = as soon as anything reads the store
let snapshot: RichmondHillNow | null = null;
let running = false;
let clockTimer: ReturnType<typeof setTimeout> | undefined;
let fetchTimer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();

const minuteOf = (ms: number) => Math.floor(ms / 60_000) * 60_000;
const visible = () => document.visibilityState === "visible";

function compute(): RichmondHillNow {
  const ms = Date.now();
  const age = reading ? readingAge(reading, ms) : "unusable";
  const usable = age === "unusable" ? null : reading;
  // The sun comes from the reading even when its weather is too old to
  // show: sunrise and sunset don't go stale
  const clock = richmondHillClock(ms, reading, richmondHill);
  return {
    now: minuteOf(ms),
    time: clock.time,
    date: clock.date,
    status: usable ? (age as "fresh" | "stale") : settled ? "unavailable" : "loading",
    reading: usable,
    // "Sunny" or "Clear" by the same sun the scene uses, not the reading's
    // is_day, which can be half an hour behind at sunrise and sunset
    condition: usable ? describeWeather(usable.weatherCode, isDaytime(ms / 1000, clock.daylight, usable.isDay)) : null,
    daylight: clock.daylight,
  };
}

function update() {
  snapshot = compute();
  listeners.forEach((l) => l());
}

// --- The clock -----------------------------------------------------------

function scheduleTick() {
  clearTimeout(clockTimer);
  // A few ms past the boundary, so the new minute has begun everywhere
  clockTimer = setTimeout(tick, 60_000 - (Date.now() % 60_000) + 25);
}

function tick() {
  const date = snapshot?.date;
  update();
  // A new day in Richmond Hill (at its midnight, whatever the visitor's
  // time zone or daylight saving): the day's sun is recomputed by
  // compute(); if the reading doesn't cover the new date, fetch one
  if (date && snapshot && snapshot.date !== date && !reading?.sun.some((s) => s.date === snapshot!.date)) load();
  scheduleTick();
}

// --- The weather ---------------------------------------------------------

function scheduleFetch(delay: number) {
  clearTimeout(fetchTimer);
  nextFetchAt = Date.now() + delay;
  if (running && visible()) fetchTimer = setTimeout(load, delay);
}

async function load() {
  if (inFlight) return;
  inFlight = true;
  clearTimeout(fetchTimer);
  let next = REFRESH_MS;
  try {
    // A stalled answer counts as a failure (and is retried), rather than
    // leaving the request open and the display loading forever
    const res = await fetch("/api/weather", { cache: "no-store", headers: { accept: "application/json" }, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    // An error page (e.g. a 500 while the server's refresh failed) isn't
    // JSON; { ok: false } is the server saying it has no reading
    const body: unknown = await res.json().catch(() => null);
    const fresh = body && typeof body === "object" && "ok" in body && body.ok === true && "reading" in body ? body.reading : null;
    if (!isWeatherReading(fresh)) throw new Error("no reading");
    // Different caches can answer with different readings: keep the newer
    if (!reading || fresh.observedAt >= reading.observedAt) reading = fresh;
    failures = 0;
    const serverAge = Date.now() / 1000 - fresh.fetchedAt;
    if (serverAge > WEATHER_CACHE_SECONDS + 60 && !followedUp) {
      next = FOLLOW_UP_MS;
      followedUp = true;
    } else {
      followedUp = false;
    }
  } catch {
    failures++;
    next = retryDelay(failures);
  }
  inFlight = false;
  settled = true;
  update();
  scheduleFetch(next);
}

// --- Starting and stopping -----------------------------------------------

function onVisibility() {
  if (!visible()) {
    clearTimeout(clockTimer);
    clearTimeout(fetchTimer);
    return;
  }
  // Timers are slowed or stopped in hidden tabs: catch up now
  update();
  scheduleTick();
  if (Date.now() >= nextFetchAt) load();
  else scheduleFetch(nextFetchAt - Date.now());
}

function start() {
  running = true;
  document.addEventListener("visibilitychange", onVisibility);
  onVisibility();
}

function stop() {
  running = false;
  document.removeEventListener("visibilitychange", onVisibility);
  clearTimeout(clockTimer);
  clearTimeout(fetchTimer);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!running) start();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) stop();
  };
}

function getSnapshot(): RichmondHillNow {
  // Before anything subscribes (or after everything has unsubscribed)
  // there's no timer, so a new minute is noticed here
  if (!snapshot || (!running && minuteOf(Date.now()) !== snapshot.now)) snapshot = compute();
  return snapshot;
}

const getServerSnapshot = () => SERVER_SNAPSHOT;

export function useRichmondHill(): RichmondHillNow {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
