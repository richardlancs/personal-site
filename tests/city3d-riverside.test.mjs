// Home, the riverside (Riverside.tsx, Task 12): its five boards, what
// they say and where they lead, and what it may not have (a second
// planar reflection, a spot light). Its composition is data in
// districts/lujiazui.def.ts (RIVERSIDE) and each section's def (sign).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const root = new URL("../", import.meta.url).pathname;
const read = (path) => readFileSync(`${root}${path}`, "utf8");
const noComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
const src = noComments(read("app/components/city3d/Riverside.tsx"));

test("the anchors are exactly the five sections' signs, left to right across the home view", async () => {
  const { scenes, signPlace, RIVERSIDE_EYE } = await import("../app/components/city3d/scenes.ts");
  const { section } = await import("../app/sections/registry.ts");
  assert.match(src, /const SIGNED: Exclude<SectionId, "home">\[\] = \["about", "experience", "projects", "interests", "contact"\];/);
  assert.match(src, /anchors\.set\(`sign:\$\{s\.id\}`, s\.center\)/);
  // no other anchor than sign:<id> and its edges
  const keys = [...src.matchAll(/anchors\.set\(\s*([^,]+),/g)].map((m) => m[1].trim());
  assert.deepEqual(keys, ["`sign:${s.id}`", "`sign:${s.id}:${k}`"]);
  // Their x in the home camera's space rises in that order
  const home = scenes.lujiazui.home;
  const [ex, ey, ez] = RIVERSIDE_EYE;
  const f = [home.target[0] - ex, home.target[1] - ey, home.target[2] - ez];
  const len = Math.hypot(...f);
  const fw = f.map((v) => v / len);
  // right = forward × up
  const right = [-fw[2], 0, fw[0]];
  const rl = Math.hypot(...right);
  const xs = ["about", "experience", "projects", "interests", "contact"].map((id) => {
    const p = signPlace(section(id).district);
    const v = [p.x - ex, p.y - ey, p.z - ez];
    const z = v[0] * fw[0] + v[1] * fw[1] + v[2] * fw[2];
    assert.ok(z > 0, `${id} in front of the camera`);
    return (v[0] * right[0] + v[2] * right[2]) / rl / z;
  });
  for (let i = 1; i < xs.length; i++) assert.ok(xs[i] > xs[i - 1], `camera-space x: ${xs.map((x) => x.toFixed(3))}`);
});

test("each board says its section's title through buildSign; every other sign is a mark sign", () => {
  const calls = [...src.matchAll(/buildSign\(\{([^}]*)\}\)/g)];
  assert.equal(calls.length, 1, "one buildSign call, in the boards' loop");
  assert.match(calls[0][1], /text: title/);
  assert.match(src, /const title = section\(id\)\.title;/);
  assert.match(calls[0][1], /kind: "board"/);
  // no words drawn here
  assert.doesNotMatch(src, /fillText|strokeText/);
  for (const m of src.matchAll(/buildMarkSign\(\{([^}]*)\}\)/g)) assert.doesNotMatch(m[1], /text:/);
  // the face and its mount are named for visibility.mjs
  assert.match(src, /signFace\.name = `sign:\$\{b\.id\}`/);
  assert.match(src, /o\.name = `mount:\$\{b\.id\}`/);
});

test("every Hitbox navigates through cityPath", () => {
  const boxes = [...src.matchAll(/<Hitbox[\s\S]*?\/>/g)].map((m) => m[0]);
  assert.ok(boxes.length >= 1);
  for (const b of boxes) assert.match(b, /onSelect=\{\(\) => navigate\(cityPath\(s\.id\)\)\}/);
});

test("at most one planar reflection, and no spot light", async () => {
  const { DISTRICT_LIGHTS } = await import("../app/components/city3d/scenes.ts");
  assert.equal(DISTRICT_LIGHTS.lujiazui, 0);
  assert.doesNotMatch(src, /SpotLight|SceneLights|<spotLight|new THREE\.\w*Light\(/);
  assert.doesNotMatch(src, /new Reflector|buildReflection\(/);
  // the river is the one surface that may reflect; the promenade's paving is always the fake
  assert.equal([...src.matchAll(/buildRiver\(/g)].length, 1);
  for (const m of src.matchAll(/wetPaving\(\{([\s\S]*?)\}\);/g)) assert.match(m[1], /mode: "fake"/);
});

test("the composition is data in the riverside's def, not numbers in the scene", async () => {
  const { RIVERSIDE } = await import("../app/components/city3d/districts/lujiazui.def.ts");
  assert.match(src, /import lujiazui, \{ RIVERSIDE \} from "\.\/districts\/lujiazui\.def";/);
  for (const k of ["water", "landing", "landmarks", "skyline", "neon", "boat"]) assert.ok(RIVERSIDE[k], k);
  // the landmarks' places are the def's
  assert.doesNotMatch(src, /buildPearlTower, -?\d/);
  // movers are the kit's, run by useMovers
  assert.match(src, /useMovers\(built\.movers, \{ active, still \}\)/);
});
