// The mobile audit: every route, the Sections menu, the weather slip and
// the résumé dialog, at phone, tablet, desktop and phone-landscape sizes,
// against a production build. Headless Chrome with touch emulation and
// emulated safe-area insets (CDP Emulation.setSafeAreaInsetsOverride, so
// env(safe-area-inset-*) resolves as on a notched phone): not a real
// device.
//
//   npm run build && npx next start -p 3202
//   PLAYWRIGHT=…/playwright/index.mjs node docs/ui/scripts/mobile-audit.mjs http://localhost:3202 [outDir]
//   SHOTS=docs/ui/screenshots PREFIX=after …   also saves mobile-<prefix>-<size>-<page>.jpg
//
// Prints each finding, then counts by kind; writes <outDir>/mobile-audit.json.
// Exits 1 if anything in the "fail" kinds is found.
//
// What counts:
// - overflow: the document scrolls sideways, or an element reaches past the
//   viewport without an ancestor clipping it
// - small: an interactive target under 44x44 CSS px. Exempt: links inside
//   running text (the block around them has other words; WCAG 2.5.8's
//   inline exception) and the PDF's own links on the résumé's pages
// - overlap: two targets whose boxes intersect (neither inside the other)
// - close: two targets less than 8px apart, unless both are at least 48px
//   across the edge they share (rows in a list, keys in a grid: a tap
//   anywhere lands on exactly one, and each is bigger than the minimum)
// - tiny-text: visible text under 12px
// - unsafe: a control or text (fixed ones anywhere, the rest sideways)
//   under an emulated safe-area inset, or out of the viewport
// - fit: an open menu, slip or dialog taller or wider than the safe
//   viewport, or one with more content than room that can't scroll
// - chain: an open menu or slip that scrolls but lets the scroll run on to
//   the page behind it (touch scroll gesture, CDP)
// - clipped: a button's label cut off by its own box (200% text)
// - tap: a tap on a main action that didn't do its job
// Warnings (listed, not failures): body text under 16px on phones, :hover
// rules outside @media (hover: hover), and backdrop-filtered elements on
// screen during a scroll on a phone (a number, for comparing).
import { mkdirSync, writeFileSync } from "node:fs";
import { listed } from "../../../app/sections/registry.ts";
import { launch } from "../../audit/scripts/pw.mjs";

const [base = "http://localhost:3202", out = "mobile-audit-out"] = process.argv.slice(2);
const SHOTS = process.env.SHOTS;
const PREFIX = process.env.PREFIX || "now";
mkdirSync(out, { recursive: true });
if (SHOTS) mkdirSync(SHOTS, { recursive: true });

// ROUTES=/,/contact and ONLY=320,844x390 narrow a run while working on something
const routes = listed.map((s) => s.href).filter((r) => !process.env.ROUTES || process.env.ROUTES.split(",").includes(r));
const slug = (route) => (route === "/" ? "home" : route.slice(1));
const FAIL_KINDS = ["overflow", "small", "overlap", "close", "tiny-text", "unsafe", "fit", "chain", "clipped", "tap", "error"];

// Insets of a notched phone held upright (top: the status bar and notch,
// bottom: the home bar), on its side (the notch left or right), and an
// iPad's status bar and home bar
const PHONE = { top: 47, bottom: 34, left: 0, right: 0 };
const PHONE_LAND = { top: 0, bottom: 21, left: 47, right: 47 };
const PAD = { top: 24, bottom: 20, left: 0, right: 0 };
const NONE = { top: 0, bottom: 0, left: 0, right: 0 };
const profiles = [
  { name: "320", width: 320, height: 640, touch: true, phone: true, insets: { ...PHONE, top: 20, bottom: 0 } },
  { name: "390", width: 390, height: 844, touch: true, phone: true, insets: PHONE },
  { name: "430", width: 430, height: 932, touch: true, phone: true, insets: { ...PHONE, top: 59 } },
  { name: "768", width: 768, height: 1024, touch: true, insets: PAD },
  { name: "1024p", width: 1024, height: 1366, touch: true, insets: PAD },
  { name: "1024l", width: 1024, height: 768, touch: true, insets: PAD },
  { name: "1440", width: 1440, height: 900, touch: false, insets: NONE },
  { name: "844x390", width: 844, height: 390, touch: true, phone: true, insets: PHONE_LAND },
  { name: "667x375", width: 667, height: 375, touch: true, phone: true, insets: NONE },
  // 200% text: the root font doubled (the site sizes its text in rem), so
  // labels grow inside their boxes
  { name: "320-text200", width: 320, height: 640, touch: true, phone: true, insets: { ...PHONE, top: 20, bottom: 0 }, text: 2 },
  { name: "390-text200", width: 390, height: 844, touch: true, phone: true, insets: PHONE, text: 2 },
  { name: "844x390-text200", width: 844, height: 390, touch: true, phone: true, insets: PHONE_LAND, text: 2 },
];
const SHOT_SIZES = new Set(["320", "390", "844x390", "768"]);
const SHOT_PAGES = new Set(["/", "/projects", "/contact"]);

const findings = [];
const warnings = [];
const metrics = [];
const seen = new Set();
function report(kind, where, detail) {
  const key = `${kind}|${where}|${detail}`;
  if (seen.has(key)) return;
  seen.add(key);
  (FAIL_KINDS.includes(kind) ? findings : warnings).push({ kind, where, detail });
  console.log(`${FAIL_KINDS.includes(kind) ? "FAIL" : "warn"} [${kind}] ${where}  ${detail}`);
}

// ---------- in the page ----------

// Everything measured in one pass. `scope` limits it to an open layer (the
// menu, the slip, the dialog); `insets` are the emulated safe areas.
const measure = ({ scope, insets, phone, touch, width, height }) => {
  // Touch: 44px and 8px apart. A mouse only: WCAG 2.5.8 (24px), no spacing rule
  const min = touch ? 43.5 : 23.5;
  // The screen the profile is, not innerWidth: a phone (isMobile) widens
  // its layout viewport when the page overflows, which would hide it
  const vw = width;
  const vh = height;
  const root = scope ? document.querySelector(scope) : document;
  const describe = (el) => {
    const id = el.id ? `#${el.id}` : "";
    const cls = [...el.classList].filter((c) => !/^(only-|arrive|take-clicks|font-|text-|mt-|min-|items-|inline-)/.test(c) || c === "text-link").slice(0, 2).map((c) => `.${c}`).join("");
    const label = (el.getAttribute("aria-label") || el.innerText || el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 24);
    return `${el.tagName.toLowerCase()}${id}${cls}${label ? ` "${label}"` : ""}`;
  };
  const visible = (el) => {
    if (!el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) return false;
    if (el.closest("[aria-hidden=true], [inert]") && !el.closest("dialog[open]")) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const srOnly = (el) => {
    for (let e = el; e && e !== document.body; e = e.parentElement) {
      const cs = getComputedStyle(e);
      const r = e.getBoundingClientRect();
      if (cs.position === "absolute" && cs.overflow === "hidden" && r.width <= 2 && r.height <= 2) return true;
    }
    return false;
  };
  // Fixed, or in the top layer (an open popover or dialog): measured
  // against the screen, not the page
  const layerOf = (el) => {
    for (let e = el; e; e = e.parentElement) {
      if (e.matches(":popover-open, dialog[open]")) return e;
      if (getComputedStyle(e).position === "fixed") return e;
    }
    return null;
  };
  // A link in a sentence: the block it's in has words besides it
  const inline = (el) => {
    if (el.tagName !== "A" || getComputedStyle(el).display !== "inline") return false;
    let block = el.parentElement;
    while (block && getComputedStyle(block).display === "inline") block = block.parentElement;
    const own = el.textContent.trim().length;
    return block && block.textContent.replace(/\s+/g, " ").trim().length > own + 3;
  };
  const targets = [...root.querySelectorAll("a[href], button, [role=tab], input, select, summary, [tabindex='0']")].filter(
    (el) => visible(el) && getComputedStyle(el).pointerEvents !== "none" && !el.classList.contains("skip-link") && !srOnly(el) && !el.closest(".textLayer, .resume-link") && !el.matches(".resume-link, .resume-doc"),
  );
  const out = { small: [], overlap: [], close: [], tinyText: [], bodySmall: [], unsafe: [], overflow: [], clipped: [], layers: [] };
  const scrollX0 = scrollX;
  const scrollY0 = scrollY;
  const boxes = targets.map((el) => {
    const r = el.getBoundingClientRect();
    const layer = layerOf(el);
    const dx = layer ? 0 : scrollX0;
    const dy = layer ? 0 : scrollY0;
    return { el, layer, inline: inline(el), r: { l: r.left + dx, t: r.top + dy, r: r.right + dx, b: r.bottom + dy, w: r.width, h: r.height }, v: r };
  });

  for (const b of boxes) {
    if (!b.inline && (b.r.w < min || b.r.h < min)) out.small.push(`${describe(b.el)} ${Math.round(b.r.w)}x${Math.round(b.r.h)}`);
    // A label cut off by its own box (glass clips its insides): the words'
    // own extent against the box (the press's ripple, a pseudo-element,
    // is bigger than the box on purpose, so scrollWidth can't tell)
    if (b.el.matches(".glass, button") && getComputedStyle(b.el).overflow !== "visible") {
      const rects = [];
      const tw = document.createTreeWalker(b.el, NodeFilter.SHOW_TEXT);
      for (let t = tw.nextNode(); t; t = tw.nextNode()) {
        if (!t.textContent.trim() || srOnly(t.parentElement) || !t.parentElement.checkVisibility()) continue;
        const words = document.createRange();
        words.selectNodeContents(t);
        rects.push(...[...words.getClientRects()].filter((q) => q.width > 0 && q.height > 0));
      }
      const box = b.el.getBoundingClientRect();
      const cut = rects.some((q) => q.left < box.left - 1 || q.right > box.right + 1 || q.top < box.top - 1 || q.bottom > box.bottom + 1);
      // An ellipsis is a cut, unless the design asks for one (.rh-condition)
      const ellipsed = [...b.el.querySelectorAll("*")].some((e) => !e.matches(".rh-condition, .rh-asof") && e.checkVisibility() && getComputedStyle(e).textOverflow === "ellipsis" && e.scrollWidth > e.clientWidth + 1);
      if (cut || ellipsed) out.clipped.push(`${describe(b.el)} ${Math.round(box.width)}x${Math.round(box.height)}`);
    }
  }
  // Pairs, within one layer (or the page)
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i];
      const c = boxes[j];
      if (a.layer !== c.layer || a.inline || c.inline) continue;
      if (a.el.contains(c.el) || c.el.contains(a.el)) continue;
      const gx = Math.max(a.r.l - c.r.r, c.r.l - a.r.r);
      const gy = Math.max(a.r.t - c.r.b, c.r.t - a.r.b);
      if (gx < -0.5 && gy < -0.5) {
        out.overlap.push(`${describe(a.el)} / ${describe(c.el)} by ${Math.round(-gx)}x${Math.round(-gy)}`);
        continue;
      }
      const gap = Math.max(gx, gy);
      if (gap >= 7.5 || !touch) continue;
      // Side by side (gx is the gap): their heights are the shared edge
      const across = gx >= gy ? Math.min(a.r.h, c.r.h) : Math.min(a.r.w, c.r.w);
      const along = gx >= gy ? Math.min(a.r.w, c.r.w) : Math.min(a.r.h, c.r.h);
      if (across >= 47.5 && along >= 43.5) continue;
      if (gx >= gy ? gy > -0.5 : gx > -0.5) continue; // diagonal neighbours only touch at a corner
      out.close.push(`${describe(a.el)} / ${describe(c.el)} ${Math.round(gap)}px apart`);
    }
  }

  // The part of a box that shows: cut by every ancestor that clips (a
  // menu that scrolls, a drawing that clips its labels); null if none
  const shownPart = (rect, el) => {
    let { left, top, right, bottom } = rect;
    for (let e = el.parentElement; e && e !== document.documentElement; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.overflowX === "visible" && cs.overflowY === "visible") continue;
      const er = e.getBoundingClientRect();
      if (cs.overflowX !== "visible") {
        left = Math.max(left, er.left);
        right = Math.min(right, er.right);
      }
      if (cs.overflowY !== "visible") {
        top = Math.max(top, er.top);
        bottom = Math.min(bottom, er.bottom);
      }
    }
    return right - left > 1 && bottom - top > 1 ? { left, top, right, bottom } : null;
  };
  const unsafeAt = (q, fixed) =>
    q.left < insets.left - 0.5 || q.right > vw - insets.right + 0.5 || (fixed && (q.top < insets.top - 0.5 || q.bottom > vh - insets.bottom + 0.5));

  // Text
  const walker = document.createTreeWalker(root === document ? document.body : root, NodeFilter.SHOW_TEXT);
  const textSeen = new Set();
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const text = n.textContent.replace(/\s+/g, " ").trim();
    const el = n.parentElement;
    if (!text || !el || textSeen.has(el) || el.closest(".textLayer, script, style, noscript, svg, .skip-link")) continue;
    textSeen.add(el);
    if (!visible(el) || srOnly(el)) continue;
    const cs = getComputedStyle(el);
    const size = parseFloat(cs.fontSize);
    if (size < 11.95) out.tinyText.push(`${describe(el)} ${size.toFixed(1)}px "${text.slice(0, 20)}"`);
    const block = el.closest("p, li, dd");
    if (phone && block && block === el && text.length >= 60 && size < 15.95 && el.closest("main")) out.bodySmall.push(`${describe(el)} ${size}px`);
    // Text sideways under a safe area (the scrolling page) or anywhere
    // under one (fixed things)
    const r = el.getBoundingClientRect();
    const fixed = !!layerOf(el);
    const range = document.createRange();
    range.selectNodeContents(n);
    const tr = range.getBoundingClientRect();
    if (tr.width === 0) continue;
    const shown = shownPart(tr, n); // from the text's own element up
    if (shown && unsafeAt(shown, fixed) && !(!fixed && r.bottom < 0))
      out.unsafe.push(`text ${describe(el)} at ${Math.round(shown.left)},${Math.round(shown.top)}–${Math.round(shown.right)},${Math.round(shown.bottom)}`);
  }
  // Controls under a safe area
  for (const b of boxes) {
    const r = b.v;
    if (b.el.matches(".resume-doc")) continue; // it scrolls under the home bar on purpose, and pads its pages for it
    // Only the part that shows (a row half scrolled out of its menu)
    const part = shownPart(r, b.el);
    if (part && unsafeAt(part, !!b.layer))
      out.unsafe.push(`control ${describe(b.el)} at ${Math.round(part.left)},${Math.round(part.top)}–${Math.round(part.right)},${Math.round(part.bottom)}`);
    // A fixed control must also be the thing a tap at its middle reaches
    if (b.layer) {
      const x = r.left + r.width / 2;
      const y = r.top + r.height / 2;
      // (Not one scrolled out of sight inside its menu)
      const scroller = b.el.parentElement?.closest(":popover-open, .resume-doc");
      const sr = scroller?.getBoundingClientRect();
      const shown = !sr || (y > sr.top && y < sr.bottom);
      if (shown && x >= 0 && x < vw && y >= 0 && y < vh) {
        const hit = document.elementFromPoint(x, y);
        if (hit && !b.el.contains(hit) && !hit.contains(b.el)) out.overlap.push(`${describe(b.el)} covered at its middle by ${describe(hit)}`);
      }
    }
  }

  // Sideways overflow
  if (!scope) {
    out.docOverflow = Math.max(document.documentElement.scrollWidth, innerWidth) - vw;
    for (const el of document.body.querySelectorAll("*")) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || (r.right <= vw + 1 && r.left >= -1)) continue;
      if (!el.checkVisibility({ visibilityProperty: true }) || srOnly(el) || el.closest(".world3d, .resume, [popover]:not(:popover-open)")) continue;
      let clipped = false;
      for (let e = el.parentElement; e && e !== document.documentElement; e = e.parentElement) {
        const cs = getComputedStyle(e);
        if (cs.overflowX !== "visible" || cs.clipPath !== "none" || cs.contain.includes("paint")) {
          const er = e.getBoundingClientRect();
          if (er.right <= vw + 1 && er.left >= -1) clipped = true;
          break;
        }
      }
      const parentOffends = (() => {
        const p = el.parentElement?.getBoundingClientRect();
        return p && (p.right > vw + 1 || p.left < -1);
      })();
      if (!clipped && !parentOffends) out.overflow.push(`${describe(el)} ${Math.round(r.left)}–${Math.round(r.right)}`);
    }
  }

  // Open layers: fit and scroll
  for (const layer of document.querySelectorAll(":popover-open, dialog[open]")) {
    const r = layer.getBoundingClientRect();
    const cs = getComputedStyle(layer);
    const scroller = layer.matches("dialog") ? layer.querySelector(".resume-doc") : layer;
    const scs = scroller ? getComputedStyle(scroller) : cs;
    out.layers.push({
      id: describe(layer),
      top: r.top,
      bottom: r.bottom,
      left: r.left,
      right: r.right,
      height: r.height,
      width: r.width,
      scrollable: scroller ? scroller.scrollHeight > scroller.clientHeight + 1 : false,
      overflowY: scs.overflowY,
      overscroll: scs.overscrollBehaviorY,
    });
  }
  return out;
};

// ---------- the browser ----------

const browser = await launch();
const errors = [];

async function open(profile) {
  const ctx = await browser.newContext({
    viewport: { width: profile.width, height: profile.height },
    deviceScaleFactor: profile.touch ? 2 : 1,
    isMobile: profile.touch,
    hasTouch: profile.touch,
  });
  const page = await ctx.newPage();
  page.setDefaultTimeout(8000);
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Emulation.setSafeAreaInsetsOverride", { insets: profile.insets });
  page.on("pageerror", (e) => errors.push(`${profile.name}: ${e}`));
  if (profile.text) await page.addInitScript((k) => {
    addEventListener("DOMContentLoaded", () => {
      const s = document.createElement("style");
      s.textContent = `html { font-size: ${16 * k}px !important; }`;
      document.head.append(s);
    });
  }, profile.text);
  return { ctx, page, cdp };
}

async function visit(page, route) {
  await page.goto(base + route, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.next, null, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1800);
}

const press = (profile, locator) => (profile.touch ? locator.tap() : locator.click());

function file(profile, route, state, m) {
  const where = `${profile.name} ${route}${state ? ` [${state}]` : ""}`;
  if (m.docOverflow > 0) report("overflow", where, `document scrolls ${m.docOverflow}px sideways`);
  for (const d of m.overflow.slice(0, 6)) report("overflow", where, d);
  for (const d of m.small) report("small", where, d);
  for (const d of m.overlap) report("overlap", where, d);
  for (const d of m.close) report("close", where, d);
  for (const d of m.tinyText) report("tiny-text", where, d);
  for (const d of m.unsafe) report("unsafe", where, d);
  for (const d of m.clipped) report("clipped", where, d);
  for (const d of m.bodySmall) report("body<16", where, d);
  const safeH = profile.height - profile.insets.top - profile.insets.bottom;
  for (const l of m.layers) {
    const overTop = l.top < profile.insets.top - 0.5;
    const overBottom = l.bottom > profile.height - profile.insets.bottom + 0.5;
    const isDialog = l.id.startsWith("dialog");
    // The dialog fills the screen on phones and pads its own bar and
    // document for the insets: only the controls inside it are checked
    if (!isDialog && (overTop || overBottom || l.height > safeH + 0.5)) report("fit", where, `${l.id} ${Math.round(l.top)}–${Math.round(l.bottom)} in a ${profile.height}px screen (safe ${profile.insets.top}–${profile.height - profile.insets.bottom})`);
    if (l.left < -0.5 || l.right > profile.width + 0.5) report("fit", where, `${l.id} ${Math.round(l.left)}–${Math.round(l.right)} wider than the screen`);
    if (l.scrollable && !/auto|scroll/.test(l.overflowY)) report("fit", where, `${l.id} has more than fits but can't scroll (overflow-y ${l.overflowY})`);
    if (l.scrollable && l.overscroll === "auto") report("chain-risk", where, `${l.id} scrolls with overscroll-behavior auto`);
  }
}

// A real touch scroll (CDP), inside an element: does the page behind move?
async function chains(page, cdp, selector) {
  const box = await page.locator(selector).boundingBox();
  if (!box) return null;
  await page.evaluate((s) => {
    const el = document.querySelector(s);
    el.scrollTop = el.scrollHeight;
  }, selector);
  const before = await page.evaluate(() => scrollY);
  await cdp.send("Input.synthesizeScrollGesture", {
    x: Math.round(box.x + box.width / 2),
    y: Math.round(box.y + Math.min(box.height - 10, 120)),
    yDistance: -260,
    gestureSourceType: "touch",
    speed: 1200,
  });
  await page.waitForTimeout(400);
  const after = await page.evaluate(() => scrollY);
  return after - before;
}

for (const profile of profiles.filter((p) => !process.env.ONLY || process.env.ONLY.split(",").includes(p.name))) {
  const { ctx, page, cdp } = await open(profile);
  const insets = profile.insets;
  for (const route of routes) {
    const where = `${profile.name} ${route}`;
    let step = "page";
    try {
    await visit(page, route);
    file(profile, route, "", await page.evaluate(measure, { insets, phone: profile.phone, touch: profile.touch, width: profile.width, height: profile.height }));
    // Fixed things again at the foot of the page
    await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(300);
    file(profile, route, "scrolled", await page.evaluate(measure, { scope: ".world-controls", insets, phone: profile.phone, touch: profile.touch, width: profile.width, height: profile.height }));
    if (SHOTS && !profile.text && SHOT_SIZES.has(profile.name) && SHOT_PAGES.has(route)) {
      await page.evaluate(() => scrollTo(0, 0));
      await page.waitForTimeout(400);
      await page.screenshot({ path: `${SHOTS}/mobile-${PREFIX}-${profile.name}-${slug(route)}.jpg`, type: "jpeg", quality: 62 });
    }
    await page.evaluate(() => scrollTo(0, 0));
    await page.waitForTimeout(200);

    // The Sections menu
    step = "menu";
    const sections = page.locator('button[popovertarget="places-menu"]');
    await press(profile, sections);
    await page.waitForTimeout(350);
    const menuOpen = await page.evaluate(() => !!document.querySelector("#places-menu:popover-open"));
    if (!menuOpen) report("tap", where, "Sections didn't open the menu");
    else {
      file(profile, route, "menu", await page.evaluate(measure, { scope: "#places-menu", insets, phone: profile.phone, touch: profile.touch, width: profile.width, height: profile.height }));
      if (profile.touch) {
        const scrollable = await page.evaluate(() => {
          const m = document.querySelector("#places-menu");
          return m.scrollHeight > m.clientHeight + 1;
        });
        const pageScrolls = await page.evaluate(() => document.documentElement.scrollHeight > innerHeight + 1);
        if (scrollable && pageScrolls) {
          const moved = await chains(page, cdp, "#places-menu");
          if (moved) report("chain", where, `a touch scroll in the menu moved the page ${moved}px`);
        }
      }
      await page.keyboard.press("Escape");
      await page.waitForTimeout(200);
    }

    // The weather slip
    step = "weather";
    const chip = page.locator(".rh-chip");
    if (await chip.isVisible()) {
      await page.evaluate(() => scrollTo(0, 0));
      await press(profile, chip);
      await page.waitForTimeout(350);
      const slip = await page.evaluate(() => !!document.querySelector("#rh-details:popover-open"));
      if (!slip) report("tap", where, "the time and weather didn't open their slip");
      else {
        file(profile, route, "weather", await page.evaluate(measure, { scope: "#rh-details", insets, phone: profile.phone, touch: profile.touch, width: profile.width, height: profile.height }));
        if (profile.touch) {
          const scrollable = await page.evaluate(() => {
            const m = document.querySelector("#rh-details");
            return m.scrollHeight > m.clientHeight + 1;
          });
          if (scrollable) {
            const moved = await chains(page, cdp, "#rh-details");
            if (moved) report("chain", where, `a touch scroll in the weather slip moved the page ${moved}px`);
          }
        }
        // A tap elsewhere closes it (light dismiss)
        if (profile.touch) {
          step = "weather: tap outside";
          // A point with nothing to press within 24px of it, outside the
          // slip (Chrome moves a tap onto a target close by, as a finger
          // is wide: a tap in the gap between two links follows one)
          const spot = await page.evaluate(() => {
            const slip = document.querySelector("#rh-details").getBoundingClientRect();
            const clear = (x, y) => {
              const hit = document.elementFromPoint(x, y);
              return hit && !hit.closest('a, button, [tabindex]:not([tabindex="-1"]), canvas, label, input');
            };
            for (let y = innerHeight - 40; y > 0; y -= 17) {
              for (const x of [30, innerWidth / 2, innerWidth - 30]) {
                if (x >= slip.left - 24 && x <= slip.right + 24 && y >= slip.top - 24 && y <= slip.bottom + 24) continue;
                if ([[0, 0], [-24, 0], [24, 0], [0, -24], [0, 24]].every(([dx, dy]) => clear(x + dx, y + dy))) return { x: Math.round(x), y: Math.round(y) };
              }
            }
            return null;
          });
          // (Over the world on wide screens every point is the scene or a
          // control: then Escape closes it instead)
          if (spot) {
            await page.touchscreen.tap(spot.x, spot.y);
            await page.waitForTimeout(300);
            if (await page.evaluate(() => !!document.querySelector("#rh-details:popover-open"))) report("tap", where, "a tap outside left the weather slip open");
          }
          // (Escape with nothing open would go back to the park)
          if (await page.evaluate(() => !!document.querySelector("#rh-details:popover-open"))) await page.keyboard.press("Escape");
          // That tap may still have found something; come back
          if (await page.evaluate(() => !!document.querySelector("dialog.resume")?.open)) {
            await page.keyboard.press("Escape");
            await page.waitForTimeout(400);
          }
          if (new URL(page.url()).pathname !== route) await visit(page, route);
        } else await page.keyboard.press("Escape");
      }
    }

    // The résumé
    step = "résumé: open";
    const link = page.locator("a[data-resume]:visible").first();
    if ((await link.count()) && (await link.isVisible())) {
      await link.scrollIntoViewIfNeeded();
      // The first opening fetches the viewer and pdf.js: the tap can take a
      // moment to be acknowledged while the page is busy (slow, not stuck)
      const t0 = Date.now();
      await (profile.touch ? link.tap({ timeout: 20000 }) : link.click({ timeout: 20000 }));
      if (Date.now() - t0 > 3000) report("slow", where, `the résumé link took ${Date.now() - t0}ms to take the tap`);
      const opened = await page.waitForSelector("dialog.resume[open] .resume-page[data-drawn] canvas", { timeout: 20000 }).then(() => true, () => false);
      if (!opened) report("tap", where, "the résumé link didn't open the viewer");
      else {
        await page.waitForTimeout(300);
        file(profile, route, "résumé", await page.evaluate(measure, { scope: "dialog.resume", insets, phone: profile.phone, touch: profile.touch, width: profile.width, height: profile.height }));
        if (SHOTS && !profile.text && SHOT_SIZES.has(profile.name) && route === "/") await page.screenshot({ path: `${SHOTS}/mobile-${PREFIX}-${profile.name}-resume.jpg`, type: "jpeg", quality: 62 });
        if (profile.touch && route === "/") {
          // Zoom in, then pan the page sideways and down with a finger
          step = "résumé: Zoom in";
          const zoomIn = page.getByRole("button", { name: "Zoom in" });
          await zoomIn.tap();
          await zoomIn.tap();
          await page.waitForTimeout(500);
          const doc = await page.locator(".resume-doc").boundingBox();
          const before = await page.evaluate(() => {
            const d = document.querySelector(".resume-doc");
            return { x: d.scrollLeft, y: d.scrollTop, wide: d.scrollWidth > d.clientWidth, tall: d.scrollHeight - d.clientHeight - d.scrollTop > 40, page: scrollY };
          });
          const mid = { x: Math.round(doc.x + doc.width / 2), y: Math.round(doc.y + doc.height / 2) };
          await cdp.send("Input.synthesizeScrollGesture", { ...mid, xDistance: -120, gestureSourceType: "touch", speed: 800 });
          await page.waitForTimeout(300);
          await cdp.send("Input.synthesizeScrollGesture", { ...mid, yDistance: -160, gestureSourceType: "touch", speed: 800 });
          await page.waitForTimeout(400);
          const after = await page.evaluate(() => {
            const d = document.querySelector(".resume-doc");
            return { x: d.scrollLeft, y: d.scrollTop, page: scrollY };
          });
          if (!before.wide || after.x <= before.x) report("tap", where, `résumé: zoomed in, a sideways finger drag didn't pan the page (${JSON.stringify({ before, after })})`);
          if (before.tall && after.y <= before.y) report("tap", where, "résumé: a finger drag didn't scroll the document");
          if (after.page !== before.page) report("chain", where, "résumé: scrolling the document moved the page behind");
          // A pinch on the document: the layout must hold (the dialog
          // stays the size of the screen, nothing scrolls sideways)
          const layoutBefore = await page.evaluate(() => ({ w: document.querySelector("dialog.resume").getBoundingClientRect().width, sw: document.documentElement.scrollWidth }));
          step = "résumé: pinch";
          await cdp.send("Input.synthesizePinchGesture", { ...mid, scaleFactor: 1.8, gestureSourceType: "touch" });
          await page.waitForTimeout(400);
          const layoutAfter = await page.evaluate(() => ({ w: document.querySelector("dialog.resume").getBoundingClientRect().width, sw: document.documentElement.scrollWidth, scale: visualViewport.scale }));
          if (layoutAfter.w !== layoutBefore.w || layoutAfter.sw !== layoutBefore.sw) report("tap", where, `résumé: a pinch changed the layout ${JSON.stringify({ layoutBefore, layoutAfter })}`);
          // Pinch back (the gesture's point is in the zoomed view's own
          // coordinates), and the page is as it was
          step = "résumé: pinch back";
          const vv = await page.evaluate(() => ({ x: Math.round(visualViewport.width / 2), y: Math.round(visualViewport.height / 2) }));
          await cdp.send("Input.synthesizePinchGesture", { ...vv, scaleFactor: 1 / 1.8, gestureSourceType: "touch" });
          await page.waitForTimeout(400);
          const scale = await page.evaluate(() => visualViewport.scale);
          if (Math.abs(scale - 1) > 0.02) report("tap", where, `résumé: pinching back left the page at ${scale.toFixed(2)}x`);
          // Fit width brings it back inside
          step = "résumé: Fit width";
          await page.locator(".resume-fit").tap();
          await page.waitForTimeout(400);
          const fits = await page.evaluate(() => {
            const d = document.querySelector(".resume-doc");
            return d.scrollWidth <= d.clientWidth + 1;
          });
          if (!fits) report("tap", where, "résumé: Fit width left the page wider than the screen");
          const download = page.locator("dialog.resume a[download], dialog.resume a[href$='.pdf']").first();
          if (!(await download.isVisible())) report("tap", where, "résumé: Download isn't on screen");
        }
        step = "résumé: Close";
        await press(profile, page.locator(".resume-close"));
        const closed = await page.waitForFunction(() => !document.querySelector("dialog.resume")?.open, null, { timeout: 3000 }).then(() => true, () => false);
        if (!closed) report("tap", where, "résumé: Close didn't close it");
      }
    }
    } catch (e) {
      report("error", where, `${step}: ${String(e.message).split("\n")[0]}`);
    }
  }

  // Taps on the main actions (phones and tablets)
  if (profile.touch && !profile.text) {
    const where = `${profile.name} taps`;
    try {
    await visit(page, "/");
    await press(profile, page.getByRole("link", { name: "View projects" }));
    await page.waitForURL(/\/projects$/, { timeout: 5000 }).catch(() => {});
    if (!page.url().endsWith("/projects")) report("tap", where, `"View projects" went to ${page.url()}`);
    await page.waitForTimeout(800);
    const tab = page.getByRole("tab").nth(1);
    if (await tab.isVisible()) {
      await press(profile, tab);
      await page.waitForTimeout(300);
      if ((await tab.getAttribute("aria-selected")) !== "true") report("tap", where, "a tap on a project's tab didn't choose it");
    }
    await press(profile, page.locator('button[popovertarget="places-menu"]'));
    await page.waitForTimeout(300);
    await press(profile, page.locator("#places-menu").getByRole("link", { name: /^Experience/ }));
    await page.waitForURL(/\/experience$/, { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(300);
    if (!page.url().endsWith("/experience")) report("tap", where, `the menu's Experience went to ${page.url()}`);
    if (await page.evaluate(() => !!document.querySelector("#places-menu:popover-open"))) report("tap", where, "the menu stayed open after choosing a section");
    const back = page.locator(".world-controls > a.glass");
    await press(profile, back);
    await page.waitForURL(base + "/", { timeout: 5000 }).catch(() => {});
    if (new URL(page.url()).pathname !== "/") report("tap", where, `the way back went to ${page.url()}`);
    if (await page.locator(".park-places").isVisible()) {
      const row = page.locator(".park-places a.place-row", { hasText: "Contact" });
      await row.scrollIntoViewIfNeeded();
      await press(profile, row);
      await page.waitForURL(/\/contact$/, { timeout: 5000 }).catch(() => {});
      if (!page.url().endsWith("/contact")) report("tap", where, `the list's last row went to ${page.url()}`);
      const onward = page.locator(".onward a.glass").first();
      await onward.scrollIntoViewIfNeeded();
      const href = await onward.getAttribute("href");
      await press(profile, onward);
      await page.waitForURL(new RegExp(`${href}$`), { timeout: 5000 }).catch(() => {});
      if (!page.url().endsWith(href)) report("tap", where, `"Other sections" ${href} went to ${page.url()}`);
    }
    } catch (e) {
      report("tap", where, String(e.message).split("\n")[0]);
    }
  }

  // Backdrop-filtered things on screen while a phone scrolls a long page
  if (profile.name === "390") {
    for (const route of ["/", "/projects", "/contact"]) {
      await visit(page, route);
      const counts = [];
      for (const y of [0.25, 0.5, 0.75]) {
        await page.evaluate((f) => scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * f), y);
        await page.waitForTimeout(150);
        counts.push(
          await page.evaluate(
            () =>
              [...document.querySelectorAll("body *")].filter((el) => {
                const cs = getComputedStyle(el);
                if (cs.backdropFilter === "none" || !el.checkVisibility()) return false;
                const r = el.getBoundingClientRect();
                return r.bottom > 0 && r.top < innerHeight && r.width > 0;
              }).length,
          ),
        );
      }
      metrics.push({ metric: "backdrop-filtered on screen while scrolling", route, counts });
      console.log(`info  backdrop-filtered on screen at 390 ${route}: ${counts.join(", ")}`);
    }
  }
  await ctx.close();
}

// :hover rules a tap could leave behind on a touch screen
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await visit(page, "/");
  const link = page.locator("a[data-resume]:visible").first();
  await link.click();
  await page.waitForSelector("dialog.resume[open]", { timeout: 15000 }).catch(() => {});
  const ungated = await page.evaluate(() => {
    const found = [];
    const walk = (rules, gated) => {
      for (const rule of rules) {
        if (rule instanceof CSSMediaRule) walk(rule.cssRules, gated || /hover:\s*hover/.test(rule.conditionText));
        else if (rule.cssRules?.length && !(rule instanceof CSSStyleRule)) walk(rule.cssRules, gated);
        else if (rule instanceof CSSStyleRule) {
          if (!gated && /:hover/.test(rule.selectorText)) found.push(rule.selectorText);
          if (rule.cssRules?.length) walk(rule.cssRules, gated);
        }
      }
    };
    for (const sheet of document.styleSheets) {
      try {
        walk(sheet.cssRules, false);
      } catch {}
    }
    return found;
  });
  for (const s of ungated) report("hover-ungated", "css", s);
  await ctx.close();
}

await browser.close();
for (const e of errors.slice(0, 5)) report("error", "page", e);

const count = (list) => list.reduce((acc, f) => ((acc[f.kind] = (acc[f.kind] || 0) + 1), acc), {});
const summary = { failures: count(findings), warnings: count(warnings), metrics };
writeFileSync(`${out}/mobile-audit.json`, JSON.stringify({ summary, findings, warnings }, null, 2));
console.log("\nfailures by kind:", JSON.stringify(summary.failures));
console.log("warnings by kind:", JSON.stringify(summary.warnings));
console.log(`${findings.length} failures, ${warnings.length} warnings`);
process.exit(findings.length ? 1 : 0);
