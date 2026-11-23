// The city alive over the journey (city-track.css, DistrictBand.tsx):
// the sky behind the panorama, haze and a beam of light drifting
// on the runway's timeline, the windows coming on at twilight, Contact's
// light, the ground's plan. All of it CSS, transforms and opacity only,
// none of it moving in still view or under reduced motion.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { panoAt, trackXForPano } from "../app/components/city2d/trackMath.ts";

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
const css = read("app/city-track.css").replace(/\/\*[\s\S]*?\*\//g, "");
const band = read("app/components/city2d/DistrictBand.tsx");
const near = read("app/components/city2d/useNear.ts");

// The block of rules that only apply with motion welcome and a timeline
const motion = css.slice(css.indexOf("@media (prefers-reduced-motion: no-preference)"));

test("the panorama's top melts into the parallax sky without losing a crown; one texture", () => {
  assert.match(css, /\.pano \{[^}]*mask-image: linear-gradient\(transparent, #000 15%\)/);
  // The twilight grade colours the sky too, and before the driver has set it the sky still draws
  assert.match(css, /\.track-sky \{[^}]*var\(--city-grade, transparent\) calc\(var\(--city-grade-mix, 0\) \* 100%\)/);
  assert.doesNotMatch(css, /\.track-sky::before|repeating-linear-gradient/);
});

test("the haze is two screens of the same mist, so its drift of a screen ends where it began", () => {
  assert.match(css, /\.track-weather::before \{[^}]*background-size: 50% 100%;/);
  assert.match(css, /@keyframes haze \{\s*to \{\s*transform: translateX\(-50%\);/);
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
  // ...blending with the whole city (no layer per tile), the tiles a pixel over each other, so no join shows
  assert.match(css, /\.band-tile \{[^}]*z-index: auto;/);
  assert.match(css, /\.band-plate \{\s*inset: 0 -1px;/);
  assert.match(css, /\.band-lights \{\s*mix-blend-mode: lighten;\s*opacity: calc\(2 \* var\(--city-night, 0\)\);/);
  assert.match(motion, /:not\(\[data-still="on"\]\) \.band-lights \{\s*animation: lights-on both;\s*animation-timeline: --runway;\s*animation-range: contain var\(--lit-from, 0px\) contain var\(--lit-to, 0px\);/);
  const track = read("app/components/city2d/CityTrack.tsx");
  assert.match(track, /setProperty\("--lit-from", `\$\{trackXForPano\(t\.offsetLeft - vw, keys\)\}px`\)/);
  assert.match(track, /setProperty\("--lit-to", `\$\{trackXForPano\(t\.offsetLeft - vw \/ 2, keys\)\}px`\)/);
});

test("trackXForPano: where along the track the panorama has moved a given way (panoAt's inverse)", () => {
  const keys = { x: [0, 1000, 2000, 2000, 3000], p: [0, 800, 800, 1500, 2000] };
  assert.equal(trackXForPano(-50, keys), 0);
  assert.equal(trackXForPano(400, keys), 500);
  assert.equal(panoAt(trackXForPano(400, keys), keys), 400);
  // At a hold it is where the hold begins; across a cut, the cut
  assert.equal(trackXForPano(800, keys), 1000);
  assert.equal(trackXForPano(1200, keys), 2000);
  assert.equal(trackXForPano(1750, keys), 2500);
  assert.equal(trackXForPano(9999, keys), 3000);
});

test("Contact is lit, and the street carries a faint plan", () => {
  assert.match(css, /#contact::before \{[^}]*radial-gradient\(26% 40% at 74% 85%, rgb\(244 184 96/);
  assert.match(css, /\.track::before \{[^}]*radial-gradient\(rgb\(230 233 238 \/ 0\.08\) 1px/);
});

test("the near-screen watch lets go of the scroll once only hidden bands wait", () => {
  assert.match(near, /if \(!\[\.\.\.waiting\.keys\(\)\]\.some\(shows\)\) listen\(false\);/);
  assert.match(near, /else window\.removeEventListener\("scroll", onFirstScroll\);/);
  assert.match(near, /else if \(waiting\.has\(entry\.target\) && shows\(entry\.target\)\) listen\(true\);/);
});
