// The city alive over the journey (city-track.css, DistrictBand.tsx):
// clouds on the sky behind the panorama, haze and a beam of light drifting
// on the runway's timeline, the windows coming on at twilight, Contact's
// light, the ground's plan. All of it CSS, transforms and opacity only,
// none of it moving in still view or under reduced motion.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
const css = read("app/city-track.css").replace(/\/\*[\s\S]*?\*\//g, "");
const band = read("app/components/city2d/DistrictBand.tsx");
const near = read("app/components/city2d/useNear.ts");

// The block of rules that only apply with motion welcome and a timeline
const motion = css.slice(css.indexOf("@media (prefers-reduced-motion: no-preference)"));

test("the sky's clouds sit on the parallax sky, and the panorama's top lets it show", () => {
  assert.match(css, /\.track-sky::before \{[^}]*--cloud: color-mix\([^}]*var\(--city-night/);
  assert.match(css, /\.track-sky::before \{[^}]*opacity: calc\(0\.35 \+ var\(--city-haze, 0\)\)/);
  assert.match(css, /\.pano \{[^}]*mask-image: linear-gradient\(transparent 8%/);
  // The twilight grade colours the sky too
  assert.match(css, /\.track-sky \{[^}]*var\(--city-grade\) calc\(var\(--city-grade-mix, 0\) \* 100%\)/);
});

test("haze, the beam and Contact's light move on the runway's timeline, never in still view", () => {
  for (const sel of [".track-weather::before", ".track-weather::after", "#contact::before"]) {
    assert.ok(motion.includes(`:root[data-track="on"]:not([data-still="on"]) ${sel}`), sel);
  }
  assert.match(motion, /animation: haze both;\s*animation-timeline: --runway;/);
  assert.match(motion, /\.track-weather::before \{\s*animation-iteration-count: 3;/);
  assert.match(motion, /\.track-weather::after \{\s*animation-name: beam;\s*animation-iteration-count: 6;/);
  assert.match(motion, /#contact::before \{\s*animation-name: lit;/);
  // Transforms and opacity only
  for (const name of ["haze", "beam", "lit", "lights-on"]) {
    const kf = css.match(new RegExp(`@keyframes ${name} \\{([\\s\\S]*?)\\n\\}`))[1];
    assert.doesNotMatch(kf.replace(/\b(?:transform|translate|opacity)\s*:/g, ""), /[a-z-]+\s*:/, name);
  }
});

test("at twilight the night plate's windows come on, flickering only where motion is welcome", () => {
  assert.match(band, /const lights = whole && shown\.length > 1 && loaded\.includes\("night"\);/);
  assert.match(band, /className="band-plate band-lights"/);
  assert.match(css, /\.band-lights \{\s*mix-blend-mode: lighten;\s*opacity: calc\(2 \* var\(--city-night, 0\)\);/);
  assert.match(motion, /:not\(\[data-still="on"\]\) \.band-lights \{\s*animation: lights-on var\(--t-sky\) var\(--ease-out\) both;/);
});

test("Contact is lit, and the street carries a faint plan", () => {
  assert.match(css, /#contact::before \{[^}]*radial-gradient\([^}]*rgb\(244 184 96/);
  assert.match(css, /\.track::before \{[^}]*radial-gradient\(rgb\(230 233 238 \/ 0\.08\) 1px/);
});

test("the near-screen watch lets go of the scroll once only hidden bands wait", () => {
  assert.match(near, /if \(!\[\.\.\.waiting\.keys\(\)\]\.some\(shows\)\) listen\(false\);/);
  assert.match(near, /else window\.removeEventListener\("scroll", onFirstScroll\);/);
  assert.match(near, /else if \(waiting\.has\(entry\.target\) && shows\(entry\.target\)\) listen\(true\);/);
});
