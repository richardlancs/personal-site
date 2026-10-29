// Apply the documented colour correction (docs/art/park/grade.json) to a
// copy of a master. The master itself is never changed, so the grade can be
// re-tuned or dropped at any time.
//
//   node scripts/art/grade.mjs [vNN]   (default: the current master)
//
// Writes art/park/graded/pk-d-<vNN>-<grade id>.png and before/after
// comparisons in art/park/reports/.

import sharp from "sharp";
import { ART, LOG_FILE, load, readJson, save } from "./lib.mjs";

const settings = readJson("docs/art/park/grade.json");
const log = readJson(LOG_FILE, []);
const version = process.argv[2];
const entry = version
  ? log.find((e) => e.version === version)
  : log.filter((e) => !e.rolledBack).at(-1);
if (!entry) throw new Error(`No version ${version}`);

const img = await load(entry.file);
const { shadows, highlights, saturation, strength } = settings;
const out = Buffer.alloc(img.data.length);
for (let i = 0; i < img.data.length; i += 3) {
  let [r, g, b] = [img.data[i], img.data[i + 1], img.data[i + 2]];
  const light = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  const dark = (1 - light) ** shadows.falloff;
  r += strength * (shadows.r * dark + highlights.r * light);
  g += strength * (shadows.g * dark + highlights.g * light);
  b += strength * (shadows.b * dark + highlights.b * light);
  const mean = (r + g + b) / 3;
  const s = 1 + strength * (saturation - 1);
  out[i] = Math.round(Math.min(Math.max(mean + (r - mean) * s, 0), 255));
  out[i + 1] = Math.round(Math.min(Math.max(mean + (g - mean) * s, 0), 255));
  out[i + 2] = Math.round(Math.min(Math.max(mean + (b - mean) * s, 0), 255));
}
const graded = { ...img, data: out };
const file = `${ART}/graded/pk-d-${entry.version}-${settings.id}.png`;
await save(graded, file);

// Before | after: the whole painting, then three close-ups
const pair = async (box, path) => {
  const crop = async (data) =>
    sharp(data, { raw: { width: img.width, height: img.height, channels: 3 } }).extract(box).png().toBuffer();
  await sharp({ create: { width: box.width * 2 + 10, height: box.height, channels: 3, background: "#222" } })
    .composite([
      { input: await crop(img.data), left: 0, top: 0 },
      { input: await crop(out), left: box.width + 10, top: 0 },
    ])
    .png()
    .toFile(path);
};
const base = `${ART}/reports/grade-${entry.version}-${settings.id}`;
await pair({ left: 0, top: 0, width: img.width, height: img.height }, `${base}-full.png`);
await pair({ left: 1100, top: 640, width: 436, height: 300 }, `${base}-bench.png`);
await pair({ left: 820, top: 380, width: 400, height: 280 }, `${base}-board.png`);
await pair({ left: 0, top: 0, width: 640, height: 420 }, `${base}-sky.png`);

const average = (data) => {
  const sum = [0, 0, 0];
  for (let i = 0; i < data.length; i += 3) for (let c = 0; c < 3; c++) sum[c] += data[i + c];
  return sum.map((v) => Math.round(v / (data.length / 3)));
};
console.log(`Wrote ${file}`);
console.log(`Average RGB before ${average(img.data)}, after ${average(out)}`);
console.log(`Comparisons: ${base}-full.png, -bench.png, -board.png, -sky.png`);
