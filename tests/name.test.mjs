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

test("the name is slate blue on its own cream backing, with a baby-blue stroke", () => {
  assert.match(block(".park-name"), /color: var\(--slate\)/);
  assert.match(block(".park-name::before"), /background: rgb\(255 249 242 \/ 0\.9\)/);
  assert.match(block(".park-name::after"), /background: linear-gradient\(90deg, [^;]*var\(--baby-hover\)\);/);
});

test("nothing about the name moves on its own, or in still view", () => {
  assert.doesNotMatch(css, /letter-spacing [0-9.]+s/);
  assert.doesNotMatch(block(".park-name::after"), /infinite/);
  assert.match(css, /:root\[data-still="on"\] \.park-name::after \{\s*animation: none !important/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{\s*:root:not\(\[data-still\]\) \.park-name::after \{\s*animation: none !important/);
});

test("the introduction has no card: lines on their own backings by day, cream words at night", () => {
  // Keyed on the attributes the world sets (Atmosphere.tsx)
  const atmosphere = readFileSync(`${root}app/components/world3d/atmosphere/Atmosphere.tsx`, "utf8");
  assert.match(atmosphere, /dataset\.skyDaylight = /);
  // No sheet or haze behind the whole block
  assert.doesNotMatch(css, /\.park-intro::(before|after)/);
  assert.match(css, /\.park-headline::before,\s*\.park-links::before \{[^}]*filter: blur\(/);
  const night = css.match(/  :root:has\(\.world3d\[data-sky-daylight="night"\]\) \{([\s\S]*?)\n  \}\n\}/);
  assert.ok(night, "no night rule");
  assert.match(night[1], /& :is\(\.park-headline, \.park-links, \.park-name\)::before \{\s*opacity: 0/);
  assert.match(night[1], /& :is\(\.park-name, \.park-headline\) \{\s*color: var\(--cream\)/);
  // The cross-fade holds still in still view
  assert.match(css, /:root\[data-still="on"\] :is\(\.park-name, \.park-headline, \.park-links, \.park-links a\)::before/);
});
