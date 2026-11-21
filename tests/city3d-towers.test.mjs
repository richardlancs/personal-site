// Projects, the walkway ring under the supertalls (districts/towers.tsx,
// towers.def.ts; plan Tasks 4–9): its two paintings on the plate, its data
// sound (scenes.ts: checkPlace), its home view the painting's frame, a
// tile on the painted right screen for every project (the spots
// "screen-<n>", each the panel's focus key, a click choosing its project),
// the pan to the wall inside the painting on wide screens, the screenshots
// loaded only while the place shows, and the only words its titles.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

const root = new URL("../", import.meta.url).pathname;
const read = (path) => readFileSync(`${root}${path}`, "utf8");
const noComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
const src = noComments(read("app/components/city3d/districts/towers.tsx"));
const defSrc = noComments(read("app/components/city3d/districts/towers.def.ts"));
const { default: def, WALL, wallPoint } = await import("../app/components/city3d/districts/towers.def.ts");
const { scenes, checkPlace, isPlace } = await import("../app/components/city3d/scenes.ts");
const { projects } = await import("../app/data/portfolio.ts");

const insideQuad = ([u, v], q) => {
  let inside = false;
  for (let i = 0, j = q.length - 1; i < q.length; j = i++) {
    const [xi, yi] = q[i], [xj, yj] = q[j];
    if (yi > v !== yj > v && u < ((xj - xi) * (v - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};

test("it is a painted place whose data is sound", () => {
  assert.equal(scenes.towers, def);
  assert.ok(isPlace(def));
  assert.deepEqual(checkPlace(def), []);
  assert.equal(def.plate.painting, "towers");
  assert.equal(def.plate.aspect, 2400 / 1032);
  for (const kind of ["day", "night"]) assert.ok(existsSync(`${root}app/assets/city/towers-${kind}.webp`), kind);
  for (const kind of ["light", "sky"]) assert.ok(existsSync(`${root}app/assets/city/masks/towers-${kind}.webp`), kind);
  assert.match(read("app/components/city3d/kit/plateArt.ts"), /towers/);
  assert.doesNotMatch(defSrc, /from "three"/);
});

test("its home view is the painting's frame, on the right of wide screens, its sign kept; arriving steps in, never back", () => {
  assert.deepEqual(def.home.pos, def.plateFrame.pos);
  assert.deepEqual(def.home.target, def.plateFrame.target);
  assert.equal(def.fov, def.plateFrame.fov);
  assert.equal(def.span, undefined, "a wider lens only grows the plate");
  assert.equal(def.frame, "right");
  assert.ok(def.sign && Number.isFinite(def.sign.bearing));
  const to = (p) => Math.hypot(...p.map((x, i) => def.home.target[i] - x));
  for (const pose of [def.enter, def.exit]) {
    assert.deepEqual(pose.target, def.home.target);
    assert.ok(to(pose.pos) < to(def.home.pos) && to(pose.pos) > 0.9 * to(def.home.pos));
  }
});

test("a tile on the painted right screen for every project: spots screen-<n>, the panel's focus keys", () => {
  assert.ok(projects.length <= WALL.tiles.length, "a tile for every project");
  const keys = projects.map((_, n) => `screen-${n}`);
  for (const k of keys) {
    assert.ok(k in def.focus, `focus ${k}`);
    assert.ok(k in def.plate.spots, `spot ${k}`);
  }
  // every tile's corners lie on the screen's face, at the podium's depth
  const face = WALL.screen;
  for (const k of keys) for (const [u, v, d] of def.plate.spots[k]) {
    assert.ok(insideQuad([u, v], face), `${k} corner ${u},${v} on the screen`);
    assert.equal(d, WALL.depth);
  }
  // the corners of the face are its own
  assert.deepEqual(wallPoint(0, 0), face[0]);
  assert.deepEqual(wallPoint(1, 1), face[2]);
  // tiles don't overlap (in the screen's own measure)
  const boxes = WALL.tiles.map(({ s, t }) => [s, t, s + WALL.tileW, t + WALL.tileH]);
  for (let a = 0; a < boxes.length; a++)
    for (let b = a + 1; b < boxes.length; b++) {
      const [A, B] = [boxes[a], boxes[b]];
      assert.ok(A[2] <= B[0] || B[2] <= A[0] || A[3] <= B[1] || B[3] <= A[1], `tiles ${a} and ${b} overlap`);
    }
  for (const [s0, t0, s1, t1] of boxes) assert.ok(s0 >= 0 && t0 >= 0 && s1 <= 1 && t1 <= 1);
});

test("the pan to the wall: straight ahead, no step in or out, no turn, and inside the painting on 16:9 and 16:10 screens", () => {
  const rad = (d) => (d * Math.PI) / 180;
  const D = Math.hypot(...def.home.target.map((x, i) => x - def.home.pos[i]));
  const H = 2 * D * Math.tan(rad(def.plateFrame.fov / 2));
  const W = H * def.plate.aspect;
  for (const [key, pose] of Object.entries(def.focus)) {
    const d = pose.pos.map((x, i) => x - def.home.pos[i]);
    assert.deepEqual(pose.target.map((x, i) => x - d[i]), def.home.target, `${key}: looks straight ahead`);
    assert.equal(d[1], 0, `${key}: no rise`);
    assert.equal(d[2], 0, `${key}: no step in or out`);
    const pan = d[0] / W;
    // the plate's cover (from the home pose) leaves the painting's left
    // edge at the screen's left on wide screens: what a screen of aspect A
    // shows is A / aspect of the painting's width (the cover's 1.1 %
    // margin over that is the drift's room)
    for (const A of [16 / 10, 16 / 9]) assert.ok(pan + A / def.plate.aspect <= 1, `${key} at ${A.toFixed(2)}: past the painting's edge`);
    // and at 1440 × 900 the wall's right edge comes into view
    assert.ok(pan + 1.6 / def.plate.aspect >= Math.max(...WALL.screen.map((p) => p[0])) - 0.002, `${key}: the wall in view at 16:10`);
  }
});

test("the drift is gentle, the beacons swell slowly, the movers stay in the painting's sky", () => {
  assert.ok(def.plate.drift.amplitude > 0);
  for (const m of def.plate.movers) {
    if (m.kind === "beacon") assert.ok(m.period >= 2);
    for (const [u, v] of m.path) assert.ok(u >= 0 && u <= 1 && v >= 0 && v <= 0.3, `${m.kind} at ${u},${v}`);
  }
});

test("clicking a tile chooses its project, as the panel's keys do; the place is a thin PlatePlace", () => {
  assert.match(src, /<PlatePlace \{\.\.\.props\} id="towers" def=\{towers\} onSpot=\{chooseTile\}>/);
  assert.match(src, /world\.select\("project", n\);\s*world\.set\(\{ focus: `screen-\$\{n\}` \}\);/);
  assert.doesNotMatch(src, /<Hitbox|new THREE\.\w*Light\(|useFrame|setInterval|Math\.random/);
});

test("nothing is imported from another scene", () => {
  const imports = [...src.matchAll(/from "([^"]+)"/g)].map((m) => m[1]);
  for (const path of imports) {
    assert.doesNotMatch(path, /Riverside|placeholder|districts\/(?!towers)|\.\/(longtang|metro|nanjing-road|bund|lujiazui)/, path);
    assert.ok(/^(react|three|@react-three\/fiber|\.\.\/|\.\/towers\.def)/.test(path), path);
  }
});

test("the only words drawn are each project's title from portfolio.ts", () => {
  assert.match(src, /import \{ projects \} from "\.\.\/\.\.\/\.\.\/data\/portfolio";/);
  const drawn = [...src.matchAll(/fillText\(([^,]+),/g)].map((m) => m[1].trim());
  assert.ok(drawn.length >= 1);
  for (const d of drawn) assert.equal(d, "title");
  assert.match(src, /const title = projects\[n\]\.title;/);
  assert.doesNotMatch(src, /strokeText/);
  assert.doesNotMatch(read("app/components/city3d/districts/towers.tsx") + read("app/components/city3d/districts/towers.def.ts"), /[぀-ヿ㐀-鿿豈-﫿]/);
});

test("each tile shows its project's cover screenshot, a file in public/, loaded only while the place shows; the wall let go when it's left", () => {
  assert.match(src, /p\.screenshots\?\.\[p\.cover \?\? 0\]/);
  for (const p of projects) {
    const shot = p.screenshots?.[p.cover ?? 0];
    if (shot) assert.ok(existsSync(`${root}public${shot.src}`), shot.src);
  }
  assert.match(src, /if \(!built \|\| !active \|\| !shotsFit\(quality\)\) return;/);
  assert.match(src, /img\.src = s\.src;/);
  assert.match(src, /shots\[n\] = null;/);
  assert.match(src, /screenMaterial\(paintWall, \{ w, h, key: `towers:wall:\$\{w\}` \}\)/);
  assert.match(src, /if \(!active\) \{\s*built\.material\.userData\.release\?\.\(\);/);
  assert.match(src, /built\.material\.userData\.restore\?\.\(\);/);
  // the wall on the spot's quad (the kit's spotGeometry), inside the plate
  assert.match(src, /spotGeometry\(ctx\.def, ctx\.plate\.frame, WALL_QUAD/);
});
