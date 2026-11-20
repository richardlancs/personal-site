// The list marker (city.css, .points): one small light-blue diamond,
// defined once, used by every content list; the folded lists' diamond is
// muted. Drawn with ::before, so never read out or copied.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const css = read("app/city.css").replace(/\/\*[\s\S]*?\*\//g, "");

test("exactly one marker definition: a 6px cyan square turned 45°, centred on the first line", () => {
  const markers = [...css.matchAll(/([^{}]+)\{([^}]*rotate: 45deg[^}]*)\}/g)];
  assert.equal(markers.length, 1, "one diamond");
  const [, selector, body] = markers[0];
  assert.equal(selector.trim(), ".points > li::before");
  assert.match(body, /content: "";/, "drawn, not a character");
  assert.match(body, /width: 6px;\s*height: 6px;/);
  assert.match(body, /background: var\(--cyan\);/);
  assert.match(body, /top: calc\(0\.5lh - 3px\);/, "on the middle of the first line, whatever its height");
  const glow = body.match(/box-shadow: 0 0 (\d+)px/);
  assert.ok(glow && Number(glow[1]) <= 4, "a glow of 4px at most");
  assert.doesNotMatch(body, /animation|transition/, "nothing moves");
  // Muted and without glow for the folded, secondary points
  assert.match(css, /\.points-quiet > li::before \{\s*background: var\(--muted\);\s*box-shadow: none;/);
  // The glow goes under prefers-contrast
  assert.match(css, /@media \(prefers-contrast: more\) \{[\s\S]*?\.points > li::before \{\s*box-shadow: none;/);
  // The list keeps no bullets of its own, and text hangs clear of the marker
  assert.match(css, /\.points \{[^}]*list-style: none;/);
  assert.match(css, /\.points > li \{[^}]*padding-left: 1\.25rem;/);
  // No other list marker anywhere: no dash drawn on an li, no ::marker styling
  const drawn = [...css.matchAll(/([^{}]*::before)\s*\{([^}]*)\}/g)].filter(([, sel, body]) => /\bli\b/.test(sel) && /content:/.test(body));
  assert.equal(drawn.length, 1, "only the diamond draws a marker on a list item");
  assert.doesNotMatch(css, /::marker/);
});

test("every content list uses it, as a real list", () => {
  for (const file of ["About", "Projects", "Experience"]) {
    const src = read(`app/components/city2d/sections/${file}.tsx`);
    assert.doesNotMatch(src, /list-disc|list-decimal|marker:/, `${file}: no other marker`);
    const lists = [...src.matchAll(/<ul\b[^>]*>/g)].map((m) => m[0]);
    const content = lists.filter((tag) => !/aria-label=\{`More|className="mt-3 space-y-1\.5 text-lg/.test(tag));
    assert.ok(content.length > 0, file);
    for (const tag of content) {
      assert.match(tag, /className=[{"`][^>]*\bpoints\b/, `${file}: ${tag}`);
      assert.match(tag, /role="list"/, `${file}: keeps list semantics in Safari`);
    }
  }
  // The folded lists in Projects are the quiet ones
  const projects = read("app/components/city2d/sections/Projects.tsx");
  const details = projects.slice(projects.indexOf("<details className"), projects.indexOf("</details>"));
  const folded = [...details.matchAll(/<ul\b[^>]*points[^>]*>/g)].map((m) => m[0]);
  assert.equal(folded.length, 2);
  for (const tag of folded) assert.match(tag, /points points-quiet/);
});
