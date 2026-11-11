// The weather and the hour in the world (app/components/world3d/atmosphere/):
// the table of looks, the arithmetic that moves a place's own lighting, the
// development preview's address form, and that the preview stays out of
// production.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { DAYLIGHTS, WEATHER_PRESETS } from "../app/lib/sky.ts";
import {
  DAYLIGHT,
  OUTDOORS,
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
} from "../app/components/world3d/atmosphere/looks.ts";
import { PREVIEW_PHASES, PREVIEW_PRESETS, parseSkyParam } from "../app/components/world3d/atmosphere/param.ts";
import { scenes } from "../app/components/world3d/scenes.ts";

const root = new URL("../", import.meta.url).pathname;
const read = (path) => readFileSync(root + path, "utf8");

const finite01 = (c) => c.every((x) => Number.isFinite(x) && x >= 0 && x <= 1);
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

// WCAG relative luminance and contrast, on sRGB 0..1
const lin = (x) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4);
const L = (c) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
const contrast = (a, b) => {
  const [hi, lo] = [L(a), L(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
const over = (fg, alpha, bg) => fg.map((x, i) => x * alpha + bg[i] * (1 - alpha));

test("the park's places stay clear of the fog in every weather and at every hour", () => {
  // From the steps (scenes.ts: park.home) to the station's sign, the
  // farthest place, about 63 m, and the arcade's and workshop's, about 46
  // and 44 m. three.js's linear fog: smoothstep(near, far, depth).
  const smooth = (a, b, x) => {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };
  const signs = { station: 63, arcade: 46, workshop: 44 };
  let worst = 0;
  for (const p of WEATHER_PRESETS)
    for (const ph of DAYLIGHTS)
      for (const progress of [0, 0.5, 1]) {
        const d = daylightLook(newDaylight(), ph, progress);
        const w = weatherLook(newWeather(), p);
        const r = fogRange({ near: 0, far: 0 }, scenes.park.fog, d, w, false);
        for (const [name, depth] of Object.entries(signs)) {
          const fog = smooth(r.near, r.far, depth);
          worst = Math.max(worst, fog);
          assert.ok(fog <= 0.4, `${p}/${ph}/${progress}: ${Math.round(fog * 100)}% fog on the ${name}'s sign`);
        }
      }
  // ...and the fog's floor is what holds them there, not luck
  const rainyDawn = fogRange({ near: 0, far: 0 }, { near: 40, far: 160 }, daylightLook(newDaylight(), "dawn", 0), weatherLook(newWeather(), "rain"), false);
  assert.ok(smooth(rainyDawn.near, rainyDawn.far, signs.station) > 0.6, "without keep, a rainy dawn would swallow the station");
  assert.ok(worst > 0.1, "the farthest place still sits in a little air");
});

test("every weather and every time of day has a look", () => {
  assert.deepEqual([...PREVIEW_PRESETS].sort(), [...WEATHER_PRESETS].sort());
  assert.deepEqual([...PREVIEW_PHASES].sort(), [...DAYLIGHTS].sort());
  for (const p of WEATHER_PRESETS) assert.ok(WEATHER[p], p);
  for (const d of DAYLIGHTS) assert.ok(DAYLIGHT[d]?.start && DAYLIGHT[d]?.end, d);
});

test("all sixteen combinations compose to colours and numbers in range, in every place", () => {
  const park = { sun: hexToRGB("#ffd09a"), fog: hexToRGB("#d7e4ec") };
  for (const p of WEATHER_PRESETS)
    for (const ph of DAYLIGHTS)
      for (const progress of [0, 0.5, 1]) {
        const d = daylightLook(newDaylight(), ph, progress);
        const w = weatherLook(newWeather(), p);
        for (const indoor of [false, true]) {
          assert.ok(finite01(lightColor([0, 0, 0], park.sun, d.sun, d.sunMix, w)), `${p}/${ph} sun`);
          assert.ok(finite01(fogColor([0, 0, 0], park.fog, d, w, indoor)), `${p}/${ph} fog`);
          const r = fogRange({ near: 0, far: 0 }, { near: 20, far: 135 }, d, w, indoor);
          assert.ok(r.near > 0 && r.far > r.near, `${p}/${ph} fog range`);
        }
        assert.ok(finite01(skyColor([0, 0, 0], d.top, w)) && finite01(skyColor([0, 0, 0], d.horizon, w)), `${p}/${ph} sky`);
        assert.ok(d.night >= 0 && d.night <= 1 && w.cover >= 0 && w.cover <= 1);
      }
});

test("neutral weather by day stays close to the painting's light", () => {
  const d = daylightLook(newDaylight(), "day", 0.5);
  const w = weatherLook(newWeather(), "neutral");
  // The sky's own colours, the park's fog, its sun's colour and strength
  assert.ok(dist(skyColor([0, 0, 0], d.top, w), hexToRGB("#4fbde8")) < 0.02);
  assert.ok(dist(skyColor([0, 0, 0], d.horizon, w), hexToRGB("#fff1dc")) < 0.03);
  assert.ok(dist(fogColor([0, 0, 0], hexToRGB("#d7e4ec"), d, w, false), hexToRGB("#d7e4ec")) < 0.03);
  assert.ok(dist(lightColor([0, 0, 0], hexToRGB("#ffd09a"), d.sun, d.sunMix, w), hexToRGB("#ffd09a")) < 0.1);
  assert.ok(Math.abs(d.sunScale * w.sunScale - 1) < 0.1 && Math.abs(d.hemiScale * w.hemiScale - 1) < 0.1);
  assert.equal(w.wet + w.snow + w.rain + w.flakes, 0);
  assert.equal(d.night, 0);
});

test("only rain wets, only snow lies, and nothing falls indoors", () => {
  for (const p of WEATHER_PRESETS) {
    const w = WEATHER[p];
    assert.equal(w.rain > 0, p === "rain", p);
    assert.equal(w.flakes > 0, p === "snow", p);
    assert.equal(w.snow > 0, p === "snow", p);
  }
  assert.deepEqual([...OUTDOORS].sort(), ["booth", "park", "station"]);
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

test("indoors the weather reaches the room's air less than the sky outside", () => {
  const d = daylightLook(newDaylight(), "day", 0.5);
  const w = weatherLook(newWeather(), "rain");
  const base = hexToRGB("#c1b19e"); // the workshop's air
  const inside = fogColor([0, 0, 0], base, d, w, true);
  const outside = fogColor([0, 0, 0], base, d, w, false);
  assert.ok(dist(inside, base) < dist(outside, base));
});

test("the words over the open sky keep 4.5:1 on their haze in every sky", () => {
  // globals.css: the introduction's haze is cream at 0.93 at its middle;
  // --muted is the quietest text on it
  const cream = hexToRGB("#fff9f2");
  const muted = hexToRGB("#45474a");
  for (const p of WEATHER_PRESETS)
    for (const ph of DAYLIGHTS) {
      const d = daylightLook(newDaylight(), ph, 1);
      const w = weatherLook(newWeather(), p);
      for (const sky of [skyColor([0, 0, 0], d.top, w), skyColor([0, 0, 0], d.horizon, w)]) {
        const haze = over(cream, 0.93, sky);
        assert.ok(contrast(muted, haze) >= 4.5, `${p}/${ph}: ${contrast(muted, haze).toFixed(2)}`);
      }
    }
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

test("the sky preview is loaded only in development", () => {
  const world = read("app/components/world3d/World3D.tsx");
  assert.match(world, /process\.env\.NODE_ENV === "development" \? lazy\(\(\) => import\("\.\/atmosphere\/DevSkyPanel"\)\) : null/);
  // and nothing else imports it
  for (const file of ["app/layout.tsx", "app/components/world3d/WorldShell.tsx", "app/components/world3d/atmosphere/Atmosphere.tsx"]) {
    assert.ok(!read(file).includes("DevSkyPanel"), file);
  }
});
