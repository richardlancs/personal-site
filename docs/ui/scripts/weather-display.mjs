// The time and weather display is something to read, not a control, and the
// home page's introduction still leads everywhere it did.
//   PLAYWRIGHT=…/playwright/index.mjs node docs/ui/scripts/weather-display.mjs http://localhost:3100
// Desktop (mouse and keyboard) and phone (touch), on a production build.
import { launch } from "../../audit/scripts/pw.mjs";

const base = process.argv[2] || "http://localhost:3100";
const results = [];
const check = (name, pass, detail = "") => {
  results.push(pass);
  console.log(`${pass ? "ok  " : "FAIL"} ${name}${detail ? "  " + JSON.stringify(detail) : ""}`);
};
const looks = (el) =>
  el.evaluate((e) => {
    const c = getComputedStyle(e);
    return [c.backgroundColor, c.borderColor, c.color, c.boxShadow, c.scale, c.transform, c.opacity].join("|");
  });

const browser = await launch();
for (const view of ["desktop", "phone"]) {
  const phone = view === "phone";
  const ctx = await browser.newContext(phone ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : { viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  // A fake clock, so a minute can pass on demand
  await page.clock.install({ time: new Date("2026-11-11T15:58:30-05:00") });
  await page.goto(base + "/", { waitUntil: "load" });
  await page.clock.runFor(3000);
  const rh = page.locator(".rh");
  await rh.waitFor();

  // What it is
  const semantics = await rh.evaluate((e) => ({
    tag: e.tagName,
    controls: e.querySelectorAll("button, a, input, [tabindex], [popovertarget], [role]").length,
    tabindex: e.getAttribute("tabindex"),
    live: !!e.closest("[aria-live], [role=status], [role=timer]"),
    time: e.querySelector("time")?.getAttribute("datetime") ?? null,
    cursor: getComputedStyle(e).cursor,
    select: getComputedStyle(e).userSelect,
  }));
  check(`${view}: plain text in a <p>, no controls, no live region`, semantics.tag === "P" && semantics.controls === 0 && semantics.tabindex === null && !semantics.live, semantics);
  check(`${view}: a <time> with a machine-readable minute`, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(semantics.time ?? ""), semantics.time);
  check(`${view}: no pointer cursor, text selectable`, semantics.cursor !== "pointer" && semantics.select !== "none", semantics);

  // Hover and click change nothing
  const before = await looks(rh);
  if (!phone) {
    await rh.hover();
    await page.clock.runFor(400);
    check(`${view}: hovering changes nothing`, (await looks(rh)) === before);
  }
  const url = page.url();
  if (phone) await rh.tap();
  else await rh.click();
  await page.clock.runFor(500);
  const after = await page.evaluate(() => ({ open: !!document.querySelector(":popover-open, dialog[open]"), pressed: !!document.querySelector(".rh[data-pressed], .rh [data-pressed]") }));
  check(`${view}: clicking opens nothing, presses nothing, goes nowhere`, !after.open && !after.pressed && page.url() === url && (await looks(rh)) === before, after);

  // Selectable: a double click selects a word in it
  if (!phone) {
    await page.locator(".rh-place").dblclick();
    const selected = await page.evaluate(() => getSelection().toString().trim());
    check(`${view}: its words can be selected`, selected.length > 0, selected);
    await page.evaluate(() => getSelection().removeAllRanges());
  }

  // The keyboard passes it by: Tab from the top never lands in it
  if (!phone) {
    await page.evaluate(() => document.activeElement?.blur());
    const stops = [];
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press("Tab");
      stops.push(await page.evaluate(() => ({ inRh: !!document.activeElement?.closest(".rh"), text: document.activeElement?.textContent?.trim().slice(0, 20) })));
    }
    check(`${view}: Tab never stops on it`, stops.every((s) => !s.inRh), stops.map((s) => s.text));
  }

  // The clock still ticks: a minute later, the time and <time> follow
  const t0 = await page.locator(".rh-time").textContent();
  await page.clock.runFor(61_000);
  const t1 = await page.locator(".rh-time").textContent();
  check(`${view}: the time moves on with the clock`, t0 !== t1, { t0, t1 });

  // (On the fake clock, hours from the real reading, it's too old to show:
  // "unavailable". The live reading is checked below, on the real clock.)

  // The introduction: exact subtitle, no paragraph, every link
  const intro = await page.evaluate(() => ({
    subtitle: document.querySelector(".park-headline")?.textContent,
    paragraph: !!document.querySelector(".park-about"),
    links: [...document.querySelectorAll(".park-intro a")].map((a) => [a.textContent.replace(/\s*\(opens in a new tab\)/, "").trim(), a.getAttribute("href")]),
  }));
  check(`${view}: the subtitle is exactly cs@uwaterloo, and there's no paragraph`, intro.subtitle === "cs@uwaterloo" && !intro.paragraph, intro);
  const want = { "View projects": "/projects", Contact: "/contact", GitHub: "https://github.com/richardlancs", LinkedIn: "https://www.linkedin.com/in/richard-lan-0312072a8", "Résumé": "/resume/richard-lan-resume.pdf" };
  check(`${view}: View projects, Contact, GitHub, LinkedIn and Résumé, with their addresses`, Object.entries(want).every(([t, h]) => intro.links.some(([lt, lh]) => lt === t && lh === h)), intro.links);
  await ctx.close();

  // And they work: the actions navigate, the résumé opens over the page
  const ctx2 = await browser.newContext(phone ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } : { viewport: { width: 1440, height: 900 } });
  const p2 = await ctx2.newPage();
  // On the real clock, the live reading arrives: a temperature and a
  // condition from /api/weather (or "Weather unavailable" if Open-Meteo is
  // down: never a placeholder)
  await p2.goto(base + "/", { waitUntil: "load" });
  await p2.waitForFunction(() => document.querySelector(".rh")?.getAttribute("data-status") !== "loading", null, { timeout: 15000 }).catch(() => {});
  const live = await p2.evaluate(async () => ({
    status: document.querySelector(".rh")?.getAttribute("data-status"),
    shown: document.querySelector(".rh")?.textContent,
    api: await fetch("/api/weather").then((r) => r.json()).catch(() => null),
  }));
  const temp = live.api?.reading ? `${Math.round(live.api.reading.temperatureC)}` : null;
  check(
    `${view}: the live reading is shown`,
    live.api?.ok ? live.status === "fresh" && live.shown.replace(/\s/g, "").includes(`${temp.replace("-", "−")}°C`) : live.shown.includes("Weather unavailable"),
    { status: live.status, shown: live.shown, temperatureC: live.api?.reading?.temperatureC },
  );
  for (const [label, path] of [["View projects", "/projects"], ["Contact", "/contact"]]) {
    await p2.goto(base + "/", { waitUntil: "load" });
    const a = p2.locator(".park-intro a", { hasText: label });
    await (phone ? a.tap() : a.click());
    await p2.waitForURL((u) => u.pathname === path, { timeout: 10000 }).catch(() => {});
    check(`${view}: ${label} goes to ${path}`, new URL(p2.url()).pathname === path, p2.url());
  }
  await p2.goto(base + "/", { waitUntil: "load" });
  const resume = p2.locator(".park-intro a[data-resume]");
  await (phone ? resume.tap() : resume.click());
  const opened = await p2.waitForSelector("dialog.resume[open] .resume-page[data-drawn]", { timeout: 20000 }).then(() => true, () => false);
  check(`${view}: Résumé opens the viewer`, opened);
  await ctx2.close();
}
await browser.close();
const failed = results.filter((r) => !r).length;
console.log(`${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
