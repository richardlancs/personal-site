// A plate that fails to load, in a real browser: every band keeps its
// gradient and its height, and shows no broken image. Needs a running
// build and an installed Playwright (docs/audit/scripts/pw.mjs):
//
//   SMOKE_URL=http://localhost:3100 PLAYWRIGHT=…/playwright/index.mjs npm test
//
// Without both it is skipped, so `npm test` stays offline.
import assert from "node:assert/strict";
import { test } from "node:test";

const base = process.env.SMOKE_URL?.replace(/\/$/, "");
const skip = base && process.env.PLAYWRIGHT ? false : "set SMOKE_URL and PLAYWRIGHT to run the browser check";

test("every plate failing: each band keeps its gradient and its height, with no broken image", { skip, timeout: 120_000 }, async () => {
  const { launch } = await import("../docs/audit/scripts/pw.mjs");
  const browser = await launch();
  try {
    for (const width of [1440, 390]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      // Every plate: the optimised files and the originals
      const failed = [];
      await page.route(/\/_next\/image\?url=[^&]*%2F_next%2Fstatic%2Fmedia%2F[a-z-]+-(day|night)\.|\/_next\/static\/media\/[a-z-]+-(day|night)\.[0-9a-f.]*(webp|png|jpg)/, (route) => {
        failed.push(route.request().url());
        return route.abort();
      });
      await page.goto(`${base}/?sky=clear-night`, { waitUntil: "load" });
      // Bring every band near the screen, so each tries its plate
      const height = await page.evaluate(() => document.documentElement.scrollHeight);
      for (let y = 0; y < height; y += 400) {
        await page.evaluate((v) => scrollTo(0, v), y);
        await page.waitForTimeout(80);
      }
      await page.waitForTimeout(800);
      const bands = await page.evaluate(() =>
        [...document.querySelectorAll(".band")].map((band) => {
          const r = band.getBoundingClientRect();
          const cs = getComputedStyle(band);
          const shown = [...band.querySelectorAll(".band-plate img")].filter((img) => img.complete && img.naturalWidth === 0 && getComputedStyle(img).opacity !== "0");
          return {
            id: band.closest("section")?.id,
            width: r.width,
            height: r.height,
            aspect: cs.aspectRatio,
            maxHeight: parseFloat(cs.maxHeight),
            gradient: cs.backgroundImage.includes("linear-gradient"),
            broken: shown.length,
            mounted: band.querySelectorAll(".band-plate").length,
          };
        }),
      );
      assert.ok(failed.length > 0, `${width}: no plate was asked for, so nothing was tested`);
      assert.equal(bands.length, 6, `${width}: six bands`);
      for (const b of bands) {
        assert.ok(b.gradient, `${width} ${b.id}: the gradient is gone`);
        assert.equal(b.broken, 0, `${width} ${b.id}: a broken image shows`);
        // Its height still comes from its aspect ratio (capped), not from a picture
        const [w, h] = b.aspect.split("/").map(Number);
        const expected = Math.min((b.width * h) / w, b.maxHeight || Infinity);
        assert.ok(Math.abs(b.height - expected) < 2, `${width} ${b.id}: height ${b.height}, expected ${expected}`);
      }
      await page.close();
    }
  } finally {
    await browser.close();
  }
});
