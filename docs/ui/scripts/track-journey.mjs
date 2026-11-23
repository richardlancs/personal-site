// The journey's guarantees (the horizontal city's plan, "Review Focus"),
// checked in a real browser against a running site:
//   PLAYWRIGHT=…/playwright/index.mjs node docs/ui/scripts/track-journey.mjs [http://localhost:3110]
// 1. a mouse wheel, Space/PageDown/arrow keys, the scrollbar and a touch
//    swipe (up and sideways) all travel the city to Contact and back home;
// 2. every anchor loaded cold lands on its stop; Back/Forward restore it;
// 3. a resize or a turn keeps the stop;
// 4. a panel taller than the stage scrolls inside (wheel, keys and touch),
//    and at its end the scroll goes on along the city: wheel and PageDown
//    over an opened long panel reach the next stop;
// 5. without JavaScript, and with the page's scripts failing, the page
//    reads top to bottom.
// Exits 1 on any failure. Headless Chrome (pw.mjs). NO_TIMELINE=1 runs it
// as a browser without scroll-driven animations would (Firefox, older
// Safari): the timeline switched off, so CityTrack's frame does the move.
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
// Until a glide has come to rest (a long one, across a row of panels, takes
// the browser's smooth scroll over a second): the scroll still for ten
// frames, at most 4 s
const rest = (page) =>
  page.evaluate(async () => {
    const t0 = performance.now();
    let last = scrollY;
    for (let still = 0; still < 10 && performance.now() - t0 < 4000; ) {
      await new Promise((r) => requestAnimationFrame(r));
      still = scrollY === last ? still + 1 : 0;
      last = scrollY;
    }
  });
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
const NO_TIMELINE = process.env.NO_TIMELINE === "1";
const newContext = async (opts = {}) => {
  const c = await browser.newContext(opts);
  if (NO_TIMELINE)
    await c.addInitScript(() => {
      const supports = CSS.supports.bind(CSS);
      CSS.supports = (a, b) => (/animation-timeline/.test(String(a)) ? false : b === undefined ? supports(a) : supports(a, b));
      addEventListener("DOMContentLoaded", () => {
        const s = document.createElement("style");
        s.textContent = ".track, .track-sky, .track-weather { animation: none !important; }";
        document.head.append(s);
      });
    });
  return c;
};
try {
  const ctx = await newContext();

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
      await settle(page, 300);
      await rest(page);
      seen.push(await atStop(page));
    }
    check(seen.join() === "about,projects,experience,interests,contact", `ArrowRight goes stop by stop (${seen.join()})`);
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press("ArrowLeft");
      await settle(page, 300);
      await rest(page);
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
    const tctx = await newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
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

  // 1c. Closure shows the next stop's city, never its words: at each
  // settled stop, no text of another stop shows on the screen (a point
  // in its words that the browser would hit belongs to the stop you're at)
  for (const size of [{ width: 1440, height: 900 }, { width: 390, height: 844 }, { width: 320, height: 640 }, { width: 844, height: 390 }, { width: 768, height: 1024 }]) {
    const page = await open(ctx, "/", size);
    for (const id of ["home", "about", "projects", "experience", "interests", "contact"]) {
      await page.evaluate((i) => {
        location.hash = i;
      }, id);
      await settle(page, 300);
      await rest(page);
      await settle(page, 300);
      const seen = await page.evaluate(() => {
        const stops = [...document.querySelectorAll(".track > .station")];
        const here = stops.find((s) => Math.abs(s.getBoundingClientRect().left) <= 2);
        const out = [];
        const walker = document.createTreeWalker(document.querySelector(".track"), NodeFilter.SHOW_TEXT);
        for (let n = walker.nextNode(); n; n = walker.nextNode()) {
          const stop = n.parentElement?.closest(".track > .station");
          if (!n.textContent.trim() || !stop || stop === here || !n.parentElement.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue;
          const range = document.createRange();
          range.selectNodeContents(n);
          for (const r of range.getClientRects()) {
            const x = Math.min(Math.max((r.left + r.right) / 2, r.left + 1), r.right - 1);
            const pts = [[r.left + 1, r.top + r.height / 2], [x, r.top + r.height / 2], [r.right - 1, r.top + r.height / 2]];
            for (const [px, py] of pts) {
              if (px < 0 || px >= innerWidth || py < 0 || py >= innerHeight) continue;
              const hit = document.elementFromPoint(px, py);
              if (hit && stop.contains(hit)) out.push(`#${stop.id} "${n.textContent.trim().slice(0, 16)}" at ${Math.round(px)},${Math.round(py)}`);
            }
          }
        }
        return { here: here?.id, out: [...new Set(out)].slice(0, 4) };
      });
      check(seen.here === id && seen.out.length === 0, `${size.width}×${size.height} at ${id}: no other stop's words on the screen${seen.out.length ? ` (${seen.out.join("; ")})` : ""}`);
    }
    await page.close();
  }

  // 1d. The edges are city: at every settled stop at 1440 and 768, and at
  // the panels in a row and each row's end (Skills, the last project, the
  // last role), no panel's words lie in the outer 10% of the screen on
  // either side. It counts the words it saw, so it can't pass on none.
  for (const size of [{ width: 1440, height: 900 }, { width: 768, height: 1024 }, { width: 1024, height: 768 }]) {
    const page = await open(ctx, "/", size);
    const lastRole = await page.evaluate(() => {
      const p = [...document.querySelectorAll("#experience .exp-stop > .panel")].pop();
      p.id ||= "journey-last-role";
      return p.id;
    });
    for (const id of ["home", "about", "projects", "marketlab", "garagepoker", "skills", "experience", lastRole, "interests", "contact"]) {
      // (the last role has no address of its own: its panel is brought on as
      // a link to it would)
      await page.evaluate((i) => (location.hash = i), id);
      await settle(page, 300);
      await rest(page);
      await settle(page, 300);
      const [out, seen] = await page.evaluate(() => {
        const edge = innerWidth * 0.1;
        const found = [];
        let seen = 0;
        const walker = document.createTreeWalker(document.querySelector(".track"), NodeFilter.SHOW_TEXT);
        for (let n = walker.nextNode(); n; n = walker.nextNode()) {
          const el = n.parentElement;
          if (!n.textContent.trim() || !el?.closest(".panel, .exp-label") || !el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue;
          const range = document.createRange();
          range.selectNodeContents(n);
          // (as drawn: a line cut short by its box, an ellipsis, ends there)
          const box = el.getBoundingClientRect();
          for (const q of range.getClientRects()) {
            const r = { left: Math.max(q.left, box.left), right: Math.min(q.right, box.right), top: q.top, bottom: q.bottom };
            if (r.right <= r.left || r.right <= 0 || r.left >= innerWidth || r.bottom <= 0 || r.top >= innerHeight) continue;
            seen++;
            if (r.left < edge - 0.5 || r.right > innerWidth - edge + 0.5) found.push(`"${n.textContent.trim().slice(0, 16)}" at ${Math.round(r.left)}–${Math.round(r.right)}`);
          }
        }
        return [[...new Set(found)].slice(0, 3), seen];
      });
      check(seen > 0 && out.length === 0, `${size.width}×${size.height} at #${id}: the outer 10% each side is city, no panel's words (${seen} lines on screen)${out.length ? ` (${out.join("; ")})` : ""}`);
    }
    await page.close();
  }

  // 2. Anchors, cold, at three sizes; Back and Forward
  for (const size of [{ width: 1440, height: 900 }, { width: 390, height: 844 }, { width: 844, height: 390 }]) {
    for (const id of ["about", "projects", "experience", "interests", "contact"]) {
      const page = await open(ctx, `/#${id}`, size);
      check((await atStop(page)) === id, `/#${id} cold at ${size.width}×${size.height} lands on its stop (got ${await atStop(page)})`);
      await page.close();
    }
    // A panel in a row (Skills, each project): the journey stops with that
    // panel where the row's first one stands (the row's inset), measured by
    // its layout (an arrival's offset aside), and wholly on the screen
    for (const id of ["skills", "marketlab", "empyrean", "garagepoker"]) {
      const page = await open(ctx, `/#${id}`, size);
      await rest(page);
      const r = await page.evaluate((id) => {
        const p = document.getElementById(id);
        const row = p.closest(".station-row");
        const left = p.getBoundingClientRect().left - (parseFloat(getComputedStyle(p).translate.split(" ")[0]) || 0);
        return [Math.round(left * 10) / 10, parseFloat(getComputedStyle(row).paddingLeft), Math.round(left + p.offsetWidth), innerWidth];
      }, id);
      check(Math.abs(r[0] - r[1]) <= 1 && r[2] <= r[3], `/#${id} cold at ${size.width}×${size.height}: its panel at the row's inset, within 1px, and wholly on the screen (left ${r[0]}, inset ${r[1]}, right ${r[2]} of ${r[3]})`);
      await page.close();
    }
  }
  {
    const page = await open(ctx, "/");
    await page.click('button[popovertarget="places-menu"]');
    await page.click('#places-menu a[href="/#experience"]');
    await settle(page, 300);
    await rest(page);
    check((await atStop(page)) === "experience", "the Sections menu goes to Experience");
    await page.click('button[popovertarget="places-menu"]');
    await page.click('#places-menu a[href="/#contact"]');
    await settle(page, 300);
    await rest(page);
    check((await atStop(page)) === "contact", "then to Contact");
    await page.goBack();
    await settle(page, 300);
    await rest(page);
    check((await atStop(page)) === "experience", "Back returns to Experience");
    await page.goForward();
    await settle(page, 300);
    await rest(page);
    check((await atStop(page)) === "contact", "Forward returns to Contact");
    // The same link again, after scrolling away, still goes there
    await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
    await page.click('button[popovertarget="places-menu"]');
    await page.click('#places-menu a[href="/#contact"]');
    await settle(page, 300);
    await rest(page);
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

  // 4. A panel taller than the stage scrolls inside; at its end the
  // scroll goes on along the city, to the next stop (nothing holds it)
  const pastExperience = (page) => page.evaluate(() => document.getElementById("experience").getBoundingClientRect().left <= 1);
  for (const how of ["wheel", "PageDown"]) {
    const page = await open(ctx, "/#marketlab", { width: 844, height: 390 });
    const panel = page.locator("#marketlab");
    await settle(page, 400);
    const fit = await panel.evaluate((p) => [p.scrollHeight, p.clientHeight, Math.round(p.getBoundingClientRect().bottom), innerHeight, p.hasAttribute("data-open")]);
    check(fit[0] > fit[1] && fit[2] <= fit[3] && fit[4], `${how}: MarketLab's panel at 844×390 is taller than it shows, fits the stage and is open (${fit})`);
    const box = await panel.boundingBox();
    const y0 = await page.evaluate(() => scrollY);
    if (how === "wheel") await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    // (focus in the panel, as Tab leaves it: the keys scroll what holds the
    // focus. A click on its words focuses the stop, whose keys travel)
    else await panel.evaluate((p) => p.querySelector("a").focus({ preventScroll: true }));
    const step = () => (how === "wheel" ? page.mouse.wheel(0, 300) : page.keyboard.press("PageDown"));
    await step();
    await settle(page, 300);
    const first = await page.evaluate(() => [scrollY, document.getElementById("marketlab").scrollTop]);
    check(first[1] > 0 && first[0] === y0, `${how} over it scrolls the panel first, not the city (${y0} → ${first})`);
    let reached = false;
    for (let i = 0; i < 120 && !reached; i++) {
      await step();
      await settle(page, 60);
      reached = await pastExperience(page);
    }
    const end = await page.evaluate(() => { const p = document.getElementById("marketlab"); return p.scrollTop + p.clientHeight >= p.scrollHeight - 2; });
    check(end && reached, `${how}: at the panel's end it goes on along the city, to the next stop (panel at its end ${end}, Experience reached ${reached})`);
    await page.close();
  }
  {
    const tctx = await newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    const phone = await open(tctx, "/#marketlab", { width: 390, height: 844 });
    await settle(phone, 400);
    const cdp = await tctx.newCDPSession(phone);
    const py0 = await phone.evaluate(() => scrollY);
    await cdp.send("Input.synthesizeScrollGesture", { x: 200, y: 700, xDistance: 0, yDistance: -200, gestureSourceType: "touch", speed: 1200 });
    await settle(phone, 600);
    const pafter = await phone.evaluate(() => [scrollY, document.getElementById("marketlab").scrollTop]);
    check(pafter[1] > 0 && pafter[0] === py0, `a touch scroll in a phone's sheet scrolls the sheet first, not the city (${py0} → ${pafter})`);
    let reached = false;
    for (let i = 0; i < 40 && !reached; i++) {
      await cdp.send("Input.synthesizeScrollGesture", { x: 200, y: 700, xDistance: 0, yDistance: -500, gestureSourceType: "touch", speed: 2000 });
      await settle(phone, 300);
      reached = (await phone.evaluate(() => scrollY)) > py0;
    }
    check(reached, "and at the sheet's end a swipe goes on along the city");
    await phone.close();
    await tctx.close();
  }

  // 5. No JavaScript; and the page's scripts failing
  for (const [label, opts, route] of [
    ["without JavaScript", { javaScriptEnabled: false }, null],
    ["with the page's scripts failing", {}, (r) => (/\/_next\/static\/chunks\/.*\.js(\?|$)/.test(r.request().url()) ? r.abort() : r.continue())],
  ]) {
    const c = await newContext({ viewport: { width: 1440, height: 900 }, ...opts });
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
