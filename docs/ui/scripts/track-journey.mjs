// The journey's guarantees (the horizontal city's plan, "Review Focus"),
// checked in a real browser against a running site:
//   PLAYWRIGHT=…/playwright/index.mjs node docs/ui/scripts/track-journey.mjs [http://localhost:3110]
// 1. a mouse wheel, Space/PageDown/arrow keys, the scrollbar and a touch
//    swipe (up and sideways) all travel the city to Contact and back home;
// 2. every anchor loaded cold lands on its stop; Back/Forward restore it;
// 3. a resize or a turn keeps the stop;
// 4. a panel taller than the stage scrolls inside, and its scroll never
//    moves the city (wheel and touch);
// 5. without JavaScript, and with the page's scripts failing, the page
//    reads top to bottom.
// Exits 1 on any failure. Headless Chrome (pw.mjs).
import { launch } from "../../audit/scripts/pw.mjs";

const base = process.argv[2] || "http://localhost:3110";
const failures = [];
const check = (ok, what) => {
  console.log(`${ok ? "ok  " : "FAIL"} ${what}`);
  if (!ok) failures.push(what);
};

// Which stop is at the left edge (its left within 2px of 0), or null
const atStop = (page) =>
  page.evaluate(() => {
    const s = [...document.querySelectorAll(".track > .station")].find((el) => Math.abs(el.getBoundingClientRect().left) <= 2);
    return s?.id ?? null;
  });
const settle = (page, ms = 900) => page.waitForTimeout(ms);
const open = async (ctx, route, size = { width: 1440, height: 900 }) => {
  const page = await ctx.newPage();
  await page.setViewportSize(size);
  page.on("pageerror", (e) => failures.push(`page error on ${route}: ${e.message}`));
  await page.goto(base + route, { waitUntil: "load" });
  await page.waitForFunction(() => document.documentElement.hasAttribute("data-track-ready"));
  await settle(page, 400);
  return page;
};

const browser = await launch();
try {
  const ctx = await browser.newContext();

  // 1. Wheel over the painting, to the end and back
  {
    const page = await open(ctx, "/");
    check((await page.evaluate(() => document.documentElement.dataset.track)) === "on", "the journey is on at 1440×900");
    await page.mouse.move(1200, 300);
    for (let i = 0; i < 80 && (await atStop(page)) !== "contact"; i++) {
      await page.mouse.wheel(0, 400);
      await settle(page, 60);
    }
    await settle(page, 300);
    check((await atStop(page)) === "contact", "a mouse wheel reaches Contact");
    for (let i = 0; i < 80 && (await page.evaluate(() => scrollY)) > 0; i++) {
      await page.mouse.wheel(0, -400);
      await settle(page, 60);
    }
    await settle(page, 300);
    check((await atStop(page)) === "home", "and back home");
    // The menu says where you are, along the way
    await page.evaluate(() => scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }));
    await settle(page, 300);
    check((await page.evaluate(() => document.querySelector('.progress-point[aria-current="location"]')?.textContent)) === "Contact", "the progress line is at Contact at the end");

    // Keys: ArrowRight stop by stop, ArrowLeft back, PageDown/Space travel
    await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
    await page.locator("body").click({ position: { x: 1300, y: 200 } });
    const seen = [];
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press("ArrowRight");
      await settle(page);
      seen.push(await atStop(page));
    }
    check(seen.join() === "about,projects,experience,interests,contact", `ArrowRight goes stop by stop (${seen.join()})`);
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press("ArrowLeft");
      await settle(page);
    }
    check((await atStop(page)) === "home", "ArrowLeft goes back home");
    for (let i = 0; i < 40 && (await atStop(page)) !== "contact"; i++) {
      await page.keyboard.press(i % 2 ? "PageDown" : "Space");
      await settle(page, 250);
    }
    check((await atStop(page)) === "contact", "Space and PageDown reach Contact");
    await page.keyboard.press("Home");
    await settle(page);
    check((await atStop(page)) === "home", "Home goes back to the first stop");
    await page.keyboard.press("End");
    await settle(page);
    check((await atStop(page)) === "contact", "End goes to the last stop");

    // The scrollbar: the page scrolls down like any page (dragging it is a scroll)
    const tall = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
    const travel = await page.evaluate(() => parseFloat(document.querySelector(".track-runway").style.getPropertyValue("--travel")));
    check(Math.abs(tall - travel) <= 1, `the page's scroll is the track's travel (${tall} / ${travel})`);
    await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
    await settle(page, 200);
    const sw = await page.evaluate(() => innerWidth - document.documentElement.clientWidth);
    if (sw > 0) {
      await page.mouse.move(1440 - sw / 2, 30);
      await page.mouse.down();
      await page.mouse.move(1440 - sw / 2, 899, { steps: 10 });
      await page.mouse.up();
      await settle(page, 300);
      check((await atStop(page)) === "contact", "dragging the scrollbar reaches Contact");
    } else {
      // Overlay scrollbars: a scroll to the bottom is what a drag does
      await page.evaluate(() => scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }));
      await settle(page, 200);
      check((await atStop(page)) === "contact", "the scrollbar's range ends at Contact (overlay scrollbar)");
    }
    // No listener here stops a scroll: nothing is prevented
    check(!(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)), "the page never scrolls sideways");
    await page.close();
  }

  // 1b. Touch: a phone, swiping up (a page scroll) and sideways (CityTrack)
  {
    const tctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
    const page = await open(tctx, "/", { width: 390, height: 844 });
    const cdp = await tctx.newCDPSession(page);
    const swipe = (x, y, dx, dy) => cdp.send("Input.synthesizeScrollGesture", { x, y, xDistance: dx, yDistance: dy, gestureSourceType: "touch", speed: 1600, preventFling: true });
    for (let i = 0; i < 30 && (await atStop(page)) !== "contact"; i++) await swipe(200, 250, 0, -260);
    await settle(page, 300);
    const end = await page.evaluate(() => [scrollY, document.documentElement.scrollHeight - innerHeight]);
    check(end[0] >= end[1] - 2, `a touch swipe up (on the painting) travels to the end (${end})`);
    check((await atStop(page)) === "contact", "and that is Contact");
    for (let i = 0; i < 30 && (await page.evaluate(() => scrollY)) > 0; i++) await swipe(200, 250, 0, 300);
    await settle(page, 300);
    check((await atStop(page)) === "home", "a touch swipe down travels back home");
    // Sideways, anywhere on the stage, the sheet included
    const y0 = await page.evaluate(() => scrollY);
    await swipe(330, 600, -250, 0);
    await settle(page, 500);
    const y1 = await page.evaluate(() => scrollY);
    check(y1 > y0 + 150, `a sideways swipe (right to left) travels forward (${y0} → ${y1})`);
    await swipe(60, 600, 250, 0);
    await settle(page, 500);
    check((await page.evaluate(() => scrollY)) < y1 - 150, "and left to right travels back");
    await page.close();
    await tctx.close();
  }

  // 2. Anchors, cold, at three sizes; Back and Forward
  for (const size of [{ width: 1440, height: 900 }, { width: 390, height: 844 }, { width: 844, height: 390 }]) {
    for (const id of ["about", "projects", "experience", "interests", "contact"]) {
      const page = await open(ctx, `/#${id}`, size);
      check((await atStop(page)) === id, `/#${id} cold at ${size.width}×${size.height} lands on its stop (got ${await atStop(page)})`);
      await page.close();
    }
    const page = await open(ctx, "/#skills", size);
    const skills = await page.evaluate(() => {
      const s = document.getElementById("skills").getBoundingClientRect();
      return { stop: document.getElementById("projects").getBoundingClientRect().left, top: s.top, h: innerHeight };
    });
    check(Math.abs(skills.stop) <= 2 && skills.top >= 0 && skills.top < skills.h, `/#skills cold at ${size.width}×${size.height}: Projects, its panel at Skills`);
    await page.close();
  }
  {
    const page = await open(ctx, "/");
    await page.click('button[popovertarget="places-menu"]');
    await page.click('#places-menu a[href="/#experience"]');
    await settle(page, 1200);
    check((await atStop(page)) === "experience", "the Sections menu goes to Experience");
    await page.click('button[popovertarget="places-menu"]');
    await page.click('#places-menu a[href="/#contact"]');
    await settle(page, 1200);
    check((await atStop(page)) === "contact", "then to Contact");
    await page.goBack();
    await settle(page, 1200);
    check((await atStop(page)) === "experience", "Back returns to Experience");
    await page.goForward();
    await settle(page, 1200);
    check((await atStop(page)) === "contact", "Forward returns to Contact");
    // The same link again, after scrolling away, still goes there
    await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
    await page.click('button[popovertarget="places-menu"]');
    await page.click('#places-menu a[href="/#contact"]');
    await settle(page, 1500);
    check((await atStop(page)) === "contact", "the menu's link to where the address already is still goes there");
    // Tab into the next stop brings it on
    await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
    await settle(page, 200);
    await page.evaluate(() => document.querySelector("#about a, #about button, #about summary")?.focus());
    await settle(page);
    check((await atStop(page)) === "about", "focus moved into the next stop brings it on");
    await page.close();
  }

  // 3. Resize and turn, mid-journey
  {
    const page = await open(ctx, "/#projects");
    for (const size of [{ width: 1024, height: 768 }, { width: 1920, height: 1080 }, { width: 390, height: 844 }, { width: 844, height: 390 }, { width: 1440, height: 900 }]) {
      await page.setViewportSize(size);
      await settle(page, 500);
      check((await atStop(page)) === "projects", `resized to ${size.width}×${size.height}, still at Projects (got ${await atStop(page)})`);
    }
    await page.close();
  }

  // 4. A panel taller than the stage scrolls inside; the city stays put
  {
    const page = await open(ctx, "/#projects", { width: 844, height: 390 });
    const panel = page.locator("#projects > .station-body");
    const fit = await panel.evaluate((p) => [p.scrollHeight, p.clientHeight, p.getBoundingClientRect().bottom, innerHeight]);
    check(fit[0] > fit[1] && fit[2] <= fit[3], `Projects' panel at 844×390 is taller than it shows and fits the stage (${fit})`);
    const box = await panel.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    const y0 = await page.evaluate(() => scrollY);
    for (let i = 0; i < 60; i++) await page.mouse.wheel(0, 500);
    await settle(page, 400);
    const after = await page.evaluate(() => [scrollY, document.querySelector("#projects > .station-body").scrollTop]);
    check(after[1] > 0, "the wheel scrolls the panel");
    check(after[0] === y0, `and never the city, even past the panel's end (${y0} → ${after[0]})`);
    await page.close();
    const tctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    const phone = await open(tctx, "/#projects", { width: 390, height: 844 });
    const cdp = await tctx.newCDPSession(phone);
    const py0 = await phone.evaluate(() => scrollY);
    for (let i = 0; i < 12; i++) await cdp.send("Input.synthesizeScrollGesture", { x: 200, y: 700, xDistance: 0, yDistance: -400, gestureSourceType: "touch", speed: 2000 });
    await settle(phone, 600);
    const pafter = await phone.evaluate(() => [scrollY, document.querySelector("#projects > .station-body").scrollTop]);
    check(pafter[1] > 0 && pafter[0] === py0, `a touch scroll in a phone's sheet scrolls the sheet, not the city (${py0} → ${pafter})`);
    await phone.close();
    await tctx.close();
  }

  // 5. No JavaScript; and the page's scripts failing
  for (const [label, opts, route] of [
    ["without JavaScript", { javaScriptEnabled: false }, null],
    ["with the page's scripts failing", {}, (r) => (/\/_next\/static\/chunks\/.*\.js(\?|$)/.test(r.request().url()) ? r.abort() : r.continue())],
  ]) {
    const c = await browser.newContext({ viewport: { width: 1440, height: 900 }, ...opts });
    const page = await c.newPage();
    if (route) await page.route("**/*", route);
    await page.goto(base + "/", { waitUntil: "load" });
    if (route) await page.waitForTimeout(3600);
    const r = await page.evaluate(() => {
      const top = (id) => document.getElementById(id).getBoundingClientRect().top + scrollY;
      return { track: document.documentElement.dataset.track ?? null, order: ["home", "about", "projects", "experience", "interests", "contact"].map(top), tall: document.documentElement.scrollHeight, wide: document.documentElement.scrollWidth - innerWidth };
    });
    check(r.track !== "on", `${label}: no journey (data-track ${r.track})`);
    check(r.order.every((t, i) => i === 0 || t > r.order[i - 1]) && r.tall > 900 * 4 && r.wide <= 0, `${label}: the sections read top to bottom (${r.order.map(Math.round)})`);
    await c.close();
  }
} finally {
  await browser.close();
}
console.log(failures.length ? `\n${failures.length} failed` : "\nall passed");
process.exit(failures.length ? 1 : 0);
