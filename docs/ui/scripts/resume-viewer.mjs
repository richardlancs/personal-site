// The résumé viewer (app/components/resume), checked in a real browser
// against a production build. Prints one ok/FAIL line per check and a
// total; exits 1 on any failure.
//
//   npm run build && npx next start -p 3141
//   PLAYWRIGHT=…/playwright/index.mjs node docs/ui/scripts/resume-viewer.mjs [base] [shotsDir]
//
// Headless Chrome only: real iOS Safari and Android Chrome aren't covered.
import { mkdirSync } from "node:fs";
import { launch } from "../../audit/scripts/pw.mjs";

const [base = "http://localhost:3141", shots = "docs/ui/screenshots"] = process.argv.slice(2);
const PDF = "/resume/richard-lan-resume.pdf";
mkdirSync(shots, { recursive: true });

let passed = 0;
let failed = 0;
function check(ok, name, detail = "") {
  if (ok) passed++;
  else failed++;
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${detail ? `  (${detail})` : ""}`);
}

const views = {
  desktop: { viewport: { width: 1440, height: 900 } },
  phone: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 },
};

const browser = await launch();

// ---------- helpers ----------

async function newPage(view, extra = {}) {
  const ctx = await browser.newContext({ ...views[view], ...extra });
  const page = await ctx.newPage();
  page.errors = [];
  page.on("pageerror", (e) => page.errors.push(String(e)));
  return { ctx, page };
}

async function visit(page, route) {
  await page.goto(base + route, { waitUntil: "load" });
  // Hydrated: the layout's listener is in place once React has run
  await page.waitForFunction(() => document.querySelector("#content") && !!window.next, null, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1200);
}

// The résumé link that's showing on this page and layout
async function trigger(page, route, view) {
  if (route === "/about" && view === "desktop") {
    await page.getByRole("button", { name: "Read all the pages at once" }).click();
  }
  const link = page.locator("a[data-resume]:visible").first();
  await link.scrollIntoViewIfNeeded();
  await page.evaluate(() => {
    // Mark it, to recognise it again after closing
    document.querySelectorAll("[data-check-trigger]").forEach((el) => el.removeAttribute("data-check-trigger"));
  });
  await link.evaluate((el) => el.setAttribute("data-check-trigger", ""));
  return link;
}

const isOpen = (page) => page.evaluate(() => !!document.querySelector("dialog.resume")?.open);
const waitDrawn = (page, timeout = 20000) =>
  page.waitForSelector("dialog.resume[open] .resume-page[data-drawn] canvas", { timeout }).then(
    () => true,
    () => false,
  );
const waitClosed = (page) =>
  page.waitForFunction(() => !document.querySelector("dialog.resume")?.open, null, { timeout: 3000 }).then(
    () => true,
    () => false,
  );
const focusInDialog = (page) => page.evaluate(() => !!document.querySelector("dialog.resume")?.contains(document.activeElement));
const pageWidth = (page) => page.evaluate(() => document.querySelector("dialog.resume .resume-page")?.getBoundingClientRect().width ?? 0);

// ---------- 1. Every trigger, by pointer and by keyboard, on both layouts ----------

for (const view of Object.keys(views)) {
  for (const route of ["/", "/about", "/contact"]) {
    for (const how of ["pointer", "keyboard"]) {
      const tag = `${view} ${route} ${how}`;
      const { ctx, page } = await newPage(view);
      await visit(page, route);
      const link = await trigger(page, route, view);
      // The narrow layout: the page itself scrolls; scroll it a little
      // further where it can, so a moved page would show
      if (view === "phone") await page.evaluate(() => window.scrollBy(0, 30));
      const before = await page.evaluate(() => ({ url: location.href, y: window.scrollY, x: window.scrollX }));
      if (how === "pointer") {
        if (view === "phone") await link.tap();
        else await link.click();
      } else {
        await link.focus();
        await page.keyboard.press("Enter");
      }
      const drawn = await waitDrawn(page);
      check((await isOpen(page)) && drawn, `${tag}: opens in the page, document drawn`);
      const during = await page.evaluate(() => ({ url: location.href, y: window.scrollY, pages: window.history.length }));
      check(during.url === before.url, `${tag}: URL unchanged while open`);
      check(during.y === before.y, `${tag}: page scroll held while open`, `scrollY ${before.y} -> ${during.y}`);
      check(await focusInDialog(page), `${tag}: focus moved into the dialog`, await page.evaluate(() => document.activeElement?.className));

      // The page behind: no scrolling, no focus, no clicks
      await page.mouse.move(views[view].viewport.width - 5, views[view].viewport.height / 2);
      if (view === "desktop") await page.mouse.wheel(0, 600);
      await page.evaluate(() => window.scrollBy(0, 0)); // nothing
      await page.waitForTimeout(150);
      const behind = await page.evaluate(() => {
        const link = document.querySelector("#content a[href]");
        link?.focus();
        const hit = document.elementFromPoint(2, window.innerHeight / 2);
        return {
          y: window.scrollY,
          overflow: getComputedStyle(document.documentElement).overflow,
          focused: document.activeElement === link,
          hit: hit?.closest("dialog") ? "dialog" : hit?.tagName,
        };
      });
      check(behind.y === before.y && behind.overflow === "hidden", `${tag}: background doesn't scroll`, `scrollY ${behind.y}, overflow ${behind.overflow}`);
      check(!behind.focused && behind.hit === "dialog", `${tag}: background inert`, `focusable ${behind.focused}, hit ${behind.hit}`);

      // Tab and Shift+Tab stay inside, going round
      await page.locator("dialog.resume .resume-doc").focus();
      const count = await page.evaluate(
        () => [...document.querySelectorAll("dialog.resume :is(a[href], button, [tabindex]:not([tabindex='-1']))")].filter((el) => el.getClientRects().length).length,
      );
      let inside = true;
      const seen = new Set();
      for (let i = 0; i < count + 2; i++) {
        await page.keyboard.press("Tab");
        inside &&= await focusInDialog(page);
        seen.add(await page.evaluate(() => document.activeElement?.outerHTML.slice(0, 80)));
      }
      for (let i = 0; i < count + 2; i++) {
        await page.keyboard.press("Shift+Tab");
        inside &&= await focusInDialog(page);
      }
      check(inside && seen.size === count, `${tag}: Tab / Shift+Tab wrap inside`, `${count} stops, ${seen.size} seen`);

      // Close: Escape for the keyboard runs, the Close button for the pointer runs
      if (how === "keyboard") await page.keyboard.press("Escape");
      else if (view === "phone") await page.getByRole("button", { name: "Close the résumé" }).tap();
      else await page.getByRole("button", { name: "Close the résumé" }).click();
      const closed = await waitClosed(page);
      await page.waitForTimeout(400); // anything that would navigate (Escape is "back to the park")
      const after = await page.evaluate(() => ({
        url: location.href,
        y: window.scrollY,
        onTrigger: document.activeElement?.hasAttribute("data-check-trigger"),
        overflow: getComputedStyle(document.documentElement).overflow,
      }));
      check(closed, `${tag}: ${how === "keyboard" ? "Escape" : "Close"} closes`);
      check(after.url === before.url, `${tag}: still on the same page after closing`, after.url);
      check(after.onTrigger, `${tag}: focus back on the trigger`);
      check(after.y === before.y && after.overflow !== "hidden", `${tag}: page scroll as it was`, `scrollY ${before.y} -> ${after.y}`);
      check(page.errors.length === 0, `${tag}: no page errors`, page.errors.join(" | "));
      await ctx.close();
    }
  }
}

// ---------- 2. The document: drawing, text, zoom, scrolling, links, Download ----------

for (const view of Object.keys(views)) {
  const tag = view;
  const { ctx, page } = await newPage(view);
  await visit(page, "/contact");
  const link = await trigger(page, "/contact", view);
  await link.click();
  await waitDrawn(page);
  await page.waitForTimeout(300);

  const ink = await page.evaluate(() => {
    const c = document.querySelector("dialog.resume canvas");
    const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
    let dark = 0;
    for (let i = 0; i < d.length; i += 4 * 7) if (d[i] + d[i + 1] + d[i + 2] < 600) dark++;
    return { w: c.width, h: c.height, cssW: c.getBoundingClientRect().width, dark, dpr: devicePixelRatio };
  });
  check(ink.dark > 1000, `${tag}: canvas drawn, not blank`, `${ink.w}x${ink.h} px, ${ink.dark} inked samples`);
  check(Math.abs(ink.w - ink.cssW * ink.dpr) < 2, `${tag}: canvas at the screen's pixel ratio`, `${ink.w} px for ${ink.cssW.toFixed(0)} css px at ${ink.dpr}x`);

  const text = await page.evaluate(() => {
    const layer = document.querySelector("dialog.resume .textLayer");
    const spans = layer?.querySelectorAll("span").length ?? 0;
    const words = layer?.textContent ?? "";
    const range = document.createRange();
    range.selectNodeContents(layer);
    getSelection().removeAllRanges();
    getSelection().addRange(range);
    const selected = getSelection().toString();
    getSelection().removeAllRanges();
    const span = layer?.querySelector("span");
    return { spans, hasName: words.includes("Richard Lan"), selected: selected.length, userSelect: span && getComputedStyle(span).userSelect };
  });
  check(text.spans > 50 && text.hasName, `${tag}: text layer present`, `${text.spans} spans`);
  check(text.selected > 500 && text.userSelect !== "none", `${tag}: text selectable`, `${text.selected} characters selected`);
  if (view === "desktop") {
    // A real drag across the name, with the mouse
    const box = await page.locator("dialog.resume .textLayer span", { hasText: "Richard Lan" }).first().boundingBox();
    await page.mouse.move(box.x + 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width - 2, box.y + box.height / 2, { steps: 5 });
    await page.mouse.up();
    const sel = await page.evaluate(() => getSelection().toString());
    check(/Richard/.test(sel), `${tag}: text selected by dragging`, JSON.stringify(sel));
  }

  const links = await page.evaluate(() => [...document.querySelectorAll("dialog.resume .resume-link")].map((a) => [a.getAttribute("href"), a.getAttribute("aria-label")]));
  check(links.length === 6 && links.every(([href, label]) => /^(https:|mailto:)/.test(href) && label), `${tag}: the PDF's links are links`, `${links.length}: ${links.map((l) => l[1]).join(", ")}`);
  check((await page.locator("dialog.resume .resume-pager").count()) === 0, `${tag}: no page navigation for a one-page résumé`);

  const dl = await page.evaluate(() => {
    const a = document.querySelector("dialog.resume .resume-bar a[download]");
    return { href: a?.getAttribute("href"), download: a?.getAttribute("download"), name: a?.textContent };
  });
  const head = await page.request.fetch(base + PDF, { method: "HEAD" });
  check(dl.href === PDF && dl.download === "richard-lan-resume.pdf" && /Download PDF/.test(dl.name), `${tag}: Download PDF link`, JSON.stringify(dl));
  check(head.ok() && /pdf/.test(head.headers()["content-type"]), `${tag}: the PDF is served`, head.headers()["content-type"]);

  // Zoom
  const fitW = await pageWidth(page);
  const inner = await page.evaluate(() => {
    const el = document.querySelector("dialog.resume .resume-doc");
    const s = getComputedStyle(el);
    return el.clientWidth - parseFloat(s.paddingLeft) - parseFloat(s.paddingRight);
  });
  check(Math.abs(fitW - inner) < 2, `${tag}: opens at fit width`, `page ${fitW.toFixed(0)} px, area ${inner.toFixed(0)} px`);
  const percent = () => page.locator("dialog.resume .resume-percent").textContent();
  const p0 = await percent();
  await page.getByRole("button", { name: "Zoom in" }).click();
  await page.waitForTimeout(400);
  const inW = await pageWidth(page);
  const p1 = await percent();
  const pressed = await page.getByRole("button", { name: "Fit width" }).getAttribute("aria-pressed");
  check(inW > fitW * 1.04 && pressed === "false", `${tag}: Zoom in widens the page`, `${fitW.toFixed(0)} -> ${inW.toFixed(0)} px, ${p0.replace(/\s+/g, " ")} -> ${p1.replace(/\s+/g, " ")}`);
  const sideways = await page.evaluate(() => {
    const el = document.querySelector("dialog.resume .resume-doc");
    return el.scrollWidth > el.clientWidth;
  });
  check(sideways, `${tag}: zoomed past the width, it scrolls sideways`);
  await drawnAgain(page);
  await page.screenshot({ path: `${shots}/resume-${view}-zoomed.jpg`, type: "jpeg", quality: 80 });
  await page.getByRole("button", { name: "Zoom out" }).click();
  await page.waitForTimeout(150);
  await page.getByRole("button", { name: "Zoom out" }).click();
  await page.waitForTimeout(400);
  const outW = await pageWidth(page);
  check(outW < fitW * 0.97, `${tag}: Zoom out narrows the page`, `${fitW.toFixed(0)} -> ${outW.toFixed(0)} px, ${await percent()}`);
  await page.getByRole("button", { name: "Fit width" }).click();
  await page.waitForTimeout(400);
  const backW = await pageWidth(page);
  check(Math.abs(backW - fitW) < 2 && (await page.getByRole("button", { name: "Fit width" }).getAttribute("aria-pressed")) === "true", `${tag}: Fit width fits again`, `${backW.toFixed(0)} px`);
  // The canvas is redrawn at the new size (sharp, not stretched)
  await drawnAgain(page);
  const redrawn = await page.evaluate(() => {
    const c = document.querySelector("dialog.resume canvas");
    return Math.abs(c.width - c.getBoundingClientRect().width * devicePixelRatio) < 2;
  });
  check(redrawn, `${tag}: redrawn sharp after zooming`);

  // A resize (a phone turning, a window narrowed) keeps it fitted
  const size = views[view].viewport;
  await page.setViewportSize(view === "phone" ? { width: size.height, height: size.width } : { width: 1100, height: 800 });
  await page.waitForTimeout(500);
  const turnedW = await pageWidth(page);
  const turnedInner = await page.evaluate(() => {
    const el = document.querySelector("dialog.resume .resume-doc");
    const s = getComputedStyle(el);
    return el.clientWidth - parseFloat(s.paddingLeft) - parseFloat(s.paddingRight);
  });
  check(Math.abs(turnedW - turnedInner) < 2, `${tag}: still fits after ${view === "phone" ? "turning" : "resizing"}`, `page ${turnedW.toFixed(0)} px, area ${turnedInner.toFixed(0)} px`);
  await page.setViewportSize(size);
  await page.waitForTimeout(500);

  // Scrolling the document: wheel (desktop) and keys (both). On a phone
  // the fitted page can be shorter than the screen: zoom in until it isn't
  const doc = page.locator("dialog.resume .resume-doc");
  for (let i = 0; i < 4 && (await doc.evaluate((el) => el.scrollHeight <= el.clientHeight + 200)); i++) {
    await page.getByRole("button", { name: "Zoom in" }).click();
    await page.waitForTimeout(300);
  }
  await doc.evaluate((el) => el.scrollTo(0, 0));
  const y0 = await page.evaluate(() => window.scrollY);
  if (view === "desktop") {
    const b = await doc.boundingBox();
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await page.mouse.wheel(0, 500);
    await page.waitForTimeout(400);
    const st = await doc.evaluate((el) => el.scrollTop);
    check(st > 100, `${tag}: the wheel scrolls the document`, `scrollTop ${st}`);
    await doc.evaluate((el) => el.scrollTo(0, 0));
  }
  await doc.focus();
  await page.keyboard.press("PageDown");
  await page.waitForTimeout(500);
  const st2 = await doc.evaluate((el) => el.scrollTop);
  const y1 = await page.evaluate(() => window.scrollY);
  check(st2 > 100 && y1 === y0, `${tag}: Page Down scrolls the document, not the page`, `scrollTop ${st2}, page ${y0} -> ${y1}`);

  // The world holds still under the dialog: count animation frames
  const frames = await page.evaluate(async () => {
    let n = 0;
    const raf = window.requestAnimationFrame;
    window.requestAnimationFrame = (cb) => {
      n++;
      return raf(cb);
    };
    await new Promise((r) => setTimeout(r, 1000));
    window.requestAnimationFrame = raf;
    return n;
  });
  check(frames < 5, `${tag}: the 3D world draws nothing while it's open`, `${frames} frames requested in 1 s`);

  // Contrast of the dialog's words, against what's behind them
  const contrast = await page.evaluate(() => {
    const parse = (c) => c.match(/[\d.]+/g).map(Number);
    const lum = ([r, g, b]) => {
      const f = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const over = (top, under) => {
      const a = top[3] ?? 1;
      return [0, 1, 2].map((i) => top[i] * a + under[i] * (1 - a));
    };
    const ratio = (a, b) => {
      const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
      return (x + 0.05) / (y + 0.05);
    };
    const bar = parse(getComputedStyle(document.querySelector(".resume-bar")).backgroundColor);
    const out = {};
    for (const [name, sel] of [
      ["title", ".resume-title"],
      ["zoom level", ".resume-percent"],
      ["Close", ".resume-close"],
      ["Download", ".resume-bar .resume-download"],
      ["Fit width (on)", ".resume-fit"],
    ]) {
      const el = document.querySelector(`dialog.resume ${sel}`);
      const bg = over(parse(getComputedStyle(el).backgroundColor), bar);
      out[name] = ratio(parse(getComputedStyle(el).color), bg).toFixed(1);
    }
    const ring = parse(getComputedStyle(document.documentElement).getPropertyValue("--focus-blue").trim().replace(/^#/, "").match(/../g).map((h) => parseInt(h, 16)).join(","));
    out["focus ring"] = ratio(ring, bar).toFixed(1);
    return out;
  });
  const low = Object.entries(contrast).filter(([name, r]) => Number(r) < (name === "focus ring" ? 3 : 4.5));
  check(low.length === 0, `${tag}: contrast (text 4.5:1, focus ring 3:1)`, Object.entries(contrast).map(([k, v]) => `${k} ${v}`).join(", "));

  await page.getByRole("button", { name: "Fit width" }).click();
  await drawnAgain(page);
  await doc.evaluate((el) => el.scrollTo(0, 0));
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${shots}/resume-${view}-open.jpg`, type: "jpeg", quality: 80 });
  check(page.errors.length === 0, `${tag}: no page errors`, page.errors.join(" | "));
  await ctx.close();
}

async function drawnAgain(page) {
  await page.waitForFunction(
    () => {
      const c = document.querySelector("dialog.resume canvas");
      return c && Math.abs(c.width - c.getBoundingClientRect().width * devicePixelRatio) < 2;
    },
    null,
    { timeout: 5000 },
  ).catch(() => {});
}

// ---------- 3. A résumé of more than one page: page navigation ----------

{
  const { ctx, page } = await newPage("desktop");
  await page.route(`**${PDF}`, (route) => route.fulfill({ status: 200, contentType: "application/pdf", body: twoPages() }));
  await visit(page, "/contact");
  await (await trigger(page, "/contact", "desktop")).click();
  await waitDrawn(page);
  await page.waitForTimeout(300);
  const label = () => page.locator("dialog.resume .resume-pageno").innerText();
  const n = await page.locator("dialog.resume .resume-page").count();
  check(n === 2 && (await label()) === "Page 1 of 2", "two pages: both drawn, 'Page 1 of 2'", `${n} pages, "${await label()}"`);
  await page.getByRole("button", { name: "Next page" }).click();
  await page.waitForTimeout(400);
  const st = await page.locator("dialog.resume .resume-doc").evaluate((el) => el.scrollTop);
  check((await label()) === "Page 2 of 2" && st > 300, "two pages: Next page goes to page 2", `"${await label()}", scrollTop ${st}`);
  await page.getByRole("button", { name: "Previous page" }).click();
  await page.waitForTimeout(400);
  check((await label()) === "Page 1 of 2", "two pages: Previous page comes back");
  await ctx.close();
}

// ---------- 4. Failures: the error state, and Retry ----------

const failures = {
  "PDF 404": (page) => page.route(`**${PDF}`, (r) => r.fulfill({ status: 404, body: "Not found" })),
  "PDF request aborted": (page) => page.route(`**${PDF}`, (r) => r.abort("failed")),
  "corrupt PDF": (page) => page.route(`**${PDF}`, (r) => r.fulfill({ status: 200, contentType: "application/pdf", body: "%PDF-1.5\nthis is not a PDF at all\n%%EOF" })),
  "worker script blocked": (page) => page.context().route(/turbopack-worker|pdf\.worker/, (r) => r.abort("blockedbyclient")),
};

for (const view of Object.keys(views)) {
  for (const [name, block] of Object.entries(failures)) {
    const tag = `${view} ${name}`;
    const { ctx, page } = await newPage(view);
    await visit(page, "/contact");
    await block(page);
    await (await trigger(page, "/contact", view)).click();
    const shown = await page.waitForSelector("dialog.resume[open] .resume-error", { timeout: 35000 }).then(
      () => true,
      () => false,
    );
    const err = await page.evaluate(() => {
      const e = document.querySelector("dialog.resume .resume-error");
      return {
        role: e?.getAttribute("role"),
        text: e?.textContent ?? "",
        retry: !!e?.querySelector("button"),
        download: e?.querySelector("a[download]")?.getAttribute("href"),
      };
    });
    check(shown && err.role === "alert" && err.retry && err.download === PDF, `${tag}: error shown with Retry and Download`, err.text.slice(0, 110));
    check(await focusInDialog(page), `${tag}: focus still in the dialog`);
    if (name === "worker script blocked" || (view === "desktop" && name === "PDF 404")) {
      await page.screenshot({ path: `${shots}/resume-${view}-error.jpg`, type: "jpeg", quality: 80 });
    }
    await page.unrouteAll({ behavior: "ignoreErrors" });
    await page.context().unrouteAll({ behavior: "ignoreErrors" });
    await page.getByRole("button", { name: "Retry" }).click();
    const recovered = await waitDrawn(page);
    check(recovered && (await page.locator("dialog.resume .resume-error").count()) === 0, `${tag}: Retry recovers`);
    check(await focusInDialog(page), `${tag}: focus kept in the dialog through Retry`);
    check(page.errors.length === 0, `${tag}: no page errors`, page.errors.join(" | "));
    await ctx.close();
  }
}

// The reader itself (pdf.js) failing to download, then coming back
{
  const { ctx, page } = await newPage("desktop");
  await visit(page, "/contact");
  // Every script requested from now on: the viewer's own chunk is warmed
  // on hover, so let it in first
  await page.locator("a[data-resume]:visible").first().hover();
  await page.waitForTimeout(800);
  await page.route(/\/_next\/static\/(immutable\/)?chunks\/.*\.js(\?|$)/, (r) => r.abort("failed"));
  await (await trigger(page, "/contact", "desktop")).click();
  const shown = await page.waitForSelector("dialog.resume[open] .resume-error", { timeout: 20000 }).then(
    () => true,
    () => false,
  );
  check(shown, "reader chunk blocked: error shown", await page.locator("dialog.resume .resume-error p").first().innerText().catch(() => ""));
  await page.unrouteAll({ behavior: "ignoreErrors" });
  await page.getByRole("button", { name: "Retry" }).click();
  check(await waitDrawn(page), "reader chunk blocked: Retry recovers");
  await ctx.close();
}

// ---------- 5. Motion: a short fade and rise; reduced motion, a fade only ----------

for (const motion of ["no-preference", "reduce"]) {
  const { ctx, page } = await newPage("desktop", { reducedMotion: motion });
  await visit(page, "/contact");
  await (await trigger(page, "/contact", "desktop")).click();
  await page.waitForSelector("dialog.resume[open]");
  const anim = await page.evaluate(() => {
    const s = getComputedStyle(document.querySelector("dialog.resume"));
    return { name: s.animationName, duration: parseFloat(s.animationDuration) };
  });
  const ok = motion === "reduce" ? anim.name === "resume-fade" && anim.duration <= 0.1 : anim.name === "resume-in" && anim.duration <= 0.3;
  check(ok, `motion ${motion}: ${motion === "reduce" ? "a brief fade only" : "a short fade in"}`, `${anim.name} ${anim.duration}s`);
  // Timed in the page, from the key to the dialog's close event, once the
  // page has been drawn (drawing would hold up the main thread)
  await waitDrawn(page);
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    const d = document.querySelector("dialog.resume");
    window.__closeTiming = {};
    document.addEventListener("keydown", () => (window.__closeTiming.key = performance.now()), { capture: true, once: true });
    d.addEventListener("close", () => (window.__closeTiming.close = performance.now()), { once: true });
  });
  await page.keyboard.press("Escape");
  await waitClosed(page);
  await page.waitForFunction(() => window.__closeTiming.close, null, { timeout: 2000 }).catch(() => {});
  const took = await page.evaluate(() => Math.round(window.__closeTiming.close - window.__closeTiming.key));
  check(took < (motion === "reduce" ? 150 : 300), `motion ${motion}: closes promptly`, `${took} ms from Escape to closed`);
  await ctx.close();
}

await browser.close();
console.log(`\n${passed} ok, ${failed} failed`);
process.exit(failed ? 1 : 0);

// A small, valid PDF of two US Letter pages with a line of text on each
function twoPages() {
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [4 0 R 6 0 R] /Count 2 >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  for (const n of [1, 2]) {
    const text = `BT /F1 28 Tf 72 700 Td (Test page ${n} of 2) Tj ET`;
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${objects.length + 2} 0 R >>`);
    objects.push(`<< /Length ${text.length} >>\nstream\n${text}\nendstream`);
  }
  let out = "%PDF-1.4\n";
  const offsets = [];
  objects.forEach((body, i) => {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = out.length;
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const o of offsets) out += `${String(o).padStart(10, "0")} 00000 n \n`;
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, "latin1");
}
