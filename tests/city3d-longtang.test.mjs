// About, the lane (districts/longtang.tsx, Task 16): framed like its
// paintings (plateFrame), exactly its two spot lights through SceneLights
// and no other light, nothing that moves, nothing from another scene, no
// words, and its decorative signs mark signs. Its composition is data in
// districts/longtang.def.ts (LANE).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const root = new URL("../", import.meta.url).pathname;
const read = (path) => readFileSync(`${root}${path}`, "utf8");
const noComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
const src = noComments(read("app/components/city3d/districts/longtang.tsx"));
const def = noComments(read("app/components/city3d/districts/longtang.def.ts"));

test("the def has a plateFrame, its poses, its riverside sign, and no three.js", async () => {
  const { scenes, DISTRICT_LIGHTS } = await import("../app/components/city3d/scenes.ts");
  const d = scenes.longtang;
  assert.ok(d.plateFrame && Number.isFinite(d.plateFrame.fov), "plateFrame");
  for (const p of [d.plateFrame.pos, d.plateFrame.target, d.home.pos, d.home.target, d.enter.pos, d.exit.pos]) assert.ok(p.every(Number.isFinite));
  // the riverside's board for About stays where visibility.mjs checked it
  assert.deepEqual(d.sign, { bearing: -17.6, distance: 17.4, y: 1.15 });
  assert.deepEqual(d.focus, {}, "About has no picker");
  assert.equal(DISTRICT_LIGHTS.longtang, 2);
  assert.doesNotMatch(def, /from "three"/);
  const { LANE } = await import("../app/components/city3d/districts/longtang.def.ts");
  // two lanterns hold the spot lights; the others are lit surfaces
  assert.ok(LANE.lanterns.length >= 2);
  // the Pearl and Shanghai Tower at the lane's far end, beyond it
  assert.ok(LANE.landmarks.pearl[1] < LANE.end * LANE.scale && LANE.landmarks.shanghaiTower[1] < LANE.end * LANE.scale);
});

test("a default export named for its section", () => {
  assert.match(src, /function AboutScene\(/);
  assert.match(src, /export default AboutScene;/);
});

test("exactly DISTRICT_LIGHTS.longtang spot lights, through SceneLights, and no other light", () => {
  const uses = [...src.matchAll(/<SceneLights\b[^>]*\/>/g)];
  assert.equal(uses.length, 1);
  assert.match(uses[0][0], /id="longtang"/);
  assert.match(uses[0][0], /spots=\{built\.spots\}/);
  // the spots are the first two lanterns
  assert.match(src, /if \(i < 2\) spots\.push\(/);
  assert.doesNotMatch(src, /new THREE\.\w*Light\(/);
  assert.doesNotMatch(src, /<\w*[lL]ight[\s/>]/);
  assert.doesNotMatch(src, /light: "spot"/);
});

test("nothing moves: no movers, no frame loop, no clock", () => {
  assert.doesNotMatch(src, /useMovers|useFrame|buildTrain|buildBoat|aircraftLights|performance\.now|Date\.now/);
  assert.doesNotMatch(src, /Math\.random/);
});

test("built only from the kit: no materials of its own, nothing from another scene", () => {
  assert.doesNotMatch(src, /new THREE\.\w*Material\(/);
  for (const m of src.matchAll(/from "([^"]+)"/g)) {
    const from = m[1];
    assert.ok(
      from === "react" || from === "three" || from.startsWith("../kit/") || ["../common", "../rng", "../scenes", "../tiers", "./longtang.def"].includes(from),
      `import from ${from}`,
    );
  }
});

test("no words: no text drawn, no buildSign; every decorative sign a mark sign", () => {
  assert.doesNotMatch(src, /fillText|strokeText|buildSign\(|textPanel|textMask/);
  const marks = [...src.matchAll(/buildMarkSign\(\{([^}]*)\}\)/g)];
  assert.ok(marks.length >= 1);
  for (const m of marks) assert.doesNotMatch(m[1], /text:/);
  assert.doesNotMatch(src + def, /[぀-ヿ㐀-鿿]/, "no Chinese or Japanese characters");
});

test("scenery only: nothing to choose, no anchors", () => {
  assert.doesNotMatch(src, /<Hitbox|anchors\.set|navigate\(/);
});

test("one upstairs window lit gold", () => {
  assert.match(src, /lit: litSurface\(\{ color: C\.glass, tone: "gold"/);
  assert.equal([...src.matchAll(/\(lit \? parts\.lit : parts\.glass\)\.push/g)].length, 1);
  assert.match(src, /const lit = side < 0 && index === LANE\.litHouse && !litPlaced;/);
});

test("the kit's new pieces: brick relief instead of a painted map, the kit's paving, lanterns' and signs' pools, one side of the lane in shade by day, the sun on the right", () => {
  assert.match(src, /relief: \{ kind: "brick", course: 0\.075 \* K/);
  assert.doesNotMatch(src, /function brickTexture|function pavingTexture|new THREE\.CanvasTexture/);
  assert.match(src, /pavingTexture\(\{ seed: 911, kind: "slabs"/);
  assert.match(src, /useGlowPools\("longtang", built\.pools, active\)/);
  assert.match(src, /useDayShade\("longtang", SHADE, active\)/);
  assert.match(src, /kind: "edge"/);
  assert.match(src, /useDisposeOnUnmount\(built\)/);
});
