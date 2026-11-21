// Experience's place (districts/metro.tsx, Task 14): its def, its lights,
// its mover, what it may import, and the only words it draws (the
// experience entries, from app/data/portfolio.ts, on the departures board)
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const root = new URL("../", import.meta.url).pathname;
const read = (path) => readFileSync(`${root}${path}`, "utf8");
const noComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
const src = noComments(read("app/components/city3d/districts/metro.tsx"));
const defSrc = noComments(read("app/components/city3d/districts/metro.def.ts"));

test("the def has a plateFrame, a home view, and a focus pose for every line on the board", async () => {
  const { scenes, DISTRICT_LIGHTS } = await import("../app/components/city3d/scenes.ts");
  const { experience } = await import("../app/data/portfolio.ts");
  const def = scenes.metro;
  assert.ok(def.plateFrame && def.plateFrame.fov > 0 && def.plateFrame.pos.length === 3 && def.plateFrame.target.length === 3);
  for (let i = 0; i < experience.length; i++) assert.ok(def.focus[`line-${i}`], `line-${i}`);
  assert.equal(def.frame, "right");
  // the sign on the riverside is unchanged (visibility.mjs was run against it)
  assert.deepEqual(def.sign, { bearing: -8.8, distance: 16.2, y: 1.1 });
  const { METRO } = await import("../app/components/city3d/districts/metro.def.ts");
  assert.equal(METRO.spots.length, DISTRICT_LIGHTS.metro);
  assert.equal(METRO.train.dwell, 20);
  assert.equal(METRO.train.cycle, 60);
  assert.doesNotMatch(defSrc, /from "three"/);
});

test("exactly DISTRICT_LIGHTS.metro spot lights, through SceneLights, and no other light", () => {
  assert.match(src, /<SceneLights id="metro" spots=\{METRO\.spots\}/);
  assert.equal([...src.matchAll(/<SceneLights/g)].length, 1);
  assert.doesNotMatch(src, /new THREE\.\w*Light\(/);
  assert.doesNotMatch(src, /<\w*[lL]ight[\s/>]/);
  assert.doesNotMatch(src, /new THREE\.\w*Material\(/);
});

test("the train is the kit's mover, run by useMovers; nothing random", () => {
  assert.match(src, /import \{ buildTrain, trainLength \} from "\.\.\/kit\/movers";/);
  assert.match(src, /buildTrain\(/);
  assert.match(src, /useMovers\(built\.movers, \{ active, still \}\)/);
  assert.match(src, /park: \(\) => train\.park\(\)/);
  assert.doesNotMatch(src, /Math\.random|useFrame/);
});

test("it imports only the kit, the scene contract, the store and data, never another scene", () => {
  const imports = [...src.matchAll(/from "([^"]+)"/g)].map((m) => m[1]);
  const allowed = /^(three|react|@react-three\/fiber|\.\.\/kit\/[\w-]+|\.\.\/common|\.\.\/store|\.\.\/rng|\.\.\/tiers|\.\/metro\.def|\.\.\/\.\.\/\.\.\/data\/portfolio|\.\.\/\.\.\/\.\.\/lib\/experience)$/;
  for (const i of imports) assert.match(i, allowed, i);
  assert.doesNotMatch(src, /Riverside|districts\/(?!metro)|\.\/(longtang|towers|nanjing-road|bund|lujiazui)/);
  assert.match(src, /function ExperienceScene\(/);
  assert.match(src, /export default ExperienceScene;/);
});

test("the only words drawn are the experience entries; every other sign is a mark sign", () => {
  assert.match(src, /import \{ experience \} from "\.\.\/\.\.\/\.\.\/data\/portfolio";/);
  assert.match(src, /const LINES = sortNewestFirst\(experience\);/);
  const texts = [...src.matchAll(/fillText\(([^,]+),/g)].map((m) => m[1].trim());
  assert.deepEqual(texts, ["text[i]"]);
  const flaps = [...src.matchAll(/flaps\(g, ([^,]+(?:\([^)]*\))?[^,]*),/g)].map((m) => m[1].trim());
  assert.deepEqual(flaps, ["e.role", "`${e.organization} · ${dates(e)}`"]);
  assert.doesNotMatch(src, /buildSign\(/);
  for (const m of src.matchAll(/buildMarkSign\(\{([^}]*)\}\)/g)) assert.doesNotMatch(m[1], /text:/);
  // no place names, no line numbers, no CJK
  assert.doesNotMatch(read("app/components/city3d/districts/metro.tsx") + read("app/components/city3d/districts/metro.def.ts"), /[　-鿿]|Lujiazui|Longtang|Century Avenue|Line 2|Nanjing Road|The Bund/);
});

test("the board's rows are Hitboxes that choose a line, as the panel's keys do", () => {
  const boxes = [...src.matchAll(/<Hitbox[\s\S]*?\/>/g)].map((m) => m[0]);
  assert.equal(boxes.length, 1);
  assert.match(boxes[0], /onSelect=\{\(\) => choose\(r\.line\)\}/);
  assert.match(src, /world\.select\("line", line\);\s*world\.set\(\{ focus: `line-\$\{line\}` \}\);/);
  assert.match(src, /useWorld\(\(s\) => s\.sel\.line\)/);
});

test("the paving is fake on every tier", () => {
  assert.match(src, /wetPaving\(\{[^}]*mode: "fake"/);
  assert.doesNotMatch(src, /buildRiver|"planar"/);
});

test("the kit's new pieces: a glazed canopy, square tiles, planters, the lamps' pools down the platform, the canopy's stripes by day, the rain kept out", () => {
  assert.match(src, /glassMaterial\(\{ tint: "#2c4766"[^)]*double: true[^)]*\}\), "glass:canopy"/);
  assert.match(src, /pavingTexture\(\{ seed: 37, kind: "grid"/);
  assert.match(src, /buildPlanters\(/);
  assert.match(src, /useGlowPools\("metro", POOLS, active\)/);
  assert.match(src, /useDayShade\("metro", SHADE, active\)/);
  assert.match(src, /kind: "lattice"/);
  // the dry shine is the kit's polish on the paving (night only), no river streaks laid on it (I1)
  assert.match(src, /wetPaving\(\{[^}]*polish: 0\.\d+ \}\)/);
  assert.doesNotMatch(src, /buildStreaks\(|kind: "river"/);
  // the lamps' warmth right to the foreground: a line pool down the platform
  assert.match(src, /\{ from: \[LAMP_LINE, METRO\.deck \+ 0\.16, 2\.4\], to: \[LAMP_LINE, METRO\.deck \+ 0\.16, -12\.4\]/);
  assert.match(defSrc, /shelter: METRO\.shelter,/);
});

test("the train says when it rests (at its stop, and gone between trains), so the canvas can idle through the dwell", () => {
  assert.match(src, /resting\(t\) \{\s*const s = \(\(t % o\.cycle\) \+ o\.cycle\) % o\.cycle;\s*return \(s >= o\.arrive && s < o\.arrive \+ o\.dwell\) \|\| s >= o\.arrive \+ o\.dwell \+ o\.leave;/);
  const common = noComments(read("app/components/city3d/common.tsx"));
  assert.match(common, /resting\?\(t: number\): boolean/);
  assert.match(common, /if \(m\.resting\?\.\(t\)\) return false;/);
});
