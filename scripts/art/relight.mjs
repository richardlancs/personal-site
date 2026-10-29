// Scripted lighting pass for E2 (the notice board), as previews. Settings
// and geometry live in docs/art/park/e2-relight.json.
//
//   node scripts/art/relight.mjs [A|B|C …]   (default: all presets)
//   node scripts/art/relight.mjs C --apply   make preset C the next master
//
// Three adjustments, each with its own soft mask, all clipped to the E2
// region so nothing outside it changes:
//   1. foliage around the board: darker and cooler. The mask is an
//      elliptical zone (no straight edges) times "how much this pixel looks
//      like foliage" by colour, so wood, paper and paving are left alone.
//      Darkening is multiplicative, so leaf texture keeps its contrast.
//   2. the board: a warm, multiplicative light, strongest toward the upper
//      left (where the sun comes from), capped by each pixel's remaining
//      headroom so the pale paper can't be pushed to white.
//   3. the paving at the board's base: e2-a's light transferred as a blurred
//      brightness ratio, applied to v01's own pixels. The stones and joints
//      stay v01's; only the light changes.
// Writes previews, mask views and comparisons to art/park/reports/.

import { chmodSync, existsSync } from "node:fs";
import sharp from "sharp";
import { ART, LOG_FILE, diff, edgeFade, load, readJson, regionMask, save, sha256, writeJson } from "./lib.mjs";

const CONFIG_FILE = "docs/art/park/e2-relight.json";
const config = readJson(CONFIG_FILE);
const args = process.argv.slice(2);
const apply = args.includes("--apply");
const log = readJson(LOG_FILE, []);
const current = log.filter((entry) => !entry.rolledBack).at(-1);
if (apply && current.file !== config.source) {
  throw new Error(`The current master is ${current.file}, but this pass was tuned on ${config.source}`);
}
const source = await load(config.source);
const { width, height } = source;
// The region this pass may change (docs/art/park/e2-relight.json: the E2
// mask extended above the fingerpost). `envelope` is exactly 0 on its edge
// and rises to 1 at `envelope` px inside, so the foliage and paving changes
// can't leave a seam; `rim` does the same over 3 px for the board, whose
// left post meets the notch around the fingerpost's arm.
const { hard } = await regionMask(config.region, width, height);
const envelope = await edgeFade(config.region, width, height, config.region.envelope);
const rim = await edgeFade(config.region, width, height, 3);

const smooth = (a, b, x) => {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1);
  return t * t * (3 - 2 * t);
};

// --- Masks (0–1 per pixel) ----------------------------------------------

// The board's silhouette, softened by ~1.5 px inside its edge
const { mask: board } = await regionMask({ polygon: config.geometry.board, feather: 3 }, width, height);
for (let p = 0; p < board.length; p++) board[p] *= rim[p];

// Foliage likelihood from colour: green to yellow-green hues, some
// saturation, not near-white
function foliageness(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const s = max ? (max - min) / max : 0;
  let h = 0;
  if (max !== min) {
    if (max === r) h = (60 * ((g - b) / (max - min)) + 360) % 360;
    else if (max === g) h = 60 * ((b - r) / (max - min)) + 120;
    else h = 60 * ((r - g) / (max - min)) + 240;
  }
  return smooth(40, 52, h) * (1 - smooth(170, 195, h)) * smooth(0.15, 0.3, s) * (1 - smooth(0.85, 0.97, max / 255));
}

const zone = config.geometry.foliageZone;
const pool = config.geometry.pavingPool;
const foliage = new Float32Array(width * height);
const paving = new Float32Array(width * height);
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const p = y * width + x;
    if (!hard[p]) continue;
    const i = p * 3;
    const d = Math.hypot((x - zone.cx) / zone.rx, (y - zone.cy) / zone.ry);
    const inZone = (1 - smooth(0.65, 1.05, d)) * (1 - smooth(zone.fadeFromY, zone.fadeToY, y));
    foliage[p] = inZone * foliageness(source.data[i], source.data[i + 1], source.data[i + 2]) * (1 - board[p]) * envelope[p];
    const e = Math.hypot((x - pool.cx) / pool.rx, (y - pool.cy) / pool.ry);
    paving[p] = (1 - smooth(0.45, 1, e)) * (1 - board[p]) * envelope[p];
  }
}

// --- e2-a's paving light as a brightness ratio --------------------------

const lightSource = await load(config.lightSource);
const luma = (img) => {
  const out = Buffer.alloc(width * height);
  for (let p = 0; p < width * height; p++) {
    out[p] = Math.round(0.2126 * img.data[p * 3] + 0.7152 * img.data[p * 3 + 1] + 0.0722 * img.data[p * 3 + 2]);
  }
  return out;
};
const blurLuma = async (img) =>
  sharp(luma(img), { raw: { width, height, channels: 1 } }).blur(5).extractChannel(0).raw().toBuffer();
// e2-a sits 1 px to the right of v01 (measured by composite.mjs)
const lightBlur = await blurLuma(lightSource);
const sourceBlur = await blurLuma(source);
const gain = new Float32Array(width * height);
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const p = y * width + x;
    if (!paving[p]) continue;
    const q = y * width + Math.min(x + 1, width - 1);
    gain[p] = Math.min(Math.max((lightBlur[q] + 4) / (sourceBlur[p] + 4), 0.8), 1.7);
  }
}

// --- Apply a preset ------------------------------------------------------

function render(preset) {
  const out = Buffer.from(source.data);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const p = y * width + x;
      if (!hard[p]) continue;
      const i = p * 3;
      let [r, g, b] = [source.data[i], source.data[i + 1], source.data[i + 2]];

      // 1. Foliage: darker, and shadows pulled toward blue-green
      const f = foliage[p];
      if (f) {
        const k = 1 - preset.foliage.darken * f;
        const cool = preset.foliage.cool * f;
        r = r * k * (1 - 0.1 * cool);
        g = g * k * (1 - 0.02 * cool);
        b = b * k * (1 + 0.16 * cool);
      }

      // 2. Board: a warm gain (multiplying keeps the wood grain's contrast),
      // stronger toward the upper left. The added light is smoothly capped at
      // half of each pixel's remaining headroom, so mid-tones get most of the
      // lift while pale paper barely moves: nothing is pushed to white and no
      // white is dimmed.
      // Leaves inside the board's outline are left alone.
      const w = board[p] * (1 - foliageness(source.data[i], source.data[i + 1], source.data[i + 2]));
      if (w) {
        const toward = 1 - 0.5 * smooth(0, 1, ((x - 942) / 162 + (y - 413) / 153) / 2);
        const lift = preset.board.lift * w * toward;
        const warm = preset.board.warm * lift;
        const brighten = (v, gain) => {
          const added = v * gain;
          const headroom = (255 - v) * 0.5;
          return added > 0 && headroom > 0 ? v + added * (1 - Math.exp(-headroom / added)) : v + Math.min(added, 0);
        };
        if (preset.board.preserveHue) {
          // One gain for all three channels, capped by the brightest
          // channel's headroom, so cream paper gets lighter but stays cream;
          // then the warm tint on top
          const top = Math.max(r, g, b);
          const k = top ? brighten(top, lift) / top : 1;
          r *= k * (1 + 0.04 * warm);
          g *= k;
          b *= k * (1 - 0.1 * warm);
        } else {
          r = brighten(r, lift + 0.12 * warm);
          g = brighten(g, lift);
          b = brighten(b, lift - 0.15 * warm);
        }
      }

      // 3. Paving: e2-a's light, warm-biased, on v01's own stones
      const s = preset.paving.strength * paving[p];
      if (s) {
        const k = gain[p];
        r *= 1 + (k - 1) * s;
        g *= 1 + (k ** 0.9 - 1) * s;
        b *= 1 + (k ** 0.6 - 1) * s;
      }

      out[i] = Math.round(Math.min(Math.max(r, 0), 255));
      out[i + 1] = Math.round(Math.min(Math.max(g, 0), 255));
      out[i + 2] = Math.round(Math.min(Math.max(b, 0), 255));
    }
  }
  return { data: out, width, height };
}

// --- Reports -------------------------------------------------------------

const R = `${ART}/reports/`;
const boardBox = { left: 820, top: 370, width: 380, height: 270 };
const crop2x = (img) =>
  sharp(img.data, { raw: { width, height, channels: 3 } })
    .extract(boardBox)
    .resize(boardBox.width * 2, boardBox.height * 2, { kernel: "lanczos3" })
    .png()
    .toBuffer();
const squint = (img) =>
  sharp(img.data, { raw: { width, height, channels: 3 } })
    .resize(384, 256)
    .blur(2.2)
    .resize(768, 512, { kernel: "nearest" })
    .png()
    .toBuffer();

// Mask view: red = foliage shading, yellow = board lift, cyan = paving light
const view = Buffer.alloc(width * height * 3);
for (let p = 0; p < width * height; p++) {
  const grey = (source.data[p * 3] + source.data[p * 3 + 1] + source.data[p * 3 + 2]) / 9;
  view[p * 3] = Math.min(grey + 220 * foliage[p] + 220 * board[p], 255);
  view[p * 3 + 1] = Math.min(grey + 200 * board[p] + 200 * paving[p], 255);
  view[p * 3 + 2] = Math.min(grey + 220 * paving[p], 255);
}
await sharp(view, { raw: { width, height, channels: 3 } }).extract(boardBox).resize(760, 540).png().toFile(`${R}e2-relight-masks.png`);

const named = args.filter((arg) => !arg.startsWith("--"));
const ids = named.length ? named : Object.keys(config.presets);
if (apply && ids.length !== 1) throw new Error("--apply needs exactly one preset, e.g. C --apply");
const rejected = await load(`${R}e2-e2-a-result.png`);
for (const id of ids) {
  const result = render(config.presets[id]);
  await save(result, `${R}e2-relight-${id}.png`);

  // Nothing outside the E2 region may change
  let outside = 0;
  for (let p = 0; p < width * height; p++) {
    if (hard[p]) continue;
    const i = p * 3;
    if (result.data[i] !== source.data[i] || result.data[i + 1] !== source.data[i + 1] || result.data[i + 2] !== source.data[i + 2]) outside++;
  }
  // Largest change within 2 px of the region's edge (should be ~0)
  let edgeMax = 0;
  for (let p = 0; p < width * height; p++) {
    if (!hard[p] || rim[p] > 0.5) continue;
    for (let c = 0; c < 3; c++) edgeMax = Math.max(edgeMax, Math.abs(result.data[p * 3 + c] - source.data[p * 3 + c]));
  }
  const changes = await diff(source, result, `${R}e2-relight-${id}-diff.png`);
  console.log(`${id} (${config.presets[id].name}): pixels changed outside the region ${outside}, largest change at the region edge ${edgeMax} levels, changed box ${changes.changedBox}`);

  // v01 | rejected e2-a | this preset, 2× around the board, and squint
  const panels = [await crop2x(source), await crop2x(rejected), await crop2x(result)];
  await sharp({ create: { width: boardBox.width * 6 + 20, height: boardBox.height * 2, channels: 3, background: "#222" } })
    .composite(panels.map((input, i) => ({ input, left: i * (boardBox.width * 2 + 10), top: 0 })))
    .png()
    .toFile(`${R}e2-relight-${id}-board-2x.png`);
  const squints = [await squint(source), await squint(result)];
  await sharp({ create: { width: 768 * 2 + 10, height: 512, channels: 3, background: "#222" } })
    .composite(squints.map((input, i) => ({ input, left: i * 778, top: 0 })))
    .png()
    .toFile(`${R}e2-relight-${id}-squint.png`);

  if (apply) {
    if (outside) throw new Error(`${outside} pixels outside the region changed; refusing to apply`);
    const version = `v${String(log.length).padStart(2, "0")}`;
    const file = `${ART}/masters/pk-d-${version}.png`;
    if (existsSync(file)) throw new Error(`${file} already exists`);
    await save(result, file);
    chmodSync(file, 0o444);
    log.push({
      version,
      file,
      sha256: sha256(file),
      date: new Date().toISOString().slice(0, 10),
      edit: "e2",
      method: "scripted relight (scripts/art/relight.mjs)",
      parent: current.version,
      parentSha256: current.sha256,
      preset: id,
      settings: config.presets[id],
      region: config.region,
      geometry: config.geometry,
      lightSource: config.lightSource,
      lightSourceSha256: sha256(config.lightSource),
      changedVsParent: changes,
      pixelsChangedOutsideRegion: outside,
    });
    writeJson(LOG_FILE, log);
    console.log(`Wrote ${file} (read-only) and logged it in ${LOG_FILE}`);
  }
}
