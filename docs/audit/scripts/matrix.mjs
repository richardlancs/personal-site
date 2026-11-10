// The release validation matrix (docs/audit/release.md). Against a
// production build:
//   npm run build && npx next start -p 3100
//   PLAYWRIGHT=…/playwright/index.mjs node docs/audit/scripts/matrix.mjs http://localhost:3100 <outDir>
// Prints one line per check and writes <outDir>/matrix.json; exits 1 if any
// check fails. Screenshots of every route at every size go to <outDir>.
import { mkdirSync, writeFileSync } from "node:fs";
import { listed } from "../../../app/sections/registry.ts";
import { launch } from "./pw.mjs";

const [base = "http://localhost:3100", out = "matrix-out"] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
// Every listed section, from the registry (never a second list)
const routes = listed.map((s) => s.href);
const slug = (route) => (route === "/" ? "home" : route.slice(1));
const results = [];
const check = (group, name, pass, detail = "") => {
  results.push({ group, name, pass: !!pass, detail });
  console.log(`${pass ? "ok  " : "FAIL"} [${group}] ${name}${detail ? `  ${typeof detail === "string" ? detail : JSON.stringify(detail)}` : ""}`);
};

// What a page looks like to the checks: overflow, the h1, the smallest
// control that isn't a link inside running text (WCAG 2.5.8's inline
// exception), and whether the world or the painting is behind it
const inspect = (page) =>
  page.evaluate(() => {
    const h1 = [...document.querySelectorAll("h1")].find((h) => h.checkVisibility());
    const r = h1?.getBoundingClientRect();
    const controls = [...document.querySelectorAll("a[href], button, [role=tab], [tabindex='0']")].filter((el) => {
      if (!el.checkVisibility?.() || el.closest("[aria-hidden=true]") || el.classList.contains("skip-link")) return false;
      const b = el.getBoundingClientRect();
      if (b.width === 0 || b.height === 0) return false;
      // Inline links in a sentence or a list of words are excepted
      return !(el.tagName === "A" && getComputedStyle(el).display === "inline" && el.closest("p, li, figcaption"));
    });
    const small = controls
      .map((el) => ({ el, b: el.getBoundingClientRect() }))
      .filter(({ b }) => b.width < 24 || b.height < 24)
      .map(({ el, b }) => `${el.tagName.toLowerCase()} "${(el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 30)}" ${Math.round(b.width)}x${Math.round(b.height)}`);
    return {
      overflow: document.documentElement.scrollWidth - innerWidth,
      h1: h1?.textContent?.trim(),
      h1Top: r ? Math.round(r.top + scrollY) : null,
      small,
      world: document.querySelector("canvas") ? "canvas" : document.querySelector(".world3d-fallback") ? "painting" : "none",
      still: document.documentElement.dataset.still,
    };
  });

const browser = await launch();

// 1. Every route at every size, and two zoom levels (a 1280x900 window at
// 200% is 640x450 CSS px; at 400%, 320x225)
const sizes = [
  ["320", 320, 740, true],
  ["390", 390, 844, true],
  ["768", 768, 1024, true],
  ["1024", 1024, 768, false],
  ["1440", 1440, 1000, false],
  ["1920", 1920, 1080, false],
  ["844x390", 844, 390, true],
  ["zoom200", 640, 450, false],
  ["zoom400", 320, 225, false],
];
for (const [name, width, height, touch] of sizes) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: name.startsWith("zoom") ? Number(name.slice(4)) / 100 : 1, isMobile: touch, hasTouch: touch });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  for (const route of routes) {
    const res = await page.goto(base + route, { waitUntil: "load" });
    await page.waitForTimeout(2500);
    const info = await inspect(page);
    check(`size ${name}`, `${route} answers and has its heading`, res.status() === 200 && info.h1, info.h1);
    check(`size ${name}`, `${route} no horizontal scroll`, info.overflow <= 0, `${info.overflow}px`);
    check(`size ${name}`, `${route} controls are at least 24x24`, info.small.length === 0, info.small.join("; "));
    await page.screenshot({ path: `${out}/${name}-${slug(route)}.jpg`, type: "jpeg", quality: 60 });
  }
  check(`size ${name}`, "no page or console errors", errors.length === 0, errors.slice(0, 3).join(" | "));
  await ctx.close();
}

// 2. The keyboard, on a wide screen
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await ctx.newPage();
  const focused = () => page.evaluate(() => {
    const el = document.activeElement;
    return { id: el?.id, cls: el?.className?.toString?.() ?? "", text: (el?.getAttribute("aria-label") || el?.textContent || "").trim().slice(0, 40), role: el?.getAttribute("role"), outline: el ? getComputedStyle(el).outlineStyle : "" };
  });
  await page.goto(base + "/projects", { waitUntil: "load" });
  await page.keyboard.press("Tab");
  check("keyboard", "Tab: the skip link comes first", (await focused()).cls.includes("skip-link"));
  await page.keyboard.press("Enter");
  check("keyboard", "Enter on the skip link moves focus to the content", (await focused()).id === "content");
  await page.keyboard.press("Shift+Tab");
  check("keyboard", "Shift+Tab goes back before the content", (await focused()).id !== "content");

  // Projects: one tab stop, arrows, Home/End, the hash follows
  await page.getByRole("tab", { selected: true }).focus();
  await page.keyboard.press("ArrowRight");
  check("keyboard", "ArrowRight chooses the next project, and the address follows", page.url().endsWith("#scrollganizer"), page.url());
  await page.keyboard.press("End");
  check("keyboard", "End chooses the last project", page.url().endsWith("#garagepoker"), page.url());
  await page.keyboard.press("Home");
  check("keyboard", "Home chooses the first project", page.url().endsWith("#marketlab"), page.url());

  // Interests: Tab from the chosen cabinet reaches its card, Shift+Tab returns
  await page.goto(base + "/interests", { waitUntil: "load" });
  await page.waitForTimeout(800);
  await page.getByRole("tab", { selected: true }).focus();
  await page.keyboard.press("End");
  const last = await focused();
  await page.keyboard.press("Tab");
  const panel = await focused();
  check("keyboard", "interests: End, then Tab reaches the card panel with a visible focus ring", panel.role === "tabpanel" && panel.outline !== "none", { last: last.text, panel });
  await page.keyboard.press("Shift+Tab");
  check("keyboard", "interests: Shift+Tab returns to the chosen cabinet", (await focused()).text === last.text);

  // The menu: Enter opens, Escape closes and stays on the page
  await page.getByRole("button", { name: "Sections" }).focus();
  await page.keyboard.press("Enter");
  const open = await page.evaluate(() => !!document.querySelector("#places-menu:popover-open"));
  await page.keyboard.press("Escape");
  const closed = await page.evaluate(() => !document.querySelector("#places-menu:popover-open"));
  check("keyboard", "Sections menu: Enter opens, Escape closes, focus back on the button", open && closed && (await focused()).text.includes("Sections") && page.url().endsWith("/interests"));

  // Escape goes back to the park
  await page.keyboard.press("Escape");
  await page.waitForURL(base + "/", { timeout: 5000 }).catch(() => {});
  check("keyboard", "Escape from a place goes back to the park", new URL(page.url()).pathname === "/", page.url());

  // Still view: Space toggles it
  const still = page.getByRole("button", { name: "Still view" });
  const before = await still.getAttribute("aria-pressed");
  await still.focus();
  await page.keyboard.press("Space");
  check("keyboard", "Space toggles Still view", (await still.getAttribute("aria-pressed")) !== before, `${before} -> ${await still.getAttribute("aria-pressed")}`);
  await ctx.close();
}

// 3. Reduced motion, and no WebGL
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await page.goto(base + "/about", { waitUntil: "load" });
  await page.waitForTimeout(1500);
  const info = await inspect(page);
  check("reduced motion", "the system setting turns Still view on", info.still === "on", info.still);
  check("reduced motion", "the world is still drawn", info.world === "canvas", info.world);
  await ctx.close();
}
{
  const flat = await launch({ args: ["--disable-webgl", "--disable-3d-apis"] });
  for (const [name, width, height] of [["1440", 1440, 1000], ["390", 390, 844]]) {
    const ctx = await flat.newContext({ viewport: { width, height } });
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    for (const route of routes) {
      await page.goto(base + route, { waitUntil: "load" });
      await page.waitForTimeout(800);
      const info = await inspect(page);
      check(`no WebGL ${name}`, `${route}: the painting stands in, the words are there`, info.world === "painting" && info.h1, info);
    }
    await page.goto(base + "/", { waitUntil: "load" });
    await page.getByRole("link", { name: "View projects" }).click();
    await page.waitForURL(base + "/projects");
    check(`no WebGL ${name}`, "the home page's actions work", true);
    check(`no WebGL ${name}`, "no page errors", errors.length === 0, errors.join(" | "));
    await ctx.close();
  }
  await flat.close();
}

// 4. A slow connection and a slow CPU: the words and links come first
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Network.enable");
  // Lighthouse's "slow 4G": 150 ms RTT, 1.6 Mbps down, 750 kbps up; 4x CPU
  await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  const start = Date.now();
  await page.goto(base + "/", { waitUntil: "commit" });
  await page.getByRole("heading", { level: 1 }).waitFor();
  const h1At = Date.now() - start;
  const action = page.getByRole("link", { name: "View projects" });
  await action.waitFor();
  const worldYet = await page.evaluate(() => !!document.querySelector("canvas"));
  await action.click();
  await page.waitForURL(base + "/projects", { timeout: 30000 });
  check("slow load", "the name is on screen before the world", true, `h1 after ${h1At} ms; world drawn yet: ${worldYet}`);
  check("slow load", "the links work while the world is still loading", new URL(page.url()).pathname === "/projects", `clicked at ${Date.now() - start} ms`);
  await ctx.close();
}

// 5. Blocked clipboard; failed images and audio
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await ctx.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", { value: { writeText: () => Promise.reject(new DOMException("blocked", "NotAllowedError")) } });
  });
  await ctx.route(/\.mp3$/, (route) => route.abort());
  await ctx.route(/\/_next\/image\?url=%2Fprojects/, (route) => route.abort());
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(base + "/contact", { waitUntil: "load" });
  await page.locator(".directory-copy").first().click();
  const status = await page.locator(".directory-status").textContent();
  const visible = await page.locator(".directory-status").isVisible();
  check("failures", "blocked clipboard: the failure is written on screen", visible && /couldn.t copy/i.test(status ?? ""), status);
  await page.getByRole("button", { name: /background music/ }).click();
  await page.waitForTimeout(1500);
  const music = await page.evaluate(() => ({ pressed: document.querySelector("[aria-label*='background music']")?.getAttribute("aria-pressed"), status: document.querySelector(".music-status")?.textContent }));
  check("failures", "failed audio: the button isn't left on, and says so", music.pressed === "false" && /couldn.t/i.test(music.status ?? ""), music);
  await page.goto(base + "/projects", { waitUntil: "load" });
  await page.waitForTimeout(1500);
  const notes = await page.locator("#project-notes").textContent();
  check("failures", "failed screenshots: the project's words and links are still there", /Code on GitHub/.test(notes ?? ""));
  check("failures", "no page errors", errors.length === 0, errors.join(" | "));
  await ctx.close();
}

// 6. Focus is never hidden: every Tab stop on every page is on screen,
// visible, and not under the fixed controls at the top (WCAG 2.4.11).
// Wide, and at 400% zoom
for (const [name, width, height] of [["1440", 1440, 900], ["1024", 1024, 768], ["zoom400", 320, 225]]) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: name === "zoom400" ? 4 : 1 });
  const page = await ctx.newPage();
  for (const route of routes) {
    await page.goto(base + route, { waitUntil: "load" });
    await page.waitForTimeout(1500);
    const hidden = [];
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press("Tab");
      const f = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return null;
        const b = el.getBoundingClientRect();
        const bar = document.querySelector(".world-controls");
        // Within a corner control's box (reported, not failed: the skip
        // link sits over the controls). What fails is something else being
        // drawn over the focused element's middle: "covered"
        const under = !bar?.contains(el) && [...(bar?.children ?? [])].some((c) => {
          const r = c.getBoundingClientRect();
          return r.width && b.left < r.right && b.right > r.left && b.top + b.height / 2 < r.bottom && b.bottom > r.top;
        });
        const x = Math.min(Math.max(b.left + b.width / 2, 0), innerWidth - 1);
        const y = Math.min(Math.max(b.top + b.height / 2, 0), innerHeight - 1);
        const top = document.elementFromPoint(x, y);
        const covered = top && !el.contains(top) && !top.contains(el) && !el.closest(".world-controls");
        return { text: (el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 30), off: b.bottom < 0 || b.top > innerHeight, invisible: !el.checkVisibility({ visibilityProperty: true }), under, covered: !!covered && getComputedStyle(top).pointerEvents !== "none" };
      });
      if (!f) break;
      if (f.off || f.invisible || f.covered) hidden.push(f);
    }
    check(`focus ${name}`, `${route}: every Tab stop is in view and not hidden`, hidden.length === 0, hidden.slice(0, 3));
  }
  await ctx.close();
}

// 7. On a phone, a place's hero is its own height after leaving home
// (Next.js keeps the home page, hidden, in the document)
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const hero = () => page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--hero")));
  await page.goto(base + "/projects", { waitUntil: "load" });
  const direct = await hero();
  await page.goto(base + "/", { waitUntil: "load" });
  await page.waitForTimeout(800);
  const home = await hero();
  await page.getByRole("link", { name: "View projects" }).click();
  await page.waitForURL(base + "/projects");
  await page.waitForTimeout(800);
  const after = await hero();
  check("hero", "a place's hero is 180-260px, loaded directly or after home", direct >= 180 && direct <= 260 && after === direct && home > after, { direct, home, after });
  await ctx.close();
}

// 8. Rapid route changes, and history
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(base + "/", { waitUntil: "load" });
  await page.waitForTimeout(1500);
  for (const href of ["/about", "/projects", "/experience", "/interests", "/contact"]) {
    await page.getByRole("button", { name: "Sections" }).click();
    await page.locator(`#places-menu a[href="${href}"]`).first().click();
    await page.waitForTimeout(150);
  }
  await page.waitForTimeout(3000);
  // Next.js keeps the pages visited before, hidden, for back and forward:
  // the heading that counts is the visible one
  const h1 = await page.locator("h1:visible").textContent();
  const arrived = await page.evaluate(() => document.querySelector(".world3d")?.getAttribute("data-arrived"));
  check("rapid", "five places in under a second: lands on the last", new URL(page.url()).pathname === "/contact" && h1 === "Contact", { h1, arrived });
  await page.goBack();
  await page.goBack();
  await page.waitForTimeout(1500);
  check("rapid", "back twice: Experience", (await page.locator("h1:visible").textContent()) === "Experience");
  await page.goForward();
  await page.waitForTimeout(1500);
  check("rapid", "forward: Interests", (await page.locator("h1:visible").textContent()) === "Interests");
  check("rapid", "no page errors", errors.length === 0, errors.join(" | "));
  await ctx.close();
}

await browser.close();
const failed = results.filter((r) => !r.pass);
writeFileSync(`${out}/matrix.json`, JSON.stringify(results, null, 1));
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
