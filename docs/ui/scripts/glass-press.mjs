// The glass press (components/ui/GlassPress.tsx, .glass in app/city.css),
// checked in a real browser on the one page: frames of the press (pointer,
// off-centre; keyboard, from the middle), that it settles within --t-slow
// (280 ms), that the action isn't delayed, that rapid presses never stack,
// that the keys used most (the top bar's, the Sections menu's rows) get a
// tint with no give or light, the still/reduced-motion tint, and the
// no-blur fallback rule.
//   PLAYWRIGHT=…/playwright/index.mjs node docs/ui/scripts/glass-press.mjs <base> [outDir=docs/ui/screenshots]
// Frames are taken by pausing the press's animations at fixed times (Web
// Animations API), so they're exact, not whatever a screenshot's timing
// happens to catch. Exits 1 if a check fails.
import { mkdirSync } from "node:fs";
import { launch } from "../../audit/scripts/pw.mjs";

const [base = "http://localhost:3101", out = "docs/ui/screenshots"] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const SLOW = 280;
const times = [0, 40, 80, 120, 160, 200, 240, 280];
const browser = await launch();
const report = {};
const fail = [];
const check = (ok, what) => ok || fail.push(what);

const open = async (page, path = "/") => {
  await page.goto(base + path, { waitUntil: "load" });
  await page.waitForTimeout(800);
};

// The press's animations and transitions on an element and its layers
const running = (locator) =>
  locator.evaluate((el) => el.getAnimations({ subtree: true }).map((a) => ({ name: a.animationName ?? `transition:${a.transitionProperty}`, end: a.effect.getComputedTiming().endTime })));

async function sheet(shots, file, captions = times.map((t) => `${t} ms`), columns = 4) {
  const sheetPage = await browser.newPage({ viewport: { width: 1200, height: 300 }, deviceScaleFactor: 1 });
  const imgs = shots.map((b, i) => `<figure style="margin:0"><img style="display:block;width:100%" src="data:image/png;base64,${b.toString("base64")}"><figcaption>${captions[i]}</figcaption></figure>`).join("");
  await sheetPage.setContent(`<body style="margin:0;background:#101217;font:600 13px system-ui;color:#e6e9ee"><div style="display:grid;grid-template-columns:repeat(${columns},1fr);gap:8px;padding:8px">${imgs}</div></body>`);
  await sheetPage.waitForTimeout(200);
  await sheetPage.screenshot({ path: file, type: "jpeg", quality: 85, fullPage: true });
  await sheetPage.close();
}

async function frames(page, locator, name) {
  const box = await locator.boundingBox();
  const pad = 14;
  const clip = { x: box.x - pad, y: box.y - pad, width: box.width + 2 * pad, height: box.height + 2 * pad };
  const shots = [];
  for (const t of times) {
    await locator.evaluate((el, t) => {
      for (const a of el.getAnimations({ subtree: true })) {
        a.pause();
        a.currentTime = t;
      }
    }, t);
    shots.push(await page.screenshot({ clip, type: "png" }));
  }
  await locator.evaluate((el) => el.getAnimations({ subtree: true }).forEach((a) => a.finish()));
  await sheet(shots, `${out}/press-${name}.jpg`);
}

// 1. Pointer, off-centre, on "View projects"; keyboard on "Contact"
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await open(page);
  const primary = page.locator(".hero .glass-primary");
  const box = await primary.boundingBox();
  await page.mouse.move(box.x + box.width * 0.22, box.y + box.height * 0.7);
  await page.mouse.down(); // held: the press, without the action
  const held = await primary.evaluate((el) => ({ pressed: el.hasAttribute("data-pressed"), held: el.hasAttribute("data-held"), x: el.style.getPropertyValue("--press-x") }));
  const anims = await running(primary);
  report.pointer = { ...held, anims };
  check(held.pressed && held.held, "pointerdown sets data-pressed and data-held");
  check(anims.some((a) => a.name === "glass-ripple") && anims.every((a) => a.end <= SLOW + 1), `the press settles within ${SLOW} ms`);
  await frames(page, primary, "pointer");
  await page.mouse.move(5, 890);
  await page.mouse.up();
  check(!(await primary.evaluate((el) => el.hasAttribute("data-held"))), "pointerup lets the key go");

  const contact = page.locator(".hero .glass:not(.glass-primary)").first();
  await contact.focus();
  await page.evaluate(() => document.querySelector(".hero .glass:not(.glass-primary)").addEventListener("click", (e) => e.preventDefault(), { once: true }));
  await page.keyboard.press("Enter");
  report.keyboard = await contact.evaluate((el) => ({ x: el.style.getPropertyValue("--press-x"), w: el.getBoundingClientRect().width }));
  check(Math.abs(parseFloat(report.keyboard.x) - report.keyboard.w / 2) < 1, "a keyboard press starts from the middle");
  await frames(page, contact, "keyboard");
  await ctx.close();
}

// 2. The keys used most: a tint at once, no give, no ripple or sheen
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await open(page);
  for (const [name, sel, prep] of [
    ["sections", ".top-bar-sections"],
    ["menu row", "#places-menu a.glass", () => page.locator(".top-bar-sections").click()],
  ]) {
    if (prep) {
      await prep();
      await page.waitForTimeout(400);
    }
    const el = page.locator(sel).first();
    const box = await el.boundingBox();
    await page.mouse.move(box.x + 10, box.y + box.height / 2);
    await page.mouse.down();
    const r = await el.evaluate((n) => ({ scale: getComputedStyle(n).scale, ripple: getComputedStyle(n, "::before").display, anims: n.getAnimations({ subtree: true }).map((a) => a.animationName).filter(Boolean) }));
    await page.mouse.move(5, 890);
    await page.mouse.up();
    report[name] = r;
    check(r.ripple === "none" && r.anims.includes("glass-tint") && !r.anims.includes("glass-ripple"), `${name}: a tint, no light`);
    await page.waitForTimeout(150);
    check((await el.evaluate((n) => getComputedStyle(n).scale)) === "none", `${name}: no give`);
  }
  await ctx.close();
}

// 3. The action isn't delayed: pointer down on "View projects" to the hash
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await open(page);
  await page.evaluate(() => {
    document.addEventListener("pointerdown", () => (window.__down = performance.now()), { capture: true, once: true });
    window.__changed = new Promise((resolve) => addEventListener("hashchange", () => resolve(performance.now()), { once: true }));
  });
  await page.locator(".hero .glass-primary").click();
  report.navigationMs = await page.evaluate(async () => Math.round((await window.__changed) - window.__down));
  check(report.navigationMs < 150, "the jump isn't held back by the press");
  await ctx.close();
}

// 4. Rapid presses don't stack: ten clicks 25 ms apart on a Copy key
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, permissions: ["clipboard-read", "clipboard-write"] });
  const page = await ctx.newPage();
  await open(page, "/#contact");
  const copy = page.locator(".contact-copy .glass").first();
  const box = await copy.boundingBox();
  for (let i = 0; i < 10; i++) {
    await page.mouse.click(box.x + 6 + i * 3, box.y + box.height / 2);
    await page.waitForTimeout(25);
  }
  report.rapid = { during: (await running(copy)).filter((a) => a.name === "glass-ripple").length };
  await page.waitForTimeout(SLOW + 300);
  report.rapid.afterPressed = await page.evaluate(() => document.querySelectorAll("[data-pressed]").length);
  check(report.rapid.during <= 1 && report.rapid.afterPressed === 0, "rapid presses don't stack and all end");
  await ctx.close();
}

// 5. Reduced motion and still view: a still tint, no ripple or give
for (const [name, opts, init] of [
  ["reduced", { reducedMotion: "reduce" }],
  ["still", {}, () => localStorage.setItem("still-view", "on")],
]) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, ...opts });
  if (init) await ctx.addInitScript(init);
  const page = await ctx.newPage();
  await open(page);
  const primary = page.locator(".hero .glass-primary");
  const box = await primary.boundingBox();
  await page.mouse.move(box.x + 20, box.y + 20);
  await page.mouse.down();
  const r = await primary.evaluate((el) => ({ scale: getComputedStyle(el).scale, ripple: getComputedStyle(el, "::before").display, anims: el.getAnimations({ subtree: true }).map((a) => a.animationName ?? `transition:${a.transitionProperty}`) }));
  report[name] = r;
  check(r.scale === "none" && r.ripple === "none" && r.anims.filter((a) => !/^transition:(background-color|border-color)$/.test(a)).join() === "glass-tint", `${name}: only the tint (colour may ease, nothing moves)`);
  await page.mouse.move(5, 890);
  await page.mouse.up();
  await ctx.close();
}

// 6. No backdrop-filter: the fallback rule is in the stylesheet
{
  const page = await browser.newPage();
  await open(page);
  report.fallbackRule = await page.evaluate(() => {
    for (const sheet of document.styleSheets)
      for (const rule of sheet.cssRules) if (rule instanceof CSSSupportsRule && /not.*backdrop-filter/.test(rule.conditionText)) return rule.conditionText;
    return null;
  });
  check(Boolean(report.fallbackRule), "the no-blur fallback rule");
  await page.close();
}

await browser.close();
console.log(JSON.stringify({ ...report, fail }, null, 1));
if (fail.length) process.exitCode = 1;
