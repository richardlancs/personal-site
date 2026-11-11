// The Richmond Hill display (components/weather): its words in every
// state, worked out from the hook's shape (lib/sky.ts), and the rules it
// keeps: no made-up values, no announcement every minute, an icon for
// every condition.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { clockTime, describeNow, splitMeridiem, temperature } from "../app/components/weather/clockText.ts";
import { MOCKS } from "./fixtures/richmondHillStates.ts";

const root = new URL("../", import.meta.url).pathname;
const read = (path) => readFileSync(`${root}${path}`, "utf8");
const ZONE = "America/Toronto";
const describe = (kind) => describeNow(MOCKS[kind], ZONE);
const space = (s) => s?.replace(/[  ]/g, " ");

test("before anything is known, the display shows blanks and no numbers", () => {
  const text = describe("loading-ssr");
  assert.equal(text.status, "loading");
  assert.equal(text.time, null);
  assert.equal(text.datetime, null);
  assert.equal(text.temperature, null);
  assert.equal(text.condition, null);
  assert.equal(text.icon, null);
  // The clock can come before the weather
  assert.equal(space(describe("loading").time), "3:07 PM");
});

test("a fresh reading: time, temperature and condition, and the minute for <time>", () => {
  const text = describe("fresh");
  assert.equal(space(text.time), "3:07 PM");
  assert.equal(text.datetime, "2026-11-10T15:07");
  assert.equal(space(text.temperature), "4 °C");
  assert.equal(text.condition, "Overcast");
  assert.equal(text.icon, "cloud");
  assert.equal(text.asOf, null);
  assert.equal(describe("night").icon, "moon");
});

test("an old reading is labelled as one, with the time it was taken", () => {
  assert.equal(space(describe("stale").asOf), "4:15 PM");
  // From another day: the date is said too
  assert.equal(space(describe("stale-yesterday").asOf), "Nov 9, 10:30 PM");
});

test("no usable reading: the time stays, the weather says it's unavailable", () => {
  const text = describe("unavailable");
  assert.equal(space(text.time), "3:07 PM");
  assert.equal(text.temperature, null);
  assert.equal(text.icon, "unknown");
  // A reading the hook still holds isn't shown once it says unavailable
  const held = describeNow({ ...MOCKS.fresh, status: "unavailable" }, ZONE);
  assert.equal(held.temperature, null);
  assert.equal(held.asOf, null);
  // Nor is "fresh" without a reading taken at its word
  assert.equal(describeNow({ ...MOCKS.fresh, reading: null }, ZONE).status, "unavailable");
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
});

test("every weather icon is drawn, on the site's icon grid", () => {
  const ids = [...read("app/lib/sky.ts").match(/export type WeatherIconId =([^;]+);/)[1].matchAll(/"([a-z-]+)"/g)].map((m) => m[1]);
  assert.ok(ids.length >= 12);
  const icons = read("app/components/weather/WeatherIcon.tsx");
  for (const id of ids) assert.match(icons, new RegExp(`^\\s+"?${id}"?: `, "m"), `no icon for ${id}`);
  for (const rule of ['viewBox="0 0 24 24"', 'strokeWidth="1.75"', 'strokeLinecap="round"', 'strokeLinejoin="round"', 'aria-hidden="true"', 'stroke="currentColor"'])
    assert.ok(icons.includes(rule), rule);
});

test("the display is something to read, not a control, and announces nothing on its own", () => {
  const clock = read("app/components/weather/WeatherClock.tsx");
  assert.doesNotMatch(clock, /aria-live|role="(status|alert|timer)"/);
  // No button, popover, handler, focus or press: plain text and a <time>
  assert.doesNotMatch(clock, /<button|popover|onClick|tabIndex|className="glass|aria-label/);
  assert.match(clock, /<p className="rh"/);
  assert.match(clock, /<time className="rh-time" dateTime=/);
  assert.match(read("app/components/world/WorldControls.tsx"), /<WeatherClock \/>/);
  // The data's credit is in every page's footer instead
  const colophon = read("app/components/ui/Colophon.tsx");
  assert.match(colophon, /weatherProvider\.url/);
  assert.match(colophon, /weatherProvider\.licenceUrl/);
  assert.match(read("app/components/world/Location.tsx"), /<Colophon \/>/);
  assert.match(read("app/page.tsx"), /<Colophon \/>/);
  // The narrow layout's row is inside the flat layout's query; the glass
  // is clear (a few percent of tint, a light blur) and selectable
  const css = read("app/globals.css");
  assert.match(css, /@media \(orientation: portrait\), \(max-width: 767px\), \(max-height: 480px\) \{\s*@media \(max-width: 719px\) \{\s*(\/\*[\s\S]*?\*\/\s*)?\.world-controls \{\s*display: grid/);
  const rh = css.match(/\n\.rh \{([^}]*)\}/)[1];
  assert.match(rh, /background: rgb\(234 245 255 \/ 0\.0[5-9]\)/);
  assert.match(rh, /backdrop-filter: blur\([4-8]px\)/);
  assert.match(rh, /user-select: text/);
  assert.doesNotMatch(rh, /cursor: pointer/);
});
