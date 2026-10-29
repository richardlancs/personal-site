// Cuts the park painting into the layers the home page animates
// (components/world/ParkScene.tsx). Run: node scripts/art/layers.mjs
//
// Nothing is repainted. Each layer is the painting's own pixels inside a
// soft mask; the plate behind the layers that move far enough to uncover
// what's under them is filled from the surrounding pixels (push-pull fill),
// so a few pixels of movement never show a hole or a double edge.
//
// Output: app/assets/park/layers/*.webp and layers.json (boxes in painting
// pixels). Masks for review: art/park/reports/layers-*.png (not committed).

import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import sharp from "sharp";

const SRC = "app/assets/park/park-v04.png";
const OUT = "app/assets/park/layers";
const REPORTS = existsSync("art/park/reports") ? "art/park/reports" : null;

const { data: src, info } = await sharp(SRC).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width;
const H = info.height;
const N = W * H;

const clamp01 = (v) => Math.min(Math.max(v, 0), 1);
const smooth = (a, b, v) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};

// A polygon (painting pixels) as a soft 0-1 mask
async function polygon(points, feather) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="100%" height="100%"/><polygon points="${points.map((p) => p.join(",")).join(" ")}" fill="#fff"/></svg>`;
  let img = sharp(Buffer.from(svg)).removeAlpha().extractChannel(0);
  if (feather > 0) img = sharp(await img.raw().toBuffer(), { raw: { width: W, height: H, channels: 1 } }).blur(feather / 2).extractChannel(0);
  const buf = await img.raw().toBuffer();
  return Float32Array.from(buf, (v) => v / 255);
}

// Per-pixel colour measures
const px = (i) => [src[i * 3], src[i * 3 + 1], src[i * 3 + 2]];
const lum = (r, g, b) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
const sat = (r, g, b) => {
  const max = Math.max(r, g, b);
  return max === 0 ? 0 : (max - Math.min(r, g, b)) / max;
};

// How much a pixel looks like open sky: pale and bright, or blue
function skyness(i) {
  const [r, g, b] = px(i);
  const l = lum(r, g, b);
  const blue = smooth(-6, 14, b - r) * smooth(0.45, 0.6, l);
  const pale = smooth(0.38, 0.24, sat(r, g, b)) * smooth(0.68, 0.8, l);
  return Math.max(blue, pale);
}

// Foliage green or autumn yellow, not grey, rust or stone
function leafiness(i) {
  const [r, g, b] = px(i);
  const s = sat(r, g, b);
  const notRust = smooth(34, 14, r - g);
  return smooth(0.2, 0.36, s) * smooth(4, 22, g - b) * notRust;
}

// Distant, hazy things (sky, mountains, the empty towers): low saturation
// or blue; trees in front of them are saturated green/yellow
function farness(i) {
  const [r, g, b] = px(i);
  const s = sat(r, g, b);
  // Sunset clouds are saturated too, but redder than any leaf
  const green = smooth(0.28, 0.42, s) * smooth(6, 20, g - b) * smooth(30, 12, r - g);
  return Math.max(skyness(i), 1 - green);
}

// 3x3 box blur of a mask (for softening keyed edges)
function soften(mask, radius = 1) {
  const out = new Float32Array(N);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      let sum = 0;
      let n = 0;
      for (let dy = -radius; dy <= radius; dy++)
        for (let dx = -radius; dx <= radius; dx++) {
          const yy = y + dy;
          const xx = x + dx;
          if (yy < 0 || yy >= H || xx < 0 || xx >= W) continue;
          sum += mask[yy * W + xx];
          n++;
        }
      out[y * W + x] = sum / n;
    }
  return out;
}

function grow(mask, radius) {
  // Max filter, separable
  const tmp = new Float32Array(N);
  const out = new Float32Array(N);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      let m = 0;
      for (let d = -radius; d <= radius; d++) {
        const xx = x + d;
        if (xx >= 0 && xx < W) m = Math.max(m, mask[y * W + xx]);
      }
      tmp[y * W + x] = m;
    }
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      let m = 0;
      for (let d = -radius; d <= radius; d++) {
        const yy = y + d;
        if (yy >= 0 && yy < H) m = Math.max(m, tmp[yy * W + x]);
      }
      out[y * W + x] = m;
    }
  return out;
}

// Fill the pixels where `hole` is 1 from the pixels around them. Push-pull:
// average the known pixels down a pyramid, then pull the averages back up
// into the holes. Smooth, colour-faithful fills for small displacements.
function pushPull(rgb, hole, w, h) {
  const known = Float32Array.from(hole, (v) => (v > 0.5 ? 0 : 1));
  const levels = [{ w, h, c: Float32Array.from(rgb), k: known }];
  while (levels.at(-1).w > 2 && levels.at(-1).h > 2) {
    const prev = levels.at(-1);
    const nw = Math.ceil(prev.w / 2);
    const nh = Math.ceil(prev.h / 2);
    const c = new Float32Array(nw * nh * 3);
    const k = new Float32Array(nw * nh);
    for (let y = 0; y < nh; y++)
      for (let x = 0; x < nw; x++) {
        let kw = 0;
        const acc = [0, 0, 0];
        for (let dy = 0; dy < 2; dy++)
          for (let dx = 0; dx < 2; dx++) {
            const xx = Math.min(x * 2 + dx, prev.w - 1);
            const yy = Math.min(y * 2 + dy, prev.h - 1);
            const j = yy * prev.w + xx;
            const wk = prev.k[j];
            kw += wk;
            for (let ch = 0; ch < 3; ch++) acc[ch] += prev.c[j * 3 + ch] * wk;
          }
        const j = y * nw + x;
        k[j] = Math.min(kw, 1);
        for (let ch = 0; ch < 3; ch++) c[j * 3 + ch] = kw > 0 ? acc[ch] / kw : 0;
      }
    levels.push({ w: nw, h: nh, c, k });
  }
  for (let l = levels.length - 2; l >= 0; l--) {
    const fine = levels[l];
    const coarse = levels[l + 1];
    for (let y = 0; y < fine.h; y++)
      for (let x = 0; x < fine.w; x++) {
        const j = y * fine.w + x;
        const a = fine.k[j];
        if (a >= 1) continue;
        // Bilinear sample of the coarse level
        const cx = Math.min((x + 0.5) / 2 - 0.5, coarse.w - 1);
        const cy = Math.min((y + 0.5) / 2 - 0.5, coarse.h - 1);
        const x0 = Math.max(Math.floor(cx), 0);
        const y0 = Math.max(Math.floor(cy), 0);
        const x1 = Math.min(x0 + 1, coarse.w - 1);
        const y1 = Math.min(y0 + 1, coarse.h - 1);
        const fx = clamp01(cx - x0);
        const fy = clamp01(cy - y0);
        for (let ch = 0; ch < 3; ch++) {
          const s =
            coarse.c[(y0 * coarse.w + x0) * 3 + ch] * (1 - fx) * (1 - fy) +
            coarse.c[(y0 * coarse.w + x1) * 3 + ch] * fx * (1 - fy) +
            coarse.c[(y1 * coarse.w + x0) * 3 + ch] * (1 - fx) * fy +
            coarse.c[(y1 * coarse.w + x1) * 3 + ch] * fx * fy;
          fine.c[j * 3 + ch] = fine.c[j * 3 + ch] * a + s * (1 - a);
        }
        fine.k[j] = 1;
      }
  }
  return levels[0].c;
}

// ---------------------------------------------------------------------
// The layers. `key` decides which pixels inside the shape belong to the
// layer; `fill: true` fills the plate behind it (the layer moves enough
// to uncover it). Pivots are where the layer turns, in painting pixels.

const layers = [
  {
    // Sky, mountains and the empty towers: the farthest plane
    id: "far",
    shape: [
      [118, 0], [790, 0], [770, 60], [880, 120], [1000, 170], [1120, 200], [1210, 260], [1215, 330],
      [1100, 320], [1000, 345], [880, 345], [770, 352], [660, 375], [600, 360], [560, 362],
      [470, 352], [400, 365], [330, 380], [250, 372], [150, 372], [118, 360],
    ],
    feather: 10,
    key: farness,
    fill: false,
  },
  {
    // The high cloud streaks in the open sky, which drift
    id: "clouds",
    shape: [[150, 0], [760, 0], [720, 120], [560, 230], [380, 255], [150, 250]],
    feather: 60,
    key: () => 1,
    fill: false,
  },
  {
    // The big tree on the right: the leaves out over the sky
    id: "canopy",
    shape: [
      [735, 0], [1536, 0], [1536, 470], [1450, 470], [1400, 360], [1330, 300], [1250, 280],
      [1190, 250], [1120, 210], [1010, 182], [890, 142], [790, 92], [735, 40],
    ],
    feather: 8,
    // Leaves and branches, not the sky or the grey towers behind them
    key: (i) => {
      const [r, g, b] = px(i);
      const grey = smooth(0.24, 0.14, sat(r, g, b)) * smooth(0.42, 0.52, lum(r, g, b));
      return 1 - Math.max(skyness(i), grey);
    },
    fill: true,
  },
  {
    // The autumn tree at the left edge
    id: "tree-left",
    shape: [[0, 165], [128, 165], [138, 300], [128, 400], [0, 410]],
    feather: 10,
    key: (i) => 1 - skyness(i),
    fill: true,
  },
  {
    // The yellow tree behind the swing
    id: "ginkgo",
    shape: [[360, 360], [420, 330], [500, 325], [570, 360], [600, 420], [585, 500], [500, 530], [400, 520], [360, 470]],
    feather: 14,
    key: (i) => {
      const [r, g, b] = px(i);
      return smooth(0.35, 0.55, sat(r, g, b)) * smooth(-10, 20, r - g + 20) * smooth(30, 70, r - b);
    },
    fill: false,
  },
  {
    // The swing seats and chains (not the frame)
    id: "swing",
    shape: [[506, 549], [576, 549], [576, 600], [562, 645], [503, 645], [500, 600]],
    feather: 2,
    key: (i) => {
      const [r, g, b] = px(i);
      return smooth(0.34, 0.22, lum(r, g, b));
    },
    fill: true,
    grow: 1,
  },
  {
    // The little pointer at the top of the signpost
    id: "sign",
    shape: [[855, 425], [898, 428], [898, 452], [855, 450]],
    feather: 2,
    key: () => 1,
    fill: true,
  },
  {
    // The receiver of the phone in the booth, which lifts
    id: "receiver",
    shape: [[1361, 547], [1374, 547], [1375, 597], [1361, 597]],
    feather: 1,
    key: () => 1,
    fill: true,
    grow: 1,
  },
  {
    // Long grass in the lower left, in front of the railing
    id: "grass-left",
    shape: [[0, 620], [140, 625], [300, 690], [470, 740], [560, 820], [610, 1024], [0, 1024]],
    feather: 12,
    key: leafiness,
    fill: false,
  },
  {
    // Ivy leaves hanging in the lower right corner
    id: "leaves-right",
    shape: [[1395, 640], [1536, 600], [1536, 1024], [1440, 1024], [1420, 860], [1395, 760]],
    feather: 12,
    key: leafiness,
    fill: false,
  },
];

mkdirSync(OUT, { recursive: true });
const plateHole = new Float32Array(N);
const manifest = {};

for (const layer of layers) {
  const shape = await polygon(layer.shape, layer.feather);
  let alpha = new Float32Array(N);
  for (let i = 0; i < N; i++) alpha[i] = shape[i] > 0.001 ? shape[i] * layer.key(i) : 0;
  alpha = soften(alpha, 1);

  if (layer.fill) {
    // Fill under the solid part and a few pixels around it. The layer
    // keeps the original pixels over the whole filled area, so at rest
    // the picture is exactly the painting.
    const solid = grow(Float32Array.from(alpha, (a) => (a > 0.35 ? 1 : 0)), layer.grow ?? 3);
    for (let i = 0; i < N; i++)
      if (solid[i] && shape[i] > 0.6) {
        plateHole[i] = 1;
        alpha[i] = 1;
      }
  }

  // Crop to the layer's bounds
  let [x0, y0, x1, y1] = [W, H, 0, 0];
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++)
      if (alpha[y * W + x] > 0.01) {
        x0 = Math.min(x0, x);
        y0 = Math.min(y0, y);
        x1 = Math.max(x1, x);
        y1 = Math.max(y1, y);
      }
  const w = x1 - x0 + 1;
  const h = y1 - y0 + 1;
  const rgba = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = (y + y0) * W + (x + x0);
      const o = (y * w + x) * 4;
      rgba[o] = src[i * 3];
      rgba[o + 1] = src[i * 3 + 1];
      rgba[o + 2] = src[i * 3 + 2];
      rgba[o + 3] = Math.round(clamp01(alpha[i]) * 255);
    }
  await sharp(rgba, { raw: { width: w, height: h, channels: 4 } })
    .webp({ quality: 92, alphaQuality: 100, effort: 6 })
    .toFile(`${OUT}/${layer.id}.webp`);
  manifest[layer.id] = [x0, y0, x1 + 1, y1 + 1];

  if (REPORTS) {
    const view = Buffer.alloc(N * 3);
    for (let i = 0; i < N; i++) {
      const a = alpha[i];
      view[i * 3] = src[i * 3] * (0.25 + 0.75 * a) + 200 * (1 - a) * 0.4;
      view[i * 3 + 1] = src[i * 3 + 1] * (0.25 + 0.75 * a);
      view[i * 3 + 2] = src[i * 3 + 2] * (0.25 + 0.75 * a) + 200 * (1 - a) * 0.4;
    }
    await sharp(view, { raw: { width: W, height: H, channels: 3 } })
      .extract({ left: x0, top: y0, width: w, height: h })
      .png()
      .toFile(`${REPORTS}/layers-${layer.id}.png`);
  }
  console.log(layer.id, manifest[layer.id]);
}

// Single leaves against the sky, for the leaves that fall now and then
const leaves = [
  [769, 8, 792, 46],
  [798, 10, 820, 47],
  [883, 73, 920, 94],
  [895, 98, 917, 134],
];
for (const [n, [x0, y0, x1, y1]] of leaves.entries()) {
  const w = x1 - x0;
  const h = y1 - y0;
  const rgba = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = (y + y0) * W + (x + x0);
      const o = (y * w + x) * 4;
      rgba[o] = src[i * 3];
      rgba[o + 1] = src[i * 3 + 1];
      rgba[o + 2] = src[i * 3 + 2];
      rgba[o + 3] = Math.round(smooth(0.25, 0.7, 1 - skyness(i)) * 255);
    }
  await sharp(rgba, { raw: { width: w, height: h, channels: 4 } }).webp({ quality: 92, alphaQuality: 100 }).toFile(`${OUT}/leaf-${n + 1}.webp`);
}

// The plate: the painting with the holes filled
const filled = pushPull(Float32Array.from(src), plateHole, W, H);
const plate = Buffer.alloc(N * 3);
for (let i = 0; i < N * 3; i++) plate[i] = Math.round(Math.min(Math.max(filled[i], 0), 255));
await sharp(plate, { raw: { width: W, height: H, channels: 3 } }).webp({ quality: 95, effort: 6 }).toFile(`${OUT}/plate.webp`);

writeFileSync(`${OUT}/layers.json`, JSON.stringify(manifest, null, 2) + "\n");
console.log("plate written");
