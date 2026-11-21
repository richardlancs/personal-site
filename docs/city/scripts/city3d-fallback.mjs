// Every /city page where the 3D city can't, or shouldn't, draw: it still
// reads (its h1, its section's content, its painting in the band), nothing
// shifts, and nothing errors. On a production build:
//   npx next build && npx next start -p 3100
//   PLAYWRIGHT=…/playwright/index.mjs node docs/city/scripts/city3d-fallback.mjs http://localhost:3100 [out.json]
//   CASES=nowebgl,lost ROUTES=/city,/city/about …   a subset
//
// The cases (app/components/city3d/CityShell.tsx):
// - nowebgl: Chrome with --disable-webgl --disable-webgl2: html[data-city3d=
//   "fallback"], the band and "Your browser can't draw the 3D city" with
//   its link to the 2D page
// - lost: the canvas's context lost by WEBGL_lose_context: "lost", the band
//   and "Restart the 3D city"; the key brings the canvas back ("on", a new
//   canvas arrives); a second loss leaves "fallback" for good
// - savedata: navigator.connection.saveData: "saving", the band and "Load
//   the 3D city (about N MB)", no response holding three.js (WebGLRenderer)
//   before the press; the press starts the canvas
// - nojs: JavaScript off: the server's HTML alone, band and content
// Each page, wide (1440×900) and on a phone (390×844, touch): one visible
// h1 with words in it, the panel's content (at least 80 characters of
// text), the band's painting loaded and on screen where the canvas isn't
// drawing, layout shift 0 (Chrome's own layout-shift entries, from the
// DevTools protocol, so it works with JavaScript off too; shifts after
// input don't count), and no console error or page error.
// Exits 1 on any failure.
import { writeFileSync } from "node:fs";
import { launch } from "../../audit/scripts/pw.mjs";

const [base = "http://localhost:3100", outFile] = process.argv.slice(2);
const ROUTES = process.env.ROUTES?.split(",") ?? ["/city", "/city/projects", "/city/experience", "/city/interests", "/city/about", "/city/contact"];
const CASES = process.env.CASES?.split(",") ?? ["nowebgl", "lost", "savedata", "nojs"];
const sizes = [
  { name: "wide", viewport: { width: 1440, height: 900 } },
  { name: "phone", viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
];

const failures = [];
const rows = [];
const fail = (where, what) => {
  failures.push(`${where}: ${what}`);
  console.log(`FAIL ${where}: ${what}`);
};

// The page as a visitor reads it
const reads = () => {
  const main = [...document.querySelectorAll("main.city-page")].find((m) => m.checkVisibility()) ?? document.querySelector("main.city-page");
  const h1s = [...document.querySelectorAll("h1")].filter((h) => h.checkVisibility());
  const panel = main?.querySelector(".city-panel");
  const img = main?.querySelector(".city-band img");
  const band = main?.querySelector(".city-band");
  const r = band?.getBoundingClientRect();
  const cs = band ? getComputedStyle(band) : null;
  return {
    section: main?.dataset.section ?? null,
    h1: h1s.map((h) => h.textContent.trim()),
    panelText: (panel?.innerText ?? "").replace(/\s+/g, " ").trim().length,
    bandShown: !!band && cs.visibility !== "hidden" && cs.display !== "none" && +cs.opacity > 0 && r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight,
    plateLoaded: !!img && img.complete && img.naturalWidth > 0,
    mode: document.documentElement.getAttribute("data-city3d"),
    note: document.querySelector(".city3d-note")?.textContent.trim() ?? null,
  };
};

async function open(browser, size, { js = true, saveData = false } = {}) {
  const ctx = await browser.newContext({ ...size, javaScriptEnabled: js });
  if (saveData)
    await ctx.addInitScript(() => {
      const connection = { saveData: true, effectiveType: "4g", addEventListener() {}, removeEventListener() {} };
      Object.defineProperty(Navigator.prototype, "connection", { get: () => connection, configurable: true });
    });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  const cdp = await ctx.newCDPSession(page);
  const shifts = [];
  cdp.on("PerformanceTimeline.timelineEventAdded", ({ event }) => {
    if (event.type === "layout-shift" && !event.layoutShiftDetails?.hadRecentInput) shifts.push(event.layoutShiftDetails?.value ?? 0);
  });
  await cdp.send("PerformanceTimeline.enable", { eventTypes: ["layout-shift"] });
  const three = [];
  page.on("response", (res) => {
    if (!/\.js(\?|$)/.test(res.url())) return;
    res.text().then((b) => b.includes("WebGLRenderer") && three.push(res.url()), () => {});
  });
  return { ctx, page, errors, shifts, three };
}

function check(where, r, { band = true, mode, note } = {}) {
  if (r.h1.length !== 1 || !r.h1[0]) fail(where, `${r.h1.length} visible h1 (${JSON.stringify(r.h1)})`);
  if (r.panelText < 80) fail(where, `the panel holds ${r.panelText} characters of text`);
  if (band && !r.bandShown) fail(where, "the band isn't showing");
  if (band && !r.plateLoaded) fail(where, "the band's painting didn't load");
  if (mode !== undefined && r.mode !== mode) fail(where, `data-city3d is ${r.mode}, expected ${mode}`);
  if (note && !(r.note ?? "").includes(note)) fail(where, `the note says ${JSON.stringify(r.note)}, expected "${note}"`);
}

const settle = async (page, ms = 2500) => {
  await page.waitForLoadState("load");
  await page.waitForTimeout(ms);
};

async function run(name, browser, opts, body) {
  for (const size of sizes)
    for (const route of ROUTES) {
      const where = `${name} ${size.name} ${route}`;
      const o = await open(browser, size, opts);
      try {
        await o.page.goto(base + route, { waitUntil: "load" });
        await body(where, o);
      } catch (e) {
        fail(where, String(e.message).split("\n")[0]);
      }
      const cls = +o.shifts.reduce((a, b) => a + b, 0).toFixed(4);
      if (cls > 0) fail(where, `layout shift ${cls}`);
      for (const e of o.errors) fail(where, `console: ${e.slice(0, 200)}`);
      rows.push({ case: name, size: size.name, route, cls, errors: o.errors.slice(0, 3) });
      console.log(`${failures.some((f) => f.startsWith(where)) ? "FAIL" : "ok  "} ${where}  CLS ${cls}`);
      await o.ctx.close();
    }
}

// ---------- No WebGL ----------
if (CASES.includes("nowebgl")) {
  const browser = await launch({ args: ["--disable-webgl", "--disable-webgl2"] });
  await run("nowebgl", browser, {}, async (where, { page }) => {
    await page.waitForFunction(() => document.documentElement.hasAttribute("data-city3d"), null, { timeout: 15000 }).catch(() => {});
    await settle(page);
    check(where, await page.evaluate(reads), { mode: "fallback", note: "can't draw the 3D city" });
    const link = await page.evaluate(() => document.querySelector(".city3d-note a")?.getAttribute("href"));
    if (!link?.startsWith("/")) fail(where, `the note's link to the 2D page is ${link}`);
  });
  await browser.close();
}

const browser = await launch();

// ---------- A lost context, twice ----------
const lose = (page) =>
  page.evaluate(() => {
    const canvas = document.querySelector(".city3d canvas");
    const gl = canvas?.getContext("webgl2");
    const ext = gl?.getExtension("WEBGL_lose_context");
    if (!ext) return false;
    ext.loseContext();
    return true;
  });
if (CASES.includes("lost")) {
  await run("lost", browser, {}, async (where, { page }) => {
    await page.waitForSelector(".city3d[data-arrived]", { timeout: 90000 });
    await page.waitForTimeout(1500);
    if (!(await lose(page))) return fail(where, "no canvas context to lose");
    await page.waitForFunction(() => document.documentElement.getAttribute("data-city3d") === "lost", null, { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(800);
    check(`${where} [first loss]`, await page.evaluate(reads), { mode: "lost", note: "Restart the 3D city" });
    await page.getByRole("button", { name: "Restart the 3D city" }).click();
    const back = await page.waitForFunction(() => document.documentElement.getAttribute("data-city3d") === "on" && !!document.querySelector(".city3d[data-arrived] canvas"), null, { timeout: 60000 }).then(() => true, () => false);
    if (!back) fail(`${where} [restart]`, "the canvas didn't come back");
    await page.waitForTimeout(1500);
    if (!(await lose(page))) return fail(where, "no canvas context to lose the second time");
    await page.waitForFunction(() => document.documentElement.getAttribute("data-city3d") === "fallback", null, { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(800);
    check(`${where} [second loss]`, await page.evaluate(reads), { mode: "fallback", note: "can't draw the 3D city" });
  });
}

// ---------- Save-Data ----------
if (CASES.includes("savedata")) {
  await run("savedata", browser, { saveData: true }, async (where, o) => {
    const { page } = o;
    await page.waitForFunction(() => document.documentElement.hasAttribute("data-city3d"), null, { timeout: 15000 }).catch(() => {});
    await settle(page, 3000);
    check(where, await page.evaluate(reads), { mode: "saving", note: "Load the 3D city (about" });
    if (o.three.length) fail(where, `three.js fetched before the press: ${o.three.join(", ")}`);
    const key = page.getByRole("button", { name: /Load the 3D city/ });
    await (o.ctx._options?.hasTouch ? key.tap() : key.click());
    const on = await page.waitForSelector(".city3d[data-arrived]", { timeout: 90000 }).then(() => true, () => false);
    if (!on) fail(`${where} [press]`, "the press didn't start the 3D city");
    // (shifts after the press are after input: they don't count)
  });
}

// ---------- JavaScript off ----------
if (CASES.includes("nojs")) {
  await run("nojs", browser, { js: false }, async (where, { page }) => {
    await settle(page, 1500);
    // (evaluate runs in Playwright's own world, not the page's scripts)
    check(where, await page.evaluate(reads), { mode: null });
  });
}

await browser.close();
if (outFile) writeFileSync(outFile, JSON.stringify({ base, date: new Date().toISOString(), rows, failures }, null, 2));
console.log(failures.length ? `\n${failures.length} failure(s)` : `\nall ${rows.length} pages read, CLS 0, no errors`);
process.exit(failures.length ? 1 : 0);
