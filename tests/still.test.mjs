// Still view (app/lib/still.ts): the script that sets
// <html data-still> before the first paint, and the CSS that keys on it.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { STILL_KEY, STILL_SCRIPT } from "../app/lib/still.ts";

const root = new URL("../", import.meta.url).pathname;

// Runs the script against a stand-in browser: a stored choice (or none, or
// storage that throws) and a system setting
function run({ stored, reduce, storageThrows = false }) {
  const attrs = {};
  const localStorage = {
    getItem(key) {
      if (storageThrows) throw new Error("SecurityError");
      return key === STILL_KEY ? stored : null;
    },
  };
  const matchMedia = (query) => ({ matches: query.includes("reduce") && reduce });
  const document = { documentElement: { setAttribute: (k, v) => (attrs[k] = v) } };
  new Function("localStorage", "matchMedia", "document", STILL_SCRIPT)(localStorage, matchMedia, document);
  return attrs["data-still"];
}

test("still view starts from the system setting until the visitor chooses", () => {
  assert.equal(run({ stored: null, reduce: false }), "off");
  assert.equal(run({ stored: null, reduce: true }), "on");
});

test("the visitor's choice wins over the system setting", () => {
  assert.equal(run({ stored: "on", reduce: false }), "on");
  assert.equal(run({ stored: "off", reduce: true }), "off");
});

test("storage that throws falls back to the system setting", () => {
  assert.equal(run({ stored: "off", reduce: true, storageThrows: true }), "on");
  assert.equal(run({ stored: "on", reduce: false, storageThrows: true }), "off");
});

test("the page's motion keys on still view, and the toggle is in the top bar", () => {
  // The stylesheets the layout loads: city.css, and the résumé viewer's
  const sheets = ["app/city.css", "app/components/resume/resume.css"].map((file) => [file, readFileSync(`${root}${file}`, "utf8")]);
  const css = sheets[0][1];
  for (const rule of [
    /:root\[data-still="on"\] \.glass\[data-pressed\],[^{]*\{\s*animation: glass-tint/,
    // The menu's opening is a transition only where motion is welcome
    /@media \(prefers-reduced-motion: no-preference\) \{\s*:root:not\(\[data-still="on"\]\) \.sections-menu \{[^}]*transition:/,
  ])
    assert.match(css, rule);
  // Every reduced-motion rule goes through still view (or covers a page
  // whose script didn't run), so the visitor's choice is never overruled
  for (const [file, text] of sheets) {
    const blocks = text.split("@media (prefers-reduced-motion: reduce)").slice(1);
    assert.ok(blocks.length > 0, `${file} has reduced-motion rules`);
    for (const block of blocks) assert.match(block.slice(0, 200), /:root:not\(\[data-still\]\)/, file);
  }
  assert.match(readFileSync(`${root}app/layout.tsx`, "utf8"), /STILL_SCRIPT/);
  assert.match(readFileSync(`${root}app/components/city2d/TopBar.tsx`, "utf8"), /<StillViewToggle \/>/);
  // The menu's own motion is CSS only: nothing in it asks the media query
  assert.doesNotMatch(readFileSync(`${root}app/components/city2d/SectionsMenu.tsx`, "utf8"), /prefers-reduced-motion|matchMedia/);
  // One source of truth: the page's moving parts ask the still script's
  // query (app/lib/still.ts), never the media query themselves
  for (const file of ["city2d/ProgressLine.tsx", "city2d/WeatherOverlay.tsx"])
    assert.doesNotMatch(readFileSync(`${root}app/components/${file}`, "utf8").replace(/^\s*\/\/.*$/gm, ""), /prefers-reduced-motion/, file);
});
