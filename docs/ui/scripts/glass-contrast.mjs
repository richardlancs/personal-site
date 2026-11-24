// Composited contrast of the words on the keys of the one page (the top
// bar's keys, the hero's two ways in, a project's keys, Contact's "Email
// me", Copy and profile keys), on each of the three papers (cream,
// charcoal, kraft: localStorage["paper"], read by the head script,
// lib/paper.ts). Each key's own label colour is read as drawn; then its
// words are hidden,
// the key is photographed as drawn over the live page, and the pixels
// under it that are worst for its words (the darkest 1% under dark words,
// the lightest 1% under light ones, so a stray anti-aliased edge doesn't
// count) are measured against its text colour. Exits 1 under 4.5:1.
//   PLAYWRIGHT=…/playwright/index.mjs node docs/ui/scripts/glass-contrast.mjs http://localhost:3102 [desktop|phone] [route=/] [papers=cream,charcoal,kraft]
// Task 12 (24 November 2026): the skies are gone with the city; the keys
// are measured on each paper, against their own label colour.
import { launch } from "../../audit/scripts/pw.mjs";

const [base = "http://localhost:3102", view = "desktop", route = "/", paperArg] = process.argv.slice(2);
const phone = view === "phone";
const papers = paperArg ? paperArg.split(",") : ["cream", "charcoal", "kraft"];
const rgb = (c) => c.match(/[\d.]+/g).slice(0, 3).map(Number);
const lin = (c) => ((c /= 255) <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
const targets = [
  { name: "sections", sel: '.top-bar [popovertarget="places-menu"]' },
  { name: "view-projects", sel: ".hero-actions .glass-primary" },
  { name: "contact-key", sel: ".hero-actions .glass:not(.glass-primary)" },
  { name: "live-demo", sel: "#projects article .glass-primary >> nth=0" },
  { name: "code", sel: "#projects article a.glass:not(.glass-primary) >> nth=0" },
  { name: "email-me", sel: "#contact .glass-lg" },
  { name: "copy", sel: "#contact button.glass >> nth=0" },
  { name: "profile-key", sel: "#contact .profile-key >> nth=0" },
];

const browser = await launch();
const decoder = await browser.newPage();
const pixels = (png) =>
  decoder.evaluate(async (b64) => {
    const img = new Image();
    img.src = `data:image/png;base64,${b64}`;
    await img.decode();
    const c = new OffscreenCanvas(img.width, img.height);
    const g = c.getContext("2d");
    g.drawImage(img, 0, 0);
    return Array.from(g.getImageData(0, 0, img.width, img.height).data);
  }, png.toString("base64"));

const rows = [];
for (const paper of papers) {
  {
    const ctx = await browser.newContext({ viewport: phone ? { width: 390, height: 844 } : { width: 1440, height: 900 }, deviceScaleFactor: 1, isMobile: phone, hasTouch: phone });
    await ctx.addInitScript((paper) => {
      try {
        localStorage.setItem("paper", paper);
      } catch {}
    }, paper);
    const page = await ctx.newPage();
    await page.goto(`${base}${route}`, { waitUntil: "load" });
    const got = await page.evaluate(() => document.documentElement.dataset.paper);
    if (got !== paper) {
      console.log(`FAIL the paper "${paper}" wasn't applied (data-paper="${got}")`);
      process.exit(2);
    }
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(800);
    // Each key's label as drawn, before the words are hidden
    const labels = {};
    for (const t of targets) {
      const el = page.locator(t.sel).first();
      if ((await el.count()) && (await el.isVisible())) labels[t.name] = await el.evaluate((n) => getComputedStyle(n).color);
    }
    // Hide the words (and icons), keep everything behind them
    await page.addStyleTag({ content: ".glass, .glass * { color: transparent !important; } .glass svg { visibility: hidden !important; }" });
    await page.waitForTimeout(150);
    const row = { sky: paper };
    for (const t of targets) {
      const el = page.locator(t.sel).first();
      if (!labels[t.name] || !(await el.count()) || !(await el.isVisible())) continue;
      // On the journey the stops are side by side: go to the target's panel
      // (or its stop) and let the glide come to rest; stacked, scroll to it
      await el.evaluate(async (n) => {
        const at = n.closest(".panel[id]") || n.closest(".station");
        if (!at) return; // the bar: always on the screen
        if (document.documentElement.dataset.track !== "on") return n.scrollIntoView({ block: "center" });
        location.hash = at.id;
        let last = -1;
        for (let still = 0; still < 10; ) {
          await new Promise((r) => requestAnimationFrame(r));
          still = scrollY === last ? still + 1 : 0;
          last = scrollY;
        }
        // and, in a panel that scrolls inside (a phone's sheet), to the key
        const p = n.closest(".panel");
        if (p) p.scrollTop += n.getBoundingClientRect().top - p.getBoundingClientRect().top - 48;
      });
      // An item that arrives on scroll (reveal.css): measure it at rest
      if (await el.evaluate((n) => Boolean(n.closest(".reveal")))) {
        await el.evaluate((n) => new Promise((done) => { const r = n.closest(".reveal"); const t = () => (r.hasAttribute("data-arrived") ? done() : requestAnimationFrame(t)); t(); }));
        await page.waitForTimeout(700);
      }
      const box = await el.boundingBox();
      const inset = t.inset ?? 4; // inside the edge and its highlight
      const clip = { x: box.x + inset, y: box.y + inset, width: box.width - 2 * inset, height: box.height - 2 * inset };
      const data = await pixels(await page.screenshot({ clip }));
      const ls = [];
      for (let i = 0; i < data.length; i += 4) ls.push(lum([data[i], data[i + 1], data[i + 2]]));
      ls.sort((a, b) => a - b);
      const darkest = ls[Math.floor(ls.length * 0.01)];
      const lightest = ls[Math.min(ls.length - 1, Math.floor(ls.length * 0.99))];
      // Dark words against the darkest of what's under them, light words the lightest
      const L = lum(rgb(labels[t.name]));
      row[t.name] = { label: +ratio(L, L < 0.18 ? darkest : lightest).toFixed(2) };
    }
    rows.push(row);
    console.log(JSON.stringify(row));
    await ctx.close();
  }
}
await browser.close();
// The worst case for each target and ink
const worst = {};
for (const row of rows)
  for (const [k, v] of Object.entries(row))
    if (k !== "sky")
      for (const [ink, c] of Object.entries(v)) {
        const key = `${k}/${ink}`;
        if (!worst[key] || c < worst[key].c) worst[key] = { c, paper: row.sky };
      }
console.log(`worst (${view} ${route}):`, JSON.stringify(worst));
const low = Object.entries(worst).filter(([, w]) => w.c < 4.5);
for (const [k, w] of low) console.log(`FAIL ${k} ${w.c}:1 on ${w.paper}`);
if (!Object.keys(worst).length) console.log("FAIL nothing measured");
process.exit(low.length || !Object.keys(worst).length ? 1 : 0);
