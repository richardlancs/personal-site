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
  b.context.some((c) => /^@media (screen and )?\(prefers-reduced-motion: no-preference\)/.test(c)) &&
  [b.prelude, ...b.context].some((c) => /:root(\[[a-z-]+\])?:not\(\[data-still="on"\]\)/.test(c));
const inKeyframes = (b) => b.context.some((c) => c.startsWith("@keyframes"));

test("every animation is behind the reduced-motion and still-view guard; none is scroll-driven", () => {
  const animated = all.filter((b) => !inKeyframes(b) && /(^|;|\s)animation(-name)?\s*:/.test(b.body) && !/animation:\s*none/.test(b.body));
  assert.ok(animated.length >= 1, "the hero");
  for (const b of animated) assert.ok(guarded(b), `unguarded animation: ${b.prelude}`);
  // Content arrives once, on a transition: never on a scroll-linked
  // (reversible) timeline (the journey's move is city-track.css's)
  assert.doesNotMatch(css, /animation-timeline:/);
  assert.doesNotMatch(css, /\.reveal[^{]*\{[^}]*animation/, "no animation on an arriving item");
});

test("the waiting state, the transitions and the lift are behind the guard too", () => {
  for (const b of all.filter((b) => !inKeyframes(b) && /transition\s*:|--lift\s*:|transform:\s*scale|opacity:\s*0\.001/.test(b.body))) assert.ok(guarded(b), b.prelude);
  // At most 1.5° each way
  assert.match(css, /rotateX\(calc\(var\(--tilt-y, 0\) \* -3deg\)\) rotateY\(calc\(var\(--tilt-x, 0\) \* 3deg\)\)/);
  // The pointer's tilt only on a fine pointer that hovers
  const hover = all.find((b) => b.prelude.includes(".depth:hover") && b.body.includes("rotateX"));
  assert.ok(hover.context.includes("@media (hover: hover) and (pointer: fine)"));
});

test("nothing loops; an item arrives once, and only once the script has marked the page", () => {
  assert.doesNotMatch(css, /infinite/);
  const waiting = all.find((b) => /opacity:\s*0\.001/.test(b.body) && b.prelude.includes(".reveal"));
  // Only under html[data-arrive] (set by arrive.ts), and only items the
  // script marked waiting (visible by default), so with JavaScript off
  // nothing waits; never in print; never focused inside, or in the section
  // a jump landed on
  assert.ok(waiting.prelude.startsWith(":root[data-arrive]"), waiting.prelude);
  assert.ok(waiting.context.includes("@media screen and (prefers-reduced-motion: no-preference)"), "screen only");
  assert.match(waiting.prelude, /\.reveal\[data-arrive-wait\]:not\(:focus-within, :target \*\)/);
  assert.match(waiting.body, /translate: var\(--arrive, 0 8px\)/, "a short move (a rise by default), no turn or scale");
  // Each stop its own way: Projects from the right (on the journey only,
  // so nothing overflows a stacked page), Experience down onto the line,
  // the interests a fade, Contact a longer rise
  assert.match(css, /:root\[data-track="on"\] #projects \{\s*--arrive: 3rem 0;/);
  assert.match(css, /#experience \{\s*--arrive: 0 -0\.75rem;/);
  assert.match(css, /#interests \{\s*--arrive: 0 0;/);
  assert.match(css, /#contact \{\s*--arrive: 0 1\.25rem;/);
  // The arrival is a transition on the mark, within --t-slow, --stagger apart
  const arriving = all.find((b) => b.prelude.includes('.reveal[data-arrived="in"]'));
  assert.match(arriving.body, /opacity var\(--t-slow\) var\(--ease-out\)/);
  assert.match(arriving.body, /transition-delay: calc\(var\(--i, 0\) \* var\(--stagger\)\)/);
  // The observer: one for the page, each item let go once marked; what's
  // on screen or above it when it starts is marked before the page is
  const arrive = read("app/components/ui/arrive.ts");
  assert.equal((arrive.match(/new IntersectionObserver\(/g) ?? []).length, 1);
  assert.match(arrive, /io\.unobserve\(e\.target\)/);
  assert.match(arrive, /rootMargin: "0px 0px -5% 0px"/, "a tall item arrives as soon as its top edge is a little way in");
  assert.doesNotMatch(arrive, /threshold/, "never waits for a share of a tall item's height");
  assert.ok(arrive.indexOf('setAttribute("data-arrived", "")') < arrive.indexOf('setAttribute("data-arrive", "")'), "in view first, then the page");
  // Started from inside each page, after hydration (Arrivals.tsx, rendered
  // last in the page), never from the layout
  assert.match(read("app/components/ui/Arrivals.tsx"), /useEffect\(\(\) => watchArrivals\(\), \[\]\)/);
  assert.doesNotMatch(read("app/components/ui/GlassPress.tsx"), /watchArrivals/);
  assert.match(read("app/page.tsx"), /<Arrivals \/>\s*<\/main>/);
});

test("the resting state is visible: no opacity 0 outside a keyframe's start", () => {
  for (const b of all) {
    if (inKeyframes(b) && b.prelude === "from") continue;
    assert.doesNotMatch(b.body, /(^|;|\s)opacity:\s*0(\.0+)?\s*(;|$)/, `${b.prelude} rests hidden`);
  }
  // The hero's start is nearly clear by default and at 0.6 for the hero
  assert.match(css, /opacity: var\(--from, 0\.001\)/);
  assert.match(css, /\.hero-arrive \{[^}]*--from: 0\.6;/);
});

test("keyframes and the arrival move only transforms and opacity", () => {
  const frames = all.filter(inKeyframes);
  assert.ok(frames.length >= 1);
  for (const b of frames) {
    for (const decl of b.body.split(";").map((d) => d.trim()).filter(Boolean)) {
      assert.match(decl.split(":")[0].trim(), /^(transform|translate|opacity)$/, `${b.context.at(-1)}: ${decl}`);
    }
  }
  const arriving = all.find((b) => b.prelude.includes('.reveal[data-arrived="in"]'));
  for (const [, prop] of arriving.body.matchAll(/(?:transition:|,)\s*([a-z-]+) var/g)) assert.ok(["opacity", "translate"].includes(prop), prop);
});

test("print shows everything at rest", () => {
  const print = all.find((b) => b.context.includes("@media print"));
  assert.ok(print, "a @media print block");
  for (const sel of [".hero-arrive", ".band-plate"]) assert.ok(print.prelude.includes(sel), sel);
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
  // The stops' panels and blocks arrive (the heading with its panel)
  for (const n of ["Projects", "Experience", "Contact"]) assert.match(read(`app/components/city2d/sections/${n}.tsx`), /className="[^"]*\breveal\b/, n);
  // The pictures have their depth wrapper, with the tilt hook
  assert.match(read("app/components/city2d/sections/Projects.tsx"), /<div className="depth [^"]*" data-tilt="">/);
  assert.match(read("app/components/city2d/sections/Interests.tsx"), /<span className="depth [^"]*" data-tilt="">/);
});
