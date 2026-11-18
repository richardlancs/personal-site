// The world painted to match the intro film (docs/world/film-look.md)
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const root = new URL("../", import.meta.url).pathname;
const read = (p) => readFileSync(`${root}${p}`, "utf8");

test("the day sky is the film's deep blue with cream-gold clouds", () => {
  const looks = read("app/components/world3d/atmosphere/looks.ts");
  assert.match(looks, /top: "#174a9e", horizon: "#9cc3e2"/);
  assert.match(looks, /cloudLit: "#ffeac2"/);
});

test("the grey city is gone: every place looks out on the film's far view", () => {
  for (const scene of ["Park", "Station", "Booth"]) {
    const src = read(`app/components/world3d/scenes/${scene}.tsx`);
    assert.doesNotMatch(src, /buildCity\(/, `${scene} still builds the city`);
    assert.match(src, /buildHills\(/, `${scene} has the hills`);
  }
  const park = read("app/components/world3d/scenes/Park.tsx");
  for (const piece of ["buildSea(", "buildRuinedTown(", "buildPylon(", "buildOverpass("]) assert.ok(park.includes(piece), piece);
});

test("the ink line is drawn on desktops and never on phones", () => {
  const world = read("app/components/world3d/World3D.tsx");
  assert.match(world, /<Painterly [^>]*ink=\{quality !== "mobile"\}/);
});

test("under the intro the park's camera waits at the gate, and never past 10 s", () => {
  const world = read("app/components/world3d/World3D.tsx");
  assert.match(world, /introShowing\(\)/);
  assert.match(world, /setTimeout\(go, 10500\)/);
  assert.match(read("app/components/intro/Intro.tsx"), /introReveal: true/);
});
