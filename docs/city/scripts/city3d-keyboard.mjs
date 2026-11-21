// The 3D city by keyboard alone, on a production build (or `next dev`):
//   PLAYWRIGHT=…/playwright/index.mjs node docs/city/scripts/city3d-keyboard.mjs http://localhost:3100
//
// - a fresh load of each /city page leaves focus at the top (on the
//   document, nothing focused: focus moves on travel, never on first load)
// - from /city, for each of the five places: Tab (only Tab) until a link
//   to it has focus, either its sign's tag over the scene (.city-tag) or
//   the panel's row of keys (.city-keys), whichever the screen has; Enter;
//   the address is the place's, and focus is on its page's h1 (tabindex -1,
//   CityPanel.tsx); Escape goes back to /city, and focus is on Home's h1
// - every focused element on the way is visible (checkVisibility) and
//   draws a focus indicator (an outline or a box-shadow)
// Wide (1440×900), and at 1024×768, where the tags may give way to the row.
// Exits 1 on any failure.
import { launch } from "../../audit/scripts/pw.mjs";

const [base = "http://localhost:3100"] = process.argv.slice(2);
const places = ["/city/projects", "/city/experience", "/city/interests", "/city/about", "/city/contact"];
const sizes = [
  { width: 1440, height: 900 },
  { width: 1024, height: 768 },
];
const failures = [];
const fail = (where, what) => {
  failures.push(`${where}: ${what}`);
  console.log(`FAIL ${where}: ${what}`);
};

const focused = () => {
  const a = document.activeElement;
  if (!a || a === document.body || a === document.documentElement) return { none: true };
  const cs = getComputedStyle(a);
  const ring = (cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0) || (cs.boxShadow && cs.boxShadow !== "none");
  return {
    none: false,
    tag: a.tagName.toLowerCase(),
    href: a.getAttribute("href"),
    cls: a.className?.toString?.() ?? "",
    text: (a.textContent ?? "").trim().slice(0, 40),
    h1: a.tagName === "H1",
    section: a.closest("main.city-page")?.dataset.section ?? null,
    visible: a.checkVisibility?.() ?? true,
    ring,
  };
};

const browser = await launch();
for (const size of sizes) {
  const tag = `${size.width}x${size.height}`;
  const ctx = await browser.newContext({ viewport: size });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

  // A fresh load leaves focus at the top
  for (const path of ["/city", ...places]) {
    await page.goto(base + path, { waitUntil: "load" });
    await page.waitForSelector(".city3d[data-arrived]", { timeout: 90000 }).catch(() => fail(`${tag} ${path}`, "the place never arrived"));
    await page.waitForTimeout(800);
    const f = await page.evaluate(focused);
    if (!f.none) fail(`${tag} ${path}`, `a fresh load put focus on ${f.tag}.${f.cls} "${f.text}"`);
    else console.log(`ok   ${tag} ${path}: fresh load, nothing focused`);
  }

  for (const target of places) {
    const where = `${tag} ${target}`;
    await page.goto(base + "/city", { waitUntil: "load" });
    await page.waitForSelector(".city3d[data-arrived]", { timeout: 90000 }).catch(() => {});
    await page.waitForTimeout(1200);
    let found = null;
    let tabs = 0;
    for (; tabs < 80; tabs++) {
      await page.keyboard.press("Tab");
      const f = await page.evaluate(focused);
      if (f.none) continue;
      if (!f.visible) fail(where, `Tab ${tabs + 1} focused a hidden ${f.tag}.${f.cls} "${f.text}"`);
      else if (!f.ring) fail(where, `Tab ${tabs + 1}: ${f.tag}.${f.cls} "${f.text}" shows no focus indicator`);
      if (f.href === target && (await page.evaluate(() => !!document.activeElement.closest(".city-tags, .city-keys")))) {
        found = f;
        break;
      }
    }
    if (!found) {
      fail(where, `no sign tag or place key reached in ${tabs} Tabs`);
      continue;
    }
    const via = (await page.evaluate(() => !!document.activeElement.closest(".city-tags"))) ? "its sign's tag" : "the row of keys";
    await page.keyboard.press("Enter");
    await page.waitForURL((u) => u.pathname === target, { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(600);
    const at = await page.evaluate(() => location.pathname);
    const f = await page.evaluate(focused);
    if (at !== target) fail(where, `Enter went to ${at}`);
    else if (!f.h1 || `/city/${f.section}` !== target) fail(where, `after Enter focus is on ${f.none ? "nothing" : `${f.tag} "${f.text}" (${f.section})`}, not the place's h1`);
    else console.log(`ok   ${where}: ${tabs + 1} Tabs to ${via}, Enter, focus on h1 "${f.text}"`);
    await page.keyboard.press("Escape");
    await page.waitForURL((u) => u.pathname === "/city", { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(600);
    const back = await page.evaluate(() => location.pathname);
    const g = await page.evaluate(focused);
    if (back !== "/city") fail(where, `Escape went to ${back}`);
    else if (!g.h1 || g.section !== "home") fail(where, `after Escape focus is on ${g.none ? "nothing" : `${g.tag} "${g.text}"`}, not Home's h1`);
    else console.log(`ok   ${where}: Escape, back on /city, focus on h1 "${g.text}"`);
  }
  for (const e of errors) fail(tag, `console: ${e.slice(0, 200)}`);
  await ctx.close();
}
await browser.close();
console.log(failures.length ? `\n${failures.length} failure(s)` : "\nall keyboard checks pass");
process.exit(failures.length ? 1 : 0);
