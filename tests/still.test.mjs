// Still view (app/components/world3d/still.ts): the script that sets
// <html data-still> before the first paint, and the CSS that keys on it.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { STILL_KEY, STILL_SCRIPT } from "../app/components/world3d/still.ts";

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

test("the page's motion keys on still view, and the toggle is in the corner", () => {
  const css = readFileSync(`${root}app/globals.css`, "utf8");
  for (const rule of [/:root\[data-still="on"\][^{]*\.arrive[^{]*\{\s*animation: none/, /:root\[data-still="on"\][^{]*\.world-label[^{]*\{\s*transition: none/]) assert.match(css, rule);
  // Every reduced-motion rule goes through still view (or covers a page
  // whose script didn't run), so the visitor's choice is never overruled
  for (const block of css.split("@media (prefers-reduced-motion: reduce)").slice(1)) assert.match(block.slice(0, 200), /:root:not\(\[data-still\]\)/);
  assert.match(readFileSync(`${root}app/layout.tsx`, "utf8"), /STILL_SCRIPT/);
  assert.match(readFileSync(`${root}app/components/world/WorldControls.tsx`, "utf8"), /<StillViewToggle \/>/);
  // One source of truth: nothing in the world asks the media query itself
  for (const file of ["world3d/World3D.tsx", "world3d/scenes/Park.tsx", "world3d/scenes/ShakeableTrees.tsx", "locations/Notebook.tsx"])
    assert.doesNotMatch(readFileSync(`${root}app/components/${file}`, "utf8"), /prefers-reduced-motion/, file);
});
