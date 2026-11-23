// The mobile audit: the one-page city (`/`) and each of its anchors (/#about,
// /#projects, /#skills, /#experience, /#interests, /#contact), each the
// journey's stop it lands on (CityTrack.tsx: the stops side by side, the
// page's scroll moving along them), the Sections
// menu, the weather display, the metro map and the résumé dialog, at
// phone, tablet, desktop and phone-landscape sizes, against a production
// build. Headless Chrome with touch emulation and
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
//   under an emulated safe-area inset, or out of the viewport (the top
//   bar and the metro map are checked again at the foot of the page)
// - fit: an open menu, slip or dialog taller or wider than the safe
//   viewport, or one with more content than room that can't scroll; the
//   stop's panel past the stage (under the bar, or the metro map and the
//   home bar), or one
//   with more than fits that can't scroll once the journey has stopped,
//   or one that shows less than 6 root ems of its words (a slit)
// - stop: an anchor that didn't land on its stop (the journey on)
// - chain: an open menu or slip, or a stop's panel, that scrolls but lets
//   the scroll run on to the page behind it (touch scroll gesture, CDP):
//   for a panel, the city moving
// - clipped: a button's label cut off by its own box (200% text)
// - covers: the metro map (fixed at the foot of the screen, on the
//   journey) lying over the page's words or controls, at the top, middle
//   and foot (words a panel has scrolled out of its own box don't count);
//   and, in the top bar, the section's name ("03 / 06 · Projects")
//   running into the bar's name, time and weather or keys
// - tap: a tap on a main action that didn't do its job
// Warnings (listed, not failures): body text under 16px on phones, :hover
// rules outside @media (hover: hover), and backdrop-filtered elements on
// screen during a scroll on a phone (a number, for comparing).
import { mkdirSync, writeFileSync } from "node:fs";
import { pageSections } from "../../../app/sections/registry.ts";
import { launch } from "../../audit/scripts/pw.mjs";

const [base = "http://localhost:3202", out = "mobile-audit-out"] = process.argv.slice(2);
const SHOTS = process.env.SHOTS;
const PREFIX = process.env.PREFIX || "now";
mkdirSync(out, { recursive: true });
if (SHOTS) mkdirSync(SHOTS, { recursive: true });

// ROUTES=/,/#contact and ONLY=320,844x390 narrow a run while working on something
// `/` and every anchor on it, the stations' and their subsections' (Skills),
// all from the registry
const routes = [...new Set(pageSections.flatMap((s) => [s.href, ...(s.subsections ?? []).map((sub) => sub.href)]))].filter(
  (r) => !process.env.ROUTES || process.env.ROUTES.split(",").includes(r),
);
if (!routes.includes("/") || routes.length < 2) console.log(`note: auditing ${routes.join(", ") || "nothing"}`);
const slug = (route) => (route === "/" ? "home" : route.replace(/^\/#?/, "").replaceAll("/", "-"));
const FAIL_KINDS = ["overflow", "small", "overlap", "close", "tiny-text", "unsafe", "fit", "chain", "clipped", "covers", "tap", "stop", "error"];

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
  { name: "1600", width: 1600, height: 1000, touch: false, insets: NONE },
  { name: "844x390", width: 844, height: 390, touch: true, phone: true, insets: PHONE_LAND },
  { name: "667x375", width: 667, height: 375, touch: true, phone: true, insets: NONE },
  // 200% text: the root font doubled (the site sizes its text in rem), so
  // labels grow inside their boxes
  { name: "320-text200", width: 320, height: 640, touch: true, phone: true, insets: { ...PHONE, top: 20, bottom: 0 }, text: 2 },
  { name: "390-text200", width: 390, height: 844, touch: true, phone: true, insets: PHONE, text: 2 },
  { name: "844x390-text200", width: 844, height: 390, touch: true, phone: true, insets: PHONE_LAND, text: 2 },
  // A tablet with large text: the metro map's names by its own width in em
  { name: "768-text200", width: 768, height: 1024, touch: true, insets: PAD, text: 2 },
];
const SHOT_SIZES = new Set(["320", "390", "844x390", "768"]);
const SHOT_PAGES = new Set(["/", "/#projects", "/#contact"]);
// The fixed things checked again at the foot of the page
const FIXED = [".top-bar", ".progress-line"];

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
  const empty = { small: [], overlap: [], close: [], tinyText: [], bodySmall: [], unsafe: [], overflow: [], clipped: [], layers: [] };
  // A scope that isn't on this screen (the map shows only on the journey)
  if (!root || (scope && !root.checkVisibility())) return empty;
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
  // Fixed, the sticky top bar (it stays at the top while the page scrolls
  // under it), or in the top layer (an open popover or dialog): measured
  // against the screen, not the page, and only against its own layer (the
  // page's words scrolled under the bar aren't the bar's neighbours).
  // Other sticky things (a project's screenshot column) stay in the page.
  const layerOf = (el) => {
    for (let e = el; e; e = e.parentElement) {
      if (e.matches(":popover-open, dialog[open]")) return e;
      const position = getComputedStyle(e).position;
      if (position === "fixed" || (position === "sticky" && e.matches(".top-bar"))) return e;
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
  // Scrolled wholly out of an ancestor that clips it (a stop's panel that
  // scrolls inside, the journey's stage): not there to tap, nor anyone's
  // neighbour, until it's scrolled back
  const clippedOut = (el) => {
    const r = el.getBoundingClientRect();
    for (let e = el.parentElement; e && e !== document.body; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.overflowX === "visible" && cs.overflowY === "visible") continue;
      const er = e.getBoundingClientRect();
      if (r.bottom <= er.top || r.top >= er.bottom || r.right <= er.left || r.left >= er.right) return true;
    }
    return false;
  };
  // On the journey, a panel that isn't wholly on the screen is a glimpse
  // of what comes next along the street (the closure): its words are a
  // peek, not something to read or tap there (a tap or focus brings it on)
  const peek = (el) => {
    const p = el.closest(".track .panel, .track .exp-label");
    if (!p || document.documentElement.dataset.track !== "on") return false;
    const r = p.getBoundingClientRect();
    return r.left < -1 || r.right > innerWidth + 1;
  };
  const targets = [...root.querySelectorAll("a[href], button, [role=tab], input, select, summary, [tabindex='0']")].filter(
    (el) => visible(el) && !clippedOut(el) && !peek(el) && getComputedStyle(el).pointerEvents !== "none" && !el.classList.contains("skip-link") && !srOnly(el) && !el.closest(".textLayer, .resume-link") && !el.matches(".resume-link, .resume-doc"),
  );
  const out = { small: [], overlap: [], close: [], tinyText: [], bodySmall: [], unsafe: [], overflow: [], clipped: [], layers: [] };
  const scrollX0 = scrollX;
  const scrollY0 = scrollY;
  // What of a target can be tapped: its box cut by the ancestors that
  // scroll it sideways (a row of keys that scrolls): a key scrolled out of
  // its row isn't under its neighbours
  const tappable = (el, r) => {
    let { left, right } = r;
    for (let e = el.parentElement; e && e !== document.documentElement; e = e.parentElement) {
      const ox = getComputedStyle(e).overflowX;
      if (ox !== "auto" && ox !== "scroll") continue;
      const er = e.getBoundingClientRect();
      left = Math.max(left, er.left);
      right = Math.min(right, er.right);
    }
    return { left, right };
  };
  const boxes = targets.map((el) => {
    const full = el.getBoundingClientRect();
    const cut = tappable(el, full);
    const r = { left: cut.left, right: cut.right, top: full.top, bottom: full.bottom, width: cut.right - cut.left, height: full.height };
    const layer = layerOf(el);
    const dx = layer ? 0 : scrollX0;
    const dy = layer ? 0 : scrollY0;
    return { el, layer, inline: inline(el), hidden: r.width <= 0.5, r: { l: r.left + dx, t: r.top + dy, r: r.right + dx, b: r.bottom + dy, w: full.width, h: r.height }, v: full };
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
      if (a.layer !== c.layer || a.inline || c.inline || a.hidden || c.hidden) continue;
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
    if (shown && unsafeAt(shown, fixed) && !(!fixed && r.bottom < 0) && !peek(el))
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
    // (the middle of what its sideways-scrolling row shows: none, if it's
    // scrolled out of it)
    if (b.layer && !b.hidden) {
      const x = (b.r.l + b.r.r) / 2;
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
      if (!el.checkVisibility({ visibilityProperty: true }) || srOnly(el) || el.closest(".resume, [popover]:not(:popover-open)")) continue;
      // Clipped by an ancestor that is itself within the screen (the
      // journey's stage clips the stops off it; a panel off the screen
      // with it doesn't count, the stage does)
      let clipped = false;
      for (let e = el.parentElement; e && e !== document.documentElement && !clipped; e = e.parentElement) {
        const cs = getComputedStyle(e);
        if (cs.overflowX !== "visible" || cs.clipPath !== "none" || cs.contain.includes("paint")) {
          const er = e.getBoundingClientRect();
          if (er.right <= vw + 1 && er.left >= -1) clipped = true;
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

// The metro map over the page: any word or control of the page (not the
// map's own, nor the top bar's) under the map's parts, where it is fixed
// at the foot of the screen (on the journey); it must never lie over a
// panel's words. Words a panel has scrolled out of its own box are hidden
// by it, so only what shows counts. And the bar's section name must not
// run into the bar's other parts.
const covers = () => {
  const out = [];
  const box = (el) => el && el.checkVisibility() && el.getBoundingClientRect();
  const meets = (a, b) => a && b && a.width > 0 && b.width > 0 && a.left < b.right - 0.5 && a.right > b.left + 0.5 && a.top < b.bottom - 0.5 && a.bottom > b.top + 0.5;
  const here = box(document.querySelector(".top-bar-here"));
  if (here) for (const sel of [".top-bar-name", ".top-bar .rh", ".top-bar-end"]) if (meets(here, box(document.querySelector(sel)))) out.push(`the bar's section name runs into ${sel}`);
  const line = document.querySelector(".progress-line");
  if (!line || !line.checkVisibility() || getComputedStyle(line).position !== "fixed") return out;
  const parts = [line, ...line.querySelectorAll("*")].filter((e) => e.checkVisibility({ opacityProperty: true, visibilityProperty: true })).map((e) => e.getBoundingClientRect()).filter((r) => r.width > 0 && r.height > 0);
  const hit = (r) => parts.some((q) => r.left < q.right - 0.5 && r.right > q.left + 0.5 && r.top < q.bottom - 0.5 && r.bottom > q.top + 0.5);
  const label = (el) => `${el.tagName.toLowerCase()}${[...el.classList].slice(0, 2).map((c) => `.${c}`).join("")} "${(el.innerText || el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 24)}"`;
  const skip = (el) => el.closest(".progress-line, .top-bar, [popover]:not(:popover-open), script, style, noscript, .sr-only") || !el.checkVisibility({ opacityProperty: true, visibilityProperty: true });
  // Only the part a panel shows: what it has scrolled (or not yet
  // scrolled) out of its own box is hidden by it
  const inPanel = (el, r) => {
    const panel = el.parentElement?.closest(".panel");
    const q = panel && getComputedStyle(panel).overflow !== "visible" ? panel.getBoundingClientRect() : { left: -1e9, right: 1e9, top: -1e9, bottom: 1e9 };
    return { left: Math.max(r.left, q.left), right: Math.min(r.right, q.right), top: Math.max(r.top, q.top), bottom: Math.min(r.bottom, q.bottom), width: Math.min(r.right, q.right) - Math.max(r.left, q.left), height: Math.min(r.bottom, q.bottom) - Math.max(r.top, q.top) };
  };
  for (const el of document.body.querySelectorAll("a[href], button, input, select, summary")) {
    if (skip(el)) continue;
    const r = inPanel(el, el.getBoundingClientRect());
    if (r.width > 0 && r.height > 0 && hit(r)) out.push(`control ${label(el)}`);
  }
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const el = n.parentElement;
    if (!n.textContent.trim() || !el || skip(el)) continue;
    const range = document.createRange();
    range.selectNodeContents(n);
    // Text cut off by its own box (an ellipsis), or scrolled out of its
    // panel, only counts where it shows
    const box = getComputedStyle(el).overflowX !== "visible" ? el.getBoundingClientRect() : null;
    const clip = (r) => inPanel(el, box ? { left: Math.max(r.left, box.left), right: Math.min(r.right, box.right), top: Math.max(r.top, box.top), bottom: Math.min(r.bottom, box.bottom) } : r);
    if ([...range.getClientRects()].map(clip).some((r) => r.width > 0 && r.height > 0 && hit(r))) out.push(`text ${label(el)}`);
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
  // (from the document's start, before the head scripts run, as a
  // browser's own text size would be: an adopted sheet needs no <head>)
  if (profile.text) await page.addInitScript((k) => {
    const s = new CSSStyleSheet();
    s.replaceSync(`html { font-size: ${16 * k}px !important; }`);
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, s];
  }, profile.text);
  return { ctx, page, cdp };
}

async function visit(page, route) {
  // A fresh load for each anchor (a goto that changes only the hash would
  // just scroll the page that's there)
  await page.goto("about:blank");
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
// A touch scroll in `selector`, from its end (a menu: it never runs on into
// the page) or, `fromTop`, from its start (a stop's panel: it scrolls first,
// and only at its end goes on along the city): how far the page moved
async function chains(page, cdp, selector, fromTop = false) {
  const box = await page.locator(selector).boundingBox();
  if (!box) return null;
  await page.evaluate(([s, top]) => {
    const el = document.querySelector(s);
    el.scrollTop = top ? 0 : el.scrollHeight;
  }, [selector, fromTop]);
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
    // The journey: the anchor's stop at the left edge, its panel inside
    // the stage, scrolling inside (never moving the city) if it must
    step = "stop";
    const stop = await page.evaluate(
      ({ route, insets, height }) => {
        if (document.documentElement.dataset.track !== "on") return null;
        const id = route.split("#")[1] || "home";
        const el = document.getElementById(id);
        const target = el?.closest(".track > .station");
        // A panel in a row (Skills): the journey stops with it wholly on
        // the screen, its stop's start somewhere to the left
        const r0 = el?.getBoundingClientRect();
        const inRow = el && el !== target && el.matches(".panel");
        const at = inRow ? (r0.left >= 0 && r0.right <= innerWidth + 1 ? target : null) : [...document.querySelectorAll(".track > .station")].find((s) => Math.abs(s.getBoundingClientRect().left) <= 2);
        // (a row's: its first panel)
        const panel = inRow ? el : at?.querySelector(".panel");
        const r = panel?.getBoundingClientRect();
        const bar = document.querySelector(".top-bar").getBoundingClientRect();
        const map = document.querySelector(".progress-line");
        return {
          landed: !!at && at === target,
          id: at?.id,
          // (one element: the panel itself, marked for the locator)
          panel: panel && (document.querySelectorAll("[data-audit-stop]").forEach((e) => e.removeAttribute("data-audit-stop")), panel.setAttribute("data-audit-stop", ""), "[data-audit-stop]"),
          under: r && r.top < bar.bottom - 0.5 ? Math.round(bar.bottom - r.top) : 0,
          // How much of the panel shows (between the bar, where it is on
          // the screen, and the map or the screen's foot), against what
          // it holds and the root's text size
          shows: !r ? 0 : Math.round(Math.min(r.bottom, map?.checkVisibility() ? map.getBoundingClientRect().top : innerHeight) - Math.max(r.top, bar.bottom > 0 ? bar.bottom : 0)),
          holds: panel ? panel.scrollHeight : 0,
          rem: parseFloat(getComputedStyle(document.documentElement).fontSize),
          // (a sheet, on a tall screen, too: it ends above the metro map,
          // which clears the home bar)
          past: !r ? 0 : Math.round(r.bottom - Math.min(height - insets.bottom, map?.checkVisibility() ? map.getBoundingClientRect().top : height)),
          more: panel ? panel.scrollHeight > panel.clientHeight + 1 : false,
          scrolls: panel ? getComputedStyle(panel).overflowY : "",
        };
      },
      { route, insets, height: profile.height },
    );
    if (stop) {
      if (!stop.landed) report("stop", where, `landed on ${stop.id ?? "no stop"}`);
      if (stop.under > 0) report("fit", where, `the stop's panel runs ${stop.under}px under the bar`);
      if (stop.past > 0.5) report("fit", where, `the stop's panel (or a sheet's words) runs ${stop.past}px past the foot of the safe screen`);
      // Readable: a panel cut short shows at least 6 lines' worth (6 root
      // ems), never a slit under a tall bar (200% text on a short screen)
      if (stop.panel && stop.shows < Math.min(stop.holds, 6 * stop.rem) - 0.5) report("fit", where, `the stop's panel shows only ${stop.shows}px of its ${stop.holds}px (at least ${Math.min(stop.holds, 6 * stop.rem)}px: 6 root ems)`);
      if (stop.more && !/auto|scroll/.test(stop.scrolls)) report("fit", where, `the stop's panel has more than fits but can't scroll (overflow-y ${stop.scrolls})`);
      if (stop.more && profile.touch && stop.panel) {
        const moved = await chains(page, cdp, stop.panel, true);
        if (moved) report("chain", where, `a touch scroll at the top of the stop's panel moved the city ${moved}px, not the panel`);
        await page.evaluate((s) => (document.querySelector(s).scrollTop = 0), stop.panel);
      }
    }
    step = "page";
    // The metro map over the page, where this anchor lands
    for (const d of await page.evaluate(covers)) report("covers", where, d.startsWith("the bar") ? d : `the metro map lies over ${d}`);
    // Fixed things again at the foot of the page
    await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(300);
    for (const scope of FIXED) file(profile, route, `scrolled ${scope}`, await page.evaluate(measure, { scope, insets, phone: profile.phone, touch: profile.touch, width: profile.width, height: profile.height }));
    for (const d of await page.evaluate(covers)) report("covers", `${where} [foot]`, d.startsWith("the bar") ? d : `the metro map lies over ${d}`);
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

    // The time and weather: something to read, not a control. Not in the
    // tab order, no popover, and a tap on it opens nothing and goes nowhere
    step = "weather";
    const display = page.locator(".rh");
    if (await display.isVisible()) {
      await page.evaluate(() => scrollTo(0, 0));
      const passive = await display.evaluate((e) => !e.matches("button, a, [tabindex], [popovertarget]") && !e.querySelector("button, a, [tabindex], [popovertarget]"));
      if (!passive) report("tap", where, "the time and weather display holds a control");
      if (profile.touch) {
        const before = page.url();
        await display.tap();
        await page.waitForTimeout(250);
        const opened = await page.evaluate(() => !!document.querySelector(":popover-open, dialog[open]"));
        if (opened || page.url() !== before) report("tap", where, "a tap on the time and weather did something");
      }
    }

    // The résumé
    step = "résumé: open";
    // The first résumé link on the screen (on the journey, the stop's own;
    // the others are off the screen, sideways)
    await page.evaluate(() => {
      for (const a of document.querySelectorAll("a[data-resume]")) a.removeAttribute("data-audit");
      const on = [...document.querySelectorAll("a[data-resume]")].find((a) => {
        const r = a.getBoundingClientRect();
        return a.checkVisibility() && r.width > 0 && r.left >= 0 && r.right <= innerWidth;
      });
      on?.setAttribute("data-audit", "");
    });
    const link = page.locator("a[data-resume][data-audit]").first();
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

  // Taps on the main actions (phones and tablets): each is a jump down the
  // one page, so each must land on its anchor with the station on screen
  if ((profile.touch || profile.name === "1600") && !profile.text) {
    const where = `${profile.name} taps`;
    const landed = async (hash, what) => {
      await page.waitForFunction((h) => location.hash === h, hash, { timeout: 5000 }).catch(() => {});
      // A smooth scroll's glide: down the whole one-page site it takes about
      // 1.5 s, so wait until the page has stopped moving (up to 4 s)
      for (let i = 0, last = -1, still = 0; i < 40 && still < 3; i++) {
        await page.waitForTimeout(100);
        const y = await page.evaluate(() => scrollY);
        still = y === last ? still + 1 : 0;
        last = y;
      }
      const at = await page.evaluate((h) => {
        const el = document.getElementById(h.slice(1));
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { hash: location.hash, top: r.top, bottom: r.bottom, left: r.left, track: document.documentElement.dataset.track === "on" };
      }, hash);
      if (!at || at.hash !== hash) report("tap", where, `${what} went to ${page.url()}`);
      else if (at.track && Math.abs(at.left) > 2) report("tap", where, `${what} left ${hash}'s stop ${Math.round(at.left)}px from the left edge`);
      else if (at.bottom < 0 || at.top > profile.height * 0.5) report("tap", where, `${what} left ${hash} at ${Math.round(at.top)}px, not near the top of the screen`);
    };
    try {
      await visit(page, "/");
      await press(profile, page.getByRole("link", { name: "View projects" }));
      await landed("#projects", '"View projects"');
      const tab = page.locator("#projects").getByRole("tab").nth(1);
      if (await tab.isVisible()) {
        await press(profile, tab);
        await page.waitForTimeout(300);
        if ((await tab.getAttribute("aria-selected")) !== "true") report("tap", where, "a tap on a project's tab didn't choose it");
      }
      await press(profile, page.locator('button[popovertarget="places-menu"]'));
      await page.waitForTimeout(300);
      await press(profile, page.locator("#places-menu").getByRole("link", { name: /Experience/ }).first());
      await landed("#experience", "the menu's Experience");
      if (await page.evaluate(() => !!document.querySelector("#places-menu:popover-open"))) report("tap", where, "the menu stayed open after choosing a section");
      // The metro map (on the journey): a station takes you there
      await visit(page, "/");
      const point = page.locator(".progress-line a.progress-point").first();
      if (await page.locator(".progress-line").isVisible() && (await point.isVisible())) {
        await press(profile, page.locator(".progress-line").getByRole("link", { name: /Contact/ }));
        await landed("#contact", "the metro map's Contact");
      }
    } catch (e) {
      report("tap", where, String(e.message).split("\n")[0]);
    }
  }

  // Backdrop-filtered things on screen while a phone scrolls a long page
  if (profile.name === "390") {
    for (const route of ["/"]) {
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

// :hover rules a tap could leave behind on a touch screen: `/`'s
// stylesheets with the résumé's
for (const route of ["/"]) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await visit(page, route);
  const link = page.locator("a[data-resume]:visible").first();
  if (await link.count()) {
    await link.click();
    await page.waitForSelector("dialog.resume[open]", { timeout: 15000 }).catch(() => {});
  }
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
