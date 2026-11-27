// The horizontal journey (components/city2d/CityTrack.tsx, trackMath.ts,
// lib/track.ts, app/city-track.css): its arithmetic, and the rules it keeps.
// The browser half (wheel, keys, touch, anchors, resize, inner scroll, no
// scripts) is docs/ui/scripts/track-journey.mjs.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import { GLIDE_MS, ROOM_EMS, TRACK_MIN, landing, nearestPlace, placeAt, scrollYForStop, stopAt, stopOffsets, trackFits, trackRoom, glideEase, glideMs, glideOn } from "../app/components/city2d/trackMath.ts";
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

test("no scroll-jacking: the wheel and pointer listeners are passive, only the keys' page step is prevented, no fling", () => {
  const src = code(read("app/components/city2d/CityTrack.tsx"));
  assert.match(src, /^"use client";/);
  assert.doesNotMatch(src, /"mousewheel"|"touchmove"|"touchstart"|onTouchMove|stopPropagation|stopImmediatePropagation/);
  // preventDefault only in the keys (PageDown/Space step a place, as the arrows do)
  const keys = src.slice(src.indexOf("const onKey ="), src.indexOf("const onClick ="));
  assert.equal((src.match(/preventDefault/g) ?? []).length, (keys.match(/preventDefault/g) ?? []).length);
  // Every listener it adds that sees scrolling input is passive
  assert.match(src, /const passive = \{ passive: true, signal \};/);
  for (const m of src.matchAll(/addEventListener\("(scroll|wheel|pointer\w+)", \w+(, \w+)?\)/g)) assert.equal(m[2], ", passive", m[0]);
  // The wheel answers only sideways input (A11Y-11), never a zoom, never over a sideways scroller
  assert.match(src, /e\.ctrlKey \|\| Math\.abs\(e\.deltaX\) <= Math\.abs\(e\.deltaY\) \|\| sideways\(e\.target\)/);
  // No fling: a released swipe lands on a place, never glides on past
  assert.doesNotMatch(src, /FLING|\.v \*/);
  assert.match(src, /const k = landing\(from, along\(\), xs\(\), narrow\.matches, vw \* 0\.3\)/);
  // A sideways swipe travels, but up and down stay the browser's, and pinch zoom
  assert.match(src, /e\.pointerType === "touch"/);
  const css = read("app/city-track.css");
  assert.match(css, /\.track-stage \{[^}]*touch-action: pan-y pinch-zoom;/);
  assert.match(css, /\.track \.panel \{[^}]*touch-action: pan-y pinch-zoom;/, "the panels too (a scroller sets its own)");
  // Snapping that never traps: near a place on a wide screen, onto each on the narrow layout, off while a sideways move goes on
  assert.match(css, /:root\[data-track="on"\] \{[^}]*scroll-snap-type: y proximity;[^}]*overscroll-behavior-x: none;/);
  assert.match(css, /:root\[data-track="on"\]\[data-free\] \{\s*scroll-snap-type: none;/);
  const phone = css.slice(css.indexOf("@media (max-aspect-ratio: 1 / 1)"));
  assert.match(phone, /\.snap-mark \{\s*scroll-snap-stop: always;/);
  assert.match(phone, /scroll-snap-type: y mandatory;/);
  assert.match(css, /\.snap-mark \{\s*position: absolute;\s*width: 1px;\s*height: 1px;\s*scroll-snap-align: start;/);
});

test("the keys: ArrowLeft/ArrowRight, PageUp/PageDown and Space go a place, never from a field, a menu or a dialog, focus with them, and cut in still view", () => {
  const src = code(read("app/components/city2d/CityTrack.tsx"));
  assert.match(src, /const arrow = e\.key === "ArrowLeft" \|\| e\.key === "ArrowRight";/);
  assert.match(src, /const page = e\.key === "PageDown" \|\| e\.key === "PageUp" \|\| e\.key === " ";/);
  assert.match(src, /e\.altKey \|\| e\.ctrlKey \|\| e\.metaKey/, "Alt+Left is Back");
  assert.match(src, /e\.shiftKey && e\.key !== " "/);
  assert.match(src, /glide\(places\[next\]\.x, still\(\)\);\s*focusPanel\(places\[next\]\.panel\);/, "the step takes focus (A11Y-06)");
  assert.match(src, /const SKIP = "input, textarea, select, \[contenteditable\], dialog, \[popover\]"/);
  assert.match(src, /if \(instant \|\| calm\.matches \|\| document\.hidden\) return scrollTo\(\{ top: top \+ to, behavior: "instant" \}\);/, "a cut with reduced motion");
  assert.match(src, /const glide = \(x: number, instant = still\(\)\) =>/, "a glide cuts in still view");
  assert.match(src, /html\.dataset\.still === "on"/);
});

test("anchors, Back/Forward, links and focus all bring their stop on", () => {
  const src = code(read("app/components/city2d/CityTrack.tsx"));
  assert.match(src, /if \(location\.hash\.length > 1\) toHash\(location\.hash, true\)/, "cold: straight there");
  assert.match(src, /addEventListener\("hashchange", onHash, \{ signal \}\)/);
  assert.match(src, /addEventListener\("popstate", onHash, \{ signal \}\)/);
  assert.match(src, /document\.addEventListener\("click", onClick, \{ signal \}\)/, "a link to where the address already is");
  assert.match(src, /document\.addEventListener\("focusin", onFocus, \{ signal \}\)/);
  // A panel in a row (Skills, a project): the journey stops with that
  // panel on, never scrolling the page or a panel to it
  assert.match(read("app/components/city2d/jump.ts"), /el\.closest\("\.panel"\) \?\? el\.querySelector\("\.panel"\) \?\? el/);
  assert.match(src, /const p = panelOf\(el\);/);
  // A link's jump takes focus to the panel (A11Y-10, A11Y-03)
  assert.match(src, /toHash\(url\.hash, undefined, true\)/);
  assert.doesNotMatch(src, /scrollIntoView|panel\.scrollTo\(/);
  // The jump's focus never scrolls on the journey
  assert.match(read("app/components/city2d/jump.ts"), /preventScroll: Boolean\(hash\) \|\| track/);
});

test("measure: the runway from the track's width, again on any resize, keeping the stop", () => {
  const src = code(read("app/components/city2d/CityTrack.tsx"));
  assert.match(src, /new ResizeObserver\(/);
  assert.match(src, /sizes\.observe\(stage\)/);
  assert.match(src, /for \(const el of \[\.\.\.stops, \.\.\.track\.querySelectorAll\("\.panel > \*"\)\]\) sizes\.observe\(el\)/, "a stop that grows, and a panel's words growing");
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
  const run = (w, h, path = "/", ready = false, rem = "16px") => {
    const attrs = {};
    const timers = [];
    const html = {
      setAttribute: (k, v) => (attrs[k] = v),
      hasAttribute: (k) => k in attrs || (k === "data-track-ready" && ready),
    };
    const listeners = {};
    const history = { scrollRestoration: "auto" };
    vm.runInNewContext(TRACK_SCRIPT, {
      history,
      document: { documentElement: html },
      location: { pathname: path },
      innerWidth: w,
      innerHeight: h,
      getComputedStyle: () => ({ fontSize: rem }),
      addEventListener: (t, f) => (listeners[t] = f),
      setTimeout: (f, ms) => timers.push([f, ms]),
    });
    return { attrs, history, fire: () => (listeners.load?.(), timers.forEach(([f]) => f()), attrs), timers };
  };
  // "/" opens on Home: the browser never puts back a scroll from before
  // (a reload, Back into a new document), on the journey or stacked
  assert.equal(run(1440, 900).history.scrollRestoration, "manual");
  assert.equal(run(390, 844).history.scrollRestoration, "manual");
  assert.equal(run(844, 390).history.scrollRestoration, "manual", "the stacked page too");
  assert.equal(run(1440, 900, "/nope").history.scrollRestoration, "auto", "only on /");
  const ct = code(read("app/components/city2d/CityTrack.tsx"));
  assert.match(ct, /history\.scrollRestoration = "manual";\s*measure\(\);/, "CityTrack too, for a page arrived at in the app");
  assert.match(ct, /history\.scrollRestoration = "auto";/, "and puts it back on leaving");
  // Opened without an anchor, the first measure moves nothing (an anchor: straight there)
  assert.match(ct, /if \(first\) \{\s*first = false;\s*if \(location\.hash\.length > 1\) toHash\(location\.hash, true\);\s*\}/);
  assert.equal(run(1440, 900).attrs["data-track"], "on");
  assert.equal(run(390, 844).attrs["data-track"], undefined, "a phone reads top to bottom");
  assert.equal(run(768, 1024).attrs["data-track"], "on", "a tablet keeps the journey");
  // A panel needs ROOM_EMS of room (trackRoom), so a phone on its side reads stacked
  assert.equal(run(844, 390).attrs["data-track"], undefined, "a phone on its side");
  assert.equal(run(1024, 768).attrs["data-track"], "on", "a small laptop");
  assert.equal(run(TRACK_MIN.width - 1, 900).attrs["data-track"], undefined);
  assert.equal(run(800, TRACK_MIN.height - 1).attrs["data-track"], undefined);
  assert.equal(run(1440, 900, "/nope").attrs["data-track"], undefined, "only the one page");
  // 200% text: the height counts in ems (TRACK_MIN.ems), so a short screen reads stacked
  assert.equal(run(844, 390, "/", false, "32px").attrs["data-track"], undefined, "a phone on its side at 200% text");
  assert.equal(run(320, 640, "/", false, "32px").attrs["data-track"], undefined, "a small phone at 200% text");
  assert.equal(run(390, 844, "/", false, "32px").attrs["data-track"], undefined, "a tall phone at 200% text: its sheet under 20em");
  assert.equal(run(667, 375).attrs["data-track"], undefined, "a small phone on its side at 100%");
  // The same rule in CityTrack's measure
  for (const [w, h, rem] of [[844, 390, 32], [320, 640, 32], [390, 844, 32], [390, 844, 16], [667, 375, 16], [319, 900, 16], [1024, 768, 16], [1024, 768, 32], [1440, 900, 16], [320, 568, 16], [1024, 600, 16], [768, 1024, 32]]) {
    const html = run(w, h, "/", false, `${rem}px`).attrs["data-track"] === "on";
    assert.equal(trackFits(w, h, rem), html, `${w}×${h} at ${rem}px: the head script and measure() agree`);
  }
  assert.match(code(read("app/components/city2d/CityTrack.tsx")), /trackFits\(innerWidth, innerHeight, parseFloat\(getComputedStyle\(html\)\.fontSize\)\)/);
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
  assert.match(body, /\.track-stage \{[^}]*position: sticky;[^}]*top: 0;[^}]*height: 100svh;[^}]*overflow: clip;/);
  assert.match(body, /\.track-runway \{\s*position: relative;\s*height: calc\(var\(--travel, 0px\) \+ 100svh\);/);
  assert.match(body, /@supports \(animation-timeline: view\(\)\) \{[\s\S]*view-timeline: --runway block;[\s\S]*animation-range: contain 0% contain 100%;/);
  assert.match(body, /animation: track-move linear both;/, "one pixel along for one down");
  // Where there's no timeline, the script writes the transforms each frame
  const src = code(read("app/components/city2d/CityTrack.tsx"));
  assert.match(src, /track\.style\.transform = `translateX\(\$\{-along\(\)\}px\)`/);
  assert.match(body, /scroll-padding-top: 0;/, "nothing pads the view timeline");
  // The bar floats over the stage (no first scroll that moves the page, not the city)
  assert.match(body, /:root\[data-track="on"\] \.top-bar \{\s*position: fixed;/);
  // Closure: every stop but the last leaves the next one's peek in view
  assert.match(body, /\.track > \.station \{[^}]*width: calc\(100cqw - var\(--peek\)\);/);
  assert.match(body, /\.track > \.station:last-of-type \{\s*width: 100cqw;/);
  // Panels: never taller than the stage, scroll inside only when open,
  // and at their end chain on to the page (the journey goes on)
  assert.match(body, /--room: calc\(100% - var\(--[\w-]+\) - var\(--foot\)\);/);
  assert.match(body, /\.track \.station-body \{[^}]*max-height: var\(--room\);/);
  assert.match(body, /\.station-row \.panel \{[^}]*max-height: 100%;/);
  assert.match(body, /\.track \.panel \{[^}]*overflow-y: hidden;/);
  assert.match(body, /\.track \[data-open\] \{\s*overflow-y: auto;\s*\}/);
  assert.deepEqual(body.match(/overscroll-behavior[\w-]*: \w+/g), ["overscroll-behavior-x: none"], "an open panel at its end hands the scroll on; only the page's sideways overscroll is off");
  const src2 = code(read("app/components/city2d/CityTrack.tsx"));
  assert.match(src2, /p\.toggleAttribute\("data-open", scrolls && Math\.abs\(x - px\) <= 2\)/, "each panel, at its place, with more than it shows");
  // A stop of a row of panels is as wide as its row
  assert.match(body, /\.track > \.station:has\(> \.station-row\) \{\s*width: auto;/);
  // Phones: the words a sheet below the bar's strip
  assert.match(body, /@media \(max-aspect-ratio: 1 \/ 1\)/);
  // ... where no sheet shows the next one's words: each stop the whole screen
  const phone = body.slice(body.indexOf("@media (max-aspect-ratio: 1 / 1)"));
  assert.match(phone, /\.track > \.station \{\s*width: 100cqw;/);
});

test("Task 12: no city behind the journey: no panorama, sky, parallax, weather or motion blur, only the track moves", () => {
  const body = code(read("app/city-track.css"));
  for (const gone of [".pano", ".band", ".track-sky", ".track-weather", "#contact::before", ".track::before", "@keyframes track-sky", "@keyframes track-hold", "@keyframes haze", "@keyframes beam", "@keyframes lights-on"]) assert.ok(!body.includes(gone), `city-track.css still has ${gone}`);
  assert.match(body, /:root\[data-track="on"\] \.track \{\s*animation: track-move linear both;/, "the track alone rides the runway");
  const src = code(read("app/components/city2d/CityTrack.tsx"));
  for (const gone of ["pano", "WeatherOverlay", "track-sky", "feGaussianBlur", "blur", "parallax", "trackjump", "city"]) assert.ok(!src.includes(gone), `CityTrack still has ${gone}`);
  assert.match(src, /<div className="track-stage">\s*<div className="track">\{children\}<\/div>\s*<\/div>/);
  const math = code(read("app/components/city2d/trackMath.ts"));
  for (const gone of ["parallax", "SKY_DEPTH", "panoKeys", "panoAt", "trackXForPano"]) assert.ok(!math.includes(gone), `trackMath still has ${gone}`);
  for (const f of ["DistrictBand.tsx", "panorama.ts", "panoramaImages.ts", "homePlate.ts", "WeatherOverlay.tsx", "citySky.ts", "CityDriver.tsx", "useNear.ts"]) assert.ok(!existsSync(`${root}app/components/city2d/${f}`), `${f} is still there`);
  for (const f of ["cityLook.ts", "skyParam.ts", "platePreload.ts", "precip.ts"]) assert.ok(!existsSync(`${root}app/lib/${f}`), `lib/${f} is still there`);
  assert.ok(!existsSync(`${root}app/assets/city`), "the paintings are still there");
  assert.doesNotMatch(read("app/layout.tsx"), /CityDriver|platePreload|PLATE_PRELOAD|panorama/);
  assert.match(read("app/page.tsx"), /<CityTrack>/);
  // Under prefers-contrast the panels lose their soft edges
  assert.match(body, /@media \(prefers-contrast: more\) \{[\s\S]*\.track \.panel \{/);
});

test("arrivals: each panel and its pieces enter on the runway's timeline from the panel's place, reversing with the scroll; none in still view", () => {
  const body = code(read("app/city-track.css"));
  const block = body.slice(body.indexOf("@supports (animation-timeline: view())"));
  assert.match(block, /@media \(prefers-reduced-motion: no-preference\) \{\s*:root\[data-track="on"\]:not\(\[data-still="on"\]\) :is\(\.track \.panel, \.panel :is\(/);
  assert.match(block, /animation: arrive var\(--ease-out\) both;\s*animation-timeline: --runway;/);
  assert.match(block, /animation-range: contain calc\(var\(--at\) - 100vw \+ var\(--k, 0\) \* 4vw\) contain calc\(var\(--at\) - 50vw/);
  assert.match(block, /@supports \(order: sibling-index\(\)\) \{\s*\.panel \* \{\s*--k: min\(sibling-index\(\) - 1, 5\);/, "pieces in sequence");
  // Transform and opacity only
  for (const name of ["arrive"]) {
    const kf = body.match(new RegExp(`@keyframes ${name} \\{([\\s\\S]*?)\\n\\}`))[1];
    for (const prop of kf.matchAll(/^\s*([a-z-]+):/gm)) assert.ok(["opacity", "translate", "scale"].includes(prop[1]), `${name}: ${prop[1]}`);
  }
  // Each panel's place along the track, from its layout (not its transforms)
  const src = code(read("app/components/city2d/CityTrack.tsx"));
  assert.match(src, /x \+= e\.offsetLeft;/);
  assert.match(src, /p\.style\.setProperty\("--at", `\$\{x\}px`\)/);
});

test("Task 8: the arrivals never animate a key or a link; anchors centre their panel (the glass and the layout: B's tests)", () => {
  const body = code(read("app/city-track.css"));
  // The arrivals never animate a key or a link itself (GlassPress's give is its scale)
  const set = body.match(/:is\(\.track \.panel, \.panel :is\(([^)]*)\)\)/)[1];
  assert.doesNotMatch(set, /glass|text-link/);
  // Anchors measure the panel's layout (--at), not its drawn rect, and put it in the middle
  const src = code(read("app/components/city2d/CityTrack.tsx"));
  assert.match(src, /const x = parseFloat\(p\.style\.getPropertyValue\("--at"\)\);/);
  assert.match(src, /Math\.max\(offsets\[i\], x - \(vw - Math\.min\(p\.offsetWidth, vw\)\) \/ 2\)/);
});

test("Task 9: the places: the nearest for the label, the last reached for a key, a sideways move lands on one", () => {
  const xs = [0, 1296, 2592, 4032, 5472];
  assert.equal(nearestPlace(0, xs), 0);
  assert.equal(nearestPlace(647, xs), 0);
  assert.equal(nearestPlace(649, xs), 1, "the label switches as the next panel's middle passes the screen's (V19)");
  assert.equal(nearestPlace(99999, xs), 4);
  assert.equal(placeAt(1295.6, xs), 1, "half a pixel is rounding");
  assert.equal(placeAt(1200, xs), 0);
  // The narrow layout: one place per swipe, a nudge goes back
  assert.equal(landing(1296, 1310, xs, true, 100), 1);
  assert.equal(landing(1296, 1400, xs, true, 100), 2);
  assert.equal(landing(1296, 1200, xs, true, 100), 0);
  assert.equal(landing(1296, 3000, xs, true, 100), 3, "let go past a place: the next one on");
  assert.equal(landing(0, -40, xs, true, 100), 0);
  // Wide: the nearest if near, else where it is
  assert.equal(landing(0, 1250, xs, false, 400), 1);
  assert.equal(landing(0, 600, xs, false, 400), null);
  assert.equal(landing(0, 10, [], true, 400), null);
});

test("Task 11: every jump glides, sub-linearly longer for a longer way, capped", () => {
  assert.deepEqual(GLIDE_MS, { min: 600, perScreen: 700, max: 1600 });
  assert.equal(glideMs(0, 1440), 600, "a hop takes the least");
  assert.equal(glideMs(1440, 1440), 700);
  assert.equal(glideMs(-1440 * 4, 1440), 1400, "either way");
  assert.equal(glideMs(1440 * 30, 1440), 1600, "never past the cap");
  assert.ok(glideMs(1440 * 4, 1440) < 4 * glideMs(1440, 1440), "quicker per screen when longer");
  assert.equal(glideEase(0), 0);
  assert.equal(glideEase(1), 1, "lands exactly");
  assert.equal(glideEase(-1), 0);
  assert.equal(glideEase(2), 1);
  assert.equal(glideEase(0.5), 0.5);
  for (let t = 0; t < 1; t += 0.05) assert.ok(glideEase(t + 0.05) >= glideEase(t) && glideOn(t + 0.05) >= glideOn(t), "never back");
  // Sent on while under way (a key held): no gentle start again
  assert.equal(glideOn(0), 0);
  assert.equal(glideOn(1), 1);
  assert.ok(glideOn(0.1) > 0.25 && glideEase(0.1) < 0.01);
  assert.match(code(read("app/components/city2d/CityTrack.tsx")), /const ease = glideRaf \? glideOn : glideEase;/);
});

test("Task 9: the snap targets, the bar's label, focus and the glide, from one list", () => {
  const src = code(read("app/components/city2d/CityTrack.tsx"));
  assert.match(src, /snaps\.append\(Object\.assign\(document\.createElement\("div"\), \{ className: "snap-mark" \}\)\)/);
  assert.match(src, /m\.dataset\.for = p\.panel\.id \|\| stops\[p\.stop\]\.id;\s*m\.style\.top = `\$\{p\.x\}px`;/);
  assert.match(src, /<div className="track-snaps" aria-hidden="true" \/>/);
  assert.match(src, /dispatchEvent\(new CustomEvent\("trackplace", \{ detail: place \}\)\)/);
  // Task 11: no dissolve, every jump glides (snapping let go meanwhile,
  // giving way to your own scroll)
  assert.doesNotMatch(src, /data-dissolve|FAR/);
  assert.doesNotMatch(code(read("app/motion.css")), /data-dissolve|\.track-stage/);
  assert.doesNotMatch(src, /behavior: "smooth"/, "the browser's smooth scroll is not the glide");
  assert.match(src, /const ms = glideMs\(to - from, vw\);/);
  assert.match(src, /html\.setAttribute\("data-free", ""\);/);
  assert.match(src, /if \(wrote >= 0 && Math\.abs\(scrollY - wrote\) > 2\) return stopGlide\(\);/, "your own scroll wins");
  assert.match(src, /addEventListener\("wheel", takeOver, passive\);\s*addEventListener\("pointerdown", takeOver, passive\);/);
  // An overflowing panel is a region in the Tab order; one well off the screen starts at its top
  assert.match(src, /p\.setAttribute\("tabindex", scrolls \? "0" : \(tab \?\? "-1"\)\)/);
  assert.match(src, /if \(r\.right < -vw \|\| r\.left > 2 \* vw\) p\.scrollTop = 0;/);
  // Before the measure every arrival is done (M13: nothing moves at hydration)
  assert.match(code(read("app/city-track.css")), /:root\[data-track="on"\] \.track \{\s*--at: 0px;/);
});

test("Task 9: a panel needs 20em of room, or the page reads stacked", () => {
  assert.equal(ROOM_EMS, 20);
  assert.ok(trackRoom(844, 390) < 320 && trackRoom(667, 375) < 320, "phones on their side");
  assert.ok(trackRoom(390, 844, 32) < 640, "a phone at 200% text");
  assert.ok(trackRoom(1024, 768) >= 320 && trackRoom(390, 844) >= 320 && trackRoom(1440, 900) >= 320);
  assert.ok(!trackFits(844, 390) && trackFits(1024, 768) && !trackFits(390, 844) && trackFits(768, 1024) && !trackFits(390, 844, 32));
});
