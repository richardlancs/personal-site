// Contact, the promenade (districts/bund.tsx, bund.def.ts; plan Tasks 4–9):
// its two paintings on the plate, its data sound (scenes.ts: checkPlace),
// its home view the painting's frame, the clock spot on the painted clock
// face and the kit's clock on it telling Richmond Hill's hour, its living
// parts (river, wet paving, sky, glass) and its movers inside the
// painting, nothing clickable.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

const root = new URL("../", import.meta.url).pathname;
const read = (path) => readFileSync(`${root}${path}`, "utf8");
const noComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
const src = noComments(read("app/components/city3d/districts/bund.tsx"));
const def = (await import("../app/components/city3d/districts/bund.def.ts")).default;
const { scenes, checkPlace, isPlace } = await import("../app/components/city3d/scenes.ts");

const inside = ([u, v]) => u >= 0 && u <= 1 && v >= 0 && v <= 1;
const bounds = (pts) => {
  const us = pts.map((p) => p[0]), vs = pts.map((p) => p[1]);
  return { u0: Math.min(...us), u1: Math.max(...us), v0: Math.min(...vs), v1: Math.max(...vs) };
};

test("it is a painted place whose data is sound", () => {
  assert.equal(scenes.bund, def);
  assert.ok(isPlace(def));
  assert.deepEqual(checkPlace(def), []);
  assert.equal(def.plate.painting, "bund");
  assert.equal(def.plate.aspect, 2400 / 1032);
  for (const kind of ["day", "night"]) assert.ok(existsSync(`${root}app/assets/city/bund-${kind}.webp`), kind);
  for (const kind of ["light", "sky"]) assert.ok(existsSync(`${root}app/assets/city/masks/bund-${kind}.webp`), kind);
  assert.match(read("app/components/city3d/kit/plateArt.ts"), /bund/);
});

test("its home view is the painting's frame, on the right of wide screens, its sign kept", () => {
  assert.deepEqual(def.home.pos, def.plateFrame.pos);
  assert.deepEqual(def.home.target, def.plateFrame.target);
  assert.equal(def.fov, def.plateFrame.fov, "the lens is the painting's, so the plate shows as much of it as it can");
  assert.equal(def.span, undefined);
  assert.equal(def.frame, "right");
  assert.ok(def.sign && Number.isFinite(def.sign.bearing));
  // arriving and leaving step in along the home view's line, never back (no edge shows)
  for (const pose of [def.enter, def.exit]) {
    assert.deepEqual(pose.target, def.home.target);
    const to = (p) => Math.hypot(...p.map((x, i) => def.home.target[i] - x));
    assert.ok(to(pose.pos) < to(def.home.pos) && to(pose.pos) > 0.9 * to(def.home.pos));
  }
  // portrait phones centre on the clock tower (about u 0.41) and the promenade
  const half = Math.tan((def.plateFrame.fov * Math.PI) / 360) * def.plate.aspect;
  const u = 0.5 + Math.tan((def.portrait.yaw * Math.PI) / 180) / (2 * half);
  assert.ok(u > 0.4 && u < 0.46, `portrait middle at u ${u.toFixed(3)}`);
});

test("Contact has no picker: no focus keys, no Hitbox; the clock spots sit on the painted clock tower", () => {
  assert.deepEqual(def.focus, {});
  assert.doesNotMatch(src, /onSpot|Hitbox/);
  const { clock, "clock-side": side } = def.plate.spots;
  assert.deepEqual(Object.keys(def.plate.spots).sort(), ["clock", "clock-side"]);
  // the face toward the eye: centred on the painted face (u 0.412, v 0.216), about as wide as tall in pixels
  const b = bounds(clock);
  assert.ok(Math.abs((b.u0 + b.u1) / 2 - 0.412) < 0.002 && Math.abs((b.v0 + b.v1) / 2 - 0.216) < 0.003);
  const w = (b.u1 - b.u0) * 2400, h = (b.v1 - b.v0) * 1032;
  assert.ok(w > 30 && w < 46 && h > 30 && h < 46 && Math.abs(w - h) < 6, `${w.toFixed(0)} × ${h.toFixed(0)} px`);
  // the side face just right of it, narrow
  const s = bounds(side);
  assert.ok(s.u0 > b.u1 && s.u1 - s.u0 < 0.01 && s.v0 > 0.19 && s.v1 < 0.25);
  // both at the depth the painting stands out of the sky there (standing)
  for (const c of [...clock, ...side]) assert.equal(c[2], def.plate.depth.standing);
});

test("the clock tells Richmond Hill's hour: the kit's clock face on the spots, its hands moved with the store's hour", () => {
  assert.match(src, /<PlatePlace \{\.\.\.props\} id="bund" def=\{bund\}>/);
  assert.match(src, /spotGeometry\(def, plate\.frame, def\.plate\.spots\.clock/);
  assert.match(src, /spotGeometry\(def, plate\.frame, def\.plate\.spots\["clock-side"\]/);
  assert.match(src, /clockMaterial\(world\.get\(\)\.hour\)/);
  assert.match(src, /const hour = useWorld\(\(s\) => s\.hour\);/);
  assert.match(src, /if \(setClockHour\(hour\)\) invalidate\(\);/);
  assert.match(src, /useDisposeOnUnmount\(/);
  assert.match(src, /export default ContactScene;/);
  // nothing of the old code-built promenade, no lights of its own, no words
  assert.doesNotMatch(src, /SceneLights|PointLight|SpotLight|fillText|Math\.random/);
});

test("its living parts: the river clear of the railing, the wet paving, the sky and the glass", () => {
  const kinds = def.plate.regions.map((r) => r.kind);
  for (const k of ["water", "wet", "sky", "glass"]) assert.ok(kinds.includes(k), k);
  for (const r of def.plate.regions) assert.ok(r.poly.every(inside), r.kind);
  // the river sits between the far bank (v ≈ 0.586) and the railing's top rail, right of the promenade's end
  for (const r of def.plate.regions.filter((r) => r.kind === "water")) {
    const b = bounds(r.poly);
    assert.ok(b.u0 >= 0.6 && b.v0 >= 0.585 && b.v1 <= 0.71, JSON.stringify(b));
  }
  // the sky stays above the skyline and clear of the clock tower (u < 0.435 above v 0.14)
  for (const r of def.plate.regions.filter((r) => r.kind === "sky")) {
    const b = bounds(r.poly);
    assert.ok(b.v1 <= 0.38 && b.u0 >= 0.435, JSON.stringify(b));
  }
  // the wet paving keeps off the booth's glass
  const glassBooth = def.plate.regions.find((r) => r.kind === "glass");
  assert.ok(bounds(glassBooth.poly).u1 < 0.35);
});

test("its movers: ferries on the river, the far bank's traffic and slow beacons, all inside the painting", () => {
  const movers = def.plate.movers;
  const kinds = movers.map((m) => m.kind);
  assert.ok(kinds.filter((k) => k === "boat").length >= 2);
  assert.ok(kinds.includes("trail") && kinds.includes("beacon"));
  for (const m of movers) {
    assert.ok(m.path.every(inside), `${m.kind} inside the painting`);
    if (m.kind === "boat") {
      // on the water, under the far bank and above the railing
      for (const [, v] of m.path) assert.ok(v > 0.595 && v < 0.66, `boat at v ${v}`);
      // slow: a crossing takes two minutes or more
      assert.ok(m.period >= 120);
    }
    if (m.kind === "beacon") assert.ok(m.period >= 4, "a beacon swells, never blinks");
  }
  // the depth: a ground under the promenade's far end and the near things brought forward
  assert.equal(def.plate.depth.kind, "layers");
  assert.ok(def.plate.depth.ground.horizon > 0.55 && def.plate.depth.ground.horizon < 0.65);
  assert.ok(def.plate.depth.layers.length >= 3);
});
