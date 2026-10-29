// Composite one approved region of an edited candidate into the current
// desktop master, leaving every other pixel exactly as it was.
//
//   node scripts/art/composite.mjs <edit> <candidate.png> [options]
//
//   <edit>          e3, e2, e4, e1 … (regions in docs/art/park/edits.json)
//   --apply         write the next master (without it: preview only)
//   --match-colour  shift the edited region's colours to match the master
//                   around it (use when ChatGPT re-tinted the whole image)
//   --rect l,t,r,b  override the region for this run
//   --feather n     override the soft-edge width (px, inside the region)
//   --shift dx,dy   use this alignment instead of searching (when ChatGPT
//                   moved the area further than the ±12 px search)
//
// See docs/art/park/refinement-workflow.md.

import { chmodSync, existsSync } from "node:fs";
import { basename } from "node:path";
import sharp from "sharp";
import { ART, EDITS_FILE, LOG_FILE, diff, load, outline, readJson, regionBox, regionMask, save, sha256, writeJson } from "./lib.mjs";

const [editId, candidatePath, ...flags] = process.argv.slice(2);
if (!editId || !candidatePath) {
  console.error("Usage: node scripts/art/composite.mjs <edit> <candidate.png> [--apply] [--match-colour] [--rect l,t,r,b] [--feather n]");
  process.exit(1);
}
const flag = (name) => flags.includes(name);
const option = (name) => {
  const i = flags.indexOf(name);
  return i >= 0 ? flags[i + 1] : undefined;
};

const { edits, size } = readJson(EDITS_FILE);
if (!edits[editId]) throw new Error(`Unknown edit "${editId}" (see ${EDITS_FILE})`);
const region = { ...edits[editId] };
if (option("--rect")) region.rect = option("--rect").split(",").map(Number);
if (option("--feather")) region.feather = Number(option("--feather"));

// The current master is the last entry in the log that wasn't rolled back
const log = readJson(LOG_FILE, []);
const current = log.filter((entry) => !entry.rolledBack).at(-1);
const master = await load(current.file);
let candidate = await load(candidatePath);
if (candidate.width !== size[0] || candidate.height !== size[1]) {
  console.error(
    `Candidate is ${candidate.width}×${candidate.height}; the master is ${size[0]}×${size[1]}.\n` +
      "Download the original image from ChatGPT (not a screenshot or a resized copy), or ask it to keep the 1536×1024 landscape size.",
  );
  process.exit(1);
}

const { width, height } = master;
const { mask, hard } = await regionMask(region, width, height);
const box = regionBox(region, width, height);

// 1. Alignment: ChatGPT can nudge the whole image by a few pixels. Find
// the shift that best lines the candidate up with the master, judged on a
// band of pixels just outside the region (they should be unchanged).
const outer = regionBox(region, width, height, 120);
const inBand = (x, y) =>
  x >= outer.left && x < outer.left + outer.width && y >= outer.top && y < outer.top + outer.height &&
  !(x >= box.left - 8 && x < box.left + box.width + 8 && y >= box.top - 8 && y < box.top + box.height + 8);
const grey = (img, x, y) => {
  const i = (y * width + x) * 3;
  return img.data[i] + img.data[i + 1] + img.data[i + 2];
};
let shift = { dx: 0, dy: 0, error: Infinity };
const forced = option("--shift")?.split(",").map(Number);
for (let dy = -12; dy <= 12 && !forced; dy++) {
  for (let dx = -12; dx <= 12; dx++) {
    let sum = 0;
    let n = 0;
    for (let y = outer.top; y < outer.top + outer.height; y += 3) {
      for (let x = outer.left; x < outer.left + outer.width; x += 3) {
        const sx = x + dx;
        const sy = y + dy;
        if (!inBand(x, y) || sx < 0 || sy < 0 || sx >= width || sy >= height) continue;
        sum += Math.abs(grey(master, x, y) - grey(candidate, sx, sy));
        n++;
      }
    }
    const error = sum / n / 3;
    if (error < shift.error) shift = { dx, dy, error };
  }
}
if (forced) shift = { dx: forced[0], dy: forced[1], error: NaN, forced: true };
if (shift.dx || shift.dy) {
  const moved = Buffer.alloc(candidate.data.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const sx = Math.min(Math.max(x + shift.dx, 0), width - 1);
      const sy = Math.min(Math.max(y + shift.dy, 0), height - 1);
      candidate.data.copy(moved, (y * width + x) * 3, (sy * width + sx) * 3, (sy * width + sx) * 3 + 3);
    }
  }
  candidate = { ...candidate, data: moved };
}

// 2. Colour: compare a ring just outside the region in both images. If
// ChatGPT re-tinted everything, the ring shows it, and --match-colour maps
// the edited region back onto the master's colours.
const ring = [];
const ringBox = regionBox(region, width, height, 24);
for (let y = ringBox.top; y < ringBox.top + ringBox.height; y++) {
  for (let x = ringBox.left; x < ringBox.left + ringBox.width; x++) {
    if (!hard[y * width + x]) ring.push((y * width + x) * 3);
  }
}
const channelStats = (img) =>
  [0, 1, 2].map((c) => {
    let sum = 0;
    let sq = 0;
    for (const i of ring) {
      sum += img.data[i + c];
      sq += img.data[i + c] ** 2;
    }
    const mean = sum / ring.length;
    return { mean, sd: Math.sqrt(Math.max(sq / ring.length - mean * mean, 1)) };
  });
const masterRing = channelStats(master);
const candidateRing = channelStats(candidate);
const ringShift = masterRing.map((m, c) => +(candidateRing[c].mean - m.mean).toFixed(1));
const matchColour = flag("--match-colour");

// 3. Blend: result = master + mask × (candidate − master)
const result = Buffer.from(master.data);
for (let p = 0; p < width * height; p++) {
  const m = mask[p];
  if (m === 0) continue;
  for (let c = 0; c < 3; c++) {
    const i = p * 3 + c;
    let value = candidate.data[i];
    if (matchColour) {
      value = (value - candidateRing[c].mean) * (masterRing[c].sd / candidateRing[c].sd) + masterRing[c].mean;
    }
    result[i] = Math.round(Math.min(Math.max(master.data[i] + m * (value - master.data[i]), 0), 255));
  }
}
const output = { data: result, width, height };

// 4. Verify: nothing outside the region may differ from the master
let leaked = 0;
for (let p = 0; p < width * height; p++) {
  if (hard[p]) continue;
  const i = p * 3;
  if (result[i] !== master.data[i] || result[i + 1] !== master.data[i + 1] || result[i + 2] !== master.data[i + 2]) leaked++;
}
if (leaked) throw new Error(`${leaked} pixels outside the region changed; refusing to continue`);

// How much ChatGPT changed outside the region (ignored, but worth knowing)
let drift = 0;
for (let p = 0; p < width * height; p++) {
  if (hard[p]) continue;
  const i = p * 3;
  drift += Math.abs(master.data[i] - candidate.data[i]) + Math.abs(master.data[i + 1] - candidate.data[i + 1]) + Math.abs(master.data[i + 2] - candidate.data[i + 2]);
}
drift /= (width * height - hard.reduce((n, v) => n + (v ? 1 : 0), 0)) * 3;

// 5. Reports: master | candidate | result around the region, and heat maps
const name = basename(candidatePath, ".png");
const tag = `${editId}-${name}${matchColour ? "-matched" : ""}`;
const resultPath = `${ART}/reports/${tag}-result.png`;
await save(output, resultPath);
const view = regionBox(region, width, height, 60);
const panel = async (img) =>
  sharp(img.data, { raw: { width, height, channels: 3 } }).extract(view).png().toBuffer();
const outlined = `${ART}/reports/${tag}-outlined.png`;
await outline(resultPath, region, outlined);
const panels = [await panel(master), await panel(candidate), await sharp(outlined).extract(view).toBuffer()];
await sharp({ create: { width: view.width * 3 + 20, height: view.height, channels: 3, background: "#222" } })
  .composite(panels.map((input, i) => ({ input, left: i * (view.width + 10), top: 0 })))
  .png()
  .toFile(`${ART}/reports/${tag}-compare.png`);
const versusCurrent = await diff(master, output, `${ART}/reports/${tag}-diff-vs-current.png`);
const original = await load(log[0].file);
const versusOriginal = await diff(original, output, `${ART}/reports/${tag}-diff-vs-original.png`);

const summary = {
  edit: editId,
  candidate: candidatePath,
  candidateSha256: sha256(candidatePath),
  parent: current.version,
  region: region.rect ?? region.polygon,
  feather: region.feather,
  alignmentShift: [shift.dx, shift.dy],
  alignmentError: +shift.error.toFixed(2),
  candidateDriftOutsideRegion: +drift.toFixed(2),
  ringColourShiftRGB: ringShift,
  colourMatched: matchColour,
  changedVsCurrent: versusCurrent,
  changedVsOriginal: versusOriginal,
  pixelsChangedOutsideRegion: leaked,
};
console.log(JSON.stringify(summary, null, 2));
console.log(`\nReports: ${ART}/reports/${tag}-compare.png, -diff-vs-current.png, -diff-vs-original.png`);

if (flag("--apply")) {
  const version = `v${String(log.length).padStart(2, "0")}`;
  const file = `${ART}/masters/pk-d-${version}.png`;
  if (existsSync(file)) throw new Error(`${file} already exists`);
  await save(output, file);
  chmodSync(file, 0o444);
  log.push({ version, file, sha256: sha256(file), date: new Date().toISOString().slice(0, 10), ...summary });
  writeJson(LOG_FILE, log);
  console.log(`\nWrote ${file} (read-only) and logged it in ${LOG_FILE}`);
} else {
  console.log("\nPreview only. Re-run with --apply to make it the next master.");
}
