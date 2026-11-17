// Composited contrast of the text in every glass panel over the world, on
// every page, over every weather and daylight (the ?sky= preview: `next
// dev` only).
//   PLAYWRIGHT=…/playwright/index.mjs node docs/ui/scripts/panel-contrast.mjs http://localhost:3130 [routes=/,/projects,…] [skies=clear-day,…]
// The method is intro-contrast.mjs's: two photographs, the panels' letters
// see-through, then magenta; the pixels that differ are the letters, and
// under them, the first photograph is what each letter stands on (the
// glass, and the world through it). Contrast is each run of text's own
// colour against those pixels, 2nd percentile; it fails under 4.5:1.
// Whole screens are photographed at once, a screen's height at a time
// down the page, in still view so nothing in the scene moves.
import { launch } from "../../audit/scripts/pw.mjs";

const [base = "http://localhost:3130", routeArg, skyArg] = process.argv.slice(2);
const routes = routeArg ? routeArg.split(",") : ["/projects", "/experience", "/interests", "/about", "/contact", "/map"];
const skies = skyArg ? skyArg.split(",") : ["clear", "cloudy", "rain", "snow"].flatMap((p) => ["dawn", "day", "dusk", "night"].map((d) => `${p}-${d}`));
// The panels (globals.css: the glass in the world) and the stained glass
const panels = [".location-header", ".location-footer", ".project-notes", ".tool-board", ".directory", ".phone-line", ".cabinet-card", ".timetable", ".timetable-notice", ".notebook-page", ".notebook-sheet", ".notebook-controls", ".map-sheet", ".lost-notice"];

const browser = await launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
await ctx.addInitScript(() => localStorage.setItem("still-view", "on"));
const page = await ctx.newPage();
const decoder = await browser.newPage();
// The two photographs and the runs of text go to a page of their own,
// which works out each run's contrast there (sending whole screens of
// pixels back out is what's slow)
const measure = (under, lit, runs) =>
  decoder.evaluate(
    async ({ a, b, runs }) => {
      const load = async (b64) => {
        const img = new Image();
        img.src = `data:image/png;base64,${b64}`;
        await img.decode();
        const c = new OffscreenCanvas(img.width, img.height);
        const g = c.getContext("2d");
        g.drawImage(img, 0, 0);
        return { w: img.width, d: g.getImageData(0, 0, img.width, img.height).data };
      };
      const [u, l] = [await load(a), await load(b)];
      const lin = (c) => ((c /= 255) <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
      const lum = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
      return runs.map((run) => {
        const [r, g, bl] = run.color.match(/[\d.]+/g).map(Number);
        const L = lum(r, g, bl);
        const ratios = [];
        for (let py = Math.floor(run.box.y); py < run.box.y + run.box.h; py++)
          for (let px = Math.floor(run.box.x); px < run.box.x + run.box.w; px++) {
            const i = (py * u.w + px) * 4;
            if (Math.abs(l.d[i] - u.d[i]) + Math.abs(l.d[i + 1] - u.d[i + 1]) + Math.abs(l.d[i + 2] - u.d[i + 2]) > 120) {
              const B = lum(u.d[i], u.d[i + 1], u.d[i + 2]);
              ratios.push((Math.max(L, B) + 0.05) / (Math.min(L, B) + 0.05));
            }
          }
        if (ratios.length < 8) return null;
        ratios.sort((x, y) => x - y);
        return +ratios[Math.floor(ratios.length * 0.02)].toFixed(2);
      });
    },
    { a: under.toString("base64"), b: lit.toString("base64"), runs },
  );

const worst = {};
let failed = 0;
for (const route of routes) {
  for (const sky of skies) {
    await page.goto(`${base}${route}?sky=${sky}`, { waitUntil: "load" });
    await page.waitForFunction(() => document.querySelector(".world3d")?.getAttribute("data-arrived") === "true", null, { timeout: 30000 }).catch(() => {});
    await page.addStyleTag({ content: "*, *::before, *::after { transition: none !important; animation: none !important; } nextjs-portal, [data-dev-sky-panel] { display: none !important; }" });
    await page.waitForTimeout(1500);
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    const row = { route, sky };
    for (let y = 0; y < height; y += 800) {
      await page.evaluate((y) => scrollTo(0, y), y);
      await page.waitForTimeout(300);
      // Every run of text in a panel that's on screen: its box, its colour,
      // and which panel it's in
      const runs = await page.evaluate((panels) => {
        const out = [];
        for (const sel of panels)
          for (const panel of document.querySelectorAll(sel)) {
            const walker = document.createTreeWalker(panel, NodeFilter.SHOW_TEXT);
            for (let n = walker.nextNode(); n; n = walker.nextNode()) {
              const el = n.parentElement;
              if (!n.textContent.trim() || !el || el.closest("svg")) continue;
              const cs = getComputedStyle(el);
              if (cs.visibility === "hidden" || Number(cs.opacity) < 0.5) continue;
              const range = document.createRange();
              range.selectNodeContents(n);
              const r = range.getBoundingClientRect();
              if (r.width < 4 || r.height < 4 || r.bottom < 70 || r.top > innerHeight - 4) continue;
              out.push({ sel, color: cs.color, box: { x: r.x, y: Math.max(r.y, 70), w: r.width, h: Math.min(r.bottom, innerHeight) - Math.max(r.y, 70) } });
            }
          }
        return out;
      }, panels);
      if (!runs.length) continue;
      const paint = (c) =>
        page.evaluate(
          ({ panels, c }) => {
            let s = document.getElementById("measure-style");
            if (!s) document.head.append((s = Object.assign(document.createElement("style"), { id: "measure-style" })));
            s.textContent = panels.map((p) => `${p}, ${p} *`).join(",") + `{ color: ${c} !important; -webkit-text-fill-color: ${c} !important; text-decoration-color: transparent !important; text-shadow: none !important; }`;
          },
          { panels, c },
        );
      await paint("transparent");
      const under = await page.screenshot();
      await paint("rgb(255, 0, 255)");
      const lit = await page.screenshot();
      await page.evaluate(() => document.getElementById("measure-style")?.remove());
      const results = await measure(under, lit, runs);
      runs.forEach((run, k) => {
        const c = results[k];
        if (c == null) return;
        const key = `${route} ${run.sel}`;
        if (!row[run.sel] || c < row[run.sel]) row[run.sel] = c;
        if (!worst[key] || c < worst[key].c) worst[key] = { c, sky };
      });
    }
    for (const c of Object.values(row)) if (typeof c === "number" && c < 4.5) failed++;
    console.log(JSON.stringify(row));
  }
}
console.log("worst:");
for (const [k, v] of Object.entries(worst).sort((a, b) => a[1].c - b[1].c)) console.log(`  ${v.c < 4.5 ? "✗" : " "} ${k.padEnd(36)} ${v.c} (${v.sky})`);
console.log(failed ? `${failed} panel readings below 4.5:1` : "every panel's text at or above 4.5:1");
await browser.close();
process.exit(failed ? 1 : 0);
