// Motion checks on a running build: still view (system setting, the
// toggle, persistence, keyboard), interrupted journeys (rapid clicks,
// back/forward spam), and the arcade's looping screens. Prints one line
// per check and exits non-zero if any fails.
//
//   PLAYWRIGHT=/path/to/playwright/index.mjs node docs/audit/scripts/motion.mjs <baseUrl> [outDir]
import { mkdirSync, writeFileSync } from "node:fs";
import { launch } from "./pw.mjs";

const [base, out] = process.argv.slice(2);
if (!base) {
  console.error("usage: node motion.mjs <baseUrl> [outDir]");
  process.exit(2);
}
if (out) mkdirSync(out, { recursive: true });
const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok: !!ok, detail });
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${detail ? ` (${detail})` : ""}`);
};

const sceneFor = { "/": "park", "/projects": "workshop", "/experience": "station", "/interests": "arcade", "/about": "library", "/contact": "booth", "/map": "park" };

async function newPage(browser, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, ...opts });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  return { ctx, page, errors };
}

// The world has arrived at the place for this address: the right scene,
// the camera settled, the threshold open
const settledAt = (page, path, timeout = 8000) =>
  page
    .waitForFunction(
      (scene) => {
        const w = document.querySelector(".world3d");
        const iris = document.querySelector(".world-iris");
        return w?.getAttribute("data-scene") === scene && w.hasAttribute("data-arrived") && (!iris || getComputedStyle(iris).visibility === "hidden");
      },
      sceneFor[path],
      { timeout },
    )
    .then(() => true)
    .catch(() => false);

const go = (page, href) => page.evaluate((href) => document.querySelector(`#places-menu a[href="${href}"]`)?.click(), href);

// Two pictures of the world a moment apart: the same if it holds still
async function moving(page, ms = 1200) {
  const clip = { x: 0, y: 0, width: 1440, height: 1000 };
  const a = await page.screenshot({ clip });
  await page.waitForTimeout(ms);
  const b = await page.screenshot({ clip });
  return !a.equals(b);
}

const browser = await launch();

// 1. Rapid route changes: five places in a second
{
  const { ctx, page, errors } = await newPage(browser);
  await page.goto(base + "/", { waitUntil: "load" });
  await settledAt(page, "/");
  const route = ["/projects", "/experience", "/interests", "/about", "/contact"];
  const t0 = Date.now();
  for (const href of route) {
    await go(page, href);
    await page.waitForTimeout(200);
  }
  const ok = await settledAt(page, "/contact");
  check("five places in a second land at the last one", ok && page.url().endsWith("/contact"), `${Date.now() - t0} ms, ${page.url()}`);
  const h1 = await page.locator("h1").first().textContent();
  check("the last page's content is showing", /contact/i.test(h1 || ""), h1);
  // Back and forward, as fast as they come
  for (let i = 0; i < 4; i++) await page.goBack({ waitUntil: "commit" });
  for (let i = 0; i < 2; i++) await page.goForward({ waitUntil: "commit" });
  // (traversals this quick can coalesce; what matters is that the world
  // and the page end up at whatever address the browser settles on)
  await page.waitForTimeout(500);
  const path = new URL(page.url()).pathname;
  const settled = await settledAt(page, path);
  const heading = await page.locator("h1").first().textContent();
  check("back x4, forward x2: world and page match the address", settled, `${path}, h1 ${heading}`);
  // Park and back again before the camera gets anywhere
  await go(page, "/");
  await page.waitForTimeout(150);
  await go(page, "/about");
  await page.waitForTimeout(150);
  await go(page, "/");
  check("park, a place, the park again in 0.3 s", await settledAt(page, "/"));
  check("no console errors while interrupting journeys", errors.length === 0, errors.join(" | "));
  if (out) await page.screenshot({ path: `${out}/rapid-final.jpg`, type: "jpeg", quality: 70 });
  await ctx.close();
}

// 2. Still view follows the system setting, live, until the visitor chooses
{
  const { ctx, page, errors } = await newPage(browser);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto(base + "/", { waitUntil: "load" });
  await settledAt(page, "/");
  // The park's far scenery and the other places are built in idle time
  // after arrival; a frame that shows new scenery isn't motion, so wait
  await page.waitForTimeout(8000);
  const state = () => page.evaluate(() => ({ attr: document.documentElement.getAttribute("data-still"), pressed: document.querySelector('button[aria-label="Still view"]')?.getAttribute("aria-pressed") }));
  let s = await state();
  check("no preference: still view off", s.attr === "off" && s.pressed === "false", JSON.stringify(s));
  check("no preference: the world moves", await moving(page));
  await page.emulateMedia({ reducedMotion: "reduce" });
  // (the few frames it takes to come to rest: the camera's breathing and
  // the wind's lean let go)
  await page.waitForTimeout(1000);
  s = await state();
  check("system switches to reduce: still view on, at once", s.attr === "on" && s.pressed === "true", JSON.stringify(s));
  check("reduce: the world holds still", !(await moving(page)));
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.waitForTimeout(400);
  s = await state();
  check("system back to no preference: still view off", s.attr === "off" && s.pressed === "false", JSON.stringify(s));
  check("and the world moves again", await moving(page));
  // The visitor chooses (by keyboard): their choice wins over the system's
  const button = page.locator('button[aria-label="Still view"]');
  await button.focus();
  const ring = await button.evaluate((el) => getComputedStyle(el).outlineStyle + " " + getComputedStyle(el).outlineWidth);
  await page.keyboard.press("Enter");
  s = await state();
  check("Enter on the toggle turns still view on", s.attr === "on" && s.pressed === "true", `${JSON.stringify(s)}, focus ${ring}`);
  await page.keyboard.press("Space");
  s = await state();
  check("Space turns it off again", s.attr === "off" && s.pressed === "false", JSON.stringify(s));
  await page.keyboard.press("Space");
  const box = await button.boundingBox();
  check("the toggle is at least 24px", box && box.width >= 24 && box.height >= 24, box && `${box.width}x${box.height}`);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.reload({ waitUntil: "load" });
  s = await state();
  check("chosen on, reloaded with no system preference: still on", s.attr === "on" && s.pressed === "true", JSON.stringify(s));
  await page.locator('button[aria-label="Still view"]').click();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload({ waitUntil: "load" });
  s = await state();
  check("chosen off, reloaded with the system asking for reduce: still off", s.attr === "off" && s.pressed === "false", JSON.stringify(s));
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.waitForTimeout(300);
  s = await state();
  check("a choice isn't overridden by later system changes", s.attr === "off", JSON.stringify(s));
  check("no console errors (still view)", errors.length === 0, errors.join(" | "));
  await ctx.close();
}

// 3. Still view: journeys cut, the arcade's screens hold one frame, and
// turning it on mid-journey cuts to the destination
{
  const { ctx, page, errors } = await newPage(browser, { reducedMotion: "reduce" });
  await page.goto(base + "/", { waitUntil: "load" });
  await settledAt(page, "/");
  const t0 = Date.now();
  await go(page, "/interests");
  const cut = await settledAt(page, "/interests", 3000);
  check("still view: the park to the arcade is a cut", cut, `${Date.now() - t0} ms`);
  await page.waitForTimeout(600);
  check("still view: the arcade's screens hold still", !(await moving(page, 2000)));
  if (out) await page.screenshot({ path: `${out}/still-arcade.jpg`, type: "jpeg", quality: 70 });
  await page.locator('button[aria-label="Still view"]').click(); // motion on
  await page.waitForTimeout(800);
  check("motion on: the arcade's screens play", await moving(page, 1500));
  await go(page, "/");
  await page.waitForTimeout(250);
  const t1 = Date.now();
  await page.locator('button[aria-label="Still view"]').click(); // still, mid-journey
  check("still view turned on mid-journey: cut to the destination", await settledAt(page, "/", 2500), `${Date.now() - t1} ms`);
  check("no console errors (still journeys)", errors.length === 0, errors.join(" | "));
  await ctx.close();
}

// 4. Storage that throws (some private windows): the system setting rules,
// the toggle still works for the visit
{
  const { ctx, page, errors } = await newPage(browser, { reducedMotion: "reduce" });
  await ctx.addInitScript(() => {
    const deny = () => {
      throw new DOMException("denied", "SecurityError");
    };
    Storage.prototype.getItem = deny;
    Storage.prototype.setItem = deny;
    Storage.prototype.removeItem = deny;
  });
  await page.goto(base + "/", { waitUntil: "load" });
  const attr = await page.evaluate(() => document.documentElement.getAttribute("data-still"));
  check("storage blocked: falls back to the system setting", attr === "on", attr);
  await page.locator('button[aria-label="Still view"]').click();
  const after = await page.evaluate(() => document.documentElement.getAttribute("data-still"));
  check("storage blocked: the toggle still works for the visit", after === "off", after);
  check("storage blocked: no uncaught errors", errors.length === 0, errors.join(" | "));
  await ctx.close();
}
await browser.close();

// 5. No WebGL: the painting stands in, still view still works
{
  const noGl = await launch({ args: ["--disable-webgl", "--disable-3d-apis"] });
  const ctx = await noGl.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(base + "/about", { waitUntil: "load" });
  await page.waitForTimeout(1500);
  const info = await page.evaluate(() => ({ fallback: !!document.querySelector(".world3d-fallback img"), canvas: !!document.querySelector("canvas"), h1: document.querySelector("h1")?.textContent }));
  check("no WebGL: the painting, no canvas, the page's words", info.fallback && !info.canvas && info.h1, JSON.stringify(info));
  await page.locator('button[aria-label="Still view"]').click();
  const attr = await page.evaluate(() => document.documentElement.getAttribute("data-still"));
  check("no WebGL: the toggle works", attr === "on", attr);
  check("no WebGL: no uncaught errors", errors.length === 0, errors.join(" | "));
  if (out) await page.screenshot({ path: `${out}/no-webgl-about.jpg`, type: "jpeg", quality: 70 });
  await noGl.close();
}

if (out) writeFileSync(`${out}/motion.json`, JSON.stringify(results, null, 1));
const failed = results.filter((r) => !r.ok);
console.log(`${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
