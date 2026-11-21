// Home's scene (Riverside.tsx): a thin wrapper round the plate
// (PlatePlace.tsx) with the rooftop's data (districts/lujiazui.def.ts),
// and the five sections' signs: the anchors "sign:<section>" the page lays
// its links over, a Hitbox to each section, and a board with each
// section's title, the only words in the scene.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const root = new URL("../", import.meta.url).pathname;
const read = (path) => readFileSync(`${root}${path}`, "utf8");
const noComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
const src = noComments(read("app/components/city3d/Riverside.tsx"));

test("Home is the plate with the rooftop's data; its spots navigate through cityPath, live only while the links stand over them", () => {
  assert.match(src, /import lujiazui, \{ groundDepth, HOME_SIGNS \} from "\.\/districts\/lujiazui\.def";/);
  assert.match(src, /<PlatePlace \{\.\.\.props\} id="lujiazui" def=\{lujiazui\} onSpot=\{\(key\) => navigate\(cityPath\(key as SectionId\)\)\} spotEnabled=\{boardsLive\}>/);
  assert.match(src, /const boardsLive = \(\) => document\.documentElement\.dataset\.cityTags === "over";/);
  assert.match(read("app/components/city3d/sceneChunks.ts"), /import Riverside from "\.\/Riverside";/);
});

test("the anchors are exactly the five sections' signs and their edges, from their spots", async () => {
  const { HOME_SIGNS } = await import("../app/components/city3d/districts/lujiazui.def.ts");
  const m = src.match(/const SIGNED: Exclude<SectionId, "home">\[\] = \[([^\]]*)\];/);
  assert.ok(m);
  const signed = m[1].split(",").map((s) => s.trim().replace(/"/g, ""));
  assert.deepEqual([...signed].sort(), ["about", "contact", "experience", "interests", "projects"]);
  // left to right across the painting (by their middles)
  const mid = signed.map((id) => HOME_SIGNS[id].spot.reduce((a, c) => a + c[0], 0) / 4);
  for (let i = 1; i < mid.length; i++) assert.ok(mid[i] > mid[i - 1], signed.join(", "));
  const keys = [...src.matchAll(/anchors\.set\(\s*([^,]+),/g)].map((x) => x[1].trim());
  assert.deepEqual(keys, ["`sign:${s.id}${k}`"]);
  for (const k of ['""', '":top"', '":foot"', '":left"', '":right"']) assert.ok(src.includes(`${k}: new THREE.Vector3(`), k);
  // the world points follow the plate's fit every frame
  assert.match(src, /context\.plate\.cover\(camera\);\s*context\.plate\.group\.updateMatrixWorld\(\);/);
});

test("each board says its section's title through buildSign; no other words, no materials of its own", () => {
  const calls = [...src.matchAll(/buildSign\(\{([^}]*)\}\)/g)];
  assert.equal(calls.length, 1, "one buildSign call, in the boards' loop");
  assert.match(calls[0][1], /text: title/);
  assert.match(calls[0][1], /kind: "board"/);
  assert.match(src, /const title = section\(id\)\.title;/);
  assert.doesNotMatch(src, /fillText|strokeText/);
  assert.doesNotMatch(src, /new THREE\.\w*Material\(|new THREE\.\w*Light\(/);
  // named for visibility.mjs: the face sign:<id>, the rest mount:<id>
  assert.match(src, /signFace\.name = `sign:\$\{id\}`/);
  assert.match(src, /o\.name = `mount:\$\{id\}`/);
  // let go only through useDisposeOnUnmount
  assert.match(src, /useDisposeOnUnmount\(built\);/);
  assert.doesNotMatch(src, /built\.dispose\(\)/);
});

test("the board stands in front of the nearest ground it covers, so the painting never hides it", () => {
  assert.match(src, /const depth = Math\.max\(s\.spot\[0\]\[2\], groundDepth\(s\.label\[1\]\)\) \+ LIFT;/);
});
