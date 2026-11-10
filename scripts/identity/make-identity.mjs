// Draws the site's icons and share image from code, like the rest of the
// art: the mark in mark.svg, the share card from the painting
// (app/assets/park/park-v04.png) with the name set in the site's own fonts.
//
//   PLAYWRIGHT=/path/to/node_modules/playwright/index.mjs node scripts/identity/make-identity.mjs
//
// Writes app/icon.svg, app/favicon.ico (16, 32, 48), app/apple-icon.png
// (180) and public/share-card.jpg (1200x630, the share card every page
// names in its metadata: sections/registry.ts).
// Playwright isn't a dependency of the site (see docs/audit/scripts/pw.mjs).
import { readFileSync, writeFileSync } from "node:fs";
import { launch } from "../../docs/audit/scripts/pw.mjs";

const root = new URL("../../", import.meta.url).pathname;
const app = (name) => `${root}app/${name}`;
const mark = readFileSync(new URL("./mark.svg", import.meta.url), "utf8");
const dataUrl = (path, type) => `data:${type};base64,${readFileSync(path).toString("base64")}`;

const browser = await launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });

async function png(html, width, height, type = "png") {
  await page.setViewportSize({ width, height });
  await page.setContent(`<!doctype html><html><body style="margin:0">${html}</body></html>`);
  await page.evaluate(() => document.fonts.ready);
  const clip = { x: 0, y: 0, width, height };
  return type === "png" ? page.screenshot({ type, omitBackground: true, clip }) : page.screenshot({ type, quality: 84, clip });
}

// The mark, at a size. `square`: no rounded corners and no transparency
// (iOS rounds a touch icon itself and fills transparency with black)
const icon = (size, square = false) =>
  png(`<div style="width:${size}px;height:${size}px">${square ? mark.replace(/rx="7"/, 'rx="0"') : mark}</div>`.replace("<svg ", `<svg width="${size}" height="${size}" `), size, size);

// An .ico of PNGs (every browser since IE11 reads PNG entries)
function ico(images) {
  const header = Buffer.alloc(6 + images.length * 16);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach(({ size, data }, i) => {
    const at = 6 + i * 16;
    header.writeUInt8(size >= 256 ? 0 : size, at);
    header.writeUInt8(size >= 256 ? 0 : size, at + 1);
    header.writeUInt16LE(1, at + 4); // colour planes
    header.writeUInt16LE(32, at + 6); // bits per pixel
    header.writeUInt32LE(data.length, at + 8);
    header.writeUInt32LE(offset, at + 12);
    offset += data.length;
  });
  return Buffer.concat([header, ...images.map((image) => image.data)]);
}

writeFileSync(app("icon.svg"), mark);
const sizes = [16, 32, 48];
writeFileSync(app("favicon.ico"), ico(await Promise.all(sizes.map(async (size) => ({ size, data: await icon(size) })))));
writeFileSync(app("apple-icon.png"), await icon(180, true));

// The share card: the painting, and the name on a sheet of the site's
// cream paper in the open sky at the upper left, as on the home page
const fonts = `
  @font-face { font-family: Shippori; font-weight: 600; src: url(${dataUrl(app("fonts/shippori-mincho-b1-latin-600.woff2"), "font/woff2")}); }
  @font-face { font-family: Zen; font-weight: 500; src: url(${dataUrl(app("fonts/zen-kaku-gothic-new-latin-500.woff2"), "font/woff2")}); }`;
const card = `
  <style>${fonts}</style>
  <div style="position:relative;width:1200px;height:630px;overflow:hidden;background:#e9e2d8">
    <img src="${dataUrl(app("assets/park/park-v04.png"), "image/png")}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:50% 60%">
    <div style="position:absolute;left:64px;top:64px;padding:36px 44px 34px;border-radius:18px;background:rgb(255 253 248 / 0.94);box-shadow:0 18px 44px -20px rgb(30 16 122 / 0.35)">
      <div style="font-family:Shippori;font-weight:600;font-size:76px;line-height:1.05;color:#1d1e1e;letter-spacing:-0.01em">Richard Lan</div>
      <div style="margin-top:14px;font-family:Zen;font-weight:500;font-size:30px;color:#45474a">CS student @uwaterloo</div>
      <div style="margin-top:22px;width:56px;height:3px;border-radius:2px;background:#55c6f0"></div>
      <div style="margin-top:20px;font-family:Zen;font-weight:500;font-size:26px;color:#1e107a">Software engineering portfolio</div>
    </div>
  </div>`;
writeFileSync(`${root}public/share-card.jpg`, await png(card, 1200, 630, "jpeg"));

await browser.close();
console.log("wrote app/icon.svg, app/favicon.ico, app/apple-icon.png, public/share-card.jpg");
