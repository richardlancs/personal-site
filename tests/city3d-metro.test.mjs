// Experience's place (districts/metro.tsx, metro.def.ts): a painted place
// (scenes.ts: PlaceDef, checkPlace) whose departures board shows the
// experience entries, from app/data/portfolio.ts, the only words it draws
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const root = new URL("../", import.meta.url).pathname;
const read = (path) => readFileSync(`${root}${path}`, "utf8");
const noComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
const src = noComments(read("app/components/city3d/districts/metro.tsx"));
const defSrc = noComments(read("app/components/city3d/districts/metro.def.ts"));

test("the def is a sound painted place on the metro painting", async () => {
  const { scenes, isPlace, checkPlace } = await import("../app/components/city3d/scenes.ts");
  const def = scenes.metro;
  assert.ok(isPlace(def));
  assert.deepEqual(checkPlace(def), []);
  assert.equal(def.plate.painting, "metro");
  assert.equal(def.plate.aspect, 2400 / 1032);
  // the home view is the painting's pose and lens
  assert.deepEqual(def.home.pos, def.plateFrame.pos);
  assert.deepEqual(def.home.target, def.plateFrame.target);
  assert.equal(def.fov, def.plateFrame.fov);
  // (the riverside's signs went with the code-built Home)
  assert.ok(!("sign" in def));
  assert.doesNotMatch(defSrc, /from "three"|portfolio/);
});

test("every line on the board is a focus key with its spot, one per painted row, on the painted board", async () => {
  const { scenes } = await import("../app/components/city3d/scenes.ts");
  const { METRO } = await import("../app/components/city3d/districts/metro.def.ts");
  const { experience } = await import("../app/data/portfolio.ts");
  const def = scenes.metro;
  assert.ok(experience.length <= METRO.rows, `the painting's board has ${METRO.rows} rows for ${experience.length} entries`);
  const keys = Array.from({ length: METRO.rows }, (_, i) => `line-${i}`);
  assert.deepEqual(Object.keys(def.focus).sort(), keys);
  assert.deepEqual(Object.keys(def.plate.spots).sort(), keys);
  const b = METRO.board;
  let v = b.v0;
  for (const key of keys) {
    const q = def.plate.spots[key];
    for (const [u, , d] of q) {
      assert.ok(u >= b.u0 && u <= b.u1, key);
      assert.equal(d, b.depth);
    }
    // the rows stack down the board without gaps
    assert.ok(Math.abs(q[0][1] - v) < 1e-9, key);
    v = q[3][1];
  }
  assert.ok(Math.abs(v - b.v1) < 1e-9);
  // the board's layer stands out as far as its spots, and holds them with a margin
  const layer = def.plate.depth.layers.find((l) => l.z === b.depth);
  assert.ok(layer);
  const us = layer.mask.map((p) => p[0]), vs = layer.mask.map((p) => p[1]);
  assert.ok(Math.min(...us) < b.u0 - 0.005 && Math.max(...us) > b.u1 + 0.005);
  assert.ok(Math.min(...vs) < b.v0 - 0.005 && Math.max(...vs) > b.v1 + 0.005);
  // the rain keeps out from under the canopy
  assert.equal(def.shelter, METRO.shelter);
});

test("it lives calmly: water-free regions, traffic, a far train, beacons that swell, nothing fast", async () => {
  const { scenes, driftTravel } = await import("../app/components/city3d/scenes.ts");
  const p = scenes.metro.plate;
  const kinds = new Set(p.regions.map((r) => r.kind));
  for (const k of ["sky", "glass", "wet"]) assert.ok(kinds.has(k), k);
  assert.ok(driftTravel(p.drift) < 0.01);
  const movers = p.movers;
  assert.ok(movers.filter((m) => m.kind === "trail").length >= 2);
  assert.ok(movers.some((m) => m.kind === "boat" && (m.count ?? 1) > 4 && m.period >= 60), "the far train");
  for (const m of movers.filter((m) => m.kind === "beacon")) assert.ok(m.period >= 4);
  for (const m of movers) if (m.kind !== "beacon") assert.ok(m.period >= 20, "nothing hurries");
});

test("the component is a thin PlatePlace wrapper; the board is drawn on its spot; nothing random", () => {
  assert.match(src, /<PlatePlace \{\.\.\.props\} id="metro" def=\{metro\} onSpot=/);
  assert.match(src, /spotGeometry\(ctx\.def, ctx\.plate\.frame, quad, 4\)/);
  assert.match(src, /screenMaterial\(drawBoard,/);
  assert.doesNotMatch(src, /Math\.random|useFrame|new THREE\.\w*Light\(|<SceneLights|new THREE\.\w*Material\(/);
  const imports = [...src.matchAll(/from "([^"]+)"/g)].map((m) => m[1]);
  const allowed = /^(three|react|@react-three\/fiber|\.\.\/kit\/[\w-]+|\.\.\/common|\.\.\/store|\.\.\/tiers|\.\.\/scenes|\.\.\/PlatePlace|\.\/metro\.def|\.\.\/\.\.\/\.\.\/data\/portfolio|\.\.\/\.\.\/\.\.\/lib\/experience)$/;
  for (const i of imports) assert.match(i, allowed, i);
  assert.match(src, /function ExperienceScene\(/);
  assert.match(src, /export default ExperienceScene;/);
});

test("the only words drawn are the experience entries", () => {
  assert.match(src, /import \{ experience \} from "\.\.\/\.\.\/\.\.\/data\/portfolio";/);
  assert.match(src, /const LINES = sortNewestFirst\(experience\);/);
  const texts = [...src.matchAll(/fillText\(([^,]+),/g)].map((m) => m[1].trim());
  assert.deepEqual(texts, ["text[i]"]);
  const flaps = [...src.matchAll(/flaps\(g, ([^,]+(?:\([^)]*\))?[^,]*),/g)].map((m) => m[1].trim());
  assert.deepEqual(flaps, ["e.role", "`${e.organization} · ${dates(e)}`"]);
  assert.doesNotMatch(read("app/components/city3d/districts/metro.tsx") + read("app/components/city3d/districts/metro.def.ts"), /[　-鿿]|Lujiazui|Longtang|Century Avenue|Line 2|Nanjing Road|The Bund/);
});

test("a row of the board chooses its line, as the panel's keys do, and the board shows the chosen one", () => {
  assert.match(src, /onSpot=\{\(key\) => choose\(Number\(key\.slice\("line-"\.length\)\)\)\}/);
  assert.match(src, /world\.select\("line", line\);\s*world\.set\(\{ focus: `line-\$\{line\}` \}\);/);
  assert.match(src, /useWorld\(\(s\) => s\.sel\.line\)/);
});
