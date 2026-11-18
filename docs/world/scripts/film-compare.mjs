// How close the world looks to the intro's film (docs/world/film-look.md):
// photographs a place's home view with the page hidden, next to a frame
// of the film, and measures the colour difference (CIE ΔE76) between
// matching regions (sky, clouds, far hills, trees, grass, path).
// Against `next dev` (the ?sky= preview is development-only):
//   PLAYWRIGHT=…/playwright/index.mjs node docs/world/scripts/film-compare.mjs http://localhost:3130 <outDir> [skies=clear-day,…] [route=/]
// Writes <outDir>/compare-<sky>.jpg (film | world) and prints ΔE per region.
import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { launch } from "../../audit/scripts/pw.mjs";

const sharp = createRequire(import.meta.url)("sharp");
const [base = "http://localhost:3130", out = "/tmp/film-compare", skyArg = "clear-day", route = "/"] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const FILM = new URL("../../../public/intro/intro.h264.mp4", import.meta.url).pathname;

// Regions as fractions of the frame [x0, y0, x1, y1], chosen per picture
// so each covers the same kind of thing in both
const FILM_REGIONS = {
  skyTop: [0.55, 0.0, 0.95, 0.08],
  sky: [0.6, 0.3, 0.8, 0.42],
  cloud: [0.2, 0.05, 0.42, 0.4],
  far: [0.45, 0.48, 0.62, 0.53],
  trees: [0.35, 0.58, 0.5, 0.66],
  grass: [0.25, 0.7, 0.55, 0.8],
  path: [0.47, 0.92, 0.53, 0.98],
};
const WORLD_REGIONS = {
  skyTop: [0.55, 0.0, 0.95, 0.08],
  sky: [0.6, 0.06, 0.8, 0.15],
  cloud: [0.03, 0.04, 0.22, 0.16],
  far: [0.36, 0.3, 0.62, 0.48],
  trees: [0.15, 0.3, 0.32, 0.45],
  grass: [0.72, 0.68, 0.98, 0.78],
  path: [0.12, 0.86, 0.4, 0.97],
};

const lab = ([r, g, b]) => {
  const lin = (c) => ((c /= 255) <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const [R, G, B] = [lin(r), lin(g), lin(b)];
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const x = f((0.4124 * R + 0.3576 * G + 0.1805 * B) / 0.95047);
  const y = f(0.2126 * R + 0.7152 * G + 0.0722 * B);
  const z = f((0.0193 * R + 0.1192 * G + 0.9505 * B) / 1.08883);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
};
async function means(buf, regions) {
  const { data, info } = await sharp(buf).raw().toBuffer({ resolveWithObject: true });
  const res = {};
  for (const [k, [x0, y0, x1, y1]] of Object.entries(regions)) {
    let n = 0;
    const s = [0, 0, 0];
    for (let y = Math.floor(y0 * info.height); y < y1 * info.height; y += 2)
      for (let x = Math.floor(x0 * info.width); x < x1 * info.width; x += 2) {
        const i = (y * info.width + x) * info.channels;
        s[0] += data[i];
        s[1] += data[i + 1];
        s[2] += data[i + 2];
        n++;
      }
    res[k] = s.map((v) => v / n);
  }
  return res;
}
const hex = (c) => "#" + c.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");

// The film's frame: the middle of the run, the view the park should match
const { execFileSync } = await import("node:child_process");
const filmPng = `${out}/film.png`;
execFileSync("ffmpeg", ["-v", "error", "-y", "-ss", "4", "-i", FILM, "-frames:v", "1", "-vf", "scale=1440:810", filmPng]);
const film = await means(filmPng, FILM_REGIONS);

const b = await launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 810 } });
await ctx.addInitScript(() => localStorage.setItem("still-view", "on"));
const page = await ctx.newPage();
for (const sky of skyArg.split(",")) {
  await page.goto(`${base}${route}?sky=${sky}`, { waitUntil: "load" });
  await page.waitForFunction(() => document.querySelector(".world3d")?.getAttribute("data-arrived") === "true", null, { timeout: 30000 }).catch(() => {});
  await page.addStyleTag({ content: ".over-world, .world-controls, nextjs-portal, [data-dev-sky-panel] { visibility: hidden !important; }" });
  await page.waitForTimeout(2500);
  const shot = await page.screenshot();
  const world = await means(shot, WORLD_REGIONS);
  const rows = Object.keys(FILM_REGIONS).map((k) => {
    const [a, c] = [lab(film[k]), lab(world[k])];
    const de = Math.hypot(a[0] - c[0], a[1] - c[1], a[2] - c[2]);
    return { k, film: hex(film[k]), world: hex(world[k]), de };
  });
  const mean = rows.reduce((s, r) => s + r.de, 0) / rows.length;
  console.log(`${sky}  mean ΔE ${mean.toFixed(1)}`);
  for (const r of rows) console.log(`  ${r.k.padEnd(7)} film ${r.film}  world ${r.world}  ΔE ${r.de.toFixed(1)}`);
  const pair = await sharp({ create: { width: 2880, height: 810, channels: 3, background: "#000" } })
    .composite([{ input: filmPng, left: 0, top: 0 }, { input: shot, left: 1440, top: 0 }])
    .png()
    .toBuffer();
  await sharp(pair).resize(1600).jpeg({ quality: 78 }).toFile(`${out}/compare-${sky}.jpg`);
}
await b.close();
