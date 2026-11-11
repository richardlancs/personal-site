// The lamps and the signs, from fixed camera poses, for comparing the
// lighting before and after a change. Against `next dev` (the ?sky=
// preview and window.__pose are development-only):
//   npx next dev -p 3301
//   PLAYWRIGHT=…/playwright/index.mjs node docs/world/scripts/lighting-shots.mjs http://localhost:3301 <outDir> <prefix> [only]
// Writes <outDir>/<prefix>-<name>.jpg for every shot below (or only the
// ones whose name contains [only]).
import { mkdirSync } from "node:fs";
import { launch } from "../../audit/scripts/pw.mjs";

const [base = "http://localhost:3301", out = "docs/world/screenshots", prefix = "lighting-after", only = ""] = process.argv.slice(2);
mkdirSync(out, { recursive: true });

// Close-ups: the world only, the page's words hidden
const P = (pos, target) => ({ pos, target });
const shots = [
  // The park from the main camera, every kind of evening
  { name: "desktop-park-clear-night", route: "/", sky: "clear-night" },
  { name: "desktop-park-clear-dusk", route: "/", sky: "clear-dusk-0.7" },
  { name: "desktop-park-clear-day", route: "/", sky: "clear-day" },
  { name: "desktop-park-rain-night", route: "/", sky: "rain-night" },
  { name: "desktop-park-snow-night", route: "/", sky: "snow-night" },
  { name: "desktop-park-cloudy-night", route: "/", sky: "cloudy-night" },
  // The places with their signs, at night
  { name: "desktop-station-clear-night", route: "/experience", sky: "clear-night" },
  { name: "desktop-arcade-clear-night", route: "/interests", sky: "clear-night" },
  { name: "desktop-booth-clear-night", route: "/contact", sky: "clear-night" },
  { name: "desktop-workshop-clear-night", route: "/projects", sky: "clear-night" },
  { name: "desktop-library-clear-night", route: "/about", sky: "clear-night" },
  { name: "desktop-booth-clear-day", route: "/contact", sky: "clear-day" },
  // Close-ups
  { name: "closeup-lamp-night", route: "/", sky: "clear-night", pose: P([6.2, 2.1, -2.6], [2.7, 1.7, -7.1]) },
  { name: "closeup-lamp-low-night", route: "/", sky: "clear-night", pose: P([-0.6, 1.2, -3.4], [2.9, 2.0, -7.6]) },
  { name: "closeup-lamp-rain-night", route: "/", sky: "rain-night", pose: P([6.2, 2.1, -2.6], [2.7, 1.7, -7.1]) },
  { name: "closeup-lamp-day", route: "/", sky: "clear-day", pose: P([6.2, 2.1, -2.6], [2.7, 1.7, -7.1]) },
  { name: "closeup-lamp-far-night", route: "/", sky: "clear-night", pose: P([-3.2, 2.4, -6.5], [-7.4, 1.6, -13.2]) },
  { name: "closeup-workshop-sign-night", route: "/", sky: "clear-night", pose: P([10.1, 2.6, -18.2], [15.2, 3.7, -25.7]) },
  { name: "closeup-station-sign-night", route: "/", sky: "clear-night", pose: P([4, 2.6, -35.5], [4, 4.4, -46.4]) },
  { name: "closeup-arcade-sign-night", route: "/", sky: "clear-night", pose: P([-5.2, 2.6, -20.6], [-8.5, 4.7, -29.2]) },
  { name: "closeup-booth-sign-night", route: "/", sky: "clear-night", pose: P([6.4, 1.9, 6.2], [9.5, 2.3, 1.5]) },
  { name: "closeup-arcade-sign-day", route: "/", sky: "clear-day", pose: P([-5.2, 2.6, -20.6], [-8.5, 4.7, -29.2]) },
  { name: "closeup-platform-sign-night", route: "/experience", sky: "clear-night", pose: P([797.6, 2.4, 5.2], [793.4, 3.5, 0.6]) },
  { name: "closeup-neon-night", route: "/interests", sky: "clear-night", pose: P([1198.2, 2.3, 0.9], [1194.05, 3.3, 0.8]) },
  // Phones
  { name: "phone-park-clear-night", route: "/", sky: "clear-night", phone: true },
  { name: "phone-park-clear-dusk", route: "/", sky: "clear-dusk-0.7", phone: true },
  { name: "phone-park-clear-day", route: "/", sky: "clear-day", phone: true },
  { name: "phone-park-rain-night", route: "/", sky: "rain-night", phone: true },
  { name: "phone-park-snow-night", route: "/", sky: "snow-night", phone: true },
  { name: "phone-arcade-clear-night", route: "/interests", sky: "clear-night", phone: true },
];

const browser = await launch();
const errors = [];
for (const phone of [false, true]) {
  const list = shots.filter((s) => !!s.phone === phone && (!only || s.name.includes(only)));
  if (!list.length) continue;
  const ctx = await browser.newContext({
    viewport: phone ? { width: 390, height: 844 } : { width: 1440, height: 900 },
    deviceScaleFactor: phone ? 2 : 1,
    isMobile: phone,
    hasTouch: phone,
  });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(String(e)));
  for (const s of list) {
    await page.goto(`${base}${s.route}?sky=${s.sky}`, { waitUntil: "load" });
    await page.waitForFunction(() => document.querySelector(".world3d")?.getAttribute("data-arrived") === "true", null, { timeout: 40000 }).catch(() => {});
    if (s.pose) {
      await page.addStyleTag({ content: "body * { visibility: hidden !important } .world3d, .world3d canvas { visibility: visible !important } .world-labels, .world-iris { display: none !important }" });
      await page.evaluate((pose) => Object.assign(window, { __pose: pose }), s.pose);
    }
    // The sky's first state is snapped; give the far scenery, textures and fonts a moment
    await page.waitForTimeout(3500);
    await page.screenshot({ path: `${out}/${prefix}-${s.name}.jpg`, type: "jpeg", quality: 70 });
    console.log("shot", s.name);
  }
  await ctx.close();
}
await browser.close();
console.log(`${errors.length} page errors`, errors.slice(0, 5));
