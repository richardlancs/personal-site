// Composited contrast of the home page's introduction (no card behind it)
// and of the time and weather display (clear glass), over every weather and
// daylight (the ?sky= preview: `next dev` only).
//   PLAYWRIGHT=…/playwright/index.mjs node docs/ui/scripts/intro-contrast.mjs http://localhost:3130 [desktop|phone] [outDir]
// For each run of text, two photographs over the live scene: its letters
// see-through (their halo kept), then its letters magenta. The pixels that
// differ are the letters; under them, the first photograph is what each
// letter stands on. Contrast is the text's own colour against those
// pixels: the 2nd percentile (worst, ignoring a stray anti-aliased edge)
// is reported, and fails under 4.5:1 (3:1 for the 2.5rem+ name). Measured
// in still view, so nothing in the scene moves between the two.
import { mkdirSync } from "node:fs";
import { launch } from "../../audit/scripts/pw.mjs";

const [base = "http://localhost:3130", view = "desktop", out = ""] = process.argv.slice(2);
const phone = view === "phone";
if (out) mkdirSync(out, { recursive: true });
const skies = ["clear", "cloudy", "rain", "snow"].flatMap((p) => ["dawn", "day", "dusk", "night"].map((d) => `${p}-${d}`));
const targets = [
  { name: "name", sel: ".park-name", large: true },
  { name: "subtitle", sel: ".park-headline" },
  { name: "github", sel: ".park-links li:nth-child(1) a" },
  { name: "linkedin", sel: ".park-links li:nth-child(2) a" },
  { name: "resume", sel: ".park-links li:nth-child(3) a" },
  { name: "primary", sel: ".park-actions .glass-primary" },
  { name: "secondary", sel: ".park-actions .glass:not(.glass-primary)" },
  { name: "place", sel: ".rh-place" },
  { name: "time", sel: ".rh-time" },
  { name: "temp", sel: ".rh-temp" },
  { name: "condition", sel: ".rh-condition" },
];
const lin = (c) => ((c /= 255) <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const lum = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

const browser = await launch();
const ctx = await browser.newContext({ viewport: phone ? { width: 390, height: 844 } : { width: 1440, height: 900 }, deviceScaleFactor: 1, isMobile: phone, hasTouch: phone });
// Still view (world3d/still.ts): rain, snow and leaves hold still, so the
// two photographs differ only in the letters
await ctx.addInitScript(() => localStorage.setItem("still-view", "on"));
const page = await ctx.newPage();
const decoder = await browser.newPage();
const pixels = (png) =>
  decoder.evaluate(async (b64) => {
    const img = new Image();
    img.src = `data:image/png;base64,${b64}`;
    await img.decode();
    const c = new OffscreenCanvas(img.width, img.height);
    const g = c.getContext("2d");
    g.drawImage(img, 0, 0);
    return Array.from(g.getImageData(0, 0, img.width, img.height).data);
  }, png.toString("base64"));

const worst = {};
let failed = 0;
for (const sky of skies) {
  await page.goto(`${base}/?sky=${sky}`, { waitUntil: "load" });
  await page.waitForFunction(() => document.querySelector(".world3d")?.getAttribute("data-arrived") === "true", null, { timeout: 30000 }).catch(() => {});
  await page.waitForFunction(() => document.querySelector(".rh")?.getAttribute("data-status") !== "loading", null, { timeout: 15000 }).catch(() => {});
  // No transitions mid-measure; the development-only overlays out of the pictures
  await page.addStyleTag({ content: "*, *::before, *::after { transition: none !important; animation: none !important; } nextjs-portal, [data-dev-sky-panel] { display: none !important; }" });
  await page.waitForTimeout(1500);
  if (out) await page.screenshot({ path: `${out}/intro-${view}-${sky}.jpg`, type: "jpeg", quality: 70 });
  const row = { sky };
  for (const t of targets) {
    const el = page.locator(t.sel).first();
    if (!(await el.count()) || !(await el.isVisible())) continue;
    const ink = await el.evaluate((e) => getComputedStyle(e).color);
    const [r, g, b] = ink.match(/[\d.]+/g).map(Number);
    const L = lum(r, g, b);
    const box = await el.boundingBox();
    const clip = { x: Math.max(0, box.x - 2), y: Math.max(0, box.y - 2), width: box.width + 4, height: box.height + 4 };
    const paint = (c) =>
      el.evaluate((e, c) => {
        e.setAttribute("data-measure", "");
        let s = document.getElementById("measure-style");
        if (!s) document.head.append((s = Object.assign(document.createElement("style"), { id: "measure-style" })));
        s.textContent = `[data-measure], [data-measure] * { color: ${c} !important; -webkit-text-fill-color: ${c} !important; text-decoration-color: transparent !important; }`;
      }, c);
    await paint("transparent");
    const under = await pixels(await page.screenshot({ clip }));
    await paint("rgb(255, 0, 255)");
    const lit = await pixels(await page.screenshot({ clip }));
    await el.evaluate((e) => {
      e.removeAttribute("data-measure");
      document.getElementById("measure-style")?.remove();
    });
    const ratios = [];
    for (let i = 0; i < under.length; i += 4) {
      const d = Math.abs(lit[i] - under[i]) + Math.abs(lit[i + 1] - under[i + 1]) + Math.abs(lit[i + 2] - under[i + 2]);
      if (d > 120) ratios.push(ratio(L, lum(under[i], under[i + 1], under[i + 2])));
    }
    if (!ratios.length) continue;
    ratios.sort((a, b) => a - b);
    const c = +ratios[Math.floor(ratios.length * 0.02)].toFixed(2);
    row[t.name] = c;
    if (!worst[t.name] || c < worst[t.name].c) worst[t.name] = { c, sky };
    if (c < (t.large ? 3 : 4.5)) failed++;
  }
  console.log(JSON.stringify(row));
}
console.log(`worst (${view}):`, JSON.stringify(worst));
console.log(failed ? `${failed} below the line` : "all at or above 4.5:1 (3:1 for the name)");
await browser.close();
process.exit(failed ? 1 : 0);
