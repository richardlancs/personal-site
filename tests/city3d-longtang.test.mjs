// About, the lane, as a painted place (districts/longtang.tsx wraps
// PlatePlace; its data is districts/longtang.def.ts): the def is sound by
// checkPlace, every spot and light lies on the painting where the paint
// is, the depth is a corridor (near walls and paving come out, the sky
// and skyline stay back), the movers are slow and night-only, and the
// component is a thin wrapper with nothing to choose.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const root = new URL("../", import.meta.url).pathname;
const read = (path) => readFileSync(`${root}${path}`, "utf8");
const noComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
const src = noComments(read("app/components/city3d/districts/longtang.tsx"));
const defSrc = noComments(read("app/components/city3d/districts/longtang.def.ts"));

const { scenes, isPlace, checkPlace, driftTravel } = await import("../app/components/city3d/scenes.ts");
const { laneDepth } = await import("../app/components/city3d/districts/longtang.def.ts");
const def = scenes.longtang;

test("the def is a painted place, and sound", () => {
  assert.ok(isPlace(def), "a plate");
  assert.deepEqual(checkPlace(def), []);
  assert.equal(def.plate.painting, "longtang");
  assert.equal(def.plate.aspect, 2400 / 1032, "the paintings' shape");
  assert.ok(driftTravel(def.plate.drift) < 0.01, "drift under 1% in 10 s");
  assert.doesNotMatch(defSrc, /from "three"/, "no three.js in the def");
});

test("its painting and masks are in the art list", () => {
  const art = read("app/components/city3d/kit/plateArt.ts");
  for (const f of ["longtang-day.webp", "longtang-night.webp", "masks/longtang-light.webp"]) assert.match(art, new RegExp(f.replace(".", "\\.")), f);
});

test("home is the painting's frame; the arrival comes from in front of it, never behind", () => {
  assert.deepEqual(def.home.pos, def.plateFrame.pos);
  assert.deepEqual(def.home.target, def.plateFrame.target);
  assert.equal(def.fov, def.plateFrame.fov);
  // the view's direction, and how far along it enter stands from home
  const d = def.home.target.map((t, i) => t - def.home.pos[i]);
  const len = Math.hypot(...d);
  const along = def.enter.pos.reduce((a, p, i) => a + (p - def.home.pos[i]) * d[i], 0) / len;
  assert.ok(along > 0 && along < 0.06 * len, `enter ${along.toFixed(3)} ahead of home`);
  for (const p of [def.enter.pos, def.enter.target, def.exit.pos, def.exit.target]) assert.ok(p.every(Number.isFinite));
});

test("About has no picker: no focus keys; spots are anchors (no onSpot)", () => {
  assert.deepEqual(def.focus, {});
  assert.doesNotMatch(src, /onSpot|world\.set/);
  for (const key of ["window", "window-low", "lantern", "lane-end"]) assert.ok(key in def.plate.spots, key);
});

test("no riverside sign: Home's spot for About is Home's own data (lujiazui.def.ts)", () => {
  assert.ok(!("sign" in def));
});

test("the depth is a corridor: walls and paving come out, nearer toward the frame's edges; the sky stays back", () => {
  // the sky between the roofs, the far skyline, and the lane's far end
  assert.equal(laneDepth(0.55, 0.05), 0);
  assert.equal(laneDepth(0.646, 0.1), 0);
  assert.ok(laneDepth(0.54, 0.6) < 0.05, "the far gate");
  // the near walls and paving
  assert.ok(laneDepth(0.02, 0.5) > 0.6, "the near left wall");
  assert.ok(laneDepth(0.98, 0.5) > 0.6, "the near right wall");
  assert.ok(laneDepth(0.54, 0.98) > 0.4, "the paving at the foot");
  // nearer as it comes toward the edges, down the lane
  let last = -1;
  for (const u of [0.5, 0.45, 0.4, 0.3, 0.2, 0.1, 0]) {
    const d = laneDepth(u, 0.6);
    assert.ok(d >= last, `left wall at u ${u}`);
    last = d;
  }
  // the layers say the same, at steps of 0.025 or less, each within the
  // engine's range
  const layers = def.plate.depth.layers;
  assert.ok(layers.length > 20);
  const zs = [...new Set(layers.map((l) => l.z))].sort((a, b) => a - b);
  for (let i = 1; i < zs.length; i++) assert.ok(zs[i] - zs[i - 1] <= 0.0251, "steps of 0.025");
  assert.ok(zs.every((z) => z > 0 && z <= 0.7));
  // later (nearer) layers over earlier ones
  for (let i = 1; i < layers.length; i++) assert.ok(layers[i].z >= layers[i - 1].z);
});

test("spots sit at the depth of the paint under them", () => {
  for (const [key, quad] of Object.entries(def.plate.spots)) {
    const u = quad.reduce((a, c) => a + c[0], 0) / 4, v = quad.reduce((a, c) => a + c[1], 0) / 4;
    for (const c of quad) assert.equal(c[2], laneDepth(u, v), key);
    // inside the painting and not in its dark foot (v > 0.93)
    assert.ok(quad.every((c) => c[1] < 0.93), key);
  }
});

test("regions: sky, glass, wet paving, no water", () => {
  const kinds = def.plate.regions.map((r) => r.kind).sort();
  assert.deepEqual([...new Set(kinds)], ["glass", "sky", "wet"]);
  const sky = def.plate.regions.find((r) => r.kind === "sky");
  assert.ok(sky.poly.every(([, v]) => v <= 0.34), "the sky stays above the roofs");
  const wet = def.plate.regions.find((r) => r.kind === "wet");
  assert.ok(wet.poly.every(([, v]) => v >= 0.65), "the paving starts at the lane's far end");
});

test("movers: calm, after dark, on the skyline; no blinking, nothing fast", () => {
  const movers = def.plate.movers;
  assert.ok(movers.length >= 2);
  for (const m of movers) {
    assert.notEqual(m.night, false, "night only");
    if (m.kind === "beacon") assert.ok(m.period === 0 || m.period >= 4, "a slow swell");
    else assert.ok(m.period >= 60, "slow across the sky");
    // on the skyline, in the sky's strip (above the roofs, between them)
    for (const [u, v] of m.path) assert.ok(u > 0.45 && u < 0.71 && v < 0.2, `${m.kind} at ${u}, ${v}`);
  }
  assert.ok(!movers.some((m) => m.kind === "trail"), "no traffic in the lane");
});

test("the component is a thin PlatePlace wrapper, named for its section", () => {
  assert.match(src, /function AboutScene\(/);
  assert.match(src, /export default AboutScene;/);
  assert.match(src, /<PlatePlace \{\.\.\.props\} id="longtang" def=\{longtang\} \/>/);
  for (const m of src.matchAll(/from "([^"]+)"/g)) assert.ok(["../common", "../PlatePlace", "./longtang.def"].includes(m[1]), `import from ${m[1]}`);
  assert.doesNotMatch(src + defSrc, /Math\.random|useFrame|new THREE/);
  assert.doesNotMatch(src + defSrc, /[぀-ヿ㐀-鿿]/, "no Chinese or Japanese characters");
});
