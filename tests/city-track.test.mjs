// The horizontal journey (components/city2d/CityTrack.tsx, trackMath.ts,
// lib/track.ts, app/city-track.css): its arithmetic, and the rules it keeps.
// The browser half (wheel, keys, touch, anchors, resize, inner scroll, no
// scripts) is docs/ui/scripts/track-journey.mjs.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import { TRACK_MIN, parallax, scrollYForStop, stopAt, stopOffsets } from "../app/components/city2d/trackMath.ts";
import { TRACK_SCRIPT, TRACK_WAIT_MS } from "../app/lib/track.ts";

const root = new URL("../", import.meta.url).pathname;
const read = (path) => readFileSync(`${root}${path}`, "utf8");
const code = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

// Stops as the CSS makes them: a viewport less the peek, the last a whole
// viewport; and wider ones (content decides, as Projects and Experience may)
const layouts = (vw, peek) => [
  [vw - peek, vw - peek, vw - peek, vw - peek, vw - peek, vw],
  [vw - peek, vw - peek, 2.6 * vw, 1.4 * vw, vw - peek, vw],
];
const viewports = [320, 390, 768, 844, 1024, 1440, 1920, 2560];

test("stopOffsets: each stop starts where the last ended, and the last number is the whole width", () => {
  assert.deepEqual(stopOffsets([100, 200, 50]), [0, 100, 300, 350]);
  assert.deepEqual(stopOffsets([]), [0]);
  for (const vw of viewports)
    for (const widths of layouts(vw, 0.1 * vw)) {
      const o = stopOffsets(widths);
      assert.equal(o.length, widths.length + 1);
      assert.ok(Math.abs(o.at(-1) - widths.reduce((a, b) => a + b, 0)) < 1e-6, "they add up");
      for (let i = 1; i < o.length; i++) assert.ok(o[i] > o[i - 1], "in order");
    }
});

test("stopAt(scrollYForStop(i)) is i, for every stop and viewport", () => {
  for (const vw of viewports)
    for (const widths of layouts(vw, Math.min(176, Math.max(40, 0.1 * vw)))) {
      const o = stopOffsets(widths);
      for (let i = 0; i < widths.length; i++) {
        const y = scrollYForStop(i, o, vw);
        assert.equal(stopAt(y, o), i, `vw ${vw}, stop ${i}`);
        // Rounded to whole pixels (a browser's scroll), still the same stop
        assert.equal(stopAt(Math.round(y), o), i);
        assert.ok(y >= 0 && y <= o.at(-1) - vw, "never past either end");
      }
      // The last stop is the end of the page's scroll
      assert.equal(scrollYForStop(widths.length - 1, o, vw), o.at(-1) - vw);
    }
});

test("stopAt: between two stops you're at the one you've reached; `lead` counts the next early", () => {
  const o = stopOffsets([1000, 1000, 1000]);
  assert.equal(stopAt(0, o), 0);
  assert.equal(stopAt(999, o), 0);
  assert.equal(stopAt(1000, o), 1);
  assert.equal(stopAt(999.6, o), 1, "half a pixel is rounding");
  assert.equal(stopAt(700, o, 400), 1);
  assert.equal(stopAt(-50, o), 0);
  assert.equal(stopAt(99999, o), 2);
});

test("scrollYForStop clamps the stop number and never runs past the track's end", () => {
  const o = stopOffsets([500, 500, 300]);
  assert.equal(scrollYForStop(-3, o, 800), 0);
  assert.equal(scrollYForStop(9, o, 800), 500);
  assert.equal(scrollYForStop(2, o, 800), 500, "a last stop narrower than the screen: the end");
  assert.equal(scrollYForStop(0, [0], 800), 0);
});

test("parallax: depth 0 moves with the street, 1 stays put, and it stays within bounds", () => {
  assert.equal(parallax(1000, 0), 1000);
  assert.equal(parallax(1000, 1), 0);
  assert.ok(Math.abs(parallax(1000, 0.7) - 300) < 1e-9);
  assert.equal(parallax(1000, -2), 1000);
  assert.equal(parallax(1000, 3), 0);
  for (const x of [-500, 0, 250, 9000])
    for (const d of [0, 0.25, 0.7, 1]) {
      const p = parallax(x, d);
      assert.ok(Math.abs(p) <= Math.abs(x), "never further than the street");
      assert.ok(p * x >= 0, "never the other way");
    }
});

test("no scroll-jacking: no wheel or touchmove listener, nothing prevented, nothing smoothed", () => {
  const src = code(read("app/components/city2d/CityTrack.tsx"));
  assert.match(src, /^"use client";/);
  assert.doesNotMatch(src, /"wheel"|"mousewheel"|"touchmove"|"touchstart"|onWheel|onTouchMove/);
  assert.doesNotMatch(src, /preventDefault|stopPropagation|stopImmediatePropagation/);
  // Every listener it adds that sees scrolling input is passive
  for (const m of src.matchAll(/addEventListener\("(scroll|pointer\w+)", \w+(, \{[^}]*\})?\)/g)) assert.match(m[2] ?? "", /passive: true/, m[0]);
  // A sideways swipe travels, but up and down stay the browser's, and pinch zoom
  assert.match(src, /e\.pointerType === "touch"/);
  const css = read("app/city-track.css");
  assert.match(css, /\.track-stage \{[^}]*touch-action: pan-y pinch-zoom;/);
  assert.match(css, /\.track \.station-body \{[^}]*touch-action: pan-y pinch-zoom;/, "the panels too (a scroller sets its own)");
  // No snapping that could trap
  assert.doesNotMatch(css, /scroll-snap/);
});

test("the keys: ArrowLeft/ArrowRight go a stop, never from a field, a menu or a dialog, and cut in still view", () => {
  const src = code(read("app/components/city2d/CityTrack.tsx"));
  assert.match(src, /e\.key !== "ArrowLeft" && e\.key !== "ArrowRight"/);
  assert.match(src, /e\.altKey \|\| e\.ctrlKey \|\| e\.metaKey \|\| e\.shiftKey/, "Alt+Left is Back");
  assert.match(src, /const SKIP = "input, textarea, select, \[contenteditable\], dialog, \[popover\]/);
  assert.match(src, /behavior: instant \? "instant" : "smooth"/);
  assert.match(src, /const glide = \(x: number, instant = still\(\)\)/, "a glide cuts in still view");
  assert.match(src, /html\.dataset\.still === "on"/);
});

test("anchors, Back/Forward, links and focus all bring their stop on", () => {
  const src = code(read("app/components/city2d/CityTrack.tsx"));
  assert.match(src, /if \(location\.hash\.length > 1\) toHash\(location\.hash, true\)/, "cold: straight there");
  assert.match(src, /addEventListener\("hashchange", onHash\)/);
  assert.match(src, /addEventListener\("popstate", onHash\)/);
  assert.match(src, /document\.addEventListener\("click", onClick\)/, "a link to where the address already is");
  assert.match(src, /document\.addEventListener\("focusin", onFocus\)/);
  // A part of a section (Skills): its panel scrolls to it, never the page
  assert.match(src, /panel\.scrollTo\(/);
  assert.doesNotMatch(src, /scrollIntoView/);
  // The jump's focus never scrolls on the journey
  assert.match(read("app/components/city2d/jump.ts"), /preventScroll: Boolean\(hash\) \|\| track/);
});

test("measure: the runway from the track's width, again on any resize, keeping the stop", () => {
  const src = code(read("app/components/city2d/CityTrack.tsx"));
  assert.match(src, /new ResizeObserver\(/);
  assert.match(src, /sizes\.observe\(stage\)/);
  assert.match(src, /for \(const s of stops\) sizes\.observe\(s\)/, "a stop that grows (its content)");
  assert.match(src, /run\.style\.setProperty\("--travel"/);
  assert.match(src, /glide\(offsets\[i\] \+ f \* \(offsets\[i \+ 1\] - offsets\[i\]\), true\)/, "the same place in the same stop, at once");
  assert.match(src, /html\.setAttribute\("data-track-ready", ""\)/);
  // The progress line reads the stops' places from it
  assert.match(src, /marks = stops\.map\(\(_, k\) => top \+ scrollYForStop\(k, offsets, vw\)\)/);
  assert.match(read("app/components/city2d/ProgressLine.tsx"), /marks = trackMarks\(\) \?\?/);
  // The browser never shifts the scroll on its own
  assert.match(read("app/city-track.css"), /overflow-anchor: none;/);
});

test("the head script turns the journey on before the first paint, only on / with room, and falls back", () => {
  const layout = read("app/layout.tsx");
  assert.match(layout, /<script dangerouslySetInnerHTML=\{\{ __html: TRACK_SCRIPT \}\} \/>/);
  assert.ok(layout.indexOf("TRACK_SCRIPT }}") < layout.indexOf("<body>"), "in <head>");
  assert.match(layout, /import "\.\/city-track\.css";/);
  const run = (w, h, path = "/", ready = false) => {
    const attrs = {};
    const timers = [];
    const html = {
      setAttribute: (k, v) => (attrs[k] = v),
      hasAttribute: (k) => k in attrs || (k === "data-track-ready" && ready),
    };
    const listeners = {};
    vm.runInNewContext(TRACK_SCRIPT, {
      document: { documentElement: html },
      location: { pathname: path },
      innerWidth: w,
      innerHeight: h,
      addEventListener: (t, f) => (listeners[t] = f),
      setTimeout: (f, ms) => timers.push([f, ms]),
    });
    return { attrs, fire: () => (listeners.load?.(), timers.forEach(([f]) => f()), attrs), timers };
  };
  assert.equal(run(1440, 900).attrs["data-track"], "on");
  assert.equal(run(390, 844).attrs["data-track"], "on");
  assert.equal(run(844, 390).attrs["data-track"], "on", "a phone on its side");
  assert.equal(run(TRACK_MIN.width - 1, 900).attrs["data-track"], undefined);
  assert.equal(run(800, TRACK_MIN.height - 1).attrs["data-track"], undefined);
  assert.equal(run(1440, 900, "/nope").attrs["data-track"], undefined, "only the one page");
  // The runway never measured (the scripts failed): the stacked page
  const failed = run(1440, 900);
  assert.equal(failed.fire()["data-track"], "fallback");
  assert.equal(failed.timers[0][1], TRACK_WAIT_MS);
  assert.equal(run(1440, 900, "/", true).fire()["data-track"], "on", "measured: it stays");
  // CityTrack leaves a fallback alone
  assert.match(code(read("app/components/city2d/CityTrack.tsx")), /if \(html\.dataset\.track !== "fallback"\)/);
});

test("the CSS: a sticky stage that can't be scrolled sideways, the move on the runway's own scroll", () => {
  const css = read("app/city-track.css");
  const body = code(css);
  // Every rule but the keyframes is for screens with the journey on (print and no scripts read top to bottom)
  assert.match(body, /^@media screen \{/m);
  assert.match(body, /\.track-stage \{[^}]*position: sticky;[^}]*top: 0;[^}]*height: 100dvh;[^}]*overflow: clip;/);
  assert.match(body, /\.track-runway \{\s*height: calc\(var\(--travel, 0px\) \+ 100dvh\);/);
  assert.match(body, /@supports \(animation-timeline: view\(\)\) \{[\s\S]*view-timeline: --runway block;[\s\S]*animation-range: contain 0% contain 100%;/);
  assert.match(body, /animation: track-move linear both;/, "one pixel along for one down");
  assert.match(body, /transform: translateX\(var\(--x, 0px\)\);/, "the script's --x where there's no timeline");
  assert.match(body, /scroll-padding-top: 0;/, "nothing pads the view timeline");
  // The bar floats over the stage (no first scroll that moves the page, not the city)
  assert.match(body, /:root\[data-track="on"\] \.top-bar \{\s*position: fixed;/);
  // Closure: every stop but the last leaves the next one's peek in view
  assert.match(body, /\.track > \.station \{[^}]*width: calc\(100cqw - var\(--peek\)\);/);
  assert.match(body, /\.track > \.station:last-of-type \{\s*width: 100cqw;/);
  // Panels: never taller than the stage, scroll inside only when open, never chaining then
  assert.match(body, /\.track \.station-body \{[^}]*max-height: calc\(100% - var\(--stop-top\)/);
  assert.match(body, /\.track \.station-body \{[^}]*overflow-y: hidden;/);
  assert.match(body, /\.track > \[data-open\] > \.station-body \{\s*overflow-y: auto;\s*overscroll-behavior: contain;/);
  // Phones: the painting on top, the words a sheet below
  assert.match(body, /@media \(max-aspect-ratio: 1 \/ 1\)/);
});

test("depth: the sky lags the street, but not in still view; the weather is drawn once, held over the stage", () => {
  const body = code(read("app/city-track.css"));
  assert.match(body, /\.track-sky \{[^}]*transform: translateX\(calc\(0\.3 \* var\(--x, 0px\)\)\);/);
  assert.match(body, /@keyframes track-sky \{[\s\S]*?translateX\(calc\(-0\.3 \* var\(--travel, 0px\)\)\)/);
  assert.match(body, /:root\[data-track="on"\]\[data-still="on"\] \.track-sky \{[^}]*transform: translateX\(var\(--x, 0px\)\);[^}]*animation-name: track-move;/);
  assert.match(body, /@keyframes track-hold \{[\s\S]*?translateX\(var\(--travel, 0px\)\)/);
  const track = read("app/components/city2d/CityTrack.tsx");
  assert.equal((track.match(/<WeatherOverlay \/>/g) ?? []).length, 1);
  assert.doesNotMatch(read("app/components/city2d/DistrictBand.tsx"), /WeatherOverlay/, "not one per band");
  // Under prefers-contrast the panels are solid
  assert.match(body, /@media \(prefers-contrast: more\) \{[\s\S]*\.station-body \{[^}]*background: var\(--ink\);/);
});
