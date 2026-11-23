// Composited contrast of the words on the glass keys of the one-page city
// (the top bar's keys, the hero's two ways in, a project's keys, Contact's
// "Email me", Copy and profile keys), over every weather and daylight
// (the ?sky= preview: `next dev` only). For each key the words are hidden,
// the key is photographed as drawn over the live page, and the pixels
// under it that are worst for its words (the darkest 1% under dark words,
// the lightest 1% under light ones, so a stray anti-aliased edge doesn't
// count) are measured against its text colour. Exits 1 under 4.5:1.
//   PLAYWRIGHT=…/playwright/index.mjs node docs/ui/scripts/glass-contrast.mjs http://localhost:3101 [desktop|phone] [route=/]
// Round 2 (20 November 2026): rewritten for the black palette; the park's
// targets (corner controls, bench tabs, cabinets, timetable, notebook)
// and its slate ink are gone.
import { launch } from "../../audit/scripts/pw.mjs";

const [base = "http://localhost:3130", view = "desktop", route = "/"] = process.argv.slice(2);
const phone = view === "phone";
const presets = ["clear", "cloudy", "rain", "snow"];
const phases = ["dawn", "day", "dusk", "night"];
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const lin = (c) => ((c /= 255) <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
// The words each target carries: --text on the glass, --ink on the
// lantern of a primary key (city.css)
const TEXT = { text: "#e6e9ee" };
const INK = { ink: "#08090c" };
const targets = [
  { name: "sections", sel: '.top-bar [popovertarget="places-menu"]', ink: TEXT },
  { name: "view-projects", sel: ".hero-actions .glass-primary", ink: INK },
  { name: "contact-key", sel: ".hero-actions .glass:not(.glass-primary)", ink: TEXT },
  { name: "live-demo", sel: "#projects article .glass-primary >> nth=0", ink: INK },
  { name: "code", sel: "#projects article a.glass:not(.glass-primary) >> nth=0", ink: TEXT },
  { name: "email-me", sel: "#contact .glass-lg", ink: INK },
  { name: "copy", sel: "#contact button.glass >> nth=0", ink: TEXT },
  { name: "profile-key", sel: "#contact .profile-key >> nth=0", ink: TEXT },
];
const dark = (h) => lum(hex(h)) < 0.18;

const browser = await launch();
const ctx = await browser.newContext({ viewport: phone ? { width: 390, height: 844 } : { width: 1440, height: 900 }, deviceScaleFactor: 1, isMobile: phone, hasTouch: phone });
const page = await ctx.newPage();
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
for (const preset of presets) {
  for (const phase of phases) {
    await page.goto(`${base}${route}?sky=${preset}-${phase}`, { waitUntil: "load" });
    await page.waitForFunction(() => document.documentElement.hasAttribute("data-sky-ready"), null, { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(1500);
    // Hide the words (and icons), keep everything behind them
    await page.addStyleTag({ content: ".glass, .glass * { color: transparent !important; } .glass svg { visibility: hidden !important; }" });
    await page.waitForTimeout(150);
    const row = { sky: `${preset}-${phase}` };
    for (const t of targets) {
      const el = page.locator(t.sel).first();
      if (!(await el.count()) || !(await el.isVisible())) continue;
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
      row[t.name] = Object.fromEntries(Object.entries(t.ink).map(([k, v]) => [k, +ratio(lum(hex(v)), dark(v) ? darkest : lightest).toFixed(2)]));
    }
    rows.push(row);
    console.log(JSON.stringify(row));
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
        if (!worst[key] || c < worst[key].c) worst[key] = { c, sky: row.sky };
      }
console.log(`worst (${view} ${route}):`, JSON.stringify(worst));
const low = Object.entries(worst).filter(([, w]) => w.c < 4.5);
for (const [k, w] of low) console.log(`FAIL ${k} ${w.c}:1 at ${w.sky}`);
if (!Object.keys(worst).length) console.log("FAIL nothing measured");
process.exit(low.length || !Object.keys(worst).length ? 1 : 0);
