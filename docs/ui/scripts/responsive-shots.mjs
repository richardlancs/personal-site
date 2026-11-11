// The main pages at every width the mobile brief names, for before/after.
//   PLAYWRIGHT=…/playwright/index.mjs node docs/ui/scripts/responsive-shots.mjs <base> <outDir> <prefix>
// Phones are emulated (isMobile, touch, DPR 2), not real devices.
import { mkdirSync } from "node:fs";
import { launch } from "../../audit/scripts/pw.mjs";

const [base = "http://localhost:3100", out = "docs/ui/screenshots", prefix = "shot"] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const routes = ["/", "/projects", "/experience", "/contact"];
const phone = { isMobile: true, hasTouch: true, deviceScaleFactor: 2 };
const views = {
  w320: { viewport: { width: 320, height: 640 }, ...phone },
  w390: { viewport: { width: 390, height: 844 }, ...phone },
  w430: { viewport: { width: 430, height: 932 }, ...phone },
  land: { viewport: { width: 844, height: 390 }, ...phone },
  w768: { viewport: { width: 768, height: 1024 }, hasTouch: true, deviceScaleFactor: 1 },
  w1024: { viewport: { width: 1024, height: 768 }, hasTouch: true, deviceScaleFactor: 1 },
  w1440: { viewport: { width: 1440, height: 900 } },
};
const browser = await launch();
const errors = [];
const overflow = [];
for (const [view, opts] of Object.entries(views)) {
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(`${view}: ${e}`));
  for (const route of routes) {
    await page.goto(base + route, { waitUntil: "load" });
    await page.waitForFunction(() => document.querySelector(".world3d")?.getAttribute("data-arrived") === "true", null, { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(2500);
    const sw = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (sw > 0) overflow.push(`${view} ${route} +${sw}px`);
    const tag = route === "/" ? "home" : route.slice(1);
    await page.screenshot({ path: `${out}/${prefix}-${view}-${tag}.jpg`, type: "jpeg", quality: 72 });
  }
  await ctx.close();
}
await browser.close();
console.log(`${routes.length * Object.keys(views).length} shots in ${out}; ${errors.length} page errors`, errors, "horizontal overflow:", overflow);
