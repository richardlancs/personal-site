// node docs/audit/scripts/shots.mjs <baseUrl> <outDir> [settleMs]: the seven
// routes at 1440x1000 and 390x844 (JPEG), and a JSON log of titles,
// horizontal overflow, WebGL and errors
import { mkdirSync, writeFileSync } from "node:fs";
import { listed } from "../../../app/sections/registry.ts";
import { launch } from "./pw.mjs";

const [base, out, settle = "5000"] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const browser = await launch();
// Every listed section, from the registry (never a second list)
const routes = listed.map((s) => s.href);
const views = [["desktop", 1440, 1000], ["mobile", 390, 844]];
const log = [];
for (const [name, width, height] of views) {
  const mobile = name === "mobile";
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  for (const route of routes) {
    await page.goto(base + route, { waitUntil: "load" });
    await page.waitForTimeout(Number(settle));
    const slug = route === "/" ? "home" : route.slice(1);
    await page.screenshot({ path: `${out}/${name}-${slug}.jpg`, type: "jpeg", quality: 70 });
    const info = await page.evaluate(() => ({
      title: document.title,
      hOverflow: document.documentElement.scrollWidth > innerWidth,
      canvas: !!document.querySelector("canvas"),
      webgl: !!document.createElement("canvas").getContext("webgl2"),
    }));
    log.push({ view: name, route, ...info });
  }
  log.push({ view: name, errors });
  await ctx.close();
}
await browser.close();
writeFileSync(`${out}/log.json`, JSON.stringify(log, null, 1));
console.log(JSON.stringify(log));
