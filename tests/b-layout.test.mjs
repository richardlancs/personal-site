// The journey's panels (city-track.css, components/city2d/Station.tsx):
// one top line, widths by what each holds, clear glass panes, the "More"
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
  // (--hang: --line is the hairline colour, used inside the cards)
  assert.match(css, /--hang: calc\(var\(--stop-top\) \+ 1\.5rem\);\s*--room: calc\(100% - var\(--hang\) - var\(--foot\)\);/);
  const body = rule(':root[data-track="on"] .track .station-body');
  assert.match(body, /top: var\(--hang\);/);
  assert.match(body, /max-height: var\(--room\);/);
  assert.match(body, /margin: 0;/, "the stacked page's pull-up doesn't move the line");
  assert.doesNotMatch(body, /min-height|margin: auto/, "sized by what it holds, never re-centred as it grows");
  assert.match(rule(':root[data-track="on"] .track .station-row'), /align-items: flex-start;[\s\S]*padding: var\(--hang\) 0 var\(--foot\)/);
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

test("every panel is a pane of clear glass: a whisper of --panel, a texture and sheen in the paper's light, a rim, a soft shadow in the paper's own --shadow; no blur, no halo, no shade", () => {
  const panel = rule(':root[data-track="on"] .track .panel');
  assert.match(panel, /border: 1px solid var\(--rim\);/);
  assert.match(panel, /--rim: color-mix\(in srgb, var\(--shadow\) \d+%, transparent\);/, "a darker rim on the light papers");
  assert.match(panel, /repeating-linear-gradient\(/, "a texture that reads as glass");
  assert.match(panel, /color-mix\(in srgb, var\(--panel\) [0-9]%, transparent\);/, "no more than a whisper of tint");
  assert.doesNotMatch(panel, /background: var\(--panel\);/, "see-through, not a card");
  assert.match(panel, /box-shadow:[^;]*inset 0 1px 0 color-mix\(in srgb, var\(--hi\)[^;]*color-mix\(in srgb, var\(--shadow\) \d+%, transparent\)/);
  assert.match(rule(':root[data-paper="charcoal"][data-track="on"] .track .panel'), /--rim: color-mix\(in srgb, var\(--text\) \d+%, transparent\);/, "a light rim on black");
  assert.doesNotMatch(css, /backdrop-filter|text-shadow|--shade|--sky-tone\)/, "no blur, and its words need no halo");
  assert.doesNotMatch(css, /rgb\(|#[0-9a-f]{3,8}\b/i, "only tokens");
  assert.match(css, /border-width: 1px 0 0;/, "the phone's sheet: its top edge");
  const more = css.slice(css.indexOf("@media (prefers-contrast: more)"));
  assert.match(more, /\.track \.panel \{\s*border-color: var\(--text\);\s*box-shadow: none;\s*background: var\(--panel\);/, "solid under more contrast");
});

test("the More cue fades into the paper behind the glass", () => {
  assert.match(rule(':root[data-track="on"] .track .panel::after'), /background: linear-gradient\([^;]*var\(--paper\) 70%\);/);
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
  // (just under the bar: no empty strip where the painting was)
  assert.match(css, /--stop-band: calc\(var\(--bar-h\) \+ 0\.75rem\);/);
  assert.doesNotMatch(css.replace(/\.track-runway \{[^}]*\}/, ""), /100dvh/, "nothing but the runway (CityTrack's) sized from dvh");
});

test("short screens: panels just under the bar, compact headings", () => {
  const short = css.slice(css.lastIndexOf("@media (max-height: 500px)"));
  assert.match(short, /--hang: var\(--stop-top\);[\s\S]*--pad: 1rem;[\s\S]*\.station-title \{\s*font-size: 2rem;/);
});
