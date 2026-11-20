// The bands of painting at the top of each station (components/city2d/
// DistrictBand.tsx), the driver that sets their sky on <html> from
// Richmond Hill's clock (CityDriver.tsx), the plates themselves
// (app/assets/city/) and the hero over the first band (sections/Hero.tsx).
import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { test } from "node:test";
import { stations } from "../app/sections/registry.ts";

const root = new URL("../", import.meta.url).pathname;
const read = (path) => readFileSync(`${root}${path}`, "utf8");
const districts = [...new Set(stations.map((s) => s.district))];

// A WebP's pixel size from its header: lossy (VP8), lossless (VP8L) or
// extended (VP8X)
function webpSize(path) {
  const b = readFileSync(path);
  assert.equal(b.toString("ascii", 0, 4), "RIFF", path);
  assert.equal(b.toString("ascii", 8, 12), "WEBP", path);
  const chunk = b.toString("ascii", 12, 16);
  if (chunk === "VP8X") return [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)];
  if (chunk === "VP8 ") return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
  if (chunk === "VP8L") {
    const bits = b.readUInt32LE(21);
    return [1 + (bits & 0x3fff), 1 + ((bits >> 14) & 0x3fff)];
  }
  throw new Error(`${path}: unknown WebP chunk ${chunk}`);
}

test("the band reserves its height and never sets text over the painting", () => {
  const css = read("app/city.css");
  assert.match(css, /\.band\s*\{[^}]*aspect-ratio:\s*21\s*\/\s*9/);
  assert.match(css, /\.band\s*\{[^}]*max-height:/, "a very wide window still shows what's under the band");
  const band = read("app/components/city2d/DistrictBand.tsx");
  assert.match(band, /aria-hidden="true"/);
  // Nothing but the plates (and the no-script plate) is drawn in it
  assert.doesNotMatch(band, /<(p|h[1-6]|span)[\s>]/);
});

test("the band keeps its gradient when a plate fails, and has a no-script plate", () => {
  const src = read("app/components/city2d/DistrictBand.tsx");
  assert.match(src, /onError/);
  assert.match(src, /<noscript>/);
  assert.match(src, /alt=""/);
  assert.doesNotMatch(src, /alt="[^"]+"/, "every plate is decorative");
  assert.match(src, /platesNeeded\(/, "only the plates in use are mounted");
  assert.match(src, /sizes="\(max-width: 767px\) 175vw, 100vw"/, "the phone crop asks for a wide enough plate");
  assert.match(src, /placeholder="blur"/);
});

test("only the home band loads early; the others wait until they're near", () => {
  const station = read("app/components/city2d/Station.tsx");
  assert.match(station, /<DistrictBand district=\{section\.district\}/);
  const band = read("app/components/city2d/DistrictBand.tsx");
  // Eager loading only behind the prop; next/image is lazy otherwise
  assert.doesNotMatch(band, /loading="eager"|priority=\{true\}|preload/);
  assert.match(band, /loading=\{priority \? "eager" : undefined\}/);
  assert.match(station, /priority=\{section\.id === "home"\}/);
});

test("the driver waits for the clock and writes the sky on <html>", () => {
  const src = read("app/components/city2d/CityDriver.tsx");
  assert.match(src, /now === 0/);
  assert.match(src, /documentElement/);
  assert.match(src, /cityVars\(/);
  // The preview only in development
  assert.match(src, /process\.env\.NODE_ENV === "development"/);
  // Nothing of the 3D world comes with it but the preview's parser
  assert.doesNotMatch(src, /from "three"|@react-three/);
  const layout = read("app/layout.tsx");
  assert.match(layout, /<CityDriver \/>/);
});

test("the sky is worked out in one place; the bands run no timers of their own", () => {
  const users = ["app/components/city2d/DistrictBand.tsx", "app/components/city2d/Station.tsx", "app/components/city2d/sections/Hero.tsx", "app/page.tsx", "app/layout.tsx"].filter((f) => read(f).includes("cityVars("));
  assert.deepEqual(users, []);
  const band = read("app/components/city2d/DistrictBand.tsx");
  assert.doesNotMatch(band, /setInterval|setTimeout|useRichmondHill/);
});

test("the band's day/night cross-fade, grade and bottom fade, still in still view", () => {
  const css = read("app/city.css");
  assert.match(css, /var\(--city-night/);
  assert.match(css, /\.band::after\s*\{[^}]*background:\s*var\(--city-grade\)[^}]*opacity:\s*var\(--city-grade-mix[,)][^}]*mix-blend-mode:\s*soft-light/);
  assert.match(css, /var\(--ground/);
  assert.match(css, /transition:\s*opacity 3s/);
  // Guarded as the rest of city.css is: none of it moves in still view
  assert.match(css, /:root\[data-still="on"\][^{]*\.band/);
  assert.match(css, /prefers-reduced-motion: reduce\) \{\s*:root:not\(\[data-still\]\)[^{]*\.band/);
});

test("every district has both plates, the same size, none over 600 KB", () => {
  assert.equal(districts.length, 6);
  const plates = read("app/components/city2d/plates.ts");
  for (const d of districts) {
    const [day, night] = ["day", "night"].map((t) => `${root}app/assets/city/${d}-${t}.webp`);
    for (const f of [day, night]) {
      assert.ok(existsSync(f), f);
      assert.ok(statSync(f).size <= 600 * 1024, `${f} is ${statSync(f).size} bytes`);
      assert.ok(plates.includes(`/assets/city/${f.split("/").pop()}"`), `plates.ts imports ${f}`);
    }
    assert.deepEqual(webpSize(day), webpSize(night), `${d}: the day and night plates differ in size`);
  }
});

test("the hero has the name, the headline, two actions and three links, and no paragraph", () => {
  const src = read("app/components/city2d/sections/Hero.tsx");
  assert.ok(!src.includes('"use client"'), "the hero is a server component");
  assert.match(src, /<h1[^>]*>\{profile\.name\}<\/h1>/);
  assert.ok(!/<p[ >]/.test(src.replace(/<p className="[^"]*headline[^"]*"/, "")));
  assert.match(src, /<p className="[^"]*headline[^"]*">\{profile\.headline\}<\/p>/);
  assert.match(src, /href="#projects" className="glass glass-primary"/);
  assert.match(src, /href="#contact" className="glass"/);
  for (const s of ["githubUrl", "linkedinUrl"]) assert.ok(src.includes(`profile.${s}`), s);
  // The résumé goes through the viewer's link (it alone names resumeUrl)
  assert.match(src, /<ResumeLink[\s>]/);
});
