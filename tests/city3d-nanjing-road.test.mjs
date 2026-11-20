// Interests: the pedestrian street (app/components/city3d/districts/nanjing-road.tsx)
// and its poses (nanjing-road.def.ts): framed like its paintings, built
// only from the kit, its three spot lights through SceneLights, the arcade
// machine's screen the one Hitbox, and no words but the interests' own.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const root = new URL("../", import.meta.url).pathname;
const read = (path) => readFileSync(`${root}${path}`, "utf8");
const noComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
const src = noComments(read("app/components/city3d/districts/nanjing-road.tsx"));
const machine = noComments(read("app/components/city3d/arcade/arcadeMachine.ts"));

test("the def has a plateFrame, a home view, the machine's focus pose and its riverside sign", async () => {
  const { scenes } = await import("../app/components/city3d/scenes.ts");
  const d = scenes["nanjing-road"];
  assert.ok(d.plateFrame && d.plateFrame.fov > 20 && d.plateFrame.pos.length === 3 && d.plateFrame.target.length === 3);
  assert.deepEqual(Object.keys(d.focus), ["machine"]);
  assert.equal(d.frame, "right");
  assert.deepEqual(d.sign, { bearing: 8.8, distance: 16.2, y: 1.1 }, "the riverside sign moves only with a visibility.mjs run");
  // the street's far end is inside the fog's far range, the landmarks visible past it
  assert.ok(d.fog.far > 220);
});

test("exactly DISTRICT_LIGHTS spot lights, through SceneLights, and no other light", async () => {
  const { DISTRICT_LIGHTS } = await import("../app/components/city3d/scenes.ts");
  assert.equal(DISTRICT_LIGHTS["nanjing-road"], 3);
  assert.match(src, /<SceneLights id="nanjing-road" spots=\{built\.spots\}/);
  // three spot lamps (their heads are the spots)
  assert.equal((src.match(/\{ x: LAMP_[LR], z: LAMPS_[LR]\[SPOT_[LR]( \+ 1)?\]/g) ?? []).length, 3);
  assert.doesNotMatch(src, /new THREE\.\w*Light\b|<\w*[lL]ight\b(?!s)/);
  assert.doesNotMatch(src, /<(pointLight|spotLight|ambientLight|hemisphereLight|directionalLight)/);
});

test("built only from the kit: no material made here, no Math.random, nothing from another scene", () => {
  assert.doesNotMatch(src, /new THREE\.\w*Material\b|<\w+Material\b/);
  assert.doesNotMatch(src, /Math\.random/);
  for (const m of src.matchAll(/from "([^"]+)"/g)) {
    const path = m[1];
    assert.ok(!/districts\/|\.\.\/Riverside|^\.\/(?!nanjing-road\.def)/.test(path), `imports ${path}`);
  }
  assert.doesNotMatch(machine, /new THREE\.\w*Material\b/);
});

test("anything that moves is a Mover run by useMovers; the tram is parked", () => {
  assert.match(src, /useMovers\(built\.movers, \{ active: on, still \}\)/);
  assert.match(src, /const screenMover: Mover = \{/);
  assert.doesNotMatch(src, /buildTrain|buildBoat|aircraftLights|useFrame/);
});

test("no words in the scene but the interests' own: decorative signs are mark signs; the machine draws only the data and its rules", () => {
  assert.doesNotMatch(src, /buildSign\(|fillText|strokeText/);
  const marks = [...src.matchAll(/buildMarkSign\(\{([^}]*)\}\)/g)];
  assert.ok(marks.length >= 1);
  for (const m of marks) assert.doesNotMatch(m[1], /text:/);
  assert.match(src, /createMachine\(interests\)/);
  assert.match(src, /import \{ interests \} from "\.\.\/\.\.\/\.\.\/data\/portfolio"/);
  // the machine: no place names, no CJK, no scanlines, the city's fonts
  assert.doesNotMatch(machine, /[぀-ヿ㐀-鿿]/);
  assert.doesNotMatch(machine, /[Ss]canline|INSERT COIN|Nanjing|Shanghai/);
  assert.match(machine, /fonts\(\)/);
});

test("the machine's screen is the one Hitbox: it plays, as the panel's Play key does", () => {
  const boxes = [...src.matchAll(/<Hitbox[\s\S]*?\/>/g)].map((m) => m[0]);
  assert.equal(boxes.length, 1);
  assert.match(boxes[0], /id="nanjing-road:machine"/);
  assert.match(boxes[0], /world\.set\(\{ focus: "machine" \}\)/);
  // a click aims: the Hitbox's hit point, scaled back to the screen's uv
  assert.match(boxes[0], /onSelect=\{\(hit\) =>/);
  assert.match(boxes[0], /play\(u >= 0 && u <= 1 && v >= 0 && v <= 1 \? new THREE\.Vector2\(u, v\) : null\)/);
  assert.match(src, /built\.machine\.press\(uv, t, s\)/);
  // the panel's presses and the chosen mode come from the store
  assert.match(src, /useWorld\(\(s\) => s\.arcadePress\)/);
  assert.match(src, /useWorld\(\(s\) => s\.sel\.interest\)/);
  assert.match(src, /world\.set\(\{ arcadeStatus: status \}\)/);
  // the anchor is named for the scene
  assert.match(src, /anchorKey\("nanjing-road", "machine"\)/);
});

test("the paving is planar on the high tier only (TIERS), and reflects what it should", () => {
  assert.match(src, /mode: TIERS\[quality\]\.reflection/);
  assert.match(src, /if \(TIERS\[quality\]\.reflection === "planar"\) reflectIn\(/);
});

test("the kit's new pieces: paving, stone relief on the arcade, planters, light pools; no attach workaround", () => {
  assert.match(src, /pavingTexture\(\{ seed: 1543, kind: "slabs"/);
  assert.match(src, /relief: \{ kind: "stone"/);
  assert.match(src, /buildPlanters\(/);
  assert.match(src, /useGlowPools\("nanjing-road", POOLS, active\)/);
  assert.match(src, /useDisposeOnUnmount\(built\)/);
  assert.doesNotMatch(src, /\battach\b/);
});

test("the tuning: carved, floodlit stone facades with windows lit by floors, glazed lit shopfronts, the day plate's sun and dapple", async () => {
  // the left side is the kit's surface with stone relief and a floodlight glow, not window-material towers
  assert.match(src, /"facades:stone"/);
  assert.match(src, /relief: \{ kind: "stone", bay: BAY, floor: FLOOR/);
  assert.match(src, /"windows:lit"/);
  assert.doesNotMatch(src, /buildTowers\(\[\.\.\.left/);
  // the shopfronts: kit glass over a lit room, their light spilling onto the paving
  assert.match(src, /glassMaterial\(\{ tint: "#55697a"/);
  assert.match(src, /"shops:sheen"/);
  assert.match(src, /useDayShade\("nanjing-road", SHADE, active\)/);
  const { scenes } = await import("../app/components/city3d/scenes.ts");
  assert.ok(scenes["nanjing-road"].sun[0] > 0, "the sun from the right, as the day plate");
});
