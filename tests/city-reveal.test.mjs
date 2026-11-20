// The page's arrival and its pictures' depth (app/reveal.css, Station.tsx's
// order(), Tilt.tsx): content never waits on or is hidden by an animation,
// nothing moves in still view or with reduced motion, and only transform
// and opacity move. docs/ui/ux-motion-principles.md, principles 3 and 17.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

const root = new URL("../", import.meta.url).pathname;
const read = (path) => readFileSync(`${root}${path}`, "utf8");
const css = read("app/reveal.css").replace(/\/\*[\s\S]*?\*\//g, "");

// Every declaration block in the stylesheet, with the at-rules and
// selectors it sits in (outermost first)
function blocks(source) {
  const out = [];
  const stack = [];
  let start = 0;
  for (let i = 0; i < source.length; i++) {
    const c = source[i];
    if (c === "{") {
      stack.push(source.slice(start, i).trim().split(";").pop().trim());
      start = i + 1;
    } else if (c === "}") {
      const body = source.slice(start, i);
      const prelude = stack.pop();
      if (body.includes(":")) out.push({ prelude, context: [...stack], body: body.trim() });
      start = i + 1;
    }
  }
  return out;
}

const all = blocks(css);
const guarded = (b) =>
  b.context.some((c) => /^@media \(prefers-reduced-motion: no-preference\)/.test(c)) &&
  [b.prelude, ...b.context].some((c) => c.includes(':root:not([data-still="on"])'));
const inKeyframes = (b) => b.context.some((c) => c.startsWith("@keyframes"));

test("every animation is behind the reduced-motion and still-view guard; scroll-driven ones behind @supports", () => {
  const animated = all.filter((b) => !inKeyframes(b) && /(^|;|\s)animation(-name)?\s*:/.test(b.body) && !/animation:\s*none/.test(b.body));
  assert.ok(animated.length >= 3, "the arrival, the hero and the bands");
  for (const b of animated) {
    assert.ok(guarded(b), `unguarded animation: ${b.prelude}`);
    if (b.prelude.includes(".hero-arrive")) continue; // the one-time load arrival
    assert.ok(b.context.includes("@supports (animation-timeline: view())"), `not behind @supports: ${b.prelude}`);
    assert.match(b.body, /animation-timeline:/, `scroll-driven: ${b.prelude}`);
  }
});

test("the transitions and the lift are behind the guard too", () => {
  for (const b of all.filter((b) => !inKeyframes(b) && /transition\s*:|--lift\s*:|transform:\s*scale/.test(b.body))) assert.ok(guarded(b), b.prelude);
  // The pointer's tilt only on a fine pointer that hovers
  const hover = all.find((b) => b.prelude.includes(".depth:hover") && b.body.includes("rotateX"));
  assert.ok(hover.context.includes("@media (hover: hover) and (pointer: fine)"));
});

test("nothing loops; arrivals complete within the entry", () => {
  assert.doesNotMatch(css, /infinite/);
  const reveal = all.find((b) => b.prelude.endsWith(".reveal") && b.body.includes("animation-range"));
  // Ends no later than entry 100%: whatever is wholly on screen is at rest
  assert.match(reveal.body, /animation-range:\s*entry [^;]+ entry min\(calc\(45% \+ var\(--i, 0\) \* 10%\)/);
  assert.match(css, /\.reveal:focus-within\s*\{\s*animation: none;/, "focus inside shows it at once");
});

test("the resting state is visible: no opacity 0 outside a keyframe's start", () => {
  for (const b of all) {
    if (inKeyframes(b) && b.prelude === "from") continue;
    assert.doesNotMatch(b.body, /(^|;|\s)opacity:\s*0(\.0+)?\s*(;|$)/, `${b.prelude} rests hidden`);
  }
  // The arrival's start is nearly clear, never quite 0; the hero's starts at 0.6
  assert.match(css, /opacity: var\(--from, 0\.001\)/);
  assert.match(css, /\.hero-arrive \{[^}]*--from: 0\.6;/);
});

test("keyframes move only transform and opacity", () => {
  const frames = all.filter(inKeyframes);
  assert.ok(frames.length >= 2);
  for (const b of frames) {
    for (const decl of b.body.split(";").map((d) => d.trim()).filter(Boolean)) {
      assert.match(decl.split(":")[0].trim(), /^(transform|opacity)$/, `${b.context.at(-1)}: ${decl}`);
    }
  }
});

test("print shows everything at rest", () => {
  const print = all.find((b) => b.context.includes("@media print"));
  assert.ok(print, "a @media print block");
  for (const sel of [".reveal", ".hero-arrive", ".band-plate"]) assert.ok(print.prelude.includes(sel), sel);
  assert.match(print.body, /animation: none !important/);
});

test("Tilt: one passive listener, frame cancelled, still view and reduced motion respected", () => {
  if (!existsSync(`${root}app/components/city2d/Tilt.tsx`)) return;
  const tilt = read("app/components/city2d/Tilt.tsx");
  assert.equal((tilt.match(/addEventListener\("pointermove"/g) ?? []).length, 1, "one pointermove listener");
  assert.match(tilt, /addEventListener\("pointermove", move, \{ passive: true \}\)/);
  assert.match(tilt, /removeEventListener\("pointermove", move\)/);
  assert.match(tilt, /requestAnimationFrame\(draw\)/);
  assert.match(tilt, /cancelAnimationFrame\(frame\)/);
  assert.match(tilt, /dataset\.still === "on"/);
  assert.match(tilt, /prefers-reduced-motion: no-preference/);
  assert.match(tilt, /\(hover: hover\) and \(pointer: fine\)/);
  assert.match(tilt, /return null;/, "renders nothing");
  // Mounted once, from a server component
  const mounts = ["Projects", "Interests", "About", "Experience", "Hero", "Contact"].filter((n) =>
    /<Tilt \/>/.test(read(`app/components/city2d/sections/${n}.tsx`)),
  );
  assert.deepEqual(mounts, ["Projects"]);
});

test("the sections stay server components; the items carry their order", () => {
  for (const n of ["Hero", "About", "Projects", "Experience", "Interests"]) {
    const src = read(`app/components/city2d/sections/${n}.tsx`);
    assert.doesNotMatch(src, /^["']use client["']/m, n);
    assert.match(src, /\b(reveal|hero-arrive)\b/, `${n} marks what arrives`);
  }
  const station = read("app/components/city2d/Station.tsx");
  assert.doesNotMatch(station, /^["']use client["']/m);
  assert.match(station, /export const order = \(i: number\) => \(\{ "--i": Math\.min\(i, 5\) \}\)/, "at most six steps");
  assert.match(station, /className="station-number reveal"[^>]*style=\{order\(0\)\}/);
  assert.match(station, /className="station-title reveal" style=\{order\(1\)\}/);
  // The pictures have their depth wrapper, with the tilt hook
  assert.match(read("app/components/city2d/sections/Projects.tsx"), /<div className="depth [^"]*" data-tilt="">/);
  assert.match(read("app/components/city2d/sections/Interests.tsx"), /<span className="depth [^"]*" data-tilt="">/);
});
