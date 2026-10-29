// The review checks from docs/art/park/review-c01.md, rerun on any image:
// text-zone contrast row by row, where the brightest areas are, the light on
// the notice board, and colour balance.
//
//   node scripts/art/measure.mjs [image]   (default: the current master)

import { LOG_FILE, contrast, load, luminance, readJson } from "./lib.mjs";

const path = process.argv[2] ?? readJson(LOG_FILE, []).filter((e) => !e.rolledBack).at(-1).file;
const img = await load(path);
const ink = luminance(0x2b, 0x2f, 0x27); // the site's text colour

function stats([x0, y0, x1, y1]) {
  let sum = 0;
  const rgb = [0, 0, 0];
  let n = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * img.width + x) * 3;
      sum += luminance(img.data[i], img.data[i + 1], img.data[i + 2]);
      for (let c = 0; c < 3; c++) rgb[c] += img.data[i + c];
      n++;
    }
  }
  return { luminance: +(sum / n).toFixed(3), rgb: rgb.map((v) => Math.round(v / n)) };
}

console.log(`Measuring ${path}\n`);

// Text zone: worst and best ink contrast per 20 px row, x 120–760
console.log("Text zone (x 120–760): ink contrast per row band");
for (let y = 60; y < 420; y += 20) {
  let min = Infinity;
  let max = 0;
  for (let x = 120; x < 760; x += 8) {
    const c = contrast(stats([x, y, x + 8, y + 20]).luminance, ink);
    min = Math.min(min, c);
    max = Math.max(max, c);
  }
  console.log(`  y ${String(y).padStart(3)}–${y + 20}: min ${min.toFixed(1)}  max ${max.toFixed(1)}${min < 4.5 ? "   below 4.5" : ""}`);
}

// Brightest 64 px blocks, overall and in the midground (below the skyline)
const blocks = [];
for (let y = 0; y < img.height; y += 64) {
  for (let x = 0; x < img.width; x += 64) blocks.push({ x, y, l: stats([x, y, x + 64, y + 64]).luminance });
}
blocks.sort((a, b) => b.l - a.l);
const list = (items) => items.map((b) => `${b.x},${b.y} (${b.l.toFixed(2)})`).join("  ");
console.log(`\nBrightest blocks overall:    ${list(blocks.slice(0, 6))}`);
console.log(`Brightest in the midground:  ${list(blocks.filter((b) => b.y >= 384 && b.y < 900).slice(0, 6))}`);

const regions = {
  "Notice board face": [965, 440, 1080, 520],
  "Light around the board": [850, 520, 1150, 640],
  "Trees behind the board": [1090, 400, 1200, 520],
  "Phone booth": [1300, 440, 1430, 690],
  "Pavilion window": [150, 505, 200, 550],
  "Shadow under the bench": [1180, 840, 1400, 900],
  "Whole image": [0, 0, img.width, img.height],
};
console.log("\nRegions (mean luminance, mean RGB):");
for (const [name, box] of Object.entries(regions)) {
  const s = stats(box);
  console.log(`  ${name.padEnd(26)} ${s.luminance.toFixed(3)}  rgb(${s.rgb.join(", ")})`);
}

// E2: how strongly the notice board separates from the foliage around it
const face = stats(regions["Notice board face"]);
const behind = stats(regions["Trees behind the board"]);
const above = stats([950, 385, 1100, 425]);
console.log("\nNotice board separation:");
console.log(`  face vs foliage behind  ${contrast(face.luminance, behind.luminance).toFixed(2)}:1`);
console.log(`  face vs foliage above   ${contrast(face.luminance, above.luminance).toFixed(2)}:1`);
console.log(`  foliage behind, blue ÷ red ${(behind.rgb[2] / behind.rgb[0]).toFixed(2)} (higher = cooler)`);
let clipped = 0;
let pixels = 0;
for (let y = 440; y < 520; y++) {
  for (let x = 965; x < 1080; x++) {
    const i = (y * img.width + x) * 3;
    if (Math.max(img.data[i], img.data[i + 1], img.data[i + 2]) >= 250) clipped++;
    pixels++;
  }
}
console.log(`  board face pixels at ≥250 ${((clipped / pixels) * 100).toFixed(1)}%`);
