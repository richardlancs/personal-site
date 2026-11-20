// Projects' place (districts/towers.tsx, Task 13): its poses, its two spot
// lights and no other, nothing moving, nothing from another scene, and the
// only words drawn are the projects' titles from portfolio.ts, on screens
// showing each project's cover screenshot.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

const root = new URL("../", import.meta.url).pathname;
const read = (path) => readFileSync(`${root}${path}`, "utf8");
const noComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
const src = noComments(read("app/components/city3d/districts/towers.tsx"));
const defSrc = noComments(read("app/components/city3d/districts/towers.def.ts"));

test("the def has a plate frame and one focus pose per project, each looking at its screen", async () => {
  const { default: towers, TOWERS, screenMiddle } = await import("../app/components/city3d/districts/towers.def.ts");
  const { projects } = await import("../app/data/portfolio.ts");
  assert.ok(towers.plateFrame && towers.plateFrame.fov > 0 && towers.plateFrame.pos.length === 3 && towers.plateFrame.target.length === 3);
  assert.ok(projects.length <= TOWERS.screens.az.length, "a screen for every project");
  assert.deepEqual(Object.keys(towers.focus), TOWERS.screens.az.map((_, n) => `screen-${n}`));
  for (let n = 0; n < projects.length; n++) {
    const pose = towers.focus[`screen-${n}`];
    assert.deepEqual(pose.target, screenMiddle(n));
    // inside the plaza, below the ring's deck height plus a little
    assert.ok(Math.hypot(pose.pos[0], pose.pos[2]) < TOWERS.ring.r, `screen-${n}: from inside the ring`);
  }
  // the home eye stands inside the ring, under its deck
  const [x, y, z] = towers.home.pos;
  assert.ok(Math.hypot(x, z) < TOWERS.ring.r - TOWERS.ring.width / 2 && y < TOWERS.ring.deck);
  assert.doesNotMatch(defSrc, /from "three"/);
});

test("exactly DISTRICT_LIGHTS.towers spot lights, through SceneLights, and no other light", async () => {
  const { DISTRICT_LIGHTS } = await import("../app/components/city3d/scenes.ts");
  const { TOWERS } = await import("../app/components/city3d/districts/towers.def.ts");
  assert.equal(TOWERS.spots.length, DISTRICT_LIGHTS.towers);
  const uses = [...src.matchAll(/<SceneLights([^>]*)\/>/g)];
  assert.equal(uses.length, 1);
  assert.match(uses[0][1], /id="towers"/);
  assert.match(uses[0][1], /spots=\{SPOTS\}/);
  assert.match(src, /const SPOTS: V3\[\] = T\.spots\.map\(/);
  assert.doesNotMatch(src, /new THREE\.\w*Light\(|<\w*[lL]ight[\s/>]|<primitive object=\{[^}]*light/i);
});

test("nothing moves on its own: no movers, no frame loop, no randomness", () => {
  assert.doesNotMatch(src, /useFrame|useMovers|requestAnimationFrame|setInterval|Math\.random/);
  // any mover would have to be the kit's
  assert.doesNotMatch(src, /type Mover\b(?![^;]*from "\.\.\/common")/);
});

test("nothing is imported from another scene", () => {
  const imports = [...src.matchAll(/from "([^"]+)"/g)].map((m) => m[1]);
  for (const path of imports) {
    assert.doesNotMatch(path, /Riverside|placeholder|districts\/(?!towers)|\.\/(longtang|metro|nanjing-road|bund|lujiazui)/, path);
    assert.ok(/^(react|three|@react-three\/fiber|\.\.\/|\.\/towers\.def)/.test(path), path);
  }
});

test("the only words drawn are each project's title from portfolio.ts; no sign carries words", () => {
  assert.match(src, /import \{ projects \} from "\.\.\/\.\.\/\.\.\/data\/portfolio";/);
  const drawn = [...src.matchAll(/fillText\(([^,]+),/g)].map((m) => m[1].trim());
  assert.ok(drawn.length >= 1);
  for (const d of drawn) assert.equal(d, "title");
  assert.match(src, /const title = projects\[n\]\.title;/);
  assert.doesNotMatch(src, /strokeText|buildSign\(/);
  for (const m of src.matchAll(/buildMarkSign\(\{([^}]*)\}\)/g)) assert.doesNotMatch(m[1], /text:/);
  assert.doesNotMatch(read("app/components/city3d/districts/towers.tsx") + read("app/components/city3d/districts/towers.def.ts"), /[぀-ヿ㐀-鿿豈-﫿]/);
});

test("each screen shows its project's cover screenshot, a file in public/, loaded only while the place shows", async () => {
  const { projects } = await import("../app/data/portfolio.ts");
  assert.match(src, /p\.screenshots\?\.\[p\.cover \?\? 0\]/);
  for (const p of projects) {
    const shot = p.screenshots?.[p.cover ?? 0];
    if (shot) assert.ok(existsSync(`${root}public${shot.src}`), shot.src);
  }
  // fetched in an effect gated on `active`, let go in its cleanup
  assert.match(src, /if \(!active \|\| !shotsFit\(quality\)\) return;/);
  assert.match(src, /img\.src = s\.src;/);
  assert.match(src, /shots\[n\] = null;/);
  // the screens' faces are the kit's screenMaterial
  assert.match(src, /screenMaterial\(paintScreen\(n\)/);
});

test("clicking a screen chooses its project, as the panel's keys do", () => {
  const boxes = [...src.matchAll(/<Hitbox[\s\S]*?\/>/g)].map((m) => m[0]);
  assert.equal(boxes.length, 1);
  assert.match(boxes[0], /world\.select\("project", n\)/);
  assert.match(boxes[0], /world\.set\(\{ focus: `screen-\$\{n\}` \}\)/);
  assert.match(src, /anchors\.set\(anchorKey\("towers", `screen-\$\{n\}`\)/);
});
