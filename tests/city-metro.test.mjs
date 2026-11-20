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
  // Always open where it shows: nothing to expand or collapse, so it can't
  // be left open over the page or say one thing and show another
  assert.doesNotMatch(src, /aria-expanded|useState|data-open|<button/);
  const css = read("app/city.css");
  assert.match(css, /\.metro-stop\[aria-current="location"\] \.metro-ring \{[^}]*background: var\(--cyan\)[^}]*box-shadow/, "a filled, ringed stop");
  assert.match(css, /\.metro-stop\[aria-current="location"\] \.metro-name \{[^}]*font-weight: 700/);
  assert.match(read("app/page.tsx"), /<MetroLine \/>/);
  assert.equal((read("app/page.tsx").match(/<MetroLine \/>/g) ?? []).length, 1);
});

test("the metro line shows only where the margin holds it, on a near-solid ground; the bar has the stop between", () => {
  const css = read("app/city.css");
  // Hidden by default; from 97rem fixed in the margin, clear of the safe areas
  assert.match(css, /\.metro-line \{\s*display: none;\s*\}/);
  assert.match(css, /@media \(min-width: 97rem\) \{\s*\.metro-line \{\s*display: block;\s*position: fixed;\s*right: max\([^)]*env\(safe-area-inset-right\)\);\s*bottom: max\([^)]*env\(safe-area-inset-bottom\)\);/);
  // No folded state left, no hover or focus opening
  assert.doesNotMatch(css, /metro-pill|\.metro-line\[data-open\]|\.metro-line:focus-within|\.metro-line:hover/);
  // Its own ground: near-opaque ink with a hairline (no text on a painting)
  const stops = /\.metro-stops \{([^}]*)\}/.exec(css)[1];
  assert.match(stops, /background: rgb\(12 21 38 \/ 0\.9[0-9]\)/);
  assert.match(stops, /border: 1px solid var\(--line\)/);
  // Between 53rem and 97rem (where the bar has room on one row): the stop
  // in the top bar, quiet and hidden from
  // assistive technology (the Sections menu marks it with aria-current)
  const here = read("app/components/city2d/StationHere.tsx");
  assert.match(here, /aria-hidden="true"/);
  assert.match(here, /useStation\(\)/);
  assert.doesNotMatch(here, /<(a|button)[\s>]/, "not a control");
  assert.match(read("app/components/city2d/TopBar.tsx"), /<StationHere \/>/);
  assert.match(css, /\.top-bar-here \{\s*display: none;\s*color: var\(--muted\)/);
  assert.match(css, /@media \(min-width: 53rem\) and \(max-width: 96\.99rem\) \{[^@]*\.top-bar-here \{\s*display: block;/);
});

test("useStation: one IntersectionObserver for the page, disconnected when no one reads it", () => {
  const src = read("app/components/city2d/useStation.ts");
  assert.equal((src.match(/new IntersectionObserver\(/g) ?? []).length, 1);
  assert.match(src, /\.disconnect\(\)/);
  assert.match(src, /useSyncExternalStore\(/);
  assert.match(src, /getServerSnapshot = \(\): SectionId => "home"/);
  for (const f of ["MetroLine.tsx", "SectionsMenu.tsx", "StationHere.tsx"]) assert.match(read(`app/components/city2d/${f}`), /useStation\(\)/, f);
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
