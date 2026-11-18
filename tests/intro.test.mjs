// The home page's intro: app/components/intro (a deliberate exception to
// "words never wait for the world", CLAUDE.md, Motion)
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { test } from "node:test";
import { CAP_MS, DURATION, KID_PATH, cover, kid, layer, painting, wipe } from "../app/components/intro/timeline.ts";

const root = new URL("../", import.meta.url).pathname;
const read = (p) => readFileSync(`${root}${p}`, "utf8");

test("it lasts no more than 10 seconds", () => {
  assert.ok(DURATION <= 9.5, `${DURATION} s`);
  assert.ok(CAP_MS <= 10000);
  assert.equal(painting(DURATION), 0, "the painting is gone when it ends");
  assert.equal(cover(0), 1);
  assert.equal(cover(1), 0);
  assert.equal(wipe(DURATION), 1);
  for (const t of [0, 3, 6, 9]) assert.ok(Number.isFinite(layer("near", t).scale));
});

test("the kid runs past the camera, then away down the path, getting smaller", () => {
  assert.equal(kid(1), null, "not there at the start");
  const near = kid(1.6);
  const far = kid(6);
  assert.ok(near && far);
  assert.ok(near.h > 0.4, "close to the lens at first");
  assert.ok(far.h < near.h / 5, "small far away");
  assert.ok(far.y < near.y, "further up the screen as they go");
  let last = Infinity;
  for (let t = 1.5; t < 7.1; t += 0.25) {
    const k = kid(t);
    assert.ok(k.h <= last + 1e-9, `never grows (t=${t})`);
    last = k.h;
  }
  assert.equal(kid(7.5), null, "gone before the wipe");
  // The path ends at the park, near the middle-right of the picture
  const end = KID_PATH.at(-1);
  assert.ok(end[0] > 0.6 && end[1] < 0.8);
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

test("its paintings stay within 900 KB", () => {
  const dir = `${root}app/assets/intro`;
  const total = readdirSync(dir).reduce((sum, f) => sum + statSync(`${dir}/${f}`).size, 0);
  assert.ok(total <= 900 * 1024, `${Math.round(total / 1024)} KB`);
});
