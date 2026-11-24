// Composited contrast of every visible word on the one page (`/`), on each
// of the three papers (cream, charcoal, kraft: <html data-paper>, chosen by
// the Paper picker and kept in localStorage["paper"], lib/paper.ts), wide
// and on a phone. Any server will do (the papers are the visitor's choice,
// not a development preview):
//   PLAYWRIGHT=…/playwright/index.mjs node docs/ui/scripts/city-contrast.mjs [base=http://localhost:3102] [papers=cream,charcoal,kraft] [sizes=1440x900,390x844]  (positional: base, then papers, then sizes; "" for the default)
//
// The method is panel-contrast.mjs's: two photographs of each screen, every
// word see-through, then magenta. The pixels that differ are the letters;
// under them, the first photograph is what each letter stands on (its
// card, the crumpled paper, whatever is drawn). Each run of text's own
// colour (composited over those pixels if it, or anything it's in, is
// partly transparent) against each of them; the run's reading is the worst
// of them less the darkest 2% (stray anti-aliased edge pixels, and the
// paper's darkest creases under a stroke), as panel-contrast.mjs takes it.
// Glow never counts: text-shadow is off in both photographs.
//
// A run fails under 4.5:1, or under 3:1 if it's large (24px and over, or
// 18.66px and over at weight 700 or more). The hero's name and the
// sections' headings must be measured on every paper: if either isn't,
// that's a failure too. The page is photographed a screen at a time from
// top to foot, in still view (nothing moves between the two photographs).
//
// Prints, per paper and size, the lowest reading in each station (and the
// bar, the metro map and the page's foot; and, with the Sections menu open,
// the bar, the map and the menu's rows), then every failing run with its
// text, a selector and its reading. Exits 1 on any failure, 2 if the page
// isn't what this script expects (the paper not applied, no stations).
import { launch } from "../../audit/scripts/pw.mjs";

const [base = "http://localhost:3102", paperArg, sizeArg] = process.argv.slice(2);
const PAPERS = ["cream", "charcoal", "kraft"];
const papers = paperArg ? paperArg.split(",") : PAPERS;
const sizes = (sizeArg || "1440x900,390x844").split(",").map((s) => {
  const [width, height] = s.split("x").map(Number);
  return { name: s, width, height };
});
// Must be measured on every screen size on every paper
const REQUIRED = [
  { sel: ".hero-name", what: "the hero's name" },
  { sel: ".station-title", what: "the sections' headings" },
];
const NORMAL = 4.5;
const LARGE = 3;

const fatal = (message) => {
  console.error(`city-contrast: ${message}`);
  process.exit(2);
};

const browser = await launch();
const decoder = await browser.newPage();

// The two photographs and the runs go to a page of their own, which works
// out each run's contrast there (sending whole screens of pixels back out
// is what's slow)
const measure = (under, lit, runs) =>
  decoder.evaluate(
    async ({ a, b, runs }) => {
      const load = async (b64) => {
        const img = new Image();
        img.src = `data:image/png;base64,${b64}`;
        await img.decode();
        const c = new OffscreenCanvas(img.width, img.height);
        const g = c.getContext("2d");
        g.drawImage(img, 0, 0);
        return { w: img.width, h: img.height, d: g.getImageData(0, 0, img.width, img.height).data };
      };
      const [u, l] = [await load(a), await load(b)];
      const lin = (c) => ((c /= 255) <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
      const lum = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
      return runs.map((run) => {
        const [r, g, bl, alpha = 1] = run.color.match(/[\d.]+/g).map(Number);
        const a = Math.min(1, alpha * run.opacity);
        const ratios = [];
        const inside = (px, py) => run.exclude.some((e) => px >= e.x && px < e.x + e.w && py >= e.y && py < e.y + e.h);
        for (const box of run.boxes)
          for (let py = Math.max(0, Math.floor(box.y)); py < Math.min(u.h, box.y + box.h); py++)
            for (let px = Math.max(0, Math.floor(box.x)); px < Math.min(u.w, box.x + box.w); px++) {
              if (inside(px, py)) continue;
              const i = (py * u.w + px) * 4;
              if (Math.abs(l.d[i] - u.d[i]) + Math.abs(l.d[i + 1] - u.d[i + 1]) + Math.abs(l.d[i + 2] - u.d[i + 2]) <= 120) continue;
              const [ur, ug, ub] = [u.d[i], u.d[i + 1], u.d[i + 2]];
              // The letter as drawn: its colour over what's under it
              const L = lum(r * a + ur * (1 - a), g * a + ug * (1 - a), bl * a + ub * (1 - a));
              const B = lum(ur, ug, ub);
              ratios.push((Math.max(L, B) + 0.05) / (Math.min(L, B) + 0.05));
            }
        if (ratios.length < 8) return null;
        ratios.sort((x, y) => x - y);
        return { p2: +ratios[Math.floor(ratios.length * 0.02)].toFixed(2), min: +ratios[0].toFixed(2) };
      });
    },
    { a: under.toString("base64"), b: lit.toString("base64"), runs },
  );

// Every visible run of text on the screen: its line boxes, colour, how
// opaque its ancestors leave it, whether it's large, where it is on the
// page, a selector, and the fixed things in front of it to leave out
const collect = (page) =>
  page.evaluate(() => {
    const describe = (el) => {
      const parts = [];
      for (let e = el; e && e !== document.body && parts.length < 3; e = e.parentElement) {
        const cls = [...e.classList].slice(0, 2).map((c) => `.${c}`).join("");
        parts.unshift(`${e.tagName.toLowerCase()}${e.id ? `#${e.id}` : ""}${cls}`);
        if (e.id) break;
      }
      return parts.join(" > ");
    };
    const srOnly = (el) => {
      for (let e = el; e && e !== document.body; e = e.parentElement) {
        const cs = getComputedStyle(e);
        const r = e.getBoundingClientRect();
        if (cs.position === "absolute" && cs.overflow === "hidden" && r.width <= 2 && r.height <= 2) return true;
        if (cs.clipPath === "inset(50%)") return true;
      }
      return false;
    };
    const opacityOf = (el) => {
      let o = 1;
      for (let e = el; e; e = e.parentElement) o *= Number(getComputedStyle(e).opacity);
      return o;
    };
    // The fixed and sticky layers (the top bar, the metro map, an open
    // menu): words under them aren't on screen, and theirs are their own
    const layers = [...document.querySelectorAll(".top-bar, .progress-line, :popover-open, dialog[open]")]
      .filter((e) => e.checkVisibility())
      .map((e) => {
        const r = e.getBoundingClientRect();
        return { el: e, box: { x: r.x, y: r.y, w: r.width, h: r.height } };
      });
    const where = (el) => {
      // The line is mounted in the bar, but is its own layer on wide screens
      if (el.closest(".progress-line")) return "metro map";
      if (el.closest(".top-bar")) return "top bar";
      const station = el.closest("section.station");
      if (station) return `#${station.id}`;
      if (el.closest("footer")) return "foot";
      return "page";
    };
    const out = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const text = n.textContent.replace(/\s+/g, " ").trim();
      const el = n.parentElement;
      if (!text || !el || el.closest("svg, script, style, noscript, nextjs-portal")) continue;
      if (!el.checkVisibility({ opacityProperty: true, visibilityProperty: true }) || srOnly(el)) continue;
      const range = document.createRange();
      range.selectNodeContents(n);
      const boxes = [...range.getClientRects()]
        .filter((r) => r.width >= 2 && r.height >= 4 && r.bottom > 2 && r.top < innerHeight - 2 && r.right > 0 && r.left < innerWidth)
        .map((r) => ({ x: r.x, y: r.y, w: r.width, h: r.height }));
      if (!boxes.length) continue;
      const own = layers.find((l) => l.el.contains(el));
      const exclude = layers.filter((l) => l !== own && !(own && own.el.contains(l.el))).map((l) => l.box);
      const cs = getComputedStyle(el);
      const size = parseFloat(cs.fontSize);
      const weight = Number(cs.fontWeight) || 400;
      out.push({
        text: text.slice(0, 40),
        sel: describe(el),
        required: [".hero-name", ".station-title"].filter((s) => el.closest(s)),
        where: where(el),
        menu: !!el.closest("#places-menu"),
        color: cs.color,
        opacity: opacityOf(el),
        large: size >= 24 || (size >= 18.66 && weight >= 700),
        size,
        boxes,
        exclude,
      });
    }
    return out;
  });

const paint = (page, c) =>
  page.evaluate((c) => {
    let s = document.getElementById("measure-style");
    if (!s) document.head.append((s = Object.assign(document.createElement("style"), { id: "measure-style" })));
    s.textContent = `body *, body *::before, body *::after { color: ${c} !important; -webkit-text-fill-color: ${c} !important; text-shadow: none !important; text-decoration-color: transparent !important; caret-color: transparent !important; }`;
  }, c);

const failures = [];
const missing = [];
const table = [];
for (const size of sizes) {
  // Still view: nothing fades or moves between the two photographs. It
  // follows the system's reduced-motion setting alone (lib/still.ts, Task
  // 11: no key, no saved choice), so the context asks for reduced motion
  const ctx = await browser.newContext({ viewport: { width: size.width, height: size.height }, deviceScaleFactor: 1, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  for (const paper of papers) {
    // The paper as a returning visitor's saved choice, read by the head
    // script before the first paint
    await page.addInitScript((paper) => {
      try {
        localStorage.setItem("paper", paper);
      } catch {}
    }, paper);
    await page.goto(`${base}/`, { waitUntil: "load" });
    const got = await page.evaluate(() => document.documentElement.dataset.paper);
    if (got !== paper) fatal(`the paper "${paper}" wasn't applied (data-paper="${got}"): is the Paper picker's head script (lib/paper.ts) in?`);
    const still = await page.evaluate(() => document.documentElement.dataset.still);
    if (still !== "on") fatal(`still view isn't on (data-still="${still}") under reduced motion: the readings would move`);
    if (!(await page.locator("section.station").count())) fatal(`no section.station on ${base}/: is this the one page?`);
    // Everything at rest, except the journey's own move (the track rides
    // the page's scroll: without it the page never goes past its first stop)
    await page.addStyleTag({ content: "*, *::before, *::after { transition: none !important; } :not(.track), ::before, ::after { animation: none !important; } nextjs-portal { display: none !important; }" });
    // The fonts and the pictures in, so nothing reflows between photographs
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(400);

    const row = {};
    const seenRequired = new Set();
    // Photograph the screen twice and read each run against what's under it
    const screen = async (runs) => {
      if (!runs.length) return;
      await paint(page, "transparent");
      const under = await page.screenshot();
      await paint(page, "rgb(255, 0, 255)");
      const lit = await page.screenshot();
      await page.evaluate(() => document.getElementById("measure-style")?.remove());
      const results = await measure(under, lit, runs);
      runs.forEach((run, k) => {
        const res = results[k];
        if (!res) return;
        for (const s of run.required) seenRequired.add(s);
        const need = run.large ? LARGE : NORMAL;
        if (!row[run.where] || res.p2 < row[run.where]) row[run.where] = res.p2;
        if (res.p2 < need) failures.push({ size: size.name, paper, where: run.where, text: run.text, sel: run.sel, ratio: res.p2, min: res.min, need, color: run.color, px: run.size });
      });
    };
    const bar = await page.evaluate(() => document.querySelector(".top-bar")?.getBoundingClientRect().height ?? 0);
    // A screen at a time: down the page stacked, along it on the journey
    // (a scroll of y is y along the track, and a phone's stop is one
    // screen wide, so a step never passes a whole stop)
    const along = await page.evaluate(() => document.documentElement.dataset.track === "on");
    const step = Math.max(200, Math.min(size.height - Math.round(bar) - 40, along ? size.width - 40 : Infinity));
    const full = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; ; y += step) {
      await page.evaluate((y) => scrollTo(0, y), y);
      await page.waitForTimeout(250);
      await screen(await collect(page));
      if (y + size.height >= full) break;
    }
    // The Sections menu open, a third of the way along: the page dims
    // behind it, but the bar, the metro map and the menu's rows keep their
    // contrast (only theirs are measured: the page's words are under the
    // dimming on purpose)
    await page.evaluate(() => scrollTo(0, Math.round(document.documentElement.scrollHeight / 3)));
    await page.waitForTimeout(250);
    await page.locator('button[popovertarget="places-menu"]').click();
    await page.waitForTimeout(250);
    const open = (await collect(page)).filter((r) => r.where === "top bar" || r.where === "metro map");
    if (!open.some((r) => r.menu)) missing.push({ size: size.name, paper, what: "the open menu's rows", sel: "#places-menu" });
    await screen(open.map((r) => ({ ...r, where: `menu open: ${r.menu ? "menu" : r.where}` })));
    await page.keyboard.press("Escape");
    for (const r of REQUIRED) if (!seenRequired.has(r.sel)) missing.push({ size: size.name, paper, what: r.what, sel: r.sel });
    table.push({ size: size.name, paper, row });
    console.log(`${size.name.padEnd(9)} ${paper.padEnd(9)} ${Object.entries(row).map(([k, v]) => `${k} ${v}`).join("  ")}`);
  }
  await ctx.close();
}
await browser.close();

// Duplicates (the same run on two overlapping screens) once each
const seen = new Set();
const unique = failures
  .filter((f) => {
    const key = `${f.size}|${f.paper}|${f.sel}|${f.text}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  })
  .sort((a, b) => a.ratio - b.ratio);

console.log("\nlowest per place, over every paper and size:");
const lowest = {};
for (const { size, paper, row } of table)
  for (const [k, v] of Object.entries(row)) if (!lowest[k] || v < lowest[k].v) lowest[k] = { v, at: `${size} ${paper}` };
for (const [k, { v, at }] of Object.entries(lowest).sort((a, b) => a[1].v - b[1].v)) console.log(`  ${k.padEnd(14)} ${String(v).padStart(6)}  (${at})`);

if (unique.length) {
  console.log(`\n${unique.length} run(s) under their minimum:`);
  for (const f of unique) console.log(`  ✗ ${f.ratio} (min ${f.min}) < ${f.need}  ${f.size} ${f.paper}  ${f.where}  ${f.sel}  "${f.text}"  ${f.color} ${f.px}px`);
}
if (missing.length) {
  console.log(`\n${missing.length} required reading(s) not measured (the element wasn't found, or too few of its pixels showed):`);
  for (const m of missing) console.log(`  ✗ ${m.size} ${m.paper}: ${m.what} (${m.sel})`);
}
const bad = unique.length + missing.length;
console.log(bad ? `\nFAIL: ${bad} problem(s) over ${papers.length} papers x ${sizes.length} sizes` : `\nok: every word at or above its minimum over ${papers.length} papers x ${sizes.length} sizes`);
process.exit(bad ? 1 : 0);
