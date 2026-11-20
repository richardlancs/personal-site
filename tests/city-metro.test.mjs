// The metro line and the list of stations (components/city2d/MetroLine.tsx,
// StationIndex.tsx, useStation.ts), and where the Sections menu marks
// where you are.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const root = new URL("../", import.meta.url).pathname;
const read = (path) => readFileSync(`${root}${path}`, "utf8");

test("the list of stations is a server-rendered nav of glass keys from the registry", () => {
  const src = read("app/components/city2d/StationIndex.tsx");
  assert.doesNotMatch(src, /"use client"/);
  assert.match(src, /aria-label="Stations"/);
  assert.match(src, /stations\s*\.filter\(\(s\) => s\.id !== "home"\)\s*\.map\(/);
  assert.match(src, /<ol>/);
  assert.match(src, /className="glass"/);
  assert.match(src, /stopNumber\(s\)/);
  assert.match(read("app/components/city2d/sections/Hero.tsx"), /<\/ul>\s*<StationIndex \/>/, "under the hero's links");
});

test("the metro line names where you are, by shape as well as colour", () => {
  const src = read("app/components/city2d/MetroLine.tsx");
  assert.match(src, /aria-label="Where you are"/);
  assert.match(src, /aria-current=\{s\.id === here \? "location" : undefined\}/);
  assert.match(src, /stations\.map\(/);
  assert.match(src, /s\.station/, "stops are named as the stations are");
  assert.match(src, /aria-expanded=\{open\}/, "the pill is a disclosure");
  const css = read("app/city.css");
  assert.match(css, /\.metro-stop\[aria-current="location"\] \.metro-ring \{[^}]*background: var\(--cyan\)[^}]*box-shadow/, "a filled, ringed stop");
  assert.match(css, /\.metro-stop\[aria-current="location"\] \.metro-name \{[^}]*font-weight: 700/);
  assert.match(read("app/page.tsx"), /<MetroLine \/>/);
  assert.equal((read("app/page.tsx").match(/<MetroLine \/>/g) ?? []).length, 1);
});

test("the metro line hides on phones, clears the safe areas, and opens in the margin only when it fits", () => {
  const css = read("app/city.css");
  assert.match(css, /@media \(max-width: 479px\) \{\s*\.metro-line \{\s*display: none;/);
  assert.match(css, /\.metro-line \{[^}]*right: max\([^)]*env\(safe-area-inset-right\)\)[^}]*bottom: max\([^)]*env\(safe-area-inset-bottom\)\)/);
  assert.match(css, /@media \(min-width: 97rem\) \{\s*\.metro-pill \{\s*display: none;/);
  // Hover opens it only where there is hover
  assert.match(css, /@media \(hover: hover\) \{\s*\.metro-line:hover \.metro-stops/);
  assert.match(css, /\.metro-line:focus-within \.metro-stops/);
});

test("useStation: one IntersectionObserver for the page, disconnected when no one reads it", () => {
  const src = read("app/components/city2d/useStation.ts");
  assert.equal((src.match(/new IntersectionObserver\(/g) ?? []).length, 1);
  assert.match(src, /\.disconnect\(\)/);
  assert.match(src, /useSyncExternalStore\(/);
  assert.match(src, /getServerSnapshot = \(\): SectionId => "home"/);
  for (const f of ["MetroLine.tsx", "SectionsMenu.tsx"]) assert.match(read(`app/components/city2d/${f}`), /useStation\(\)/, f);
});

test("the Sections menu marks where you are and leaves modified clicks to the browser", () => {
  const src = read("app/components/city2d/SectionsMenu.tsx");
  assert.match(src, /aria-current=\{s\.id === here \? "location" : undefined\}/);
  assert.match(src, /sections-menu-here/, "a mark as well as colour");
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
  assert.match(read("app/sections/registry.ts"), /export const sectionMetadata = \(id: "home"\): Metadata =>/);
});
