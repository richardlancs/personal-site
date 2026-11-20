// The top bar's rows: how tall `.top-bar` is at each width, on `/` and on a
// `/city` page, so a change to the bar (the "3D city" key) can be checked
// to add no row anywhere (docs/superpowers/plans/2026-11-19-shanghai-3d.md,
// Task 2). Widths 320 to 1920 in steps of 16, plus 390, 830 and 1440, at
// 900 tall; and 200% text (the root font doubled, as mobile-audit.mjs does)
// at 320×900, 390×844 and 844×390. A page that isn't there (404) is left out.
//   PLAYWRIGHT=…/playwright/index.mjs node docs/city/scripts/bar-fit.mjs <base> [out.json] [baseline.json]
// With a baseline, it compares: every width's `/` bar as tall as the
// baseline's, and every `/city` page's bar as tall as `/`'s at that width
// (exits 1 and lists the widths otherwise).
import { readFileSync, writeFileSync } from "node:fs";
import { launch } from "../../audit/scripts/pw.mjs";

const [base = "http://localhost:3100", out = "docs/city/bar-fit.json", baselinePath] = process.argv.slice(2);
const paths = ["/", "/city/projects"];
const widths = [...new Set([...Array.from({ length: 101 }, (_, i) => 320 + i * 16), 390, 830, 1440])].sort((a, b) => a - b);
const views = [...widths.map((w) => ({ w, h: 900, text: 1 })), { w: 320, h: 900, text: 2 }, { w: 390, h: 844, text: 2 }, { w: 844, h: 390, text: 2 }];

const browser = await launch();
const result = {};
for (const path of paths) {
  const page = await browser.newPage();
  const res = await page.goto(base + path, { waitUntil: "domcontentloaded" });
  if (!res || res.status() !== 200) {
    console.log(`${path}: ${res?.status()} (left out)`);
    await page.close();
    continue;
  }
  await page.waitForLoadState("load");
  result[path] = {};
  for (const v of views) {
    await page.setViewportSize({ width: v.w, height: v.h });
    await page.evaluate((k) => {
      let s = document.getElementById("bar-fit-text");
      if (!s) {
        s = document.createElement("style");
        s.id = "bar-fit-text";
        document.head.append(s);
      }
      s.textContent = k === 1 ? "" : `html { font-size: ${16 * k}px !important; }`;
    }, v.text);
    await page.waitForTimeout(120);
    const key = `${v.w}x${v.h}${v.text === 1 ? "" : "@200%"}`;
    result[path][key] = await page.evaluate(() => {
      const bar = document.querySelector(".top-bar");
      const sw = document.querySelector(".top-bar .view-switch");
      return { h: bar.offsetHeight, key: sw ? getComputedStyle(sw).display !== "none" : null };
    });
  }
  await page.close();
}
await browser.close();
writeFileSync(out, JSON.stringify(result, null, 1));
console.log(`wrote ${out}`);

if (baselinePath) {
  const baseline = JSON.parse(readFileSync(baselinePath, "utf8"));
  const bad = [];
  for (const [key, v] of Object.entries(result["/"] ?? {})) {
    const was = baseline["/"]?.[key];
    if (was && was.h !== v.h) bad.push(`/ ${key}: ${was.h} -> ${v.h}`);
  }
  for (const path of paths.filter((p) => p !== "/"))
    for (const [key, v] of Object.entries(result[path] ?? {})) if (result["/"]?.[key] && result["/"][key].h !== v.h) bad.push(`${path} ${key}: ${v.h}, / is ${result["/"][key].h}`);
  const shown = Object.entries(result["/"] ?? {}).filter(([, v]) => v.key).map(([k]) => k);
  console.log(`the bar's "3D city" key shows from: ${shown[0] ?? "nowhere"}`);
  if (bad.length) {
    console.log(`FAIL\n${bad.join("\n")}`);
    process.exitCode = 1;
  } else console.log("ok: the bar is as tall as before at every width, and the same on /city");
}
