// Draws the site's icons and share image from code: the mark in mark.svg
// (in the default cream paper's colours: city.css, :root[data-paper="cream"]:
// the paper, the Prussian-blue accent, the ink and the teal accent-2), and
// the share card, a sheet of crumpled cream paper drawn here (an SVG
// turbulence lit from the upper left, a fixed seed) with the name set in
// the site's own fonts.
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

// The mark, at a size. `square`: no rounded corners, no edge and no
// transparency (iOS rounds a touch icon itself and fills transparency with black)
const icon = (size, square = false) =>
  png(`<div style="width:${size}px;height:${size}px">${square ? mark.replace(/x="0\.5" y="0\.5" width="31" height="31" rx="7"/, 'width="32" height="32" rx="0"').replace(/ stroke="#c9bca3"/, "") : mark}</div>`.replace("<svg ", `<svg width="${size}" height="${size}" `), size, size);

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

// The share card: a sheet of crumpled cream paper (large soft creases and
// a fine grain, lit from the upper left; fixed seeds, so the same card
// every run), and the name on a card of the same paper, a little lighter,
// with a soft shadow, as the site's panels are
const fonts = `
  @font-face { font-family: Rajdhani; font-weight: 700; src: url(${dataUrl(app("fonts/rajdhani-latin-700.woff2"), "font/woff2")}); }
  @font-face { font-family: Rajdhani; font-weight: 500; src: url(${dataUrl(app("fonts/rajdhani-latin-500.woff2"), "font/woff2")}); }
  @font-face { font-family: Nunito; font-weight: 600; src: url(${dataUrl(app("fonts/nunito-latin-400-700.woff2"), "font/woff2")}); }`;
const cream = { paper: "#efe7d6", panel: "#f7f1e5", line: "#c9bca3", text: "#1d2330", accent: "#1f4f8a", accent2: "#0a6168", shadow: "rgb(74 59 34 / 0.28)" };
const crumple = `
  <svg width="1200" height="630" style="position:absolute;inset:0">
    <filter id="crumple" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.006" numOctaves="5" seed="11" result="creases"/>
      <feDiffuseLighting in="creases" surfaceScale="16" lighting-color="#fff" result="lit"><feDistantLight azimuth="225" elevation="50"/></feDiffuseLighting>
      <feComponentTransfer in="lit" result="soft"><feFuncR type="linear" slope="0.55" intercept="0.52"/><feFuncG type="linear" slope="0.55" intercept="0.52"/><feFuncB type="linear" slope="0.55" intercept="0.52"/></feComponentTransfer>
      <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="3" result="grain"/>
      <feColorMatrix in="grain" type="luminanceToAlpha" result="grainA"/>
      <feComponentTransfer in="grainA" result="fine"><feFuncA type="linear" slope="0.12" intercept="0"/></feComponentTransfer>
      <feFlood flood-color="#000" result="black"/>
      <feComposite in="black" in2="fine" operator="in" result="specks"/>
      <feComposite in="specks" in2="soft" operator="over"/>
    </filter>
    <rect width="1200" height="630" fill="${cream.paper}"/>
    <rect width="1200" height="630" filter="url(#crumple)" style="mix-blend-mode:multiply"/>
  </svg>`;
const card = `
  <style>${fonts}</style>
  <div style="position:relative;width:1200px;height:630px;overflow:hidden;background:${cream.paper}">
    ${crumple}
    <div style="position:absolute;left:72px;top:72px;padding:38px 48px;border-radius:16px;background:${cream.panel};border:1px solid ${cream.line};box-shadow:0 2px 3px ${cream.shadow},0 22px 44px -18px ${cream.shadow}">
      <div style="font-family:Rajdhani;font-weight:700;font-size:88px;line-height:1;color:${cream.text};letter-spacing:0.01em">Richard Lan</div>
      <div style="margin-top:12px;font-family:Rajdhani;font-weight:500;font-size:36px;color:${cream.accent};letter-spacing:0.04em">cs@uwaterloo</div>
      <div style="margin-top:20px;width:56px;height:3px;border-radius:2px;background:${cream.accent2}"></div>
      <div style="margin-top:18px;font-family:Nunito;font-weight:600;font-size:26px;color:${cream.text}">Software engineering portfolio</div>
    </div>
    <div style="position:absolute;right:72px;bottom:64px;width:120px;height:120px">${mark.replace("<svg ", '<svg width="120" height="120" ')}</div>
  </div>`;
writeFileSync(`${root}public/share-card.jpg`, await png(card, 1200, 630, "jpeg"));

await browser.close();
console.log("wrote app/icon.svg, app/favicon.ico, app/apple-icon.png, public/share-card.jpg");
