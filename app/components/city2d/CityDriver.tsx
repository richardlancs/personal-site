"use client";

import { useEffect } from "react";
import { cityVars } from "../../lib/cityLook";
import type { SkyState } from "../../lib/sky";
import { useRichmondHill } from "../weather/useRichmondHill";
import { parseSkyParam } from "../world3d/atmosphere/param";
import { setCityBlend } from "./citySky";

// Sets the city's sky on <html> from Richmond Hill's clock and weather
// (lib/cityLook.ts: cityVars): data-daylight, data-weather and the four
// --city-* variables city.css paints the bands with, and tells the bands
// how far night has come (citySky.ts) so each mounts only the plates it
// needs. The one place the sky is worked out; the bands run no timers.
// Without a usable reading the weather is "neutral" and the daylight
// still follows the clock. Renders nothing.
//
// In development only, ?sky= (world3d/atmosphere/param.ts, e.g.
// ?sky=clear-dusk-0.5) stands in for the live sky, to check each look.
export default function CityDriver() {
  const { now, condition, daylight } = useRichmondHill();
  const preset = condition?.preset ?? "neutral";
  const phase = daylight.phase;
  // Changes once a minute at most; three places is finer than any blend needs
  const progress = Math.round(daylight.progress * 1000) / 1000;

  useEffect(() => {
    // `now` is 0 only in the server snapshot, before the clock is known
    if (now === 0) return;
    let sky: Pick<SkyState, "preset" | "daylight" | "progress"> = { preset, daylight: phase, progress };
    if (process.env.NODE_ENV === "development") {
      sky = parseSkyParam(new URLSearchParams(window.location.search).get("sky")) ?? sky;
    }
    const { data, vars } = cityVars(sky);
    const html = document.documentElement;
    html.dataset.daylight = data.daylight;
    html.dataset.weather = data.weather;
    for (const [name, value] of Object.entries(vars)) html.style.setProperty(name, value);
    setCityBlend(Number(vars["--city-night"]));
    // From the next frame on, changes of sky cross-fade (city.css); the
    // first one, from the fallbacks, doesn't
    if (!("skyReady" in html.dataset)) requestAnimationFrame(() => (html.dataset.skyReady = ""));
  },[now, preset, phase, progress]);

  return null;
}
