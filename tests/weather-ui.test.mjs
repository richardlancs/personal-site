// The Richmond Hill display (components/weather): its words in every
// state, worked out from the hook's shape (lib/sky.ts), and the rules it
// keeps: no made-up values, no announcement every minute, an icon for
// every condition.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { clockTime, describeNow, longDate, splitMeridiem, temperature } from "../app/components/weather/clockText.ts";
import { MOCKS } from "./fixtures/richmondHillStates.ts";

const root = new URL("../", import.meta.url).pathname;
const read = (path) => readFileSync(`${root}${path}`, "utf8");
const PLACE = "Richmond Hill, Ontario";
const ZONE = "America/Toronto";
const describe = (kind) => describeNow(MOCKS[kind], PLACE, ZONE);
const space = (s) => s?.replace(/[  ]/g, " ");

test("before anything is known, the display shows blanks and no numbers", () => {
  const text = describe("loading-ssr");
  assert.equal(text.status, "loading");
  assert.equal(text.time, null);
  assert.equal(text.temperature, null);
  assert.equal(text.condition, null);
  assert.equal(text.icon, null);
  assert.equal(text.label, "Richmond Hill, Ontario: loading the time and weather");
  assert.deepEqual([text.details.sunrise, text.details.observed, text.details.updated], [null, null, null]);
  // The clock can come before the weather
  assert.equal(describe("loading").label, "Richmond Hill, Ontario: 3:07 PM, weather loading");
});

test("a fresh reading: place, time, temperature and condition, in the button's name", () => {
  const text = describe("fresh");
  assert.equal(space(text.label), "Richmond Hill, Ontario: 3:07 PM, 4 °C, Overcast");
  assert.equal(text.icon, "cloud");
  assert.equal(text.asOf, null);
  assert.equal(text.details.note, null);
  assert.equal(space(text.details.sunrise), "6:59 AM");
  assert.equal(space(text.details.sunset), "4:53 PM");
  assert.equal(space(text.details.observed), "2:45 PM");
  assert.equal(space(text.details.updated), "2:54 PM");
  assert.equal(text.details.date, "Tuesday, November 10");
  assert.equal(describe("night").icon, "moon");
});

test("an old reading is labelled as one, with the time it was taken", () => {
  const text = describe("stale");
  assert.equal(space(text.asOf), "4:15 PM");
  assert.equal(space(text.details.note), "Last reading 4:15 PM · may be out of date");
  assert.match(space(text.label), /, as of 4:15 PM \(may be out of date\)$/);
  // From another day: the date is said too
  assert.equal(space(describe("stale-yesterday").asOf), "Nov 9, 10:30 PM");
});

test("no usable reading: the time stays, the weather says it's unavailable", () => {
  const text = describe("unavailable");
  assert.equal(text.label, "Richmond Hill, Ontario: 3:07 PM, weather unavailable");
  assert.equal(text.temperature, null);
  assert.equal(text.icon, "unknown");
  // A reading the hook still holds isn't shown once it says unavailable
  const held = describeNow({ ...MOCKS.fresh, status: "unavailable" }, PLACE, ZONE);
  assert.equal(held.temperature, null);
  assert.equal(held.details.observed, null);
  // Nor is "fresh" without a reading taken at its word
  assert.equal(describeNow({ ...MOCKS.fresh, reading: null }, PLACE, ZONE).status, "unavailable");
  // Sunrise and sunset come from the hook's daylight, so they stay when
  // the weather is missing (0 means the hook doesn't know them)
  assert.equal(space(text.details.sunrise), "6:59 AM");
  assert.equal(describe("loading-ssr").details.sunset, null);
});

test("the hook's time, with a plain space, is split the same way", () => {
  assert.deepEqual(splitMeridiem("3:07 PM"), { digits: "3:07", meridiem: "PM" });
});

test("temperatures are rounded, with a true minus sign and never −0", () => {
  assert.equal(space(temperature(4.4)), "4 °C");
  assert.equal(space(temperature(-2.6)), "−3 °C");
  assert.equal(space(temperature(-0.3)), "0 °C");
});

test("times follow Toronto's clock through daylight saving", () => {
  assert.equal(space(clockTime(Date.UTC(2026, 6, 1, 12) / 1000, ZONE)), "8:00 AM");
  assert.equal(space(clockTime(Date.UTC(2026, 11, 1, 12) / 1000, ZONE)), "7:00 AM");
  assert.deepEqual(splitMeridiem("12:59 PM"), { digits: "12:59", meridiem: "PM" });
  assert.equal(longDate("2026-03-08"), "Sunday, March 8");
  assert.equal(longDate("not a date"), null);
});

test("every weather icon is drawn, on the site's icon grid", () => {
  const ids = [...read("app/lib/sky.ts").match(/export type WeatherIconId =([^;]+);/)[1].matchAll(/"([a-z-]+)"/g)].map((m) => m[1]);
  assert.ok(ids.length >= 12);
  const icons = read("app/components/weather/WeatherIcon.tsx");
  for (const id of ids) assert.match(icons, new RegExp(`^\\s+"?${id}"?: `, "m"), `no icon for ${id}`);
  for (const rule of ['viewBox="0 0 24 24"', 'strokeWidth="1.75"', 'strokeLinecap="round"', 'strokeLinejoin="round"', 'aria-hidden="true"', 'stroke="currentColor"'])
    assert.ok(icons.includes(rule), rule);
});

test("the display announces nothing on its own and opens its details as a popover", () => {
  const clock = read("app/components/weather/WeatherClock.tsx");
  assert.doesNotMatch(clock, /aria-live|role="(status|alert|timer)"/);
  assert.match(clock, /popoverTarget="rh-details"/);
  assert.match(clock, /id="rh-details" popover="auto"/);
  assert.match(clock, /weatherProvider\.url/);
  assert.match(read("app/components/world/WorldControls.tsx"), /<WeatherClock \/>/);
  // The narrow layout's row is inside the flat layout's query, and the
  // slip holds still in still view
  const css = read("app/globals.css");
  assert.match(css, /@media \(orientation: portrait\), \(max-width: 767px\), \(max-height: 480px\) \{\s*@media \(max-width: 719px\) \{\s*(\/\*[\s\S]*?\*\/\s*)?\.world-controls \{\s*display: grid/);
  assert.match(css, /:root\[data-still="on"\] \.rh-details:popover-open \{\s*animation: none/);
});
