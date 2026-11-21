// How close each place of the 3D city looks to its painting (the plates,
// app/assets/city/<district>-{day,night}.webp): renders the place at
// ?frame=plate (its painting's pose and lens, the page hidden: City3D.tsx,
// development only), by night and by day, beside the painting, and
// measures the colour difference (CIE ΔE76) between the mean colours of
// matching cells of a 6 × 3 grid over both pictures, and between their
// mean lightness. (From docs/world/scripts/film-compare.mjs, the park's.)
// A measure, not a gate: it exits 0 whatever the ΔE (2 if a place never
// arrived or the page errors), so a round of tuning can see whether it
// moved toward the painting.
//
// Against `next dev` (?frame=plate and ?sky= are development only):
//   PLAYWRIGHT=…/playwright/index.mjs node docs/city/scripts/plate-compare.mjs http://localhost:3101 <outDir> [skies=clear-night,clear-day] [districts=lujiazui,…]
// Writes <outDir>/<district>-<night|day>.jpg (the painting above, the
// render below) and <outDir>/plate-compare.json, and prints per place and
// sky: mean ΔE over the cells, the worst cell, the three rows' (sky,
// middle, ground) means, and ΔL of the whole picture (render less
// painting: negative is darker than the painting).
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { launch } from "../../audit/scripts/pw.mjs";

const sharp = createRequire(import.meta.url)("sharp");
const [base = "http://localhost:3101", out = "plate-compare-out", skyArg = "clear-night,clear-day", onlyArg] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const PLATES = new URL("../../../app/assets/city/", import.meta.url).pathname;
const pages = { lujiazui: "/city", towers: "/city/projects", metro: "/city/experience", "nanjing-road": "/city/interests", longtang: "/city/about", bund: "/city/contact" };
const districts = onlyArg ? onlyArg.split(",") : Object.keys(pages);
const W = 1440;
const H = Math.round(W / (2400 / 1032)); // the plates' shape (City3D.tsx: PLATE_ASPECT)
const COLS = 6;
const ROWS = 3;

const lab = ([r, g, b]) => {
  const lin = (c) => ((c /= 255) <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const [R, G, B] = [lin(r), lin(g), lin(b)];
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const x = f((0.4124 * R + 0.3576 * G + 0.1805 * B) / 0.95047);
  const y = f(0.2126 * R + 0.7152 * G + 0.0722 * B);
  const z = f((0.0193 * R + 0.1192 * G + 0.9505 * B) / 1.08883);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
};
const dE = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

// Mean Lab per cell, and of the whole, at W × H
async function cells(input) {
  const { data, info } = await sharp(input).resize(W, H, { fit: "fill" }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const grid = [];
  const all = [0, 0, 0];
  let n = 0;
  for (let row = 0; row < ROWS; row++)
    for (let col = 0; col < COLS; col++) {
      const s = [0, 0, 0];
      let k = 0;
      for (let y = Math.floor((row * H) / ROWS); y < ((row + 1) * H) / ROWS; y += 2)
        for (let x = Math.floor((col * W) / COLS); x < ((col + 1) * W) / COLS; x += 2) {
          const i = (y * info.width + x) * info.channels;
          const L = lab([data[i], data[i + 1], data[i + 2]]);
          s[0] += L[0];
          s[1] += L[1];
          s[2] += L[2];
          k++;
        }
      const m = s.map((v) => v / k);
      grid.push({ row, col, lab: m });
      all[0] += m[0];
      all[1] += m[1];
      all[2] += m[2];
      n++;
    }
  return { grid, mean: all.map((v) => v / n) };
}

const browser = await launch();
const results = [];
let broken = false;
for (const district of districts) {
  for (const sky of skyArg.split(",")) {
    const phase = sky.includes("night") ? "night" : "day";
    const page = await browser.newPage({ viewport: { width: W, height: H } });
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    await page.goto(`${base}${pages[district]}?frame=plate&sky=${sky}`, { waitUntil: "load" });
    const arrived = await page.waitForSelector(".city3d[data-arrived]", { timeout: 90000 }).then(() => true, () => false);
    if (!arrived || !(await page.evaluate(() => document.documentElement.dataset.cityPlate === "on"))) {
      console.log(`${district} ${sky}: ${arrived ? "?frame=plate wasn't applied (is this next dev?)" : "never arrived"}`);
      broken = true;
      await page.close();
      continue;
    }
    await page.addStyleTag({ content: "nextjs-portal, [data-dev-sky-panel] { display: none !important; }" });
    await page.evaluate((s) => window.__city?.sky(s), sky);
    // The sky's blend from the live one (3 s), and the idle builds
    await page.waitForTimeout(11000);
    const box = await page.locator(".city3d").boundingBox();
    const shot = await page.screenshot({ clip: box });
    await page.close();
    const plate = `${PLATES}${district}-${phase}.webp`;
    const [p, r] = [await cells(plate), await cells(shot)];
    const des = p.grid.map((c, i) => dE(c.lab, r.grid[i].lab));
    const mean = des.reduce((a, b) => a + b, 0) / des.length;
    const rowMeans = [0, 1, 2].map((row) => des.filter((_, i) => p.grid[i].row === row).reduce((a, b) => a + b, 0) / COLS);
    const worst = des.indexOf(Math.max(...des));
    const dL = r.mean[0] - p.mean[0];
    const row = { district, sky, meanDE: +mean.toFixed(1), worstDE: +des[worst].toFixed(1), worstCell: `row ${p.grid[worst].row + 1}, col ${p.grid[worst].col + 1}`, rows: rowMeans.map((v) => +v.toFixed(1)), dL: +dL.toFixed(1), errors: errors.slice(0, 3) };
    results.push(row);
    if (errors.length) broken = true;
    console.log(`${district.padEnd(13)} ${sky.padEnd(12)} mean ΔE ${row.meanDE.toFixed(1).padStart(5)}  worst ${row.worstDE} (${row.worstCell})  rows ${row.rows.join(" / ")}  ΔL ${row.dL}${errors.length ? `  errors: ${errors.length}` : ""}`);
    const pair = await sharp({ create: { width: W, height: H * 2, channels: 3, background: "#000" } })
      .composite([
        { input: await sharp(plate).resize(W, H, { fit: "fill" }).toBuffer(), left: 0, top: 0 },
        { input: await sharp(shot).resize(W, H, { fit: "fill" }).toBuffer(), left: 0, top: H },
      ])
      .jpeg({ quality: 80 })
      .toBuffer();
    writeFileSync(`${out}/${district}-${phase}.jpg`, pair);
  }
}
await browser.close();
writeFileSync(`${out}/plate-compare.json`, JSON.stringify({ base, date: new Date().toISOString(), grid: `${COLS}x${ROWS}`, results }, null, 2));
if (results.length) console.log(`\nmean ΔE over ${results.length} renders: ${(results.reduce((a, b) => a + b.meanDE, 0) / results.length).toFixed(1)}`);
process.exit(broken ? 2 : 0);
