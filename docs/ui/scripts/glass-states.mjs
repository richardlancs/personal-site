// Every button-like control's states (city.css, .glass): default, hover,
// chosen, disabled and keyboard focus, photographed and measured, on wide
// screens (1440) and a phone (390). For each control it checks that it is
// a key (.glass), that the chosen state has the --accent-2 edge and is
// pressed in (an inset shade), that disabled is dashed with the default
// cursor and its label is still 4.5:1 on what's behind, and that focus
// draws the focus ring on its halo. Task 12 (24 November 2026): the
// paper themes; the colours are read from the page's own tokens, for the
// paper given (cream or charcoal; run once per paper).
//   PLAYWRIGHT=…/playwright/index.mjs node docs/ui/scripts/glass-states.mjs <base> [outDir=docs/ui/screenshots] [paper=cream]
// Sheets: glass2-<paper>-<view>-<control>.jpg
import { mkdirSync } from "node:fs";
import { launch } from "../../audit/scripts/pw.mjs";

const [base = "http://localhost:3100", out = "docs/ui/screenshots", paper = "cream"] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const browser = await launch();
const failures = [];
const report = {};
const check = (ok, what) => {
  if (!ok) failures.push(what);
};

// A token's computed value on the page (a colour as rgb(), a shadow as
// the browser writes it)
const token = (page, name, prop = "color", raw = false) =>
  page.evaluate(([name, prop, raw]) => {
    const probe = document.createElement("i");
    probe.style.setProperty(prop, raw ? name : `var(${name})`);
    document.body.append(probe);
    const value = getComputedStyle(probe).getPropertyValue(prop);
    probe.remove();
    return value;
  }, [name, prop, raw]);

let CYAN, FOCUS, HALO;
const arrive = async (page, path) => {
  await page.goto(base + path, { waitUntil: "load" });
  CYAN ??= await token(page, "--accent-2");
  FOCUS ??= await token(page, "--focus");
  // (the halo behind the ring, .glass:focus-visible: the paper at 90%)
  HALO ??= await token(page, "0 0 0 6px color-mix(in srgb, var(--paper) 90%, transparent)", "box-shadow", true);
  await page.waitForFunction(() => document.documentElement.hasAttribute("data-landed"), null, { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(800);
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
  const ls = [];
  for (let i = 0; i < data.length; i += 4) ls.push(lum([data[i], data[i + 1], data[i + 2]]));
  ls.sort((a, b) => a - b);
  const ink = lum(rgb(color));
  // Worst for the words: the darkest 1% under dark words, the lightest 1%
  // under light ones
  const under = ink < 0.18 ? ls[Math.floor(ls.length * 0.01)] : ls[Math.min(ls.length - 1, Math.floor(ls.length * 0.99))];
  return +((Math.max(ink, under) + 0.05) / (Math.min(ink, under) + 0.05)).toFixed(2);
}

async function sheet(shots, file) {
  const p = await browser.newPage({ viewport: { width: 1100, height: 300 }, deviceScaleFactor: 1 });
  const cells = shots.map(([caption, b]) => `<figure style="margin:0"><img style="display:block;max-width:100%" src="data:image/png;base64,${b.toString("base64")}"><figcaption style="margin-top:4px">${caption}</figcaption></figure>`).join("");
  await p.setContent(`<body style="margin:0;background:#26282b;font:600 13px system-ui;color:#ece6da"><div style="display:grid;gap:12px;padding:12px">${cells}</div></body>`);
  await p.waitForTimeout(150);
  await p.screenshot({ path: file, type: "jpeg", quality: 80, fullPage: true });
  await p.close();
}

const shot = async (page, locator, pad = 12) => {
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  const vp = page.viewportSize();
  const x = Math.max(0, box.x - pad), y = Math.max(0, box.y - pad);
  const width = Math.min(vp.width - x, box.width + 2 * pad), height = Math.min(vp.height - y, box.height + 2 * pad);
  // (off the screen: the journey moved it on; the whole view instead)
  if (width < 2 || height < 2) return page.screenshot();
  return page.screenshot({ clip: { x, y, width, height } });
};

// Each control: where it is, the row or group to photograph, the chosen
// one, another to hover, and a disabled one when it has one
// (The Sections menu's rows are plain rows since Task 9, V13: not glass)
const controls = {
  desktop: [
    { name: "corner", path: "/", group: ".top-bar-end", other: '[popovertarget="places-menu"]' },
    { name: "hero", path: "/", group: ".hero-actions", other: ".hero-actions .glass" },
    { name: "project", path: "/#marketlab", group: "#marketlab p:has(> a.glass)", other: "#marketlab a.glass:not(.glass-primary)" },
    { name: "copy", path: "/#contact", group: "#contact .contact > div:has(button.glass)", other: "#contact button.glass", copy: true },
    { name: "profile", path: "/#contact", group: '#contact ul[aria-label="Links"]', other: "#contact .profile-key" },
    { name: "resume", path: "/", resume: true, group: ".resume-bar", chosen: '.resume-fit[aria-pressed="true"]', other: ".resume-close" },
    { name: "resume-limit", path: "/", resume: true, zoom: true, group: ".resume-bar", other: ".resume-close", disabled: '.resume .glass[aria-disabled="true"]' },
  ],
  phone: [
    { name: "corner", path: "/", group: ".top-bar-end", other: '[popovertarget="places-menu"]' },
    { name: "hero", path: "/", group: ".hero-actions", other: ".hero-actions .glass" },
    { name: "copy", path: "/#contact", group: "#contact .contact > div:has(button.glass)", other: "#contact button.glass", copy: true },
    { name: "profile", path: "/#contact", group: '#contact ul[aria-label="Links"]', other: "#contact .profile-key" },
    { name: "resume", path: "/", resume: true, group: ".resume-bar", chosen: '.resume-fit[aria-pressed="true"]', other: ".resume-close" },
    { name: "resume-limit", path: "/", resume: true, zoom: true, group: ".resume-bar", other: ".resume-close", disabled: '.resume .glass[aria-disabled="true"]' },
  ],
};

// The states (city.css): the chosen edge is --accent-2 (CYAN, its old
// name), focus is --focus on a halo of the paper: read from the page (arrive)

const views = {
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
  phone: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
};

for (const [view, opts] of Object.entries(views)) {
  const ctx = await browser.newContext({ ...opts, permissions: ["clipboard-read", "clipboard-write"] });
  // The paper, before the head script reads it (lib/paper.ts)
  await ctx.addInitScript((p) => localStorage.setItem("paper", p), paper);
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
      for (let i = 0; i < 12 && !(await page.locator('.resume [aria-label="Zoom in"][aria-disabled="true"]').count()); i++)
        await page.locator('.resume [aria-label="Zoom in"]').click({ timeout: 5000 }).catch(() => failures.push(`${key}: no Zoom in key (the résumé didn't open)`));
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
      // (the résumé's chosen "Fit width" keeps its cyan edge inside only, so
      // it never looks like the focus ring: V20)
      check((c.resume ? r.chosen.shadow : r.chosen.border).includes(CYAN), `${key}: chosen edge ${r.chosen.border} / ${r.chosen.shadow}`);
      check(/inset/.test(r.chosen.shadow), `${key}: chosen not pressed in (${r.chosen.shadow})`);
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
      check(r.copied.border.includes(CYAN), `${key}: copied edge ${r.copied.border}`);
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
    check(new RegExp(`^solid ${FOCUS.replace(/[()]/g, "\\$&")} [23]px`).test(r.focus.outline) && r.focus.shadow.includes(HALO), `${key}: focus ${r.focus.outline} / ${r.focus.shadow}`);
    shots.push([c.chosen ? "keyboard focus on the chosen one" : "keyboard focus", await shot(page, group, 14)]);

    // The press reaches it
    await other.focus();
    // Watched as it happens: a menu row's press is let go as soon as the
    // menu closes behind the navigation (GlassPress.tsx)
    await page.evaluate(() => {
      window.__pressed = false;
      new MutationObserver(() => {
        if (document.querySelector(".glass[data-pressed]")) window.__pressed = true;
      }).observe(document, { subtree: true, attributes: true, attributeFilter: ["data-pressed"] });
    });
    await page.keyboard.press(c.resume || c.name === "corner" || c.copy ? "Space" : "Enter").catch(() => {});
    r.pressedByKeyboard = await page.evaluate(() => window.__pressed || !!document.querySelector(".glass[data-pressed]"));
    check(r.pressedByKeyboard, `${key}: no press from the keyboard`);
    await page.keyboard.press("Escape").catch(() => {});

    await sheet(shots, `${out}/glass2-${paper}-${view}-${c.name}.jpg`);
  }
  await ctx.close();
}

await browser.close();
console.log(JSON.stringify(report, null, 1));
console.log(failures.length ? `FAIL ${failures.length}\n${failures.join("\n")}` : "all states as specified");
process.exitCode = failures.length ? 1 : 0;
