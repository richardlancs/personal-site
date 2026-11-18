// The intro's painted layers (app/components/intro): the PNGs made in
// ChatGPT (prompts: docs/world/intro-prompts.md), compressed to WebP in
// app/assets/intro/. Run after replacing a layer:
//   node scripts/intro-assets.mjs ~/Downloads   (reads intro-<layer>.png)
// sharp comes with Next.js (its image optimiser), so there's nothing to install.
import { statSync } from "node:fs";
import sharp from "sharp";

const from = process.argv[2] ?? `${process.env.HOME}/Downloads`;
const layers = { sky: 74, far: 80, mid: 76, near: 78, front: 66, wipe: 64 };
let total = 0;
for (const [name, quality] of Object.entries(layers)) {
  const out = `app/assets/intro/${name}.webp`;
  await sharp(`${from}/intro-${name}.png`).webp({ quality, alphaQuality: 80, effort: 6, smartSubsample: true }).toFile(out);
  const size = statSync(out).size;
  total += size;
  console.log(`${name.padEnd(6)} ${(size / 1024).toFixed(0)} KB`);
}
console.log(`total  ${(total / 1024).toFixed(0)} KB`);
