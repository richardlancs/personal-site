// Turns the paintings saved from ChatGPT into the site's plates:
// app/assets/city/<district>-<day|night>.webp, 2400 px wide, both plates of
// a district at exactly one size so they cross-fade, each at most 600 KB.
//
//   node scripts/city-plates.mjs <folder of shanghai-plate-*.png> [check-sheet.jpg]
//
// The optional sheet shows each pair at 50% over the other, to check that
// the buildings line up. sharp comes with Next.
import { statSync } from "node:fs";
import sharp from "sharp";

const districts = ["lujiazui", "longtang", "towers", "metro", "nanjing-road", "bund"];
const [from, sheet] = process.argv.slice(2);
const W = 2400, H = 1032, MAX = 600 * 1024;
const tiles = [];

for (const d of districts) {
  const pair = {};
  for (const t of ["day", "night"]) {
    const out = `app/assets/city/${d}-${t}.webp`;
    let quality = 86;
    do {
      await sharp(`${from}/shanghai-plate-${d}-${t}.png`).resize(W, H, { fit: "fill", kernel: "lanczos3" }).webp({ quality, effort: 6 }).toFile(out);
      quality -= 4;
    } while (statSync(out).size > MAX && quality > 50);
    console.log(out, Math.round(statSync(out).size / 1024) + " KB", "q" + (quality + 4));
    pair[t] = await sharp(out).resize(800).png().toBuffer();
  }
  if (sheet) {
    const half = await sharp(pair.night).ensureAlpha(0.5).png().toBuffer();
    const blend = await sharp(pair.day).composite([{ input: half }]).png().toBuffer();
    const row = tiles.length / 3;
    [pair.day, pair.night, blend].forEach((input, i) => tiles.push({ input, left: i * 800, top: row * 344 }));
  }
}
if (sheet) await sharp({ create: { width: 2400, height: 344 * 6, channels: 3, background: "#000" } }).composite(tiles).jpeg({ quality: 78 }).toFile(sheet);
