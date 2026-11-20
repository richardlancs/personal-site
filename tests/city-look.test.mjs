// The 2D city's sky (app/lib/cityLook.ts): which of a district's two
// paintings is shown at an hour, and the haze and grade the weather and
// twilight lay over it.
import assert from "node:assert/strict";
import { test } from "node:test";
import { cityVars, nightBlend, platesNeeded } from "../app/lib/cityLook.ts";

test("day shows the day plate, night the night plate", () => {
  assert.equal(nightBlend("day", 0.5), 0);
  assert.equal(nightBlend("night", 0.5), 1);
});

test("dusk fades day to night, dawn night to day", () => {
  assert.equal(nightBlend("dusk", 0), 0);
  assert.equal(nightBlend("dusk", 0.25), 0.25);
  assert.equal(nightBlend("dusk", 1), 1);
  assert.equal(nightBlend("dawn", 0.25), 0.75);
});

test("a missing or wild progress never escapes 0..1", () => {
  for (const p of [NaN, -3, 7, undefined]) {
    const b = nightBlend("dusk", p);
    assert.ok(b >= 0 && b <= 1, String(p));
  }
});

test("only the plates in use are mounted", () => {
  assert.deepEqual(platesNeeded(0), ["day"]);
  assert.deepEqual(platesNeeded(1), ["night"]);
  assert.deepEqual(platesNeeded(0.4), ["day", "night"]);
});

test("haze by weather: clear 0, neutral 0.1, cloudy 0.45, rain 0.55, snow 0.5", () => {
  const haze = (preset) => cityVars({ preset, daylight: "day", progress: 0 }).vars["--city-haze"];
  assert.deepEqual(["clear", "neutral", "cloudy", "rain", "snow"].map(haze), ["0", "0.1", "0.45", "0.55", "0.5"]);
});

test("the grade is warm at dawn and dusk, strongest mid-twilight, and absent at noon", () => {
  assert.equal(cityVars({ preset: "clear", daylight: "day", progress: 0.5 }).vars["--city-grade-mix"], "0");
  const mid = Number(cityVars({ preset: "clear", daylight: "dusk", progress: 0.5 }).vars["--city-grade-mix"]);
  const edge = Number(cityVars({ preset: "clear", daylight: "dusk", progress: 0 }).vars["--city-grade-mix"]);
  assert.ok(mid > edge && mid <= 0.35);
});

test("without a reading the look is the neutral one, on the clock's daylight", () => {
  const { data, vars } = cityVars({ preset: "neutral", daylight: "night", progress: 0.3 });
  assert.deepEqual(data, { daylight: "night", weather: "neutral" });
  assert.equal(vars["--city-night"], "1");
  for (const v of Object.values(vars)) assert.ok(!/undefined|NaN/.test(v), v);
});
