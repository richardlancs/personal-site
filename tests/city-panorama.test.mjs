// The journey's city: one continuous panorama (scripts/city-panorama.mjs
// joins the six painted segments and cuts the tiles; panorama.ts holds
// their sizes and each stop's stretch), drawn behind every stop
// (DistrictBand.tsx) and moved along with the journey (CityTrack.tsx,
// trackMath.ts: panoKeys).
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import sharp from "sharp";
import { pageSections } from "../app/sections/registry.ts";
import { panoAt, panoKeys } from "../app/components/city2d/trackMath.ts";

const root = new URL("../", import.meta.url).pathname;
const read = (path) => readFileSync(`${root}${path}`, "utf8");
const pano = read("app/components/city2d/panorama.ts");
const num = (name) => Number(pano.match(new RegExp(`export const ${name} = (\\d+);`))[1]);
const WIDTH = num("WIDTH");
const HEIGHT = num("HEIGHT");
const SEGMENT = num("SEGMENT");
const stops = pano.match(/export const stops = \[([^\]]*)\]/)[1].split(",").map(Number);
const tiles = [...pano.matchAll(/\{ x: (\d+), w: (\d+) \}/g)].map((m, i) => ({ x: +m[1], w: +m[2], n: `0${i + 1}` }));
const images = read("app/components/city2d/panoramaImages.ts");
const joins = JSON.parse(pano.match(/export const joins = (\[.*\]);/)[1]);
const file = (t, n) => `${root}app/assets/city/panorama/${t}-${n}.webp`;

test("tiles exist by day and by night, the same count and sizes, side by side across the whole strip", async () => {
  assert.equal(tiles.length, 6);
  let x = 0;
  for (const t of tiles) {
    assert.equal(t.x, x, `tile ${t.n} starts where the last ended`);
    x += t.w;
    const [day, night] = ["day", "night"].map((p) => file(p, t.n));
    assert.ok(existsSync(day) && existsSync(night), `tile ${t.n}`);
    const [a, b] = await Promise.all([sharp(day).metadata(), sharp(night).metadata()]);
    assert.deepEqual([a.width, a.height], [t.w, HEIGHT], `day ${t.n}`);
    assert.deepEqual([b.width, b.height], [t.w, HEIGHT], `night ${t.n}`);
    assert.ok(images.includes(`import day${t.n} from "../../assets/city/panorama/day-${t.n}.webp";`));
    assert.ok(images.includes(`import night${t.n} from "../../assets/city/panorama/night-${t.n}.webp";`));
    assert.ok(images.includes(`{ day: day${t.n}, night: night${t.n} },`));
  }
  assert.equal(x, WIDTH, "the tiles cover the strip");
  // The first tile is the first segment (its cut moved a few pixels to a quiet column): the home stop's first view
  assert.ok(Math.abs(tiles[0].w - SEGMENT) <= 16);
});

test("each stop's stretch: in order, one per section, covering the whole width", () => {
  assert.equal(stops.length, pageSections.length);
  assert.equal(stops[0], 0);
  for (let i = 1; i < stops.length; i++) assert.ok(stops[i] > stops[i - 1], `stop ${i} after stop ${i - 1}`);
  // The last stretch runs to the end: about a segment (the last was redrawn a little larger, so drawn a little smaller)
  assert.ok(Math.abs(WIDTH - stops[stops.length - 1] - SEGMENT) < SEGMENT * 0.1);
});

// sRGB to CIE Lab (D65), and the distance between two colours (CIE76)
const lin = (c) => ((c /= 255) <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
function lab(r, g, b) {
  [r, g, b] = [lin(r), lin(g), lin(b)];
  const f = (t) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
  const x = f((0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047), y = f(0.2126 * r + 0.7152 * g + 0.0722 * b), z = f((0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}

test("the seams: across each join the colour changes no more than twice as much as between the neighbouring columns around it", { timeout: 120_000 }, async () => {
  for (const t of ["day", "night"]) {
    // The strip, put back together from its tiles
    const strip = new Uint8Array(WIDTH * HEIGHT * 3);
    for (const tile of tiles) {
      const { data } = await sharp(file(t, tile.n)).removeAlpha().raw().toBuffer({ resolveWithObject: true });
      for (let y = 0; y < HEIGHT; y++) strip.set(data.subarray(y * tile.w * 3, (y + 1) * tile.w * 3), (y * WIDTH + tile.x) * 3);
    }
    const L = new Float32Array(WIDTH * HEIGHT * 3);
    for (let i = 0; i < WIDTH * HEIGHT; i++) L.set(lab(strip[i * 3], strip[i * 3 + 1], strip[i * 3 + 2]), i * 3);
    // Mean ΔE between column x and x + 1, over every row
    const step = (x) => {
      let s = 0;
      for (let y = 0; y < HEIGHT; y++) {
        const a = (y * WIDTH + x) * 3, b = a + 3;
        s += Math.hypot(L[a] - L[b], L[a + 1] - L[b + 1], L[a + 2] - L[b + 2]);
      }
      return s / HEIGHT;
    };
    const mean = (a, b) => {
      let s = 0;
      for (let x = a; x <= b; x++) s += step(x);
      return s / (b - a + 1);
    };
    // The image's own: the neighbouring columns on either side (128 each)
    const own = (a, b) => (mean(Math.max(0, a - 128), a - 1) + mean(b + 1, Math.min(WIDTH - 2, b + 128))) / 2;
    // Each cut between segments (the columns it wanders over, and its soft
    // edge), and each cut between tiles (the one step from one to the next)
    const across = [...joins.map(([a, b]) => [a - 8, b + 8]), ...tiles.slice(1).map((tile) => [tile.x - 1, tile.x - 1])];
    for (const [a, b] of across) {
      const m = mean(a, b), o = own(a, b);
      assert.ok(m < o * 2, `${t}: columns ${a}–${b}: ΔE ${m.toFixed(2)} against its neighbours' ${o.toFixed(2)}`);
    }
  }
});

test("along the journey: each stop's start shows its stretch, the end shows the end, never back, never past", () => {
  // Six stops on a 1440 x 900 screen (peek 144): four a screen less the peek, two rows of panels, the last a screen
  const vw = 1440, scale = 900 / HEIGHT;
  const widths = [1296, 1296, 6000, 4000, 1296, 1440];
  const offsets = [0];
  for (const w of widths) offsets.push(offsets.at(-1) + w);
  const keys = panoKeys(offsets, vw, scale, stops, WIDTH, SEGMENT);
  const travel = offsets.at(-1) - vw;
  const end = WIDTH * scale - vw;
  assert.deepEqual(keys.x, [...offsets.slice(0, 5), travel], "a key at each stop's start, the last stop's being the end");
  // A segment drawn wider than the screen is centred in it
  const centre = (scale * SEGMENT - vw) / 2;
  for (let k = 0; k < 5; k++) assert.ok(Math.abs(keys.p[k] - (scale * stops[k] + centre)) < 1e-6, `stop ${k}`);
  assert.equal(keys.p.at(-1), end);
  for (let k = 1; k < keys.p.length; k++) assert.ok(keys.p[k] >= keys.p[k - 1]);
  // Straight between keys, held at the ends
  assert.equal(panoAt(-50, keys), keys.p[0]);
  assert.equal(panoAt(travel + 50, keys), end);
  const mid = (offsets[2] + offsets[3]) / 2;
  assert.ok(Math.abs(panoAt(mid, keys) - (keys.p[2] + keys.p[3]) / 2) < 1e-6);
  // A very wide screen: never past the end, never back
  const wide = panoKeys(offsets.map((o) => o * 2), 3440, 1000 / HEIGHT, stops, WIDTH, SEGMENT);
  for (let k = 0; k < wide.p.length; k++) assert.ok(wide.p[k] <= WIDTH * (1000 / HEIGHT) - 3440 + 1e-6 && (k === 0 || wide.p[k] >= wide.p[k - 1]));
  // No journey to speak of: nothing moves past its end
  assert.deepEqual(panoKeys([0, 1000], 1440, scale, stops, WIDTH, SEGMENT).x, [0]);
});

test("the panorama is drawn once, behind the stops, and moved on the runway's timeline", () => {
  const track = read("app/components/city2d/CityTrack.tsx");
  assert.match(read("app/page.tsx"), /<CityTrack city=\{<DistrictBand tiles=\{bandTiles\} \/>\}>/);
  assert.equal((track.match(/\{city\}/g) ?? []).length, 1);
  assert.match(track, /keys = panoKeys\(offsets, vw, pano\.offsetHeight \/ HEIGHT, starts, WIDTH, SEGMENT\);/);
  // CSS moves it where it can (its keyframes replaced by the keys), the scroll listener elsewhere
  assert.match(track, /\?\.setKeyframes\(keys\.x\.map\(/);
  assert.match(track, /pano\.style\.transform = `translateX\(\$\{-panoAt\(x, keys\)\}px\)`/);
  const css = read("app/city-track.css");
  assert.match(css, /:root\[data-track="on"\] :is\(\.track, \.track-sky, \.track-weather, \.pano\) \{\s*\/\*[^*]*\*\/\s*animation: track-move linear both;\s*animation-timeline: --runway;/);
  // Tiles side by side, as tall as the stage; the stations' own bands hidden on the journey
  assert.match(css, /:root\[data-track="on"\] \.station > \.band \{\s*display: none;/);
  assert.match(css, /:root\[data-track="on"\] \.pano \{[^}]*display: flex;/);
  assert.match(read("app/city.css"), /\.pano \{\s*display: none;/, "only on the journey");
  // Each tile keeps the painting's shape
  assert.match(read("app/components/city2d/DistrictBand.tsx"), /aspectRatio: `\$\{tile\.w\} \/ \$\{HEIGHT\}`/);
});

test("the pictures stay out of the page's JS: only server components import them, and hand the bands plain addresses", () => {
  for (const f of ["app/components/city2d/DistrictBand.tsx", "app/components/city2d/CityTrack.tsx", "app/components/city2d/homePlate.ts", "app/components/city2d/panorama.ts"]) {
    // (a type from it is fine: it is erased)
    assert.doesNotMatch(read(f), /^import (?!type )[^;]*from "\.\/panoramaImages"|\.webp"/m, f);
  }
  for (const f of ["app/page.tsx", "app/layout.tsx", "app/components/city2d/Station.tsx"]) assert.ok(!read(f).includes('"use client"'), f);
  assert.match(images, /const picture = \(\{ src, width, height \}: StaticImageData\): Picture => \(\{ src, width, height \}\);/, "no blurred placeholder in the props");
});
