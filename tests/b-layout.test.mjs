// The journey's panels (city-track.css, components/city2d/Station.tsx):
// one top line, widths by what each holds, one even glass tint, the "More"
// cue while a panel has more below, the way on at a panel's foot, and the
// phone's sheet given the screen (UX review 2026-11-23, items 2, 3, 4, 7, 9).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const root = new URL("../", import.meta.url).pathname;
const read = (f) => readFileSync(`${root}${f}`, "utf8");
const uncomment = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "");
const css = uncomment(read("app/city-track.css"));
const rule = (sel) => {
  const i = css.indexOf(`${sel} {`);
  assert.ok(i >= 0, `no rule ${sel}`);
  return css.slice(i, css.indexOf("}", i));
};

test("every panel hangs from one top line and ends above the map", () => {
  assert.match(css, /--line: calc\(var\(--stop-top\) \+ 1\.5rem\);\s*--room: calc\(100% - var\(--line\) - var\(--foot\)\);/);
  const body = rule(':root[data-track="on"] .track .station-body');
  assert.match(body, /top: var\(--line\);/);
  assert.match(body, /max-height: var\(--room\);/);
  assert.match(body, /margin: 0;/, "the stacked page's pull-up doesn't move the line");
  assert.doesNotMatch(body, /min-height|margin: auto/, "sized by what it holds, never re-centred as it grows");
  assert.match(rule(':root[data-track="on"] .track .station-row'), /align-items: flex-start;[\s\S]*padding: var\(--line\) 0 var\(--foot\)/);
  assert.doesNotMatch(css, /justify-content: safe center/, "a panel's words start at its top");
});

test("Projects and Experience take the central 80%; Home, the index, Interests and Contact what they hold", () => {
  assert.match(css, /--wide: calc\(100cqw - 2 \* var\(--peek\)\);/);
  assert.match(rule(':root[data-track="on"] .station-row .panel'), /width: min\(var\(--wide\), var\(--pw, 100cqw\)\);/);
  assert.match(rule(':root[data-track="on"] #experience .station-body'), /--w: var\(--wide\);/);
  // in rem, so 200% text gets twice the room
  assert.match(rule(':root[data-track="on"] #home .station-body'), /--pw: 46rem;/);
  assert.match(rule(':root[data-track="on"] :is(#interests .station-body, .station-row > .panel:first-child)'), /--pw: 50rem;/);
  assert.match(rule(':root[data-track="on"] #contact .station-body'), /--pw: 48rem;/);
});

test("the glass is one even tint: no shade behind any block, no halo", () => {
  const panel = rule(':root[data-track="on"] .track .panel');
  assert.match(panel, /background: linear-gradient\(rgb\(79 216 238 \/ 0\.05\), transparent 8rem\) rgb\(8 9 12 \/ 0\.4\);/);
  assert.match(panel, /backdrop-filter: blur\(24px\) brightness\(0\.62\);/);
  assert.doesNotMatch(css, /--shade|text-shadow: 0 0/, "no per-block shade, no halo");
});

test("a panel with more below says so, and the cue goes at its end", () => {
  const cue = rule(':root[data-track="on"] .track .panel::after');
  assert.match(cue, /content: "More \\2193" \/ "";/, "hidden from assistive technology");
  assert.match(cue, /position: sticky;\s*bottom: 0;/);
  assert.match(cue, /opacity: 0;\s*pointer-events: none;/, "none without a scroll timeline, and never in the way");
  // (where there are no scroll timelines it ends at once, at its base: no cue)
  assert.match(cue, /animation: more both;\s*animation-timeline: scroll\(nearest\);/);
  assert.match(css, /@keyframes more \{\s*from,\s*94% \{\s*opacity: 1;/);
});

test("the way on sits at the foot of each one-panel stop, to the next section by its registry title", () => {
  const station = read("app/components/city2d/Station.tsx");
  assert.match(station, /export function NextStop\(\{ section \}: \{ section: Section \}\)/);
  assert.match(station, /const next = pageSections\[pageSections\.indexOf\(section\) \+ 1\];\s*if \(!next\) return null;/, "none after the last");
  assert.match(station, /<a href=\{`#\$\{next\.hash\}`\} className="next-stop text-link text-link-solo">\s*Next: \{next\.title\}\s*<span aria-hidden="true">&nbsp;&rarr;<\/span>/);
  assert.match(station, /\{children\}\s*<NextStop section=\{section\} \/>/);
});

test("phones: the sheet gets the screen, sized from svh", () => {
  assert.match(rule(':root[data-track="on"] .track-stage'), /height: 100svh;/);
  assert.match(css, /--stop-band: calc\(var\(--bar-h\) \+ 0\.2 \* \(100svh - var\(--bar-h\)\)\);/);
  assert.doesNotMatch(css.replace(/\.track-runway \{[^}]*\}/, ""), /100dvh/, "nothing but the runway (CityTrack's) sized from dvh");
});

test("short screens: panels just under the bar, compact headings", () => {
  const short = css.slice(css.lastIndexOf("@media (max-height: 500px)"));
  assert.match(short, /--line: var\(--stop-top\);[\s\S]*--pad: 1rem;[\s\S]*\.station-title \{\s*font-size: 2rem;/);
});
