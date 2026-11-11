// Every button-like control's states (globals.css, .glass): default,
// hover, chosen, disabled and keyboard focus, photographed and measured,
// on wide screens (1440) and a phone (390). For each control it checks
// that it is glass, that the chosen state has the focus-blue edge and is
// pressed in (no outer shadow), that disabled is dashed with the default
// cursor and its label is still 4.5:1 on what's behind, and that focus
// draws the ring on its halo.
//   PLAYWRIGHT=…/playwright/index.mjs node docs/ui/scripts/glass-states.mjs <base> [outDir=docs/ui/screenshots]
// Sheets: glass2-<view>-<control>.jpg
import { mkdirSync } from "node:fs";
import { launch } from "../../audit/scripts/pw.mjs";

const [base = "http://localhost:3201", out = "docs/ui/screenshots"] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const browser = await launch();
const failures = [];
const report = {};
const check = (ok, what) => {
  if (!ok) failures.push(what);
};

const arrive = async (page, path) => {
  await page.goto(base + path, { waitUntil: "load" });
  await page.waitForFunction(() => document.querySelector(".world3d")?.getAttribute("data-arrived") === "true", null, { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(1800);
};

// The look of one element: what the states are made of
const look = (locator) =>
  locator.evaluate((el) => {
    const cs = getComputedStyle(el);
    return {
      glass: el.classList.contains("glass"),
      border: `${cs.borderTopStyle} ${cs.borderTopColor}`,
      shadow: cs.boxShadow,
      outline: `${cs.outlineStyle} ${cs.outlineColor} ${cs.outlineOffset}`,
      cursor: cs.cursor,
      color: cs.color,
      height: Math.round(el.getBoundingClientRect().height),
    };
  });

const lin = (c) => ((c /= 255) <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const rgb = (s) => s.match(/[\d.]+/g).slice(0, 3).map(Number);
// The label's contrast against the darkest of what's under it, the words hidden
async function labelContrast(page, locator) {
  await locator.scrollIntoViewIfNeeded();
  const color = (await look(locator)).color;
  // The words hidden, and anything drawn beside them (a lamp, a screen)
  await locator.evaluate((el) => {
    el.style.setProperty("color", "transparent", "important");
    for (const k of el.children) k.style.visibility = "hidden";
  });
  const box = await locator.boundingBox();
  const png = await page.screenshot({ clip: { x: box.x + 4, y: box.y + 4, width: box.width - 8, height: box.height - 8 } });
  await locator.evaluate((el) => {
    el.style.removeProperty("color");
    for (const k of el.children) k.style.visibility = "";
  });
  const data = await page.evaluate(async (b64) => {
    const img = new Image();
    img.src = `data:image/png;base64,${b64}`;
    await img.decode();
    const c = new OffscreenCanvas(img.width, img.height);
    const g = c.getContext("2d");
    g.drawImage(img, 0, 0);
    return Array.from(g.getImageData(0, 0, img.width, img.height).data);
  }, png.toString("base64"));
  let dark = 1;
  const ls = [];
  for (let i = 0; i < data.length; i += 4) ls.push(lum([data[i], data[i + 1], data[i + 2]]));
  ls.sort((a, b) => a - b);
  dark = ls[Math.floor(ls.length * 0.01)];
  const ink = lum(rgb(color));
  return +((Math.max(ink, dark) + 0.05) / (Math.min(ink, dark) + 0.05)).toFixed(2);
}

async function sheet(shots, file) {
  const p = await browser.newPage({ viewport: { width: 1100, height: 300 }, deviceScaleFactor: 1 });
  const cells = shots.map(([caption, b]) => `<figure style="margin:0"><img style="display:block;max-width:100%" src="data:image/png;base64,${b.toString("base64")}"><figcaption style="margin-top:4px">${caption}</figcaption></figure>`).join("");
  await p.setContent(`<body style="margin:0;background:#e8e2d9;font:600 13px system-ui;color:#203245"><div style="display:grid;gap:12px;padding:12px">${cells}</div></body>`);
  await p.waitForTimeout(150);
  await p.screenshot({ path: file, type: "jpeg", quality: 80, fullPage: true });
  await p.close();
}

const shot = async (page, locator, pad = 12) => {
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  const vp = page.viewportSize();
  const x = Math.max(0, box.x - pad), y = Math.max(0, box.y - pad);
  return page.screenshot({ clip: { x, y, width: Math.min(vp.width - x, box.width + 2 * pad), height: Math.min(vp.height - y, box.height + 2 * pad) } });
};

// Each control: where it is, the row or group to photograph, the chosen
// one, another to hover, and a disabled one when it has one
const controls = {
  desktop: [
    { name: "bench", path: "/projects", group: ".bench-tabs", chosen: '.bench-tab[aria-selected="true"]', other: '.bench-tab[aria-selected="false"]' },
    { name: "thumbs", path: "/projects#marketlab", group: ".shot-strip", chosen: '.shot-thumb[aria-pressed="true"]', other: '.shot-thumb[aria-pressed="false"]' },
    { name: "cabinets", path: "/interests", group: ".cabinet-row", chosen: '.cabinet-button[aria-selected="true"]', other: '.cabinet-button[aria-selected="false"]' },
    { name: "timetable", path: "/experience", group: ".timetable", chosen: '.timetable-line[aria-pressed="true"]', other: '.timetable-line[aria-pressed="false"]' },
    { name: "notebook", path: "/about", group: ".notebook-controls", other: '.notebook-turn:not([aria-disabled="true"])', disabled: '.notebook-turn[aria-disabled="true"]' },
    { name: "menu", path: "/projects", open: '[popovertarget="places-menu"]', group: "#places-menu", chosen: '#places-menu a[aria-current="page"]', other: '#places-menu a.glass:not([aria-current])' },
    { name: "corner", path: "/projects", group: ".world-controls-end", other: '[popovertarget="places-menu"]' },
    { name: "copy", path: "/contact", group: ".directory-lines", other: ".directory-copy", copy: true },
    { name: "resume", path: "/", resume: true, group: ".resume-bar", chosen: '.resume-fit[aria-pressed="true"]', other: ".resume-close" },
    { name: "resume-limit", path: "/", resume: true, zoom: true, group: ".resume-bar", other: ".resume-close", disabled: '.resume .glass[aria-disabled="true"]' },
  ],
  phone: [
    { name: "bench", path: "/projects", group: ".bench-tabs", chosen: '.bench-tab[aria-selected="true"]', other: '.bench-tab[aria-selected="false"]' },
    { name: "thumbs", path: "/projects#marketlab", group: ".shot-strip", chosen: '.shot-thumb[aria-pressed="true"]', other: '.shot-thumb[aria-pressed="false"]' },
    { name: "menu", path: "/projects", open: '[popovertarget="places-menu"]', group: "#places-menu", chosen: '#places-menu a[aria-current="page"]', other: '#places-menu a.glass:not([aria-current])' },
    { name: "copy", path: "/contact", group: ".directory-lines", other: ".directory-copy", copy: true },
    { name: "resume", path: "/", resume: true, group: ".resume-bar", chosen: '.resume-fit[aria-pressed="true"]', other: ".resume-close" },
    { name: "resume-limit", path: "/", resume: true, zoom: true, group: ".resume-bar", other: ".resume-close", disabled: '.resume .glass[aria-disabled="true"]' },
  ],
};

const views = {
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
  phone: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
};

for (const [view, opts] of Object.entries(views)) {
  const ctx = await browser.newContext({ ...opts, permissions: ["clipboard-read", "clipboard-write"] });
  const page = await ctx.newPage();
  for (let c of controls[view]) {
    const key = `${view} ${c.name}`;
    const r = (report[key] = {});
    await arrive(page, c.path);
    if (c.open) await page.locator(c.open).click();
    if (c.resume) {
      await page.locator("a[data-resume]").first().click();
      await page.waitForFunction(() => document.querySelector(".resume canvas"), null, { timeout: 20000 }).catch(() => {});
      await page.waitForTimeout(800);
    }
    // The résumé zoomed in as far as it goes: "Zoom in" is disabled
    if (c.zoom) {
      for (let i = 0; i < 12 && !(await page.locator('.resume [aria-label="Zoom in"][aria-disabled="true"]').count()); i++) await page.locator('.resume [aria-label="Zoom in"]').click();
      await page.waitForTimeout(600);
    }
    await page.waitForTimeout(400);
    const group = page.locator(c.group).first();
    if (c.chosen && !(await page.locator(c.chosen).count())) c = { ...c, chosen: undefined };
    if (!(await group.count()) || !(await group.isVisible())) {
      failures.push(`${key}: ${c.group} not shown`);
      continue;
    }
    const shots = [];
    await page.mouse.move(2, view === "phone" ? 840 : 890);
    shots.push(["default" + (c.chosen ? " (the chosen one is pressed in, edged in focus blue)" : ""), await shot(page, group)]);

    // Everything in it that's a control is glass
    r.notGlass = await group.evaluate((g) => [...g.querySelectorAll("button, a[href]")].filter((el) => !el.classList.contains("glass") && !el.classList.contains("text-link") && el.getClientRects().length).map((el) => el.outerHTML.slice(0, 80)));
    check(!r.notGlass.length, `${key}: not glass: ${r.notGlass.join(", ")}`);

    const other = page.locator(c.other).first();
    r.default = await look(other);
    check(r.default.glass && r.default.height >= 44, `${key}: default not 44px glass (${r.default.height})`);
    r.defaultContrast = await labelContrast(page, other);
    check(r.defaultContrast >= 4.5, `${key}: default label ${r.defaultContrast}:1`);

    if (c.chosen) {
      const chosen = page.locator(c.chosen).first();
      r.chosen = await look(chosen);
      check(r.chosen.border.includes("rgb(50, 110, 159)"), `${key}: chosen edge ${r.chosen.border}`);
      check(/inset/.test(r.chosen.shadow) && !/rgba\(32, 50, 69, 0\.35\) 0px 6px/.test(r.chosen.shadow), `${key}: chosen not pressed in (${r.chosen.shadow})`);
      r.chosenContrast = await labelContrast(page, chosen);
      check(r.chosenContrast >= 4.5, `${key}: chosen label ${r.chosenContrast}:1`);
    }

    if (view === "desktop") {
      await other.hover();
      await page.waitForTimeout(300);
      shots.push(["hover", await shot(page, group)]);
      await page.mouse.move(2, 890);
    }

    if (c.copy) {
      await other.click();
      await page.waitForTimeout(350);
      r.copied = await look(other);
      check(r.copied.border.includes("rgb(50, 110, 159)"), `${key}: copied edge ${r.copied.border}`);
      shots.push(["Copied (chosen)", await shot(page, group)]);
      await page.waitForTimeout(2200);
    }

    if (c.disabled) {
      const disabled = page.locator(c.disabled).first();
      if (await disabled.count()) {
        r.disabled = await look(disabled);
        check(r.disabled.border.startsWith("dashed") && r.disabled.cursor === "default", `${key}: disabled ${r.disabled.border} ${r.disabled.cursor}`);
        r.disabledContrast = await labelContrast(page, disabled);
        check(r.disabledContrast >= 4.5, `${key}: disabled label ${r.disabledContrast}:1`);
        // No press on a disabled control
        await disabled.click({ force: true });
        r.disabledPressed = await disabled.evaluate((el) => el.hasAttribute("data-pressed"));
        check(!r.disabledPressed, `${key}: disabled control was pressed`);
        await page.keyboard.press("Shift");
        await disabled.focus();
        await page.waitForTimeout(150);
        shots.push(["disabled, with keyboard focus (it stays focusable: aria-disabled)", await shot(page, group, 14)]);
      } else r.disabled = "none showing";
    }

    // Keyboard focus: on the chosen one where there is one (the row's tab stop)
    const focusTarget = c.chosen ? page.locator(c.chosen).first() : other;
    await page.keyboard.press("Shift");
    await focusTarget.focus();
    await page.waitForTimeout(150);
    r.focus = await look(focusTarget);
    check(/^solid rgb\(50, 110, 159\) [23]px/.test(r.focus.outline) && r.focus.shadow.includes("rgba(255, 249, 242, 0.92) 0px 0px 0px 6px"), `${key}: focus ${r.focus.outline} / ${r.focus.shadow}`);
    shots.push([c.chosen ? "keyboard focus on the chosen one" : "keyboard focus", await shot(page, group, 14)]);

    // The press reaches it
    await other.focus();
    await page.keyboard.press(c.name === "notebook" || c.resume || c.name === "corner" ? "Space" : "Enter").catch(() => {});
    r.pressedByKeyboard = await page.evaluate(() => !!document.querySelector(".glass[data-pressed]"));
    check(r.pressedByKeyboard, `${key}: no press from the keyboard`);
    await page.keyboard.press("Escape").catch(() => {});

    await sheet(shots, `${out}/glass2-${view}-${c.name}.jpg`);
  }
  await ctx.close();
}

await browser.close();
console.log(JSON.stringify(report, null, 1));
console.log(failures.length ? `FAIL ${failures.length}\n${failures.join("\n")}` : "all states as specified");
process.exitCode = failures.length ? 1 : 0;
