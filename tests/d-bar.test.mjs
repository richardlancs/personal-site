// The UX panel's fixes to the bar, the map, the menu and the résumé
// (docs/ui/ux-review-2026-11-23.md, Task 9): pinned in the source.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const root = new URL("../", import.meta.url).pathname;
const read = (path) => readFileSync(`${root}${path}`, "utf8");
const css = read("app/city.css");

test("the bar names the panel you're at from CityTrack's trackplace event (10, 16)", () => {
  const line = read("app/components/city2d/ProgressLine.tsx");
  assert.match(line, /addEventListener\("trackplace", onPlace\)/);
  assert.match(line, /removeEventListener\("trackplace", onPlace\)/);
  // "Projects · 2 of 5 Empyrean", "Projects · Skills"; the counter stays
  assert.match(line, /`\$\{place\.n\} of \$\{place\.of\} \$\{place\.title\}`/);
  assert.match(line, /\{sectionNumber\(at\)\} \/ \{sectionNumber\(points\[last\]\)\}/);
  // A long place cuts short rather than adding a row to the bar
  assert.match(css, /\.top-bar-here \{\s*display: block;\s*flex: 1 1 0;\s*min-width: 0;\s*overflow: hidden;\s*text-overflow: ellipsis;/);
});

test("Task 11: no Still view key on the bar (still view follows the system's setting)", () => {
  assert.doesNotMatch(read("app/components/city2d/TopBar.tsx"), /StillViewToggle/);
  assert.doesNotMatch(css, /\.top-bar-still-label|\.top-bar \.top-bar-still/);
});

test("the map lines up with the panels' central 80%, and its phone label stays by its dot (14, 15)", () => {
  assert.match(css, /--map-x: var\(--peek\);\s*inset: auto max\(8px, env\(safe-area-inset-right\), var\(--map-x\)\)/);
  assert.match(css, /@media \(max-aspect-ratio: 1 \/ 1\) \{\s*:root\[data-track="on"\] \.progress-line \{\s*--map-x: 0px;/);
  const narrow = css.match(/@container \(width < 36em\) \{([\s\S]*?)\n\}/)[1];
  assert.doesNotMatch(narrow, /align-self/, "centred over its dot, not pinned to a side");
  assert.match(narrow, /\.progress-rail \{\s*margin: 0 0\.5rem;/, "clear of the map's edge");
});

test("the résumé reads on a phone, opens in the phone's viewer, and never leaves the site offline (11, 20)", () => {
  const viewer = read("app/components/resume/ResumeViewer.tsx");
  assert.match(viewer, /const SMALL = 0\.6;\s*const READABLE = 0\.8;/);
  assert.match(viewer, /<a href=\{src\} target="_blank" rel="noopener noreferrer" className="glass resume-open">/);
  assert.match(viewer, /Open in your viewer/);
  const host = read("app/components/resume/ResumeHost.tsx");
  assert.doesNotMatch(host, /location\.assign/);
  assert.match(host, /<p role="alert" className="resume-fail" style=\{FAIL_STYLE\}>/);
  // Chosen is not focus: no outer glow or rim of the accent on the chosen key
  const chosen = read("app/components/resume/resume.css").match(/\.resume \.glass\[aria-pressed="true"\] \{([^}]*)\}/)[1];
  assert.match(chosen, /--glass-lift: 0 0 transparent;/);
  assert.doesNotMatch(chosen, /border-color: var\(--(focus|accent-2|cyan)\)/);
});
