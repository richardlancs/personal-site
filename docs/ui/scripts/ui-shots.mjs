// The interface on the main pages, desktop and phone, for before/after
// comparisons of the palette and the buttons.
//   PLAYWRIGHT=…/playwright/index.mjs node docs/ui/scripts/ui-shots.mjs <base> <outDir> <prefix> [query]
// e.g. a production build: … http://localhost:3100 docs/ui/screenshots after
// `query` (e.g. "?sky=clear-night") only works against `next dev`.
import { mkdirSync } from "node:fs";
import { launch } from "../../audit/scripts/pw.mjs";

const [base = "http://localhost:3100", out = "docs/ui/screenshots", prefix = "shot", query = ""] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const routes = ["/", "/projects", "/contact", "/about"];
const views = { desktop: { viewport: { width: 1440, height: 900 } }, phone: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } };
const browser = await launch();
const errors = [];
for (const [view, opts] of Object.entries(views)) {
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(`${view}: ${e}`));
  for (const route of routes) {
    await page.goto(base + route + query, { waitUntil: "load" });
    await page.waitForFunction(() => document.querySelector(".world3d")?.getAttribute("data-arrived") === "true", null, { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(2500);
    const tag = route === "/" ? "home" : route.slice(1);
    await page.screenshot({ path: `${out}/${prefix}-${view}-${tag}.jpg`, type: "jpeg", quality: 78 });
  }
  await ctx.close();
}
await browser.close();
console.log(`${routes.length * 2} shots in ${out}, ${errors.length} page errors`, errors);
