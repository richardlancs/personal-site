// The progress line (components/city2d/ProgressLine.tsx, lib/progress.ts):
// one line with a point per section that follows the scroll continuously
// and locks onto each section as it is reached, without ever touching the
// page's own scrolling.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { DEAD_ZONE, FAST, SNAP, lockedAt, progressAt, reached, shown } from "../app/lib/progress.ts";

const root = new URL("../", import.meta.url).pathname;
const read = (path) => readFileSync(`${root}${path}`, "utf8");

const marks = [0, 1000, 2400, 4000, 5200, 6000];
test("at the top the line is at the first point", () => assert.equal(progressAt(0, marks, 800, 7000), 0));
test("halfway between two sections the line is halfway between their points", () => assert.equal(progressAt(500, marks, 800, 7000), 0.5));
test("at a section's top the line is exactly on its point", () => assert.equal(progressAt(2400, marks, 800, 7000), 2));
test("at the very bottom the line reaches the last point even if the last section is short", () =>
  assert.equal(progressAt(7000 - 800, marks, 800, 7000), 5));
test("never below the first point or past the last", () => {
  assert.equal(progressAt(-50, marks, 800, 7000), 0);
  assert.equal(progressAt(99999, marks, 800, 7000), 5);
});
test("a point does not flicker at its threshold", () => {
  assert.equal(reached(1.98, 1), 1);
  assert.equal(reached(2.0, 1), 2);
  assert.equal(reached(1.97, 2), 2); // stays lit until clearly left
  assert.equal(reached(1.85, 2), 1);
});

test("a last section shorter than the screen: the remaining scroll runs to the last point", () => {
  // The page can't scroll to contact's top (6600 > 7000 - 800)
  const short = [0, 1000, 2400, 4000, 5200, 6600];
  assert.equal(progressAt(5200, short, 800, 7000), 4);
  assert.equal(progressAt(5700, short, 800, 7000), 4.5);
  assert.equal(progressAt(6200, short, 800, 7000), 5);
  // Two sections past the end share what's left between them
  const two = [0, 1000, 2400, 4000, 6500, 6800];
  assert.equal(progressAt(4000, two, 800, 7000), 3);
  assert.equal(progressAt(5100, two, 800, 7000), 4);
  assert.equal(progressAt(6200, two, 800, 7000), 5);
  // A page that doesn't scroll at all sits on its first point
  assert.equal(progressAt(0, [0, 0, 0], 800, 600), 0);
});

test("the line moves continuously, and never backwards as the page goes down", () => {
  let last = -1;
  for (let y = 0; y <= 6200; y += 7) {
    const p = progressAt(y, marks, 800, 7000);
    assert.ok(p >= last, `at ${y}: ${p} < ${last}`);
    assert.ok(p - last < 0.02 || last < 0, `at ${y}: a jump of ${p - last}`);
    last = p;
  }
});

test("reached: arriving needs the point itself, leaving needs the dead zone; a fast scroll goes straight there", () => {
  assert.equal(DEAD_ZONE, 0.1);
  assert.equal(reached(0, 0), 0);
  assert.equal(reached(3.4, 0), 3, "a jump lands on the section it's in");
  assert.equal(reached(0.5, 4), 0, "and back");
  assert.equal(reached(5, 4), 5);
  assert.equal(reached(4.95, 5), 5);
});

test("shown: the fill runs with the scroll, and locks onto a point within a few percent of it, either side", () => {
  assert.equal(SNAP, 0.04);
  // Coming down onto a point: the last bit is the point
  assert.equal(shown(1.97), 2);
  assert.equal(shown(1.995), 2);
  // Just past it, or coming back up onto it: still the point
  assert.equal(shown(2.03), 2);
  // Anywhere else: exactly the scroll, so it never lags
  assert.equal(shown(1.93), 1.93);
  assert.equal(shown(2.4), 2.4);
  assert.equal(shown(1.5), 1.5);
  assert.equal(lockedAt(1.5), null);
  assert.equal(lockedAt(4.99), 5);
  assert.equal(lockedAt(0), 0);
  // A frame-to-frame move past this is a fast scroll: never eased
  assert.ok(FAST > 2 * SNAP && FAST < 0.5);
});

test("ProgressLine: one passive scroll listener, frames through requestAnimationFrame, no layout reads while scrolling", () => {
  const src = read("app/components/city2d/ProgressLine.tsx");
  assert.match(src, /^"use client";/);
  assert.equal((src.match(/addEventListener\("scroll"/g) ?? []).length, 1, "one scroll listener");
  assert.match(src, /addEventListener\("scroll", onScroll, \{ passive: true \}\)/);
  assert.match(src, /removeEventListener\("scroll", onScroll\)/);
  assert.match(src, /requestAnimationFrame\(/);
  assert.match(src, /cancelAnimationFrame\(/);
  assert.match(src, /new ResizeObserver\(/);
  // The scroll handler and the frame it schedules read scrollY and nothing
  // that forces layout
  const onScroll = src.match(/const onScroll = \(\) => \{([\s\S]*?)\n {4}\};/)?.[1];
  assert.ok(onScroll, "the scroll handler");
  const frame = src.match(/const frame = \(\) => \{([\s\S]*?)\n {4}\};/)?.[1];
  assert.ok(frame, "the frame");
  for (const body of [onScroll, frame]) assert.doesNotMatch(body, /getBoundingClientRect|offsetTop|offsetHeight|scrollHeight|getComputedStyle|innerHeight|clientHeight/);
  // One CSS variable, on its own element
  assert.match(src, /style\.setProperty\("--progress"/);
  // In still view (or with reduced motion) only the reached integer is written
  assert.match(src, /const value = step \? now : shown\(p\);/);
  // Nothing in it moves the page
  assert.doesNotMatch(src, /scrollTo|scrollBy|scrollIntoView|preventDefault|"wheel"|"touchmove"/);
  const css = read("app/city.css");
  assert.doesNotMatch(css, /scroll-snap-type/);
});

test("the line names the sections by title, marks where you are, and its points are links only where they're labelled", () => {
  const src = read("app/components/city2d/ProgressLine.tsx");
  assert.match(src, /aria-label="Page progress"/, "not a second landmark starting \"Sections\"");
  assert.match(src, /const points = listed;/, "only the sections that are listed");
  assert.match(src, /points\.map\(/);
  // Home is a jump to the top in place, not a reload of "/"
  assert.match(src, /href=\{jumpHref\(s\.href\)\}/);
  assert.match(read("app/components/city2d/jump.ts"), /href === "\/" \? "\/#home" : href/);
  assert.match(src, /\{s\.title\}/);
  assert.match(src, /aria-current=\{s\.id === here \? "location" : undefined\}/);
  // "03 / 06 · Projects" in the top bar, hidden from assistive technology
  assert.match(src, /className="top-bar-here" aria-hidden="true"/);
  assert.match(src, /sectionNumber\(at\)/);
  assert.match(src, /· \{at\.title\}/);
  // Mounted once, in the top bar
  assert.match(read("app/components/city2d/TopBar.tsx"), /<ProgressLine \/>/);
  assert.doesNotMatch(read("app/page.tsx"), /ProgressLine|MetroLine/);
});

test("one source of where you are: useSection, written by the line and read by the menu", () => {
  assert.ok(!existsSync(`${root}app/components/city2d/useStation.ts`), "useStation.ts is renamed");
  const src = read("app/components/city2d/useSection.ts");
  assert.match(src, /useSyncExternalStore\(/);
  assert.match(src, /getServerSnapshot = \(\): SectionId => "home"/);
  assert.match(src, /export function setSection\(/);
  assert.doesNotMatch(src, /IntersectionObserver|addEventListener/, "it observes nothing itself");
  assert.match(read("app/components/city2d/ProgressLine.tsx"), /setSection\(/);
  for (const f of ["SectionsMenu.tsx", "ProgressLine.tsx"]) assert.match(read(`app/components/city2d/${f}`), /useSection\(\)/, f);
});

test("the snap: eased only on arriving at a point in a slow scroll, never armed in a fast one; nothing pulses before the page has landed", () => {
  const src = read("app/components/city2d/ProgressLine.tsx");
  const frame = src.match(/const frame = \(\) => \{([\s\S]*?)\n {4}\};/)?.[1] ?? "";
  assert.match(frame, /const fast = lastP >= 0 && Math\.abs\(p - lastP\) > FAST;/);
  assert.match(frame, /if \(!fast\) \{\s*line\.dataset\.snap = "";/);
  assert.match(frame, /else if \(lock === null \|\| fast\) \{[\s\S]*?delete line\.dataset\.snap;/);
  assert.match(src, /html\.setAttribute\("data-landed", ""\);\s*settled = true;/);
  assert.doesNotMatch(src, /setTimeout\(\(\) => \(settled = true\)/);
  // Re-measured when the bar stops being sticky (where a jump lands moves)
  assert.match(src, /attributeFilter: \["data-still", "data-bar-tall"\]/);
  // Not on a page without the sections
  assert.match(src, /!document\.getElementById\("home"\)\) return;/);
  assert.match(read("app/city.css"), /body:not\(:has\(#home\)\) :is\(\.progress-line, \.top-bar-here\) \{\s*display: none;/);
});

test("the line's CSS: transforms only, the fill eased only when it locks, and nothing moves in still view", () => {
  const css = read("app/city.css");
  // The fill's length is a transform of --progress
  assert.match(css, /\.progress-fill \{[^}]*transform: scaleX\(calc\(var\(--progress, 0\) \/ var\(--last, 5\)\)\)/);
  // The ease and the pulse sit under motion-welcome only
  const block = css.match(/@media \(prefers-reduced-motion: no-preference\) \{\s*:root:not\(\[data-still="on"\]\) \.progress-line\[data-snap\] \.progress-fill \{[^}]*\}[\s\S]*?\n\}/)?.[0];
  assert.ok(block, "the motion block");
  assert.match(block, /transition: transform var\(--t-fast\) var\(--ease-out\)/);
  assert.match(block, /animation: progress-pulse var\(--t-base\)/);
  assert.match(css, /@keyframes progress-pulse \{[^}]*scale: 1\.35/);
  // Outside that block, no transition or animation on the line
  const outside = css.replace(block, "");
  assert.doesNotMatch(outside.match(/\.progress-[a-z]+[^{]*\{[^}]*\}/g)?.join("\n") ?? "", /transition|animation/);
  // The reached point: a taller tick, its shape as well as its colour (not by colour alone)
  assert.match(css, /\n\.progress-point\[aria-current="location"\] \.progress-dot \{\s*height: 13px;/);
  // Along the bar's foot at every width: the margin's labelled line is gone
  // (the metro map at the foot replaces it, Task 5)
  assert.doesNotMatch(css, /97rem|96\.99rem/);
  assert.match(css, /\n\.progress-line \{\s*position: absolute;/);
  // The section in the top bar from 53rem on
  assert.match(css, /@media \(min-width: 53rem\) \{[^@]*\.top-bar-here \{\s*display: block;/);
});
