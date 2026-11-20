// The weather and the hour in the world (app/components/city3d/atmosphere/):
// the table of looks, the arithmetic that moves a place's own lighting, the
// development preview's address form, and that the preview stays out of
// production.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { DAYLIGHTS, WEATHER_PRESETS } from "../app/lib/sky.ts";
import {
  DAYLIGHT,
  WEATHER,
  daylightLook,
  fogColor,
  fogRange,
  hexToRGB,
  lightColor,
  newDaylight,
  newWeather,
  progressStep,
  skyColor,
  weatherLook,
} from "../app/components/city3d/atmosphere/looks.ts";
import { PREVIEW_PHASES, PREVIEW_PRESETS, parseSkyParam } from "../app/lib/skyParam.ts";

const root = new URL("../", import.meta.url).pathname;
const read = (path) => readFileSync(root + path, "utf8");

const finite01 = (c) => c.every((x) => Number.isFinite(x) && x >= 0 && x <= 1);

test("every weather and every time of day has a look", () => {
  assert.deepEqual([...PREVIEW_PRESETS].sort(), [...WEATHER_PRESETS].sort());
  assert.deepEqual([...PREVIEW_PHASES].sort(), [...DAYLIGHTS].sort());
  for (const p of WEATHER_PRESETS) assert.ok(WEATHER[p], p);
  for (const d of DAYLIGHTS) assert.ok(DAYLIGHT[d]?.start && DAYLIGHT[d]?.end, d);
});

test("all twenty combinations compose to colours and numbers in range", () => {
  const park = { sun: hexToRGB("#ffffff"), fog: hexToRGB("#141a24") };
  for (const p of WEATHER_PRESETS)
    for (const ph of DAYLIGHTS)
      for (const progress of [0, 0.5, 1]) {
        const d = daylightLook(newDaylight(), ph, progress);
        const w = weatherLook(newWeather(), p);
        assert.ok(finite01(lightColor([0, 0, 0], park.sun, d.sun, d.sunMix, w)), `${p}/${ph} sun`);
        assert.ok(finite01(fogColor([0, 0, 0], park.fog, d, w)), `${p}/${ph} fog`);
        const r = fogRange({ near: 0, far: 0 }, { near: 20, far: 135 }, d, w);
        assert.ok(r.near > 0 && r.far > r.near, `${p}/${ph} fog range`);
        assert.ok(finite01(skyColor([0, 0, 0], d.top, w)) && finite01(skyColor([0, 0, 0], d.horizon, w)), `${p}/${ph} sky`);
        assert.ok(d.night >= 0 && d.night <= 1 && w.cover >= 0 && w.cover <= 1);
      }
});

test("only rain wets, only snow lies", () => {
  for (const p of WEATHER_PRESETS) {
    const w = WEATHER[p];
    assert.equal(w.rain > 0, p === "rain", p);
    assert.equal(w.flakes > 0, p === "snow", p);
    assert.equal(w.snow > 0, p === "snow", p);
  }
});

test("night is night whatever the weather; dusk and dawn move with their progress", () => {
  assert.equal(daylightLook(newDaylight(), "night", 0).night, 1);
  const early = daylightLook(newDaylight(), "dusk", 0);
  const late = daylightLook(newDaylight(), "dusk", 1);
  assert.ok(late.night > early.night && late.sunScale < early.sunScale, "dusk darkens and cools");
  assert.ok(daylightLook(newDaylight(), "dawn", 1).night < daylightLook(newDaylight(), "dawn", 0).night, "dawn brightens");
  // A clock moving on by a minute doesn't change the target
  assert.equal(progressStep(0.501), progressStep(0.5));
  assert.equal(progressStep(NaN), 0);
});

test("the preview's address form", () => {
  assert.deepEqual(parseSkyParam("rain-night"), { preset: "rain", daylight: "night", progress: 0.5, source: "preview" });
  assert.deepEqual(parseSkyParam("clear-dusk-0.8"), { preset: "clear", daylight: "dusk", progress: 0.8, source: "preview" });
  assert.equal(parseSkyParam("snow")?.daylight, "day");
  assert.equal(parseSkyParam("hail-night"), null);
  assert.equal(parseSkyParam("rain-noon"), null);
  assert.equal(parseSkyParam(null), null);
  assert.equal(parseSkyParam("rain-day-7").progress, 1);
});

test("the sky preview is never loaded by the 2D page", () => {
  // The city's canvas (a later task) loads it in development only; the
  // page and its layout never do
  for (const file of ["app/layout.tsx", "app/page.tsx"]) assert.ok(!read(file).includes("DevSkyPanel"), file);
});
