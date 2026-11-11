// Day to night and back through the development sky panel, counting shader
// compiles and the longest frame during each 3 s blend: the lamps and signs
// must come on by changing numbers, never by building new shaders.
//   PLAYWRIGHT=…/playwright/index.mjs node docs/world/scripts/lighting-blend.mjs http://localhost:3301 [route=/] [phone]
import { launch } from "../../audit/scripts/pw.mjs";

const [base = "http://localhost:3301", route = "/", view = "desktop"] = process.argv.slice(2);
const phone = view === "phone";
const browser = await launch();
const ctx = await browser.newContext({ viewport: phone ? { width: 390, height: 844 } : { width: 1440, height: 900 }, isMobile: phone, hasTouch: phone });
await ctx.addInitScript(() => {
  const w = window;
  w.__compiles = 0;
  for (const C of [WebGL2RenderingContext, WebGLRenderingContext]) {
    const orig = C.prototype.compileShader;
    C.prototype.compileShader = function (...a) {
      w.__compiles++;
      return orig.apply(this, a);
    };
  }
  w.__frames = [];
  const tick = (now) => {
    w.__frames.push(now);
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => m.type() === "warning" && /GL_INVALID|WebGL/.test(m.text()) && errors.push(m.text()));
await page.goto(`${base}${route}?sky=clear-day`, { waitUntil: "load" });
await page.waitForFunction(() => document.querySelector(".world3d")?.getAttribute("data-arrived") === "true", null, { timeout: 40000 });
// Desktop builds the other places in idle time after arriving: let that finish
await page.waitForTimeout(phone ? 5000 : 32000);
await page.getByRole("button", { name: /^sky:/ }).dispatchEvent("click");
const steps = [
  ["clear", "dusk"],
  ["clear", "night"],
  ["rain", "night"],
  ["snow", "night"],
  ["clear", "day"],
];
for (const [preset, daylight] of steps) {
  const before = await page.evaluate(() => [window.__compiles, performance.now()]);
  const row = page.locator("tbody tr", { has: page.locator("th", { hasText: new RegExp(`^${preset}$`) }) });
  await row.getByRole("button", { name: daylight, exact: true }).dispatchEvent("click");
  await page.waitForTimeout(3600);
  const r = await page.evaluate(([c0, t0]) => {
    const f = window.__frames.filter((t) => t >= t0);
    const dts = f.slice(1).map((t, i) => t - f[i]);
    return { compiles: window.__compiles - c0, maxFrameMs: Math.round(Math.max(...dts)), frames: f.length };
  }, before);
  console.log(JSON.stringify({ to: `${preset}-${daylight}`, ...r }));
}
console.log("errors", errors.length, errors.slice(0, 3));
await browser.close();
