// Scripted lamplight for E4: a lamp left on inside the pavilion, seen
// through its small window. Built from the current master's own pixels, so
// the window's shape, frame and texture can't change. Settings:
// docs/art/park/e4-lamp.json.
//
//   node scripts/art/lamp.mjs [A|B …]    previews (default: all presets)
//   node scripts/art/lamp.mjs B --apply  make preset B the next master
//
//   1. panes: recoloured toward a dim amber. What was visible through the
//      glass stays as faint texture (the "dim interior"), at a brightness
//      set by `paneTarget`, well below the sunlit wall.
//   2. the frame: its inner edge picks up a little warmth.
//   3. the wall: a very faint warm tint that fades to nothing within
//      `reach` px of the frame and is exactly 0 at the E4 region's edge.

import { chmodSync, existsSync } from "node:fs";
import sharp from "sharp";
import { ART, EDITS_FILE, LOG_FILE, diff, edgeFade, load, luminance, readJson, regionMask, save, sha256, writeJson } from "./lib.mjs";

const CONFIG_FILE = "docs/art/park/e4-lamp.json";
const config = readJson(CONFIG_FILE);
const { edits } = readJson(EDITS_FILE);
const args = process.argv.slice(2);
const apply = args.includes("--apply");
const log = readJson(LOG_FILE, []);
const current = log.filter((entry) => !entry.rolledBack).at(-1);
if (apply && current.file !== config.source) {
  throw new Error(`The current master is ${current.file}, but this pass was tuned on ${config.source}`);
}

const source = await load(config.source);
const { width, height } = source;
const { hard } = await regionMask(edits.e4, width, height);
const envelope = await edgeFade(edits.e4, width, height, 3);
const [ox0, oy0, ox1, oy1] = config.geometry.opening;
const [fx0, fy0, fx1, fy1] = config.geometry.frame;

const smooth = (a, b, x) => {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1);
  return t * t * (3 - 2 * t);
};
// Distance (px) from a point to a rectangle; 0 inside
const rectDistance = (x, y, [x0, y0, x1, y1]) => Math.hypot(Math.max(x0 - x, 0, x - x1), Math.max(y0 - y, 0, y - y1));

// Mean brightness of the panes, so the texture can be kept as variation
let mean = 0;
let count = 0;
for (let y = oy0; y < oy1; y++) {
  for (let x = ox0; x < ox1; x++) {
    const i = (y * width + x) * 3;
    mean += luminance(source.data[i], source.data[i + 1], source.data[i + 2]);
    count++;
  }
}
mean /= count;

function render(preset) {
  const out = Buffer.from(source.data);
  const amberL = luminance(...preset.amber);
  for (let y = fy0 - preset.spill.reach - 2; y < fy1 + preset.spill.reach + 2; y++) {
    for (let x = fx0 - preset.spill.reach - 2; x < fx1 + preset.spill.reach + 2; x++) {
      const p = y * width + x;
      if (!hard[p]) continue;
      const i = p * 3;
      let [r, g, b] = [source.data[i], source.data[i + 1], source.data[i + 2]];
      const inOpening = x >= ox0 && x < ox1 && y >= oy0 && y < oy1;
      const inFrame = x >= fx0 && x < fx1 && y >= fy0 && y < fy1;

      if (inOpening) {
        // 1. Panes: amber at the target brightness, keeping the old view as
        // faint texture; softened over 1 px at the opening's edge
        const texture = luminance(r, g, b) / mean;
        // A lamp low inside the room: brighter near it, falling off toward
        // the far corners of the window
        const [lx, ly] = preset.lamp?.at ?? [(ox0 + ox1) / 2, (oy0 + oy1) / 2];
        const falloff = 1 + (preset.lamp?.falloff ?? 0) * (0.5 - Math.min(Math.hypot(x - lx, y - ly) / (ox1 - ox0), 1));
        const keep = preset.textureKeep ?? 0.3;
        const k = (preset.paneTarget / amberL) * (1 - keep + keep * texture) * falloff;
        const edge = smooth(0, 1.5, Math.min(x - ox0, ox1 - 1 - x, y - oy0, oy1 - 1 - y) + 0.5);
        const m = preset.paneMix * edge;
        r += (preset.amber[0] * k ** 0.45 - r) * m;
        g += (preset.amber[1] * k ** 0.45 - g) * m;
        b += (preset.amber[2] * k ** 0.45 - b) * m;
      } else if (inFrame) {
        // 2. Frame: warmer toward the opening
        const w = preset.frameWarm * (1 - smooth(0, 3, rectDistance(x, y, [ox0, oy0, ox1 - 1, oy1 - 1])));
        r *= 1 + w;
        g *= 1 + 0.5 * w;
        b *= 1 - 0.15 * w;
      } else {
        // 3. Wall: a faint warm tint close to the frame
        const w = preset.spill.warm * (1 - smooth(0, preset.spill.reach, rectDistance(x, y, [fx0, fy0, fx1 - 1, fy1 - 1]))) * envelope[p];
        r *= 1 + w;
        g *= 1 + 0.35 * w;
        b *= 1 - 0.5 * w;
      }
      out[i] = Math.round(Math.min(Math.max(r, 0), 255));
      out[i + 1] = Math.round(Math.min(Math.max(g, 0), 255));
      out[i + 2] = Math.round(Math.min(Math.max(b, 0), 255));
    }
  }
  return { data: out, width, height };
}

const R = `${ART}/reports/`;
const named = args.filter((arg) => !arg.startsWith("--"));
const ids = named.length ? named : Object.keys(config.presets);
if (apply && ids.length !== 1) throw new Error("--apply needs exactly one preset, e.g. B --apply");
for (const id of ids) {
  const result = render(config.presets[id]);
  await save(result, `${R}e4-lamp-${id}.png`);
  let outside = 0;
  for (let p = 0; p < width * height; p++) {
    if (hard[p]) continue;
    const i = p * 3;
    if (result.data[i] !== source.data[i] || result.data[i + 1] !== source.data[i + 1] || result.data[i + 2] !== source.data[i + 2]) outside++;
  }
  const changes = await diff(source, result, `${R}e4-lamp-${id}-diff.png`);
  console.log(`${id} (${config.presets[id].name}): pixels changed outside the E4 region ${outside}, changed box ${changes.changedBox}`);

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
      edit: "e4",
      method: "scripted lamplight (scripts/art/lamp.mjs)",
      parent: current.version,
      parentSha256: current.sha256,
      preset: id,
      settings: config.presets[id],
      geometry: config.geometry,
      region: edits.e4,
      changedVsParent: changes,
      pixelsChangedOutsideRegion: outside,
    });
    writeJson(LOG_FILE, log);
    console.log(`Wrote ${file} (read-only) and logged it in ${LOG_FILE}`);
  }
}

// v03 | rejected e4-a | presets, 4× on the window
const box = { left: 140, top: 495, width: 80, height: 75 };
const zoom = (path) => sharp(path).extract(box).resize(box.width * 4, box.height * 4, { kernel: "lanczos3" }).toBuffer();
const panels = [config.source, `${R}e4-e4-a-result.png`, ...ids.map((id) => `${R}e4-lamp-${id}.png`)];
const images = await Promise.all(panels.map(zoom));
await sharp({ create: { width: (box.width * 4 + 10) * images.length - 10, height: box.height * 4, channels: 3, background: "#222" } })
  .composite(images.map((input, i) => ({ input, left: i * (box.width * 4 + 10), top: 0 })))
  .png()
  .toFile(`${R}e4-lamp-4x.png`);
