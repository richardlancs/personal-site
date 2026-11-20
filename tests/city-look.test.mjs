// The 2D city's sky (app/lib/cityLook.ts): which of a district's two
// paintings is shown at an hour, and the haze and grade the weather and
// twilight lay over it.
import assert from "node:assert/strict";
import { test } from "node:test";
import { cityVars, nightBlend, platesNeeded, twilightGrade } from "../app/lib/cityLook.ts";

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

test("the grade: warm at golden hour, blue at blue hour, nothing at noon or midnight, and the colour changes only where the grade is nothing", () => {
  const at = (daylight, progress) => cityVars({ preset: "clear", daylight, progress }).vars;
  for (const d of ["day", "night"]) assert.equal(at(d, 0.5)["--city-grade-mix"], "0");
  // Dusk: early is golden hour (lantern), late is blue hour (cyan)
  assert.equal(at("dusk", 0.25)["--city-grade"], "#f4b860");
  assert.equal(at("dusk", 0.8)["--city-grade"], "#4fd8ee");
  // Dawn the other way round: blue first, then gold
  assert.equal(at("dawn", 0.2)["--city-grade"], "#4fd8ee");
  assert.equal(at("dawn", 0.75)["--city-grade"], "#f4b860");
  // Both are there in strength, within their peaks
  const gold = Number(at("dusk", 0.275)["--city-grade-mix"]);
  const blue = Number(at("dusk", 0.775)["--city-grade-mix"]);
  assert.ok(gold > 0.3 && gold <= 0.35, `gold ${gold}`);
  assert.ok(blue > 0.25 && blue <= 0.3, `blue ${blue}`);
  // No step: across the turn and at both ends the grade is (near) nothing
  for (const p of [0, 1]) assert.ok(Number(at("dusk", p)["--city-grade-mix"]) < 0.001);
  let last = null;
  for (let i = 0; i <= 1000; i++) {
    const p = i / 1000;
    const { color, mix } = twilightGrade("dusk", p);
    if (last && last.color !== color) assert.ok(mix < 0.01 && last.mix < 0.01, `colour changes at ${p} under a grade of ${mix}`);
    if (last) assert.ok(Math.abs(mix - last.mix) < 0.01, `a step at ${p}`);
    last = { color, mix };
  }
});

test("without a reading the look is the neutral one, on the clock's daylight", () => {
  const { data, vars } = cityVars({ preset: "neutral", daylight: "night", progress: 0.3 });
  assert.deepEqual(data, { daylight: "night", weather: "neutral" });
  assert.equal(vars["--city-night"], "1");
  for (const v of Object.values(vars)) assert.ok(!/undefined|NaN/.test(v), v);
});
