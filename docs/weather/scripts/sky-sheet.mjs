// Every weather and daylight combination, on one sheet. Against `next dev`
// (the ?sky= preview is development-only):
//   npx next dev -p 3120
//   PLAYWRIGHT=…/playwright/index.mjs node docs/weather/scripts/sky-sheet.mjs http://localhost:3120 <outDir> [route=/] [desktop|phone]
// Writes one screenshot per combination and sheet-<view>.png, a 4x4 grid
// (weather down, time of day across).
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { launch } from "../../audit/scripts/pw.mjs";

const [base = "http://localhost:3120", out = "sky-sheet", route = "/", view = "desktop"] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const presets = ["clear", "cloudy", "rain", "snow"];
const phases = ["dawn", "day", "dusk", "night"];
const phone = view === "phone";
const size = phone ? { width: 390, height: 844 } : { width: 1440, height: 1000 };

const browser = await launch();
const ctx = await browser.newContext({ viewport: size, deviceScaleFactor: 1, isMobile: phone, hasTouch: phone });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
const tag = route === "/" ? "home" : route.slice(1);
const shots = [];
for (const preset of presets) {
  for (const phase of phases) {
    await page.goto(`${base}${route}?sky=${preset}-${phase}`, { waitUntil: "load" });
    await page.waitForFunction(() => document.querySelector(".world3d")?.getAttribute("data-arrived") === "true", null, { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(2500);
    const file = `${out}/${view}-${tag}-${preset}-${phase}.jpg`;
    await page.screenshot({ path: file, type: "jpeg", quality: 72 });
    shots.push({ preset, phase, file });
  }
}
await ctx.close();

// The sheet: the 16 shots in a grid, labelled
const cell = phone ? 260 : 480;
const img = (f) => `data:image/jpeg;base64,${readFileSync(f).toString("base64")}`;
const html = `<!doctype html><body style="margin:0;background:#1d1e1e;font:600 15px system-ui;color:#fff9f2">
<div style="display:grid;grid-template-columns:90px repeat(4,${cell}px);gap:6px;padding:10px">
<div></div>${phases.map((p) => `<div style="text-align:center">${p}</div>`).join("")}
${presets.map((preset) => `<div style="align-self:center">${preset}</div>${phases.map((phase) => `<img style="width:${cell}px" src="${img(shots.find((s) => s.preset === preset && s.phase === phase).file)}">`).join("")}`).join("")}
</div></body>`;
const sheet = await browser.newPage({ viewport: { width: 90 + 4 * (cell + 6) + 20, height: 400 } });
await sheet.setContent(html);
await sheet.waitForTimeout(500);
await sheet.screenshot({ path: `${out}/sheet-${view}-${tag}.png`, fullPage: true });
await browser.close();
writeFileSync(`${out}/errors-${view}-${tag}.json`, JSON.stringify(errors, null, 1));
console.log(`${shots.length} shots, ${errors.length} page errors, sheet ${out}/sheet-${view}-${tag}.png`);
