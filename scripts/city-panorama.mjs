// Joins the six panorama segments (ChatGPT, docs/city/prompts.md, last
// section), by day and by night, into one continuous strip, and cuts it
// into the tiles the journey draws (app/assets/city/panorama/), writing
// app/components/city2d/panorama.ts with their sizes and each stop's
// stretch of the strip.
//
//   node scripts/city-panorama.mjs <folder of real-{day,night}-0N.png> [preview folder]
//
// Each segment N+1 was painted from segment N's right third, so they
// overlap by about a third, but redrawn: close, not identical, sometimes a
// few pixels off or slightly rescaled. And each night segment was edited
// from its day, but not pixel for pixel. So, in order:
// 1. Each night is registered onto its day (scale and shift, by the
//    correlation of their edges), so day and night share one geometry and
//    the dusk cross-fade doesn't double the buildings.
// 2. Each segment is aligned onto the one before (scale and shift, by the
//    least difference over the overlap, day and night together, on small
//    grey copies, then refined at half size).
// 3. The colours are matched across each overlap (a gain per channel and
//    per band of rows, half on each side, fading out across the segment).
// 4. The cut: the path of least difference down the overlap (day and night
//    together, so both strips cut alike), feathered over a few pixels, so
//    each pixel is one segment or the other and nothing ghosts.
// The strip is 941 px tall, as painted; the tiles are cut at each
// segment's right edge (give or take a few pixels), so the first tile is
// the first segment (the home stop's first view), and each stop's stretch
// starts where its segment does.
// 5. The tiles are written at SCALE times the strip (Lanczos, then a mild
//    unsharp mask, on the whole strip at once so no tile edge differs):
//    the stage is about 900 px tall, so a 2x screen draws the painting
//    about 1800 device pixels tall, and the browser's own upscale of the
//    941 px painting was soft (task-10-H-report.md). next/image makes
//    every smaller width from these, so 1x screens lose nothing.
// sharp comes with Next.
import { mkdirSync, statSync, writeFileSync } from "node:fs";
import sharp from "sharp";

const [from, preview] = process.argv.slice(2);
if (!from) throw new Error("usage: node scripts/city-panorama.mjs <png folder> [preview folder]");
const N = 6;
const H = 941;
const OUT = "app/assets/city/panorama";
const FEATHER = 12; // px, the cut's soft edge
const MARGIN = 24; // px, the cut keeps this far inside the overlap
const MAX_KB = 1000;
const SCALE = 2; // the tiles' pixels per strip pixel
const SHARPEN = { sigma: 0.8, m1: 0.5, m2: 1 }; // after the upscale: mild, no halos

// ---------- Images: RGB floats ----------

async function load(file) {
  const { data, info } = await sharp(file).removeAlpha().resize({ height: H }).raw().toBuffer({ resolveWithObject: true });
  return { w: info.width, h: info.height, d: Float32Array.from(data) };
}

const reflect = (u, n) => {
  if (u < 0) u = -u;
  if (u > n - 1) u = 2 * (n - 1) - u;
  return Math.min(Math.max(u, 0), n - 1);
};

// out(x, y) = im((x - dx) / s, (y - dy) / s), bilinear, mirrored at the edges
function warp(im, s, dx, dy, w, h) {
  const out = new Float32Array(w * h * 3);
  for (let y = 0; y < h; y++) {
    const v = reflect((y - dy) / s, im.h);
    const y0 = Math.floor(v), y1 = Math.min(y0 + 1, im.h - 1), fy = v - y0;
    for (let x = 0; x < w; x++) {
      const u = reflect((x - dx) / s, im.w);
      const x0 = Math.floor(u), x1 = Math.min(x0 + 1, im.w - 1), fx = u - x0;
      const a = (y0 * im.w + x0) * 3, b = (y0 * im.w + x1) * 3, c = (y1 * im.w + x0) * 3, e = (y1 * im.w + x1) * 3;
      const o = (y * w + x) * 3;
      for (let k = 0; k < 3; k++) {
        out[o + k] = (im.d[a + k] * (1 - fx) + im.d[b + k] * fx) * (1 - fy) + (im.d[c + k] * (1 - fx) + im.d[e + k] * fx) * fy;
      }
    }
  }
  return { w, h, d: out };
}

// A grey copy, F times smaller (box filter)
function grey(im, F) {
  const w = Math.floor(im.w / F), h = Math.floor(im.h / F);
  const g = new Float32Array(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let s = 0;
      for (let j = 0; j < F; j++)
        for (let i = 0; i < F; i++) {
          const o = ((y * F + j) * im.w + x * F + i) * 3;
          s += 0.299 * im.d[o] + 0.587 * im.d[o + 1] + 0.114 * im.d[o + 2];
        }
      g[y * w + x] = s / (F * F);
    }
  return { w, h, d: g };
}

// Bilinear sample of a grey image; NaN outside it
function at(g, u, v) {
  if (u < 0 || v < 0 || u > g.w - 1 || v > g.h - 1) return NaN;
  const x0 = Math.floor(u), y0 = Math.floor(v), x1 = Math.min(x0 + 1, g.w - 1), y1 = Math.min(y0 + 1, g.h - 1);
  const fx = u - x0, fy = v - y0;
  return (g.d[y0 * g.w + x0] * (1 - fx) + g.d[y0 * g.w + x1] * fx) * (1 - fy) + (g.d[y1 * g.w + x0] * (1 - fx) + g.d[y1 * g.w + x1] * fx) * fy;
}

function edges(g) {
  const e = new Float32Array(g.w * g.h);
  for (let y = 1; y < g.h - 1; y++)
    for (let x = 1; x < g.w - 1; x++) {
      const i = y * g.w + x;
      e[i] = Math.min(60, Math.abs(g.d[i + 1] - g.d[i - 1]) + Math.abs(g.d[i + g.w] - g.d[i - g.w]));
    }
  return { w: g.w, h: g.h, d: e };
}

// ---------- 1. Night onto day ----------

// Normalised correlation of the day's edges with the night's, the night
// moved by (s, dx, dy) (in this copy's pixels)
function ncc(A, B, s, dx, dy) {
  let sa = 0, sb = 0, saa = 0, sbb = 0, sab = 0, n = 0;
  for (let y = 4; y < A.h - 4; y += 1)
    for (let x = 4; x < A.w - 4; x += 1) {
      const b = at(B, (x - dx) / s, (y - dy) / s);
      if (Number.isNaN(b)) continue;
      const a = A.d[y * A.w + x];
      sa += a; sb += b; saa += a * a; sbb += b * b; sab += a * b; n++;
    }
  const ma = sa / n, mb = sb / n;
  return (sab / n - ma * mb) / Math.sqrt((saa / n - ma * ma) * (sbb / n - mb * mb));
}

function registerNight(day, night) {
  let best = { c: -2, s: 1, dx: 0, dy: 0 };
  const F1 = 4, A1 = edges(grey(day, F1)), B1 = edges(grey(night, F1));
  for (let s = 0.96; s <= 1.0601; s += 0.01)
    for (let dx = -8; dx <= 8; dx++)
      for (let dy = -8; dy <= 8; dy++) {
        const c = ncc(A1, B1, s, dx, dy);
        if (c > best.c) best = { c, s, dx: dx * F1, dy: dy * F1 };
      }
  const F2 = 2, A2 = edges(grey(day, F2)), B2 = edges(grey(night, F2));
  const coarse = best;
  for (let s = coarse.s - 0.01; s <= coarse.s + 0.0101; s += 0.0025)
    for (let dx = coarse.dx / F2 - 2; dx <= coarse.dx / F2 + 2; dx += 0.5)
      for (let dy = coarse.dy / F2 - 2; dy <= coarse.dy / F2 + 2; dy += 0.5) {
        const c = ncc(A2, B2, s, dx, dy);
        if (c > best.c || best === coarse) best = { c, s, dx: dx * F2, dy: dy * F2 };
      }
  return { ...best, identity: ncc(A2, B2, 1, 0, 0) };
}

// ---------- 2. Each segment onto the one before ----------

// Mean difference over the overlap (each side less its own mean, so a
// change of exposure doesn't count), B moved by (s, dx, dy) into A's frame
function misfit(As, Bs, s, dx, dy, step = 1) {
  let total = 0;
  for (let k = 0; k < As.length; k++) {
    const A = As[k], B = Bs[k];
    let sa = 0, sb = 0, n = 0;
    const x0 = Math.max(0, Math.ceil(dx));
    const pairs = [];
    for (let y = 2; y < A.h - 2; y += step)
      for (let x = x0; x < A.w; x += step) {
        const b = at(B, (x - dx) / s, (y - dy) / s);
        if (Number.isNaN(b)) continue;
        const a = A.d[y * A.w + x];
        sa += a; sb += b; n++;
        pairs.push(a, b);
      }
    if (n < 200) return Infinity;
    const ma = sa / n, mb = sb / n;
    let e = 0;
    for (let i = 0; i < pairs.length; i += 2) e += Math.abs(pairs[i] - ma - (pairs[i + 1] - mb));
    total += e / n;
  }
  return total / As.length;
}

function alignPair(A, B) {
  const F1 = 4;
  const As = [grey(A.day, F1), grey(A.night, F1)], Bs = [grey(B.day, F1), grey(B.night, F1)];
  let best = { e: Infinity };
  for (let s = 0.92; s <= 1.0801; s += 0.01)
    for (let dx = Math.round(As[0].w * 0.55); dx <= Math.round(As[0].w * 0.8); dx++)
      for (let dy = -8; dy <= 8; dy++) {
        const e = misfit([As[0]], [Bs[0]], s, dx, dy, 2);
        if (e < best.e) best = { e, s, dx, dy };
      }
  const F2 = 2;
  const A2 = [grey(A.day, F2), grey(A.night, F2)], B2 = [grey(B.day, F2), grey(B.night, F2)];
  const c = { s: best.s, dx: (best.dx * F1) / F2, dy: (best.dy * F1) / F2 };
  best = { e: Infinity };
  for (let s = c.s - 0.01; s <= c.s + 0.0101; s += 0.0025)
    for (let dx = c.dx - 3; dx <= c.dx + 3; dx += 0.5)
      for (let dy = c.dy - 3; dy <= c.dy + 3; dy += 0.5) {
        const e = misfit(A2, B2, s, dx, dy, 1);
        if (e < best.e) best = { e, s, dx: dx * F2, dy: dy * F2 };
      }
  // The day's and the night's own misfit at that alignment, for the log
  best.day = misfit([A2[0]], [B2[0]], best.s, best.dx / F2, best.dy / F2);
  best.night = misfit([A2[1]], [B2[1]], best.s, best.dx / F2, best.dy / F2);
  return best;
}

// ---------- 3. Colours ----------

const BAND = 32; // rows per band of the colour match
const bands = Math.ceil(H / BAND);

// Mean of each channel in each band of rows, over columns [x0, x1) of an image
function bandMeans(im, x0, x1) {
  const m = new Float64Array(bands * 3), n = new Float64Array(bands);
  for (let y = 0; y < im.h; y++) {
    const b = Math.floor(y / BAND);
    for (let x = x0; x < x1; x++) {
      const o = (y * im.w + x) * 3;
      for (let k = 0; k < 3; k++) m[b * 3 + k] += im.d[o + k];
      n[b]++;
    }
  }
  for (let b = 0; b < bands; b++) for (let k = 0; k < 3; k++) m[b * 3 + k] /= n[b] || 1;
  return m;
}

// The gain that takes `from` halfway to `to` (in ratio), per band and channel,
// smoothed across bands and kept within reason (different buildings in an
// overlap aren't a colour cast)
function halfGain(from, to) {
  const g = new Float64Array(bands * 3);
  for (let i = 0; i < g.length; i++) g[i] = Math.sqrt((to[i] + 4) / (from[i] + 4));
  const out = new Float64Array(g.length);
  for (let b = 0; b < bands; b++)
    for (let k = 0; k < 3; k++) {
      const p = g[Math.max(0, b - 1) * 3 + k], q = g[b * 3 + k], r = g[Math.min(bands - 1, b + 1) * 3 + k];
      out[b * 3 + k] = Math.min(1.2, Math.max(1 / 1.2, (p + 2 * q + r) / 4));
    }
  return out;
}

const gainAt = (g, y, k) => {
  const f = Math.min(Math.max((y - BAND / 2) / BAND, 0), bands - 1);
  const b0 = Math.floor(f), b1 = Math.min(b0 + 1, bands - 1), t = f - b0;
  return g[b0 * 3 + k] * (1 - t) + g[b1 * 3 + k] * t;
};

// Each segment's own gain: full over its left overlap (gL), full over its
// right overlap (gR), a straight ramp between, none where there's no overlap
function applyGains(im, gL, ovL, gR, ovR) {
  for (let y = 0; y < im.h; y++)
    for (let x = 0; x < im.w; x++) {
      const t = x <= ovL ? 0 : x >= ovR ? 1 : (x - ovL) / (ovR - ovL);
      const o = (y * im.w + x) * 3;
      for (let k = 0; k < 3; k++) {
        const a = gL ? gainAt(gL, y, k) : 1, b = gR ? gainAt(gR, y, k) : 1;
        im.d[o + k] = Math.min(255, im.d[o + k] * (a * (1 - t) + b * t));
      }
    }
}

// ---------- 4. The cut ----------

// The path down the overlap [x0, x1) (strip columns) where A and B differ
// least, day and night together; one column per row, smoothed
function cutPath(segA, segB, xA, xB, x0, x1) {
  const w = x1 - x0;
  const cost = new Float32Array(w * H);
  for (const t of ["day", "night"]) {
    const A = segA[t], B = segB[t];
    for (let y = 0; y < H; y++)
      for (let i = 0; i < w; i++) {
        const oa = (y * A.w + (x0 + i - xA)) * 3, ob = (y * B.w + (x0 + i - xB)) * 3;
        cost[y * w + i] += Math.abs(A.d[oa] - B.d[ob]) + Math.abs(A.d[oa + 1] - B.d[ob + 1]) + Math.abs(A.d[oa + 2] - B.d[ob + 2]);
      }
  }
  // A little blur, so the path follows regions, not single pixels
  const c = new Float32Array(w * H);
  for (let y = 0; y < H; y++)
    for (let i = 0; i < w; i++) {
      let s = 0, n = 0;
      for (let j = -2; j <= 2; j++)
        for (let k = -2; k <= 2; k++) {
          const yy = y + j, ii = i + k;
          if (yy >= 0 && yy < H && ii >= 0 && ii < w) { s += cost[yy * w + ii]; n++; }
        }
      c[y * w + i] = s / n;
    }
  const lo = MARGIN, hi = w - MARGIN;
  const E = new Float32Array(w * H).fill(Infinity);
  const from = new Int8Array(w * H);
  for (let i = lo; i < hi; i++) E[i] = c[i];
  for (let y = 1; y < H; y++)
    for (let i = lo; i < hi; i++) {
      let best = Infinity, d = 0;
      for (let k = -1; k <= 1; k++) {
        const e = E[(y - 1) * w + i + k];
        if (e < best) { best = e; d = k; }
      }
      E[y * w + i] = best + c[y * w + i];
      from[y * w + i] = d;
    }
  let i = lo;
  for (let k = lo; k < hi; k++) if (E[(H - 1) * w + k] < E[(H - 1) * w + i]) i = k;
  const path = new Float32Array(H);
  for (let y = H - 1; y >= 0; y--) {
    path[y] = x0 + i;
    i += from[y * w + i];
  }
  // Smoothed over 15 rows, so the soft edge has no steps
  const out = new Float32Array(H);
  for (let y = 0; y < H; y++) {
    let s = 0, n = 0;
    for (let j = -7; j <= 7; j++) if (y + j >= 0 && y + j < H) { s += path[y + j]; n++; }
    out[y] = s / n;
  }
  return out;
}

// ---------- The run ----------

const segs = [];
for (let i = 1; i <= N; i++) {
  const day = await load(`${from}/real-day-0${i}.png`);
  let night = await load(`${from}/real-night-0${i}.png`);
  const r = registerNight(day, night);
  const moved = Math.abs(r.s - 1) > 0.001 || Math.abs(r.dx) > 0.5 || Math.abs(r.dy) > 0.5;
  console.log(`night ${i} onto day: scale ${r.s.toFixed(4)}, shift ${r.dx.toFixed(1)}, ${r.dy.toFixed(1)} px; edge correlation ${r.identity.toFixed(3)} -> ${r.c.toFixed(3)}`);
  if (moved && r.c > r.identity) night = warp(night, r.s, r.dx, r.dy, day.w, day.h);
  else night = night.w === day.w ? night : warp(night, 1, 0, 0, day.w, day.h);
  segs.push({ day, night, x: 0 });
}

// Place each segment after the one before, moved into its frame
for (let i = 1; i < N; i++) {
  const A = segs[i - 1], B = segs[i];
  const a = alignPair(A, B);
  const dx = Math.floor(a.dx), fx = a.dx - dx;
  const w = Math.ceil(B.day.w * a.s + fx);
  B.day = warp(B.day, a.s, fx, a.dy, w, H);
  B.night = warp(B.night, a.s, fx, a.dy, w, H);
  B.x = A.x + dx;
  B.align = a;
  console.log(`segment ${i + 1} onto ${i}: scale ${a.s.toFixed(4)}, at ${a.dx.toFixed(1)}, ${a.dy.toFixed(1)} px; misfit day ${a.day.toFixed(2)}, night ${a.night.toFixed(2)}`);
}

// Colours matched across each overlap, half on each side
for (const t of ["day", "night"]) {
  const gains = segs.map(() => ({ gL: null, gR: null }));
  for (let i = 1; i < N; i++) {
    const A = segs[i - 1], B = segs[i];
    const x0 = B.x, x1 = A.x + A[t].w;
    const mA = bandMeans(A[t], x0 - A.x, x1 - A.x), mB = bandMeans(B[t], 0, x1 - B.x);
    gains[i - 1].gR = halfGain(mA, mB);
    gains[i].gL = halfGain(mB, mA);
  }
  segs.forEach((s, i) => {
    const ovL = i > 0 ? segs[i - 1].x + segs[i - 1][t].w - s.x : 0;
    const ovR = i < N - 1 ? segs[i + 1].x - s.x : s[t].w;
    applyGains(s[t], gains[i].gL, ovL, gains[i].gR, ovR);
  });
}

// The cuts, and the strips
const W = segs[N - 1].x + segs[N - 1].day.w;
const paths = [];
for (let i = 1; i < N; i++) {
  const A = segs[i - 1], B = segs[i];
  paths.push(cutPath(A, B, A.x, B.x, B.x, A.x + A.day.w));
}
const strips = {};
for (const t of ["day", "night"]) {
  const out = new Uint8ClampedArray(W * H * 3);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      // The segment this pixel is in, and how much of the next one (across a cut)
      let i = 0;
      while (i < N - 1 && x >= paths[i][y] - FEATHER / 2) i++;
      let rgb;
      const px = (s) => {
        const o = (y * s[t].w + (x - s.x)) * 3;
        return [s[t].d[o], s[t].d[o + 1], s[t].d[o + 2]];
      };
      if (i > 0 && x < paths[i - 1][y] + FEATHER / 2) {
        const u = (x - (paths[i - 1][y] - FEATHER / 2)) / FEATHER;
        const a = u * u * (3 - 2 * u);
        const p = px(segs[i - 1]), q = px(segs[i]);
        rgb = [0, 1, 2].map((k) => p[k] * (1 - a) + q[k] * a);
      } else rgb = px(segs[i]);
      const o = (y * W + x) * 3;
      out[o] = rgb[0];
      out[o + 1] = rgb[1];
      out[o + 2] = rgb[2];
    }
  strips[t] = out;
}

// The tiles: cut at each segment's right edge (the first is the first
// segment whole), the last running to the strip's end; each cut moved by
// up to 16 px to where neighbouring columns differ least (day and night),
// so no tile's edge lands on a building's, where an encoder's edge shows
const step = (x) => {
  let s = 0;
  for (const t of ["day", "night"])
    for (let y = 0; y < H; y++) {
      const o = (y * W + x) * 3;
      s += Math.abs(strips[t][o] - strips[t][o + 3]) + Math.abs(strips[t][o + 1] - strips[t][o + 4]) + Math.abs(strips[t][o + 2] - strips[t][o + 5]);
    }
  return s;
};
const smooth = (c) => {
  let best = c;
  for (let x = c - 16; x <= c + 16; x++) if (step(x - 1) < step(best - 1)) best = x;
  return best;
};
const cuts = [0, ...segs.slice(0, N - 1).map((s) => smooth(s.x + s.day.w)), W];
const stops = segs.map((s) => s.x);
mkdirSync(OUT, { recursive: true });
const big = {};
for (const t of ["day", "night"])
  big[t] = await sharp(Buffer.from(strips[t].buffer), { raw: { width: W, height: H, channels: 3 } })
    .resize(W * SCALE, H * SCALE, { kernel: "lanczos3" })
    .sharpen(SHARPEN)
    .raw()
    .toBuffer();
const tiles = [];
for (let i = 0; i < N; i++) {
  const x = cuts[i], w = cuts[i + 1] - cuts[i];
  for (const t of ["day", "night"]) {
    const file = `${OUT}/${t}-0${i + 1}.webp`;
    let quality = 90;
    do {
      await sharp(big[t], { raw: { width: W * SCALE, height: H * SCALE, channels: 3 } })
        .extract({ left: x * SCALE, top: 0, width: w * SCALE, height: H * SCALE })
        .webp({ quality, effort: 6 })
        .toFile(file);
      quality -= 4;
    } while (statSync(file).size > MAX_KB * 1024 && quality > 50);
    console.log(file, `${w * SCALE}x${H * SCALE}`, Math.round(statSync(file).size / 1024) + " KB", "q" + (quality + 4));
  }
  tiles.push({ x, w });
}
const joins = paths.map((p) => [Math.floor(Math.min(...p)), Math.ceil(Math.max(...p))]);

// panorama.ts: the tiles' places and sizes, each stop's start, and the
// cuts (for the seam test), plain numbers a client component may import;
// panoramaImages.ts: the tiles' pictures (static imports, so next/image
// knows their size), for server components only, which hand each band its
// tiles as props (a static import in a client component would ship its
// blurred placeholder in the page's first JS)
const pad = (i) => `0${i + 1}`;
const ts = `// The city of the journey: one continuous panorama, by day and by night,
// joined from six segments and cut into tiles by scripts/city-panorama.mjs
// (written by it: run it again rather than edit this). Pixels of the
// joined strip, which is HEIGHT tall. Each stop's stretch of the city
// starts where its segment does (stops: Home, About, Projects,
// Experience, Interests, Contact) and runs to the next one's start (the
// last to WIDTH); a segment is SEGMENT wide, so at a stop's start its
// segment shows as it was painted. The pictures: panoramaImages.ts, each
// SCALE times its tile's size here (upscaled, for 2x screens).
export const WIDTH = ${W};
export const HEIGHT = ${H};
export const SEGMENT = ${segs[0].day.w};
export const SCALE = ${SCALE};
export const stops = [${stops.join(", ")}];

/** The tiles, left to right: where each starts and how wide it is */
export const tiles = [${tiles.map((t) => `{ x: ${t.x}, w: ${t.w} }`).join(", ")}];

/** Where each cut between two segments runs (its leftmost and rightmost column): tests/city-panorama.test.mjs */
export const joins = [${joins.map((j) => `[${j.join(", ")}]`).join(", ")}];
`;
const images = `import type { StaticImageData } from "next/image";
import { tiles } from "./panorama";
${tiles.map((_, i) => `import day${pad(i)} from "../../assets/city/panorama/day-${pad(i)}.webp";\nimport night${pad(i)} from "../../assets/city/panorama/night-${pad(i)}.webp";`).join("\n")}

// The panorama's tiles' pictures, day and night (written by
// scripts/city-panorama.mjs). Server components only: they hand the bands
// (DistrictBand.tsx) their tiles as props, each picture only its address
// and size, so no client code carries the imports.
export const pictures: { day: StaticImageData; night: StaticImageData }[] = [
${tiles.map((_, i) => `  { day: day${pad(i)}, night: night${pad(i)} },`).join("\n")}
];

type Picture = { src: string; width: number; height: number };
export type BandTile = { w: number; day: Picture; night: Picture };

const picture = ({ src, width, height }: StaticImageData): Picture => ({ src, width, height });

/** The tiles as a band takes them */
export const bandTiles: BandTile[] = tiles.map((t, i) => ({ w: t.w, day: picture(pictures[i].day), night: picture(pictures[i].night) }));
`;
writeFileSync("app/components/city2d/panoramaImages.ts", images);
writeFileSync("app/components/city2d/panorama.ts", ts);
console.log("strip", `${W}x${H}`, "stops", stops.join(" "), "cuts", cuts.join(" "), "joins", JSON.stringify(joins));

// A small look at the whole strip, day over night, with the cuts marked;
// and each join at full size
if (preview) {
  mkdirSync(preview, { recursive: true });
  const raw = (t) => sharp(Buffer.from(strips[t].buffer), { raw: { width: W, height: H, channels: 3 } });
  for (const t of ["day", "night"]) {
    await raw(t).resize(2400).jpeg({ quality: 82 }).toFile(`${preview}/strip-${t}.jpg`);
    for (let i = 0; i < joins.length; i++) {
      const c = Math.round((joins[i][0] + joins[i][1]) / 2);
      const left = Math.max(0, c - 500);
      await raw(t).extract({ left, top: 0, width: Math.min(1000, W - left), height: H }).jpeg({ quality: 85 }).toFile(`${preview}/join-${i + 1}-${t}.jpg`);
    }
  }
}
