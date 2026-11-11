// Composited contrast of the words on the glass buttons (the corner
// controls, the home page's actions, a project's links, the bench tabs,
// the cabinets, the timetable's lines and the notebook's page turns, each
// as it is and chosen or disabled) and of the name,
// over every weather and daylight (the ?sky= preview: `next dev` only).
// For each control the words are hidden, the control is
// photographed as drawn over the live scene, and the darkest pixels under
// it (1st percentile, so a stray anti-aliased edge doesn't count) are
// measured against its text colours.
//   PLAYWRIGHT=…/playwright/index.mjs node docs/ui/scripts/glass-contrast.mjs http://localhost:3130 [desktop|phone] [route=/]
// Each route measures the targets it has: / (corner, name, actions),
// /projects, /interests, /experience, /about.
import { launch } from "../../audit/scripts/pw.mjs";

const [base = "http://localhost:3130", view = "desktop", route = "/"] = process.argv.slice(2);
const phone = view === "phone";
const presets = ["clear", "cloudy", "rain", "snow"];
const phases = ["dawn", "day", "dusk", "night"];
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const lin = (c) => ((c /= 255) <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
// The words each target carries, and their colours
const targets = [
  { name: "back", sel: '.world-controls > a.glass', ink: { slate: "#203245" } },
  { name: "sections", sel: '.world-controls [popovertarget="places-menu"]', ink: { slate: "#203245" } },
  { name: "still", sel: ".world-controls .glass-icon >> nth=0", ink: { slate: "#203245" } },
  { name: "chip", sel: ".world-controls .rh-chip", ink: { slate: "#203245", accent: "#23527c", muted: "#45474a" } },
  { name: "name", sel: ".park-name", ink: { slate: "#203245" }, inset: 0 },
  // Glass on the page: the home page's actions, a project's links
  { name: "primary", sel: ".park-actions .glass-primary", ink: { slate: "#203245" } },
  { name: "secondary", sel: ".park-actions .glass:not(.glass-primary)", ink: { slate: "#203245" } },
  { name: "project", sel: ".project-links .glass >> nth=0", ink: { slate: "#203245" } },
  // The tabs and choices over the scene, and the page turns on their paper
  { name: "bench", sel: '.bench-tab[aria-selected="false"]', ink: { slate: "#203245" } },
  { name: "bench-chosen", sel: '.bench-tab[aria-selected="true"]', ink: { slate: "#203245" } },
  { name: "cabinet", sel: '.cabinet-button[aria-selected="false"]', ink: { slate: "#203245" } },
  { name: "cabinet-chosen", sel: '.cabinet-button[aria-selected="true"]', ink: { slate: "#203245" } },
  { name: "line", sel: '.timetable-line[aria-pressed="false"]', ink: { slate: "#203245" } },
  { name: "line-chosen", sel: '.timetable-line[aria-pressed="true"]', ink: { slate: "#203245" } },
  { name: "turn", sel: '.notebook-turn:not([aria-disabled="true"])', ink: { slate: "#203245" } },
  { name: "turn-disabled", sel: '.notebook-turn[aria-disabled="true"]', ink: { muted: "#45474a" } },
];

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
    await page.waitForFunction(() => document.querySelector(".world3d")?.getAttribute("data-arrived") === "true", null, { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(2500);
    // Hide the words (and icons), keep everything behind them
    await page.addStyleTag({ content: ".glass, .glass *, .park-name { color: transparent !important; } .glass svg, .rh-blank, .bench-tab-lamp, .cabinet-button-screen { visibility: hidden !important; }" });
    await page.waitForTimeout(150);
    const row = { sky: `${preset}-${phase}` };
    for (const t of targets) {
      const el = page.locator(t.sel).first();
      if (!(await el.count()) || !(await el.isVisible())) continue;
      await el.scrollIntoViewIfNeeded();
      const box = await el.boundingBox();
      const inset = t.inset ?? 4; // inside the edge and its highlight
      const clip = { x: box.x + inset, y: box.y + inset, width: box.width - 2 * inset, height: box.height - 2 * inset };
      const data = await pixels(await page.screenshot({ clip }));
      const ls = [];
      for (let i = 0; i < data.length; i += 4) ls.push(lum([data[i], data[i + 1], data[i + 2]]));
      ls.sort((a, b) => a - b);
      const dark = ls[Math.floor(ls.length * 0.01)];
      row[t.name] = Object.fromEntries(Object.entries(t.ink).map(([k, v]) => [k, +ratio(lum(hex(v)), dark).toFixed(2)]));
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
