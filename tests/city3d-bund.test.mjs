// Contact, the promenade (districts/bund.tsx, Task 17): framed like its
// paintings, built only from the kit, exactly its four spot lights, its one
// mover a kit Mover, no words in the scene, nothing clickable, and the
// clock reading Richmond Hill's hour from the store.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const root = new URL("../", import.meta.url).pathname;
const read = (path) => readFileSync(`${root}${path}`, "utf8");
const noComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
const src = noComments(read("app/components/city3d/districts/bund.tsx"));
const def = await import("../app/components/city3d/districts/bund.def.ts");
const { scenes, DISTRICT_LIGHTS } = await import("../app/components/city3d/scenes.ts");

const deg = (r) => (r * 180) / Math.PI;
// Where a point (side, along) is from a pose: degrees right of where it looks
const bearingFrom = (pose, [s, a]) => {
  const [px, , pz] = pose.pos;
  const [tx, , tz] = pose.target;
  // the scene's x is -side, z is along (bund.tsx: X, Z)
  const look = Math.atan2(-(tx - px), tz - pz);
  return deg(Math.atan2(-(-s - px), a - pz) - look);
};

test("its def has the painting's frame, and the place's poses", () => {
  const b = scenes.bund;
  assert.equal(b, def.default);
  assert.ok(b.plateFrame && b.plateFrame.fov > 0, "plateFrame");
  for (const v of [...b.plateFrame.pos, ...b.plateFrame.target, ...b.home.pos, ...b.home.target]) assert.ok(Number.isFinite(v));
  assert.equal(b.frame, "right");
  assert.deepEqual(b.focus, {}, "Contact has no picker");
  assert.ok(b.sign && Number.isFinite(b.sign.bearing), "its sign on the riverside stays");
});

test("the painting's frame holds the clock tower left of the middle and the four landmarks right of it", () => {
  const { BUND } = def;
  const plate = scenes.bund.plateFrame;
  // the painting's aspect, 2400 × 1032
  const half = deg(Math.atan(Math.tan((plate.fov * Math.PI) / 360) * (2400 / 1032)));
  const clock = bearingFrom(plate, [BUND.front - BUND.clock.w / 2, BUND.clock.a]);
  assert.ok(clock < -5 && clock > -half, `clock tower at ${clock.toFixed(1)}°`);
  const marks = Object.values(BUND.landmarks).map((p) => bearingFrom(plate, p));
  for (const m of marks) assert.ok(m > 25 && m < half, `landmark at ${m.toFixed(1)}° (frame ±${half.toFixed(1)}°)`);
  // the Pearl first, left of the others, as in the paintings
  assert.ok(marks[0] < Math.min(...marks.slice(1)));
  // and the fog keeps clear of them
  for (const [s, a] of Object.values(BUND.landmarks)) assert.ok(Math.hypot(s, a) < scenes.bund.fog.keep.far * 0.6);
});

test("the home view keeps the clock tower and the Pearl in the half the panel leaves", () => {
  const { BUND } = def;
  const b = scenes.bund;
  const clock = bearingFrom(b.home, [BUND.front - BUND.clock.w / 2, BUND.clock.a]);
  const pearl = bearingFrom(b.home, BUND.landmarks.pearl);
  assert.ok(Math.abs(clock) <= b.span && Math.abs(pearl) <= b.span + 0.5, `clock ${clock.toFixed(1)}°, Pearl ${pearl.toFixed(1)}°, span ${b.span}`);
});

test("exactly its four spot lights, through SceneLights, and no other light", () => {
  assert.equal(DISTRICT_LIGHTS.bund, 4);
  assert.equal([...src.matchAll(/<SceneLights /g)].length, 1);
  assert.match(src, /<SceneLights id="bund" spots=\{built\.spots\} \/>/);
  // four of the lamps are the spot lamps; their heads are the spots
  assert.match(src, /buildLampRow\(lampSpots\.slice\(L\.spots, L\.spots \+ 4\), \{ light: "spot" \}\)/);
  assert.match(src, /const spots = lit\.heads\.map/);
  assert.ok(def.BUND.lamps.count >= def.BUND.lamps.spots + 4);
  // the spot lamps stand ahead of the painting's eye (along > 0)
  assert.ok(def.BUND.lamps.from + def.BUND.lamps.spots * def.BUND.lamps.step > 0);
  assert.doesNotMatch(src, /Light\(|<\w*[lL]ight[\s/>]/, "no light but SceneLights");
});

test("its one mover is the kit's ferry, run by useMovers", () => {
  assert.match(src, /import \{ aircraftLights, buildBoat \} from "\.\.\/kit\/movers";/);
  assert.match(src, /movers: \[boat\]/);
  assert.match(src, /const boat = buildBoat\(/);
  assert.match(src, /useMovers\(built\.movers, \{ active, still \}\)/);
  // the warning lights stand steady
  assert.match(src, /air\.park\(\);/);
  assert.doesNotMatch(src, /useFrame/);
});

test("built from the kit only: nothing from another scene, no material of its own, no randomness", () => {
  const imports = [...src.matchAll(/from "([^"]+)"/g)].map((m) => m[1]);
  const allowed = /^(react|three|@react-three\/fiber|\.\.\/kit\/\w+|\.\.\/common|\.\.\/rng|\.\.\/scenes|\.\.\/store|\.\.\/tiers|\.\/bund\.def)$/;
  for (const i of imports) assert.match(i, allowed, i);
  assert.doesNotMatch(src, /new THREE\.\w*Material\(/);
  assert.doesNotMatch(src, /Math\.random/);
});

test("no words in the scene, no clickable things", () => {
  // no sign with words, no text panel, nothing written on a canvas
  assert.doesNotMatch(src, /buildSign\(|textPanel|textMask|fillText|strokeText/);
  // decorative signs, if any, are mark signs
  for (const m of src.matchAll(/build(\w*)Sign\(/g)) assert.equal(m[1], "Mark");
  assert.doesNotMatch(src, /Hitbox|onClick|onPointer/);
  assert.doesNotMatch(src, /anchors\.set/);
});

test("the clock shows Richmond Hill's hour from the store, redrawn when the minute changes", () => {
  assert.match(src, /const hour = useWorld\(\(s\) => s\.hour\);/);
  assert.match(src, /screenMaterial\(paintClock, \{ w: 256, h: 256, key: "bund:clock" \}\)/);
  assert.match(src, /\(m\.userData\.redraw as \(\) => void\)\(\);/);
});
