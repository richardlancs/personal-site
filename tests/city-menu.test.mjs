// The Sections menu (components/city2d/SectionsMenu.tsx) and where it
// marks where you are.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const root = new URL("../", import.meta.url).pathname;
const read = (path) => readFileSync(`${root}${path}`, "utf8");

test("the Sections menu marks where you are and leaves modified clicks to the browser", () => {
  const src = read("app/components/city2d/SectionsMenu.tsx");
  assert.match(src, /aria-current=\{s\.id === here \? "location" : undefined\}/);
  // One plain list (V13): rows, not glass keys; where you are is a cyan bar
  // and a heavier weight, not by colour alone
  assert.doesNotMatch(src.match(/<nav [\s\S]*<\/nav>/)[0], /className="glass/);
  assert.match(read("app/city.css"), /\.sections-menu a\[aria-current\] \{\s*box-shadow: inset 2px 0 var\(--cyan\);\s*color: var\(--text\);\s*font-weight: 600;/);
  assert.match(src, /if \(!isPlainClick\(e\)\) return;/);
  const jump = read("app/components/city2d/jump.ts");
  assert.match(jump, /e\.button === 0 && !e\.metaKey && !e\.ctrlKey && !e\.shiftKey && !e\.altKey/);
  // Hysteresis around the tall bar
  assert.match(src, /h > window\.innerHeight \* 0\.25/);
  assert.match(src, /h < window\.innerHeight \* 0\.22/);
  const css = read("app/city.css");
  assert.match(css, /\[tabindex="-1"\]:focus \{\s*outline: none;/, "no ring on a jump's target");
  assert.match(read("app/components/city2d/sections/Projects.tsx"), /<section id="skills"[^>]*tabIndex=\{-1\}/, "Skills can take the focus");
});

test("only home makes page metadata: no anchor can become a canonical address", () => {
  assert.match(read("app/sections/metadata.ts"), /export const sectionMetadata = \(id: "home"\): Metadata =>/);
});
