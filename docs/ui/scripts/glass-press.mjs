// The glass press (components/ui/GlassPress.tsx, .glass in globals.css),
// checked in a real browser: frames of the animation (pointer, off-centre;
// keyboard, from the middle), that the action isn't delayed, that rapid
// presses never stack, the still/reduced-motion tint and the no-blur
// fallback.
//   PLAYWRIGHT=…/playwright/index.mjs node docs/ui/scripts/glass-press.mjs <base> [outDir=docs/ui/screenshots]
// Frames are taken by pausing the press's animations at fixed times (Web
// Animations API), so they're exact, not whatever a screenshot's timing
// happens to catch.
import { mkdirSync } from "node:fs";
import { launch } from "../../audit/scripts/pw.mjs";

const [base = "http://localhost:3131", out = "docs/ui/screenshots"] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const times = [0, 40, 80, 120, 160, 200, 240, 280, 320, 360, 400, 440];
const browser = await launch();
const report = {};

const arrive = async (page, path) => {
  await page.goto(base + path, { waitUntil: "load" });
  await page.waitForFunction(() => document.querySelector(".world3d")?.getAttribute("data-arrived") === "true", null, { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(1500);
};

// Pause every animation of the pressed button (its own and its two
// layers) at each time, photograph it, and let it go
async function frames(page, locator, name) {
  const box = await locator.boundingBox();
  const pad = 14;
  const clip = { x: box.x - pad, y: box.y - pad, width: box.width + 2 * pad, height: box.height + 2 * pad };
  const names = await locator.evaluate((el) => el.getAnimations({ subtree: true }).map((a) => a.animationName ?? `transition:${a.transitionProperty}`));
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
  return names;
}

async function sheet(shots, file, captions = times.map((t) => `${t} ms`), columns = 4) {
  const sheetPage = await browser.newPage({ viewport: { width: 1200, height: 300 }, deviceScaleFactor: 1 });
  const imgs = shots.map((b, i) => `<figure style="margin:0"><img style="display:block;width:100%" src="data:image/png;base64,${b.toString("base64")}"><figcaption>${captions[i]}</figcaption></figure>`).join("");
  await sheetPage.setContent(`<body style="margin:0;background:#e8e2d9;font:600 13px system-ui;color:#203245"><div style="display:grid;grid-template-columns:repeat(${columns},1fr);gap:8px;padding:8px">${imgs}</div></body>`);
  await sheetPage.waitForTimeout(200);
  await sheetPage.screenshot({ path: file, type: "jpeg", quality: 85, fullPage: true });
  await sheetPage.close();
}

// 1. Pointer, off-centre, and keyboard, from the middle (desktop home)
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 3 });
  const page = await ctx.newPage();
  await arrive(page, "/");
  const primary = page.locator(".park-actions .glass-primary");
  const box = await primary.boundingBox();
  const at = { x: box.x + box.width * 0.22, y: box.y + box.height * 0.7 };
  await page.mouse.move(at.x, at.y);
  await page.mouse.down(); // no release: the press, without going anywhere
  report.pointerVars = await primary.evaluate((el) => ({ x: el.style.getPropertyValue("--press-x"), y: el.style.getPropertyValue("--press-y"), r: el.style.getPropertyValue("--press-r"), pressed: el.hasAttribute("data-pressed") }));
  report.pointerAnimations = await frames(page, primary, "pointer");
  await page.mouse.move(5, 890);
  await page.mouse.up();

  const sections = page.locator('[popovertarget="places-menu"]');
  await sections.focus();
  await page.keyboard.press("Enter");
  report.keyboardVars = await sections.evaluate((el) => ({ x: el.style.getPropertyValue("--press-x"), y: el.style.getPropertyValue("--press-y"), w: el.getBoundingClientRect().width, h: el.getBoundingClientRect().height }));
  report.keyboardAnimations = await frames(page, sections, "keyboard");
  report.menuOpenedByKeyboard = await page.evaluate(() => !!document.querySelector("#places-menu:popover-open"));
  await page.keyboard.press("Escape");
  await ctx.close();
}

// 2. The action isn't delayed: pointer down to the new address, on a glass
// link and, for comparison, on a plain one (the Sections menu's)
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const timeTo = async (click, prepare = async () => {}) => {
    await arrive(page, "/");
    await prepare();
    await page.evaluate(() => {
      window.__down = 0;
      document.addEventListener("pointerdown", () => (window.__down = performance.now()), { capture: true, once: true });
      window.__changed = new Promise((resolve) => {
        const start = location.pathname;
        const poll = () => (location.pathname !== start ? resolve(performance.now()) : requestAnimationFrame(poll));
        poll();
      });
    });
    await click();
    return page.evaluate(async () => Math.round((await window.__changed) - window.__down));
  };
  const glass = [], plain = [];
  for (let i = 0; i < 3; i++) {
    glass.push(await timeTo(() => page.locator(".park-actions .glass-primary").click()));
    plain.push(
      await timeTo(
        () => page.locator('#places-menu a[href="/projects"]').click(),
        () => page.locator('[popovertarget="places-menu"]').click(),
      ),
    );
  }
  report.navigationMs = { glass, plain };
  await ctx.close();
}

// 3. Rapid presses don't stack: ten clicks 25 ms apart on a Copy button
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, permissions: ["clipboard-read", "clipboard-write"] });
  const page = await ctx.newPage();
  await arrive(page, "/contact");
  const copy = page.locator(".directory-copy").first();
  const box = await copy.boundingBox();
  for (let i = 0; i < 10; i++) {
    await page.mouse.click(box.x + 6 + i * 3, box.y + box.height / 2);
    await page.waitForTimeout(25);
  }
  report.rapid = {
    duringAnimations: await copy.evaluate((el) => el.getAnimations({ subtree: true }).length),
    duringPressed: await page.evaluate(() => document.querySelectorAll("[data-pressed]").length),
  };
  await page.waitForTimeout(700);
  Object.assign(report.rapid, {
    afterAnimations: await copy.evaluate((el) => el.getAnimations({ subtree: true }).length),
    afterPressed: await page.evaluate(() => document.querySelectorAll("[data-pressed]").length),
    afterStyle: await copy.evaluate((el) => el.getAttribute("style")),
  });
  await ctx.close();
}

// 4. Reduced motion: a still tint, no ripple or give
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 3, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await arrive(page, "/");
  const primary = page.locator(".park-actions .glass-primary");
  const box = await primary.boundingBox();
  await page.mouse.move(box.x + box.width * 0.22, box.y + box.height * 0.7);
  await page.mouse.down();
  report.reduced = await primary.evaluate((el) => ({
    animations: el.getAnimations({ subtree: true }).map((a) => a.animationName ?? `transition:${a.transitionProperty}`),
    ripple: getComputedStyle(el, "::before").display,
    sheen: getComputedStyle(el, "::after").display,
  }));
  report.reducedAnimations = await frames(page, primary, "reduced");
  await page.mouse.move(5, 890);
  await page.mouse.up();
  await ctx.close();
}

// 5. No backdrop-filter: the fallback rule is there, and how it looks
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await arrive(page, "/contact");
  report.fallbackRule = await page.evaluate(() => {
    for (const sheet of document.styleSheets)
      for (const rule of sheet.cssRules)
        if (rule instanceof CSSSupportsRule && /not.*backdrop-filter/.test(rule.conditionText)) return `${rule.conditionText} { ${[...rule.cssRules].map((r) => r.cssText).join(" ")} }`;
    return null;
  });
  // What a browser without it would draw: the same rules, applied
  await page.addStyleTag({ content: ".glass { backdrop-filter: none !important; -webkit-backdrop-filter: none !important; background-color: var(--glass-fallback) !important; } .glass-primary { background-color: var(--baby) !important; }" });
  await page.waitForTimeout(200);
  const shots = [await page.screenshot({ clip: { x: 0, y: 0, width: 660, height: 340 } }), await page.screenshot({ clip: { x: 740, y: 0, width: 700, height: 80 } })];
  await sheet(shots, `${out}/press-fallback.jpg`, ["no backdrop-filter: the receiver, Back", "no backdrop-filter: the corner controls"], 1);
  await ctx.close();
}

await browser.close();
console.log(JSON.stringify(report, null, 1));
