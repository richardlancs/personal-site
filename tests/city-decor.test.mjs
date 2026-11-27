// The doodles on the paper (components/city2d/Decor.tsx, city-track.css
// "Doodles"): decoration only, in the papers' own tokens, a day and a night
// drawing each, never moving, gone under more contrast and forced colours.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const root = new URL("../", import.meta.url).pathname;
const read = (f) => readFileSync(`${root}${f}`, "utf8");
const decor = read("app/components/city2d/Decor.tsx");
const css = read("app/city-track.css");
const rules = css.slice(css.indexOf("/* Doodles on the paper"));

test("the doodles are hidden from assistive technology and take no pointer", () => {
  assert.match(decor, /aria-hidden="true"[\s\S]*aria-hidden="true"/, "the drawings and the notes");
  assert.match(decor, /focusable="false"/);
  assert.match(rules, /pointer-events: none/);
  assert.doesNotMatch(decor, /"use client"/, "a server component");
});

test("every doodle has a day and a night drawing, and each paper shows its own", () => {
  assert.ok((decor.match(/className="d"/g) ?? []).length >= 8);
  assert.ok((decor.match(/className="n"/g) ?? []).length >= 8);
  assert.match(rules, /\[data-paper="charcoal"\] \.decor \.d,\s*:root:not\(\[data-paper="charcoal"\]\) \.decor \.n \{\s*display: none;/);
});

test("the doodles use the papers' tokens, never a colour of their own, and never move", () => {
  assert.doesNotMatch(decor, /#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i);
  assert.doesNotMatch(rules, /#[0-9a-f]{3,8}\b|rgba?\(|animation|transition/i);
});

test("only on the journey, only the ring on a phone, none with more contrast or forced colours", () => {
  assert.match(rules, /:root:not\(\[data-track="on"\]\) \.decor,/);
  assert.match(rules, /@media \(max-aspect-ratio: 1 \/ 1\)[\s\S]*\.decor:not\(\[data-phone\]\) \{\s*display: none;/);
  assert.equal((decor.match(/xp: /g) ?? []).length, 1, "one doodle shows on a phone");
  assert.match(rules, /@media \(prefers-contrast: more\), \(forced-colors: active\) \{\s*:root \.decor \{\s*display: none;/);
});

test("the margin notes come from the data", () => {
  assert.match(decor, /import \{ marginNotes(, projects)? \} from "..\/..\/data\/portfolio"/);
  for (const stop of ["home", "projects", "contact"]) assert.match(decor, new RegExp(`marginNotes\\.${stop}`));
});
