// The home page's intro: app/components/intro (a deliberate exception to
// "words never wait for the world", CLAUDE.md, Motion)
import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { test } from "node:test";
import { CAP_MS, DURATION, FILM_START, cover, painting, wipe } from "../app/components/intro/timeline.ts";

const root = new URL("../", import.meta.url).pathname;
const read = (p) => readFileSync(`${root}${p}`, "utf8");

test("it lasts no more than 10 seconds", () => {
  assert.ok(DURATION <= 9.5, `${DURATION} s`);
  assert.ok(CAP_MS <= 10000);
  assert.ok(FILM_START < 1);
  assert.equal(cover(0), 1);
  assert.equal(cover(1), 0);
  assert.equal(wipe(DURATION), 1, "the grass covers the frame before it ends");
  assert.equal(painting(DURATION), 0, "and the intro is gone when it ends");
});

test("it's only on the home page, a glass key skips it, and phones and still view never see it", () => {
  assert.match(read("app/page.tsx"), /<Intro \/>/);
  for (const dir of ["projects", "experience", "interests", "about", "contact", "map"]) assert.doesNotMatch(read(`app/${dir}/page.tsx`), /Intro/);
  const intro = read("app/components/intro/Intro.tsx");
  assert.match(intro, /className="glass intro-skip"/);
  assert.match(intro, />\s*Skip intro\s*</);
  assert.match(intro, /key === "Escape"/);
  const css = read("app/globals.css");
  assert.match(css, /\.intro \{\n  display: none;\n\}/, "hidden unless the wide layout shows it");
  assert.match(css, /@media \(orientation: landscape\) and \(min-width: 768px\) and \(min-height: 481px\) \{\n  :root:not\(\[data-still="on"\]\) \.intro \{\n    display: block;/, "shown only on the wide layout, never in still view");
});

test("the film is only fetched once the wide layout is confirmed", () => {
  const intro = read("app/components/intro/Intro.tsx");
  // No src in the markup: the source is set by script, after the checks
  assert.match(intro, /<video ref=\{film\}[^>]*preload="none"/);
  assert.doesNotMatch(intro, /<video[^>]*\bsrc=/);
  assert.ok(intro.indexOf("isFlat() || world.get().still") < intro.indexOf("v.src ="), "the layout check comes first");
});

test("the film stays within 8 MB and the poster within 150 KB", () => {
  for (const f of ["intro.av1.mp4", "intro.h264.mp4"]) {
    const size = statSync(`${root}public/intro/${f}`).size;
    assert.ok(size <= 8 * 1024 * 1024, `${f}: ${(size / 1048576).toFixed(1)} MB`);
  }
  assert.ok(statSync(`${root}public/intro/intro-poster.webp`).size <= 150 * 1024);
});
