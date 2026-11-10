// The name on the home page: still the page's one h1, plain text, and its
// treatment (globals.css, .park-name) quiet: no animated letter-spacing,
// and the brushstroke holds still in still view and reduced motion.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const root = new URL("../", import.meta.url).pathname;
const css = readFileSync(`${root}app/globals.css`, "utf8");
const block = (selector) => css.match(new RegExp(`\\n${selector.replace(/[.:()]/g, "\\$&")} \\{([^}]*)\\}`))?.[1] ?? "";

test("the name is the home page's h1, as text", () => {
  const page = readFileSync(`${root}app/page.tsx`, "utf8");
  assert.match(page, /<h1 id="park-name" className="park-name font-display">\s*\{profile\.name\}\s*<\/h1>/);
  assert.equal((page.match(/<h1/g) ?? []).length, 1);
});

test("the name is indigo on its own cream backing, with a sky-blue stroke", () => {
  assert.match(block(".park-name"), /color: var\(--indigo\)/);
  assert.match(block(".park-name::before"), /background: rgb\(255 249 242 \/ 0\.9\)/);
  assert.match(block(".park-name::after"), /background: var\(--sky\)/);
});

test("nothing about the name moves on its own, or in still view", () => {
  assert.doesNotMatch(css, /letter-spacing [0-9.]+s/);
  assert.doesNotMatch(block(".park-name::after"), /infinite/);
  assert.match(css, /:root\[data-still="on"\] \.park-name::after \{\s*animation: none !important/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{\s*:root:not\(\[data-still\]\) \.park-name::after \{\s*animation: none !important/);
});
