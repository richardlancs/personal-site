// Shared helpers for the painting refinement scripts (see
// docs/art/park/refinement-workflow.md). Images are handled as raw RGB
// buffers so every pixel we don't mean to touch is copied exactly.

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import sharp from "sharp";

export const ART = "art/park";
export const EDITS_FILE = "docs/art/park/edits.json";
export const LOG_FILE = "docs/art/park/master-log.json";

export async function load(path) {
  const { data, info } = await sharp(path).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

export function save(img, path) {
  return sharp(img.data, { raw: { width: img.width, height: img.height, channels: 3 } })
    .png({ compressionLevel: 9 })
    .toFile(path);
}

export const sha256 = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");

export const readJson = (path, fallback) =>
  existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : fallback;
export const writeJson = (path, value) => writeFileSync(path, JSON.stringify(value, null, 2) + "\n");

// Relative luminance (WCAG) of an sRGB pixel
const linear = (c) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
export const luminance = (r, g, b) => 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
export const contrast = (l1, l2) => (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);

// The region an edit may change, as an SVG shape
function regionSvg(region, width, height, fill = "#fff") {
  const shape = region.rect
    ? `<rect x="${region.rect[0]}" y="${region.rect[1]}" width="${region.rect[2] - region.rect[0]}" height="${region.rect[3] - region.rect[1]}" fill="${fill}"/>`
    : `<polygon points="${region.polygon.map((p) => p.join(",")).join(" ")}" fill="${fill}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="#000"/>${shape}</svg>`;
}

// A soft mask (0-1 per pixel). It is exactly 0 outside the region and
// fades in over `feather` px *inside* it, so the blend can never leak out.
export async function regionMask(region, width, height) {
  const svg = Buffer.from(regionSvg(region, width, height));
  const hard = await sharp(svg).removeAlpha().extractChannel(0).raw().toBuffer();
  const sigma = Math.max(region.feather / 2, 0.3);
  const soft = await sharp(hard, { raw: { width, height, channels: 1 } })
    .blur(sigma)
    .extractChannel(0)
    .raw()
    .toBuffer();
  const mask = new Float32Array(width * height);
  for (let i = 0; i < mask.length; i++) {
    mask[i] = hard[i] < 128 ? 0 : Math.min(Math.max((soft[i] / 255 - 0.5) * 2, 0), 1);
  }
  return { mask, hard };
}

// A fade that is exactly 0 on and outside a region's edge and rises to 1
// at `width` px inside it, measured as true distance to the edge (two-pass
// chamfer transform), so it stays 0 at concave corners too, where a blurred
// mask would not.
export async function edgeFade(region, imageWidth, imageHeight, width) {
  const svg = Buffer.from(regionSvg(region, imageWidth, imageHeight));
  const hard = await sharp(svg).removeAlpha().extractChannel(0).raw().toBuffer();
  const n = imageWidth * imageHeight;
  const dist = new Float32Array(n);
  for (let p = 0; p < n; p++) dist[p] = hard[p] < 128 ? 0 : 1e9;
  const [a, b] = [1, Math.SQRT2];
  const at = (x, y) => (x < 0 || y < 0 || x >= imageWidth || y >= imageHeight ? 0 : dist[y * imageWidth + x]);
  for (let y = 0; y < imageHeight; y++) {
    for (let x = 0; x < imageWidth; x++) {
      const p = y * imageWidth + x;
      if (!dist[p]) continue;
      dist[p] = Math.min(dist[p], at(x - 1, y) + a, at(x, y - 1) + a, at(x - 1, y - 1) + b, at(x + 1, y - 1) + b);
    }
  }
  for (let y = imageHeight - 1; y >= 0; y--) {
    for (let x = imageWidth - 1; x >= 0; x--) {
      const p = y * imageWidth + x;
      if (!dist[p]) continue;
      dist[p] = Math.min(dist[p], at(x + 1, y) + a, at(x, y + 1) + a, at(x + 1, y + 1) + b, at(x - 1, y + 1) + b);
    }
  }
  const fade = new Float32Array(n);
  for (let p = 0; p < n; p++) {
    const t = Math.min(Math.max((dist[p] - 0.5) / width, 0), 1);
    fade[p] = t * t * (3 - 2 * t);
  }
  return fade;
}

// Bounding box of a region, grown by `margin` and clamped to the image
export function regionBox(region, width, height, margin = 0) {
  const xs = region.rect ? [region.rect[0], region.rect[2]] : region.polygon.map((p) => p[0]);
  const ys = region.rect ? [region.rect[1], region.rect[3]] : region.polygon.map((p) => p[1]);
  const left = Math.max(Math.min(...xs) - margin, 0);
  const top = Math.max(Math.min(...ys) - margin, 0);
  return {
    left,
    top,
    width: Math.min(Math.max(...xs) + margin, width) - left,
    height: Math.min(Math.max(...ys) + margin, height) - top,
  };
}

// Draw a region's outline on an image (for guides and reports)
export async function outline(path, region, out, label) {
  const { width, height } = await sharp(path).metadata();
  const shape = region.rect
    ? `<rect x="${region.rect[0]}" y="${region.rect[1]}" width="${region.rect[2] - region.rect[0]}" height="${region.rect[3] - region.rect[1]}"`
    : `<polygon points="${region.polygon.map((p) => p.join(",")).join(" ")}"`;
  const box = regionBox(region, width, height);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    ${shape} fill="none" stroke="#ff2d55" stroke-width="4" stroke-dasharray="14 8"/>
    ${label ? `<text x="${box.left + box.width}" y="${Math.max(box.top - 10, 24)}" text-anchor="end" font-family="Helvetica, Arial" font-size="24" font-weight="700" fill="#ff2d55" stroke="#fff" stroke-width="4" paint-order="stroke">${label}</text>` : ""}
  </svg>`;
  await sharp(path).composite([{ input: Buffer.from(svg) }]).png().toFile(out);
}

// Where two same-size images differ: a heat map (amplified absolute
// difference) plus summary numbers
export async function diff(a, b, out) {
  const heat = Buffer.alloc(a.width * a.height * 3);
  let changed = 0;
  let sum = 0;
  let box = null;
  for (let p = 0, i = 0; p < a.width * a.height; p++, i += 3) {
    const d = Math.max(
      Math.abs(a.data[i] - b.data[i]),
      Math.abs(a.data[i + 1] - b.data[i + 1]),
      Math.abs(a.data[i + 2] - b.data[i + 2]),
    );
    sum += d;
    // Grey copy of the image underneath, red where it changed
    const grey = (a.data[i] + a.data[i + 1] + a.data[i + 2]) / 9;
    heat[i] = Math.min(grey + d * 6, 255);
    heat[i + 1] = grey;
    heat[i + 2] = grey;
    if (d > 0) {
      changed++;
      const x = p % a.width;
      const y = (p / a.width) | 0;
      box = box
        ? [Math.min(box[0], x), Math.min(box[1], y), Math.max(box[2], x), Math.max(box[3], y)]
        : [x, y, x, y];
    }
  }
  if (out) await save({ data: heat, width: a.width, height: a.height }, out);
  return { changedPixels: changed, meanAbsDiff: +(sum / (a.width * a.height)).toFixed(3), changedBox: box };
}
