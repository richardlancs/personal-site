// The Richmond Hill display's layout as readings arrive, against a
// production build: the display is as wide as its words, so what must not
// move when the weather comes in (any condition, stale, unavailable) is
// everything around it: the way back, Sections and the toggles, and (beside
// them on wide screens) the display's right edge; on narrow screens the
// menu and toggles stay in the top-right corner.
//   PLAYWRIGHT=…/playwright/index.mjs node docs/weather/scripts/chip-layout.mjs http://localhost:3100
import { launch } from "../../audit/scripts/pw.mjs";

const base = process.argv[2] || "http://localhost:3100";
const now = Math.floor(Date.now() / 1000);
const day = new Date().toLocaleDateString("en-CA", { timeZone: "America/Toronto" });
const reading = (over) => ({
  ok: true,
  reading: { observedAt: now - 300, fetchedAt: now - 200, temperatureC: -12.4, weatherCode: 99, cloudCover: 100, isDay: true, sun: [{ date: day, sunrise: now - 20000, sunset: now + 20000 }], ...over },
});
const cases = {
  long: { status: 200, body: reading({}) }, // "Thunderstorm with heavy hail"
  stale: { status: 200, body: reading({ observedAt: now - 2 * 3600, weatherCode: 3 }) },
  unavailable: { status: 503, body: { ok: false, error: "upstream" } },
  short: { status: 200, body: reading({ weatherCode: 0, temperatureC: 4 }) },
};
const sizes = [["1440", 1440, 1000, false], ["1024", 1024, 768, false], ["844x390", 844, 390, true], ["390", 390, 844, true], ["320", 320, 640, true]];
const results = [];
const check = (name, pass, detail) => {
  results.push(pass);
  console.log(`${pass ? "ok  " : "FAIL"} ${name}  ${JSON.stringify(detail)}`);
};

const browser = await launch();
for (const [size, width, height, touch] of sizes) {
  for (const [name, answer] of Object.entries(cases)) {
    const ctx = await browser.newContext({ viewport: { width, height }, isMobile: touch, hasTouch: touch });
    // Hold the reading back, so the before and after can be measured
    await ctx.route("**/api/weather", async (route) => {
      await new Promise((r) => setTimeout(r, 1500));
      await route.fulfill({ status: answer.status, contentType: "application/json", body: JSON.stringify(answer.body) });
    });
    const page = await ctx.newPage();
    for (const route of ["/", "/projects"]) {
      await page.goto(base + route, { waitUntil: "load" });
      await page.waitForTimeout(400);
      const box = () =>
        page.evaluate(() => {
          const r = (el) => (el ? (({ left, right, top, bottom }) => ({ left: Math.round(left), right: Math.round(right), top: Math.round(top), bottom: Math.round(bottom) }))(el.getBoundingClientRect()) : null);
          return { chip: r(document.querySelector(".rh")), place: r(document.querySelector(".rh-place")), end: r(document.querySelector(".world-controls-end")), back: r(document.querySelector(".world-controls > a")), status: document.querySelector(".rh")?.getAttribute("data-status") };
        });
      const before = await box();
      await page.waitForTimeout(2500);
      const after = await box();
      // Wide: the display ends at Sections, so its right edge holds and it
      // grows to the left. Narrow: alone on its row, it grows to the right
      // from where it starts.
      const narrow = width < 720;
      const same = (a, b) => (a && b ? a.left === b.left && a.top === b.top : a === b);
      const held = same(before.end, after.end) && same(before.back, after.back) && (narrow ? before.chip.left === after.chip.left : before.chip.right === after.chip.right);
      check(`${size} ${route} ${name}: nothing around it moves`, held, { status: after.status, before: before.chip, after: after.chip });
      check(`${size} ${route} ${name}: the menu and toggles end at the right edge`, width - after.end.right <= 24, { gap: width - after.end.right });
      if (after.back) check(`${size} ${route} ${name}: the way back and the chip don't touch`, after.back.right + 8 <= after.chip.left || after.chip.top >= after.back.bottom, { back: after.back, chip: after.chip });
    }
    await ctx.close();
  }
}
await browser.close();
const failed = results.filter((r) => !r).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
