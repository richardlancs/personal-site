// The top bar's rows: how tall `.top-bar` is at each width on `/`, so a
// change to the bar can be checked to add no row anywhere. Widths 320 to 1920 in steps of 16, plus 390, 830 and 1440, at
// 900 tall; and 200% text (the root font doubled, as mobile-audit.mjs does)
// at 320×900, 390×844 and 844×390. A page that isn't there (404) is left out.
//   PLAYWRIGHT=…/playwright/index.mjs node docs/city/scripts/bar-fit.mjs <base> [out.json] [baseline.json]
// With a baseline, it compares: every width's `/` bar no taller than the
// baseline's (exits 1 and lists the widths otherwise; a shorter bar, a
// row gone, passes and is listed as a note). The day/night key sits in
// the bar at every width, so it counts here.
import { readFileSync, writeFileSync } from "node:fs";
import { launch } from "../../audit/scripts/pw.mjs";

const [base = "http://localhost:3100", out = "docs/city/bar-fit.json", baselinePath] = process.argv.slice(2);
const paths = ["/"];
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
      return { h: document.querySelector(".top-bar").offsetHeight };
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
  const shorter = [];
  for (const [key, v] of Object.entries(result["/"] ?? {})) {
    const was = baseline["/"]?.[key];
    if (was && v.h > was.h) bad.push(`/ ${key}: ${was.h} -> ${v.h}`);
    else if (was && v.h < was.h) shorter.push(`${key} ${was.h} -> ${v.h}`);
  }
  if (shorter.length) console.log(`note: shorter than the baseline at ${shorter.length} views (${shorter.slice(0, 3).join(", ")}${shorter.length > 3 ? ", …" : ""})`);
  if (bad.length) {
    console.log(`FAIL\n${bad.join("\n")}`);
    process.exitCode = 1;
  } else console.log("ok: the bar is no taller than before at any width");
}
