// The painted places' light masks, and the list of their pictures the 3D
// city loads (docs/superpowers/plans/2026-11-21-city-painted-25d.md, Task 1).
//
//   npm run city:masks
//
// For every painting app/assets/city/<id>-night.webp with its -day.webp:
// - app/assets/city/masks/<id>-light.webp: where the night painting is lit
//   (windows, neon, lamps and their reflections), white, the rest black, a
//   little softened; the plate's shader (components/city3d/kit/plate.ts)
//   keeps those parts glowing steadily through the blend into night. Made
//   from the paintings alone, by thresholds (lightMask below): bright at
//   night, and not merely a pale wall that is as bright by day.
// - app/assets/city/masks/<id>-sky.webp: where the day painting is open
//   sky, white (skyMask below): the far plane of a painted place's depth,
//   which the plate (kit/plate.ts) builds in code from this, a horizon and
//   polygons in the place's data (scenes.ts: PlateDepth). There are no
//   painted depth maps: ChatGPT repaints the scene when asked for one.
// - app/components/city3d/kit/plateArt.ts: every painting's day, night,
//   light and sky masks (and a depth map, app/assets/city/depth/<id>-day.webp,
//   should one ever exist), as static imports, so new art is wired in by
//   running this again. Generated: don't edit it by hand.
//
// sharp comes with Next. Run it after adding or changing a painting.
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Where a mask's value starts and reaches full, on the night painting's
// light (max of its luminance and 0.85 × its brightest channel, so a
// saturated neon counts as lit), less DAY_SHARE of the day painting's
// luminance at that point
export const MASK = { lo: 0.34, hi: 0.66, dayShare: 0.3 };
// The masks' long edge, px (half the paintings': the shader samples them
// smoothly, and the lights are soft)
export const MASK_EDGE = 1280;
// The width the sky is looked for at (skyMask's steps are per pixel)
export const SKY_EDGE = 400;

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const luma = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

// The pure threshold: RGB(A) pixels of the night painting (and, if given,
// the day painting, the same size), `channels` per pixel (3 or 4), in;
// one byte per pixel out, 255 lit .. 0 dark
export function lightMask(night, day, width, height, { channels = 4, lo = MASK.lo, hi = MASK.hi, dayShare = MASK.dayShare } = {}) {
  const out = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const o = i * channels;
    const r = night[o] / 255, g = night[o + 1] / 255, b = night[o + 2] / 255;
    let v = Math.max(luma(r, g, b), 0.85 * Math.max(r, g, b));
    if (day) v -= dayShare * luma(day[o] / 255, day[o + 1] / 255, day[o + 2] / 255);
    out[i] = Math.round(255 * smooth(lo, hi, v));
  }
  return out;
}

// The sky's test (skyMask): a pixel is sky while it stays within `tol` of
// the column's sky colour so far (which follows it down, so the sky's
// gradient is followed), or is a cloud (light, nearly grey, not warm),
// and doesn't jump by more than `edge` from the pixel above; never under
// `lowest` of the height; holes up to `gap` of the frame filled (down, across). A rough
// guess at the edges (blue glass, pale stone can pass for sky): a place
// bounds it with its "sky" regions (scenes.ts: PlateDepth)
export const SKY = { follow: 0.01, tol: 0.22, edge: 0.05, gap: [0.1, 0.015], lowest: 0.8, cloudLuma: 0.7, cloudChroma: 0.22 };

// The pure sky finder: RGB(A) pixels of the day painting in, one byte per
// pixel out, 255 sky .. 0 not. A flood from the top row: the sky is what's
// open from the top of the frame (a window's blue lower down never
// counts), each step to a neighbour that doesn't jump by more than `edge`
// and stays within `tol` of the sky colour carried along (which follows
// the sky's gradient), or is a cloud.
export function skyMask(day, width, height, { channels = 4, gap = SKY.gap, tol = SKY.tol, edge = SKY.edge, lowest = SKY.lowest, cloudLuma = SKY.cloudLuma, cloudChroma = SKY.cloudChroma } = {}) {
  const n = width * height;
  const out = new Uint8Array(n);
  const ref = new Float32Array(n * 3);
  const c = (i, k) => day[i * channels + k] / 255;
  const cloud = (i) => {
    const r = c(i, 0), g = c(i, 1), b = c(i, 2);
    return luma(r, g, b) > cloudLuma && Math.max(r, g, b) - Math.min(r, g, b) < cloudChroma && b >= r - 0.15;
  };
  const bluish = (i) => c(i, 2) > c(i, 0) + 0.08;
  const stop = Math.floor(height * lowest);
  const queue = new Int32Array(n);
  let head = 0, tail = 0;
  for (let x = 0; x < width; x++) {
    if (!bluish(x) && !cloud(x)) continue;
    out[x] = 255;
    for (let k = 0; k < 3; k++) ref[x * 3 + k] = c(x, k);
    queue[tail++] = x;
  }
  while (head < tail) {
    const i = queue[head++];
    const x = i % width, y = (i - x) / width;
    for (const j of [x > 0 ? i - 1 : -1, x < width - 1 ? i + 1 : -1, y > 0 ? i - width : -1, y < stop - 1 ? i + width : -1]) {
      if (j < 0 || out[j]) continue;
      const step = Math.hypot(c(j, 0) - c(i, 0), c(j, 1) - c(i, 1), c(j, 2) - c(i, 2));
      const off = Math.hypot(c(j, 0) - ref[i * 3], c(j, 1) - ref[i * 3 + 1], c(j, 2) - ref[i * 3 + 2]);
      const isCloud = cloud(j);
      if (step >= edge || !(off < tol || isCloud)) continue;
      out[j] = 255;
      for (let k = 0; k < 3; k++) ref[j * 3 + k] = isCloud ? ref[i * 3 + k] : (1 - SKY.follow) * ref[i * 3 + k] + SKY.follow * c(j, k);
      queue[tail++] = j;
    }
  }
  // Clouds the flood went round: a short run of not-sky with sky above and
  // below it in its column, or either side of it in its row, is sky
  const fill = (count, len, at) => {
    const most = Math.floor(len === height ? gap[0] * height : gap[1] * width);
    for (let a = 0; a < count; a++) {
      let last = -1;
      for (let b = 0; b < len; b++) {
        if (!out[at(a, b)]) continue;
        if (last >= 0 && b - last > 1 && b - last - 1 <= most) for (let k = last + 1; k < b; k++) out[at(a, k)] = 255;
        last = b;
      }
    }
  };
  fill(width, height, (x, y) => y * width + x);
  fill(height, width, (y, x) => y * width + x);
  return out;
}

const camel = (id) => id.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());

// The generated list (plateArt.ts) for the paintings and files found
export function plateArtSource(entries) {
  const lines = [];
  const rows = [];
  for (const e of entries) {
    const n = camel(e.id);
    const imp = (name, file) => lines.push(`import ${name} from "../../../assets/city/${file}";`);
    imp(`${n}Day`, `${e.id}-day.webp`);
    imp(`${n}Night`, `${e.id}-night.webp`);
    const row = [`day: ${n}Day`, `night: ${n}Night`];
    const extra = (key, name, file) => {
      imp(name, file);
      row.push(`${key}: ${name}`);
    };
    if (e.light) extra("light", `${n}Light`, `masks/${e.id}-light.webp`);
    if (e.sky) extra("sky", `${n}Sky`, `masks/${e.id}-sky.webp`);
    if (e.depthDay) extra("depthDay", `${n}DepthDay`, `depth/${e.id}-day.webp`);
    rows.push(`  ${JSON.stringify(e.id)}: { ${row.join(", ")} },`);
  }
  return `// Generated by scripts/city/make-masks.mjs (npm run city:masks): every
// painting a painted place can show, with its light mask and depth maps.
// Don't edit by hand; run the script after adding art. Loaded on demand
// by kit/plate.ts (its own chunk), not with the city's renderer.
import type { StaticImageData } from "next/image";
${lines.join("\n")}

export type PlateArt = { day: StaticImageData; night: StaticImageData; light?: StaticImageData; sky?: StaticImageData; depthDay?: StaticImageData };

export const PLATE_ART: Record<string, PlateArt> = {
${rows.join("\n")}
};
`;
}

async function main() {
  const { default: sharp } = await import("sharp");
  const root = fileURLToPath(new URL("../../", import.meta.url));
  const dir = `${root}app/assets/city`;
  mkdirSync(`${dir}/masks`, { recursive: true });
  const ids = readdirSync(dir)
    .filter((f) => f.endsWith("-night.webp") && existsSync(`${dir}/${f.replace(/-night\.webp$/, "-day.webp")}`))
    .map((f) => f.replace(/-night\.webp$/, ""))
    .sort();
  const entries = [];
  for (const id of ids) {
    const meta = await sharp(`${dir}/${id}-night.webp`).metadata();
    const scale = Math.min(1, MASK_EDGE / Math.max(meta.width, meta.height));
    const w = Math.round(meta.width * scale), h = Math.round(meta.height * scale);
    const raw = (file) => sharp(file).resize(w, h, { fit: "fill" }).removeAlpha().raw().toBuffer();
    const [night, day] = await Promise.all([raw(`${dir}/${id}-night.webp`), raw(`${dir}/${id}-day.webp`)]);
    const mask = lightMask(night, day, w, h, { channels: 3 });
    const out = `${dir}/masks/${id}-light.webp`;
    await sharp(Buffer.from(mask), { raw: { width: w, height: h, channels: 1 } }).blur(0.8).webp({ quality: 82, effort: 6 }).toFile(out);
    // (found on a small, softened copy, SKY_EDGE px wide, which SKY's steps
    // are tuned for: the paintings' brushwork isn't an edge; then sized up)
    const sw = SKY_EDGE, sh = Math.round((SKY_EDGE * h) / w);
    const soft = await sharp(`${dir}/${id}-day.webp`).resize(sw, sh, { fit: "fill" }).removeAlpha().blur(1).raw().toBuffer();
    const small = skyMask(soft, sw, sh, { channels: 3 });
    const sky = await sharp(Buffer.from(small), { raw: { width: sw, height: sh, channels: 1 } }).resize(w, h, { fit: "fill" }).blur(1.5).extractChannel(0).raw().toBuffer();
    await sharp(sky, { raw: { width: w, height: h, channels: 1 } }).webp({ quality: 82, effort: 6 }).toFile(`${dir}/masks/${id}-sky.webp`);
    let open = 0;
    for (const v of sky) open += v;
    let lit = 0;
    for (const v of mask) lit += v;
    console.log(`${id}: ${w}×${h} mask, ${((100 * lit) / 255 / mask.length).toFixed(1)}% lit, ${((100 * open) / 255 / sky.length).toFixed(1)}% sky`);
    entries.push({
      id,
      light: true,
      sky: true,
      depthDay: existsSync(`${dir}/depth/${id}-day.webp`),
    });
  }
  writeFileSync(`${root}app/components/city3d/kit/plateArt.ts`, plateArtSource(entries));
  console.log(`kit/plateArt.ts: ${entries.length} paintings`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main();
