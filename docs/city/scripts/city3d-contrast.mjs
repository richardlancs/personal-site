// Composited contrast of every visible word on the 3D city's pages (/city
// and /city/<section>: the panels over the scene, the riverside's sign
// tags, the row of keys, the top bar), over every daylight and weather
// (4 x 5 = 20 skies), wide (1440x900) and on a phone (390x844): 6 pages x
// 20 skies x 2 sizes, 240 combinations. (From docs/ui/scripts/
// city-contrast.mjs, the 2D page's, whose method it keeps.)
// The ?sky= preview and the scene handle (window.__city) are `next dev`
// only, so run it there:
//   npx next dev -p 3101
//   PLAYWRIGHT=…/playwright/index.mjs node docs/city/scripts/city3d-contrast.mjs [base=http://localhost:3101] [skies=rain-night,…] [sizes=1440x900,390x844] [routes=/city,…]
//
// The method: two photographs of each screen, every word see-through, then
// magenta. The pixels that differ are the letters; under them, the first
// photograph is what each letter stands on (the panel's glass and the
// scene through it, a tag's backing, the bar). Each run of text's own
// colour (composited over those pixels if it, or anything it's in, is
// partly transparent) against each of them; the run's reading is the worst
// of them less the darkest 2% (stray anti-aliased edge pixels). Glow and
// bloom never count: text-shadow is off in both photographs.
//
// A run fails under 4.5:1, or under 3:1 if it's large (24px and over, or
// 18.66px and over at weight 700 or more). Every page's h1 must be
// measured in every sky and size, or that's a failure too. In still view
// (nothing moves between the two photographs, and a change of sky is a
// cut), the page is photographed a screen at a time from top to foot.
//
// Prints, per page, size and sky, the lowest reading in the panel, the
// tags and the bar; then every failing run with its text, a selector and
// its reading. Exits 1 on any failure, 2 if the page isn't what this
// script expects (no scene handle: not next dev).
import { launch } from "../../audit/scripts/pw.mjs";

const [base = "http://localhost:3101", skyArg, sizeArg, routeArg] = process.argv.slice(2);
const routes = routeArg ? routeArg.split(",") : ["/city", "/city/projects", "/city/experience", "/city/interests", "/city/about", "/city/contact"];
const WEATHERS = ["clear", "cloudy", "rain", "snow", "neutral"];
const DAYLIGHTS = ["dawn", "day", "dusk", "night"];
// Dawn and dusk at their middle, where the grade is strongest
const skies = skyArg ? skyArg.split(",") : WEATHERS.flatMap((w) => DAYLIGHTS.map((d) => `${w}-${d}-0.5`));
const sizes = (sizeArg || "1440x900,390x844").split(",").map((s) => {
  const [width, height] = s.split("x").map(Number);
  return { name: s, width, height };
});
// Must be measured on every screen size in every sky
const REQUIRED = [{ sel: "main.city-page h1", what: "the page's h1" }];
const NORMAL = 4.5;
const LARGE = 3;

const fatal = (message) => {
  console.error(`city3d-contrast: ${message}`);
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
    // The fixed and sticky layers (the top bar, the progress line, an open
    // menu): words under them aren't on screen, and theirs are their own
    const layers = [...document.querySelectorAll(".top-bar, .progress-line, :popover-open, dialog[open]")]
      .filter((e) => e.checkVisibility())
      .map((e) => {
        const r = e.getBoundingClientRect();
        return { el: e, box: { x: r.x, y: r.y, w: r.width, h: r.height } };
      });
    const where = (el) => {
      // The line is mounted in the bar, but is its own layer on wide screens
      if (el.closest(".top-bar")) return "top bar";
      if (el.closest(".city-tags")) return "tags";
      if (el.closest(".city-keys")) return "keys";
      if (el.closest(".city3d-note")) return "note";
      if (el.closest("footer")) return "foot";
      if (el.closest(".city-panel")) return "panel";
      return "page";
    };
    const out = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const text = n.textContent.replace(/\s+/g, " ").trim();
      const el = n.parentElement;
      if (!text || !el || el.closest("svg, script, style, noscript, nextjs-portal, [data-dev-sky-panel]")) continue;
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
        required: ["main.city-page h1"].filter((s) => el.closest(s)),
        where: where(el),
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
  const phone = size.width < 768;
  const ctx = await browser.newContext({ viewport: { width: size.width, height: size.height }, deviceScaleFactor: 1, isMobile: phone, hasTouch: phone });
  // Still view: nothing fades or moves between the two photographs, and a
  // new sky is a cut (atmosphere/Atmosphere.tsx: snap)
  await ctx.addInitScript(() => {
    try {
      localStorage.setItem("still-view", "on");
    } catch {}
  });
  const page = await ctx.newPage();
  for (const route of routes) {
    await page.goto(`${base}${route}?sky=${skies[0]}`, { waitUntil: "load" });
    const arrived = await page.waitForSelector(".city3d[data-arrived]", { timeout: 90000 }).then(() => true, () => false);
    if (!arrived) fatal(`${route} at ${size.name}: the 3D city never arrived`);
    if (!(await page.evaluate(() => !!window.__city))) fatal("no scene handle (window.__city): run against `next dev`");
    await page.addStyleTag({ content: "*, *::before, *::after { transition: none !important; animation: none !important; } nextjs-portal, [data-dev-sky-panel] { display: none !important; }" });
    for (const sky of skies) {
      await page.evaluate(() => scrollTo(0, 0));
      await page.evaluate((s) => window.__city.sky(s), sky);
      // One drawn frame of the new sky, and the tags placed over it
      await page.waitForTimeout(1200);
      const row = {};
      const seenRequired = new Set();
      const bar = await page.evaluate(() => document.querySelector(".top-bar")?.getBoundingClientRect().height ?? 0);
      const step = Math.max(200, size.height - Math.round(bar) - 40);
      const full = await page.evaluate(() => document.documentElement.scrollHeight);
      for (let y = 0; ; y += step) {
        await page.evaluate((y) => scrollTo(0, y), y);
        await page.waitForTimeout(300);
        const runs = await collect(page);
        if (runs.length) {
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
            if (res.p2 < need) failures.push({ size: size.name, sky: `${route} ${sky}`, where: run.where, text: run.text, sel: run.sel, ratio: res.p2, min: res.min, need, color: run.color, px: run.size });
          });
        }
        if (y + size.height >= full) break;
      }
      for (const r of REQUIRED) if (!seenRequired.has(r.sel)) missing.push({ size: size.name, sky: `${route} ${sky}`, what: r.what, sel: r.sel });
      table.push({ size: size.name, sky: `${route} ${sky}`, row });
      console.log(`${size.name.padEnd(9)} ${route.padEnd(17)} ${sky.padEnd(16)} ${Object.entries(row).map(([k, v]) => `${k} ${v}`).join("  ")}`);
    }
  }
  await ctx.close();
}
await browser.close();

// Duplicates (the same run on two overlapping screens) once each
const seen = new Set();
const unique = failures
  .filter((f) => {
    const key = `${f.size}|${f.sky}|${f.sel}|${f.text}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  })
  .sort((a, b) => a.ratio - b.ratio);

console.log("\nlowest per place, over every sky and size:");
const lowest = {};
for (const { size, sky, row } of table)
  for (const [k, v] of Object.entries(row)) if (!lowest[k] || v < lowest[k].v) lowest[k] = { v, at: `${size} ${sky}` };
for (const [k, { v, at }] of Object.entries(lowest).sort((a, b) => a[1].v - b[1].v)) console.log(`  ${k.padEnd(14)} ${String(v).padStart(6)}  (${at})`);

if (unique.length) {
  console.log(`\n${unique.length} run(s) under their minimum:`);
  for (const f of unique) console.log(`  ✗ ${f.ratio} (min ${f.min}) < ${f.need}  ${f.size} ${f.sky}  ${f.where}  ${f.sel}  "${f.text}"  ${f.color} ${f.px}px`);
}
if (missing.length) {
  console.log(`\n${missing.length} required reading(s) not measured (the element wasn't found, or too few of its pixels showed):`);
  for (const m of missing) console.log(`  ✗ ${m.size} ${m.sky}: ${m.what} (${m.sel})`);
}
const bad = unique.length + missing.length;
console.log(bad ? `\nFAIL: ${bad} problem(s) over ${routes.length} pages x ${skies.length} skies x ${sizes.length} sizes` : `\nok: every word at or above its minimum over ${routes.length} pages x ${skies.length} skies x ${sizes.length} sizes (${routes.length * skies.length * sizes.length} combinations)`);
process.exit(bad ? 1 : 0);
