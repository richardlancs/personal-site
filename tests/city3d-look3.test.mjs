// The third look round: tower forms (shaft, outline, withForms, beacons),
// merged plain panels, a pane grid on glass, trees with limbs, lamp rows
// sized and without pools, paving's mortar and variety, a railing's posts.
// Pure parts run here; what needs a canvas or a GPU is checked in the
// source, as the other kit tests do.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { test } from "node:test";

registerHooks({
  resolve(specifier, context, next) {
    try {
      return next(specifier, context);
    } catch (error) {
      if (/^\.{1,2}\//.test(specifier) && !/\.[cm]?[jt]sx?$/.test(specifier)) return next(`${specifier}.ts`, context);
      throw error;
    }
  },
});

const root = new URL("../", import.meta.url).pathname;
const read = (path) => readFileSync(`${root}${path}`, "utf8");
const kit = "app/components/city3d/kit";
const noComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");

const THREE = await import("three");
const { shaft, outline } = await import(`../${kit}/geometry.ts`);
const { buildTowers, layoutTowers, withForms, TOWER_FORMS } = await import(`../${kit}/towers.ts`);
const { glassMaterial } = await import(`../${kit}/glass.ts`);
const { buildStreetTrees } = await import(`../${kit}/trees.ts`);
const { buildLampRow, buildRailing } = await import(`../${kit}/street.ts`);
const { materialKey } = await import(`../${kit}/uniforms.ts`);
const { disposeShared } = await import(`../${kit}/materials.ts`);

test("outline: a square, its corners cut or rounded, turned, always round in one direction", () => {
  assert.equal(outline(1).length, 4);
  assert.equal(outline(1, { cut: 0.2 }).length, 8);
  assert.equal(outline(1, { round: 0.2, seg: 3 }).length, 16);
  for (const o of [outline(1), outline(1, { cut: 0.2 }), outline(1, { round: 0.2, seg: 3 }), outline(1, { cut: 0.1, turn: 0.4 })]) {
    // the signed area has one sign at every corner: a convex outline, no fold
    const turns = o.map(([ax, az], i) => {
      const [bx, bz] = o[(i + 1) % o.length];
      const [cx, cz] = o[(i + 2) % o.length];
      return (bx - ax) * (cz - bz) - (bz - az) * (cx - bx);
    });
    assert.ok(turns.every((t) => t > -1e-9) || turns.every((t) => t < 1e-9));
    for (const [x, z] of o) assert.ok(Math.hypot(x, z) <= Math.SQRT1_2 + 1e-9);
  }
});

test("shaft: sides facing out with window faces, a roof facing up; a spire's faces carry none", () => {
  const g = shaft(outline(1, { cut: 0.2 }), 0, 1, 4);
  const pos = g.getAttribute("position");
  const nor = g.getAttribute("normal");
  const face = g.getAttribute("aFace");
  let sides = 0;
  for (let i = 0; i < pos.count; i++) {
    const n = new THREE.Vector3(nor.getX(i), nor.getY(i), nor.getZ(i));
    if (n.y > 0.99) {
      assert.equal(face.getZ(i), -1, "the roof has no windows");
      continue;
    }
    sides++;
    // outward: the normal points away from the axis
    assert.ok(n.x * pos.getX(i) + n.z * pos.getZ(i) > -1e-6);
    assert.ok(face.getZ(i) >= 4 && face.getY(i) > 0);
  }
  assert.equal(sides, 8 * 6);
  // every triangle's winding agrees with its normal (front faces outward)
  for (let i = 0; i < pos.count; i += 3) {
    const a = new THREE.Vector3().fromBufferAttribute(pos, i);
    const b = new THREE.Vector3().fromBufferAttribute(pos, i + 1);
    const c = new THREE.Vector3().fromBufferAttribute(pos, i + 2);
    const w = b.sub(a).cross(c.sub(a));
    const n = new THREE.Vector3().fromBufferAttribute(nor, i);
    assert.ok(w.dot(n) > 0, `triangle ${i / 3}`);
  }
  const spire = shaft(outline(0.2), 0.8, 1, 0, { windows: false, top: 0.05 });
  const f = spire.getAttribute("aFace");
  for (let i = 0; i < f.count; i++) assert.equal(f.getZ(i), -1);
});

test("withForms: the layout never moves, the tallest get the hero forms, one form a group, kept towers keep their shape, the same from the same seed", () => {
  const specs = layoutTowers(11, { x0: -60, x1: 60, z0: -40, z1: -10 }, 40, [6, 30]);
  const formed = withForms(specs, 5);
  assert.equal(formed.length, specs.length);
  formed.forEach((t, i) => {
    const { form, ...rest } = t;
    assert.deepEqual(rest, specs[i]);
    if (form) assert.ok(TOWER_FORMS.includes(form));
  });
  const byHeight = [...formed].sort((a, b) => b.h - a.h);
  assert.deepEqual(byHeight.slice(0, 3).map((t) => t.form), ["spire", "twist", "crown"]);
  assert.deepEqual(withForms(specs, 5), formed);
  const keep = new Set(specs.slice(0, 10));
  const kept = withForms(specs, 5, { keep: (t) => keep.has(t) });
  for (let i = 0; i < 10; i++) assert.equal(kept[i].form, undefined);
  // one form a group (by style by default), heroes aside
  const heroes = new Set(byHeight.slice(0, 3));
  for (const style of [0, 1, 2, 3]) assert.ok(new Set(formed.filter((t) => t.style === style && !heroes.has(t)).map((t) => t.form)).size <= 1);
  // groups of one each: a varied field, from the forms asked for
  const varied = withForms(specs, 5, { group: (t) => t.seed, forms: ["setback", "podium", "taper"] });
  const heroAt = new Set(byHeight.slice(0, 3).map((t) => formed.indexOf(t)));
  assert.equal(new Set(varied.filter((_, i) => !heroAt.has(i)).map((t) => t.form)).size, 3);
});

test("buildTowers with forms: one mesh per style and form, every tower once, beacons on masts and spires, the window program", () => {
  disposeShared();
  const specs = withForms(layoutTowers(13, { x0: -80, x1: 80, z0: -60, z1: -10 }, 50, [8, 36]), 7);
  const meshes = buildTowers(specs, { far: false });
  const towers = meshes.filter((m) => !m.name.startsWith("towers:beacons"));
  assert.equal(towers.reduce((n, m) => n + m.count, 0), specs.length);
  const beacons = meshes.find((m) => m.name === "towers:beacons");
  const tips = specs.filter((t) => t.form === "spire" || t.form === "chamfer").length;
  assert.equal(beacons?.count ?? 0, tips);
  for (const m of towers) {
    assert.ok(m.geometry.getAttribute("aFace"));
    assert.equal(m.material.customProgramCacheKey(), materialKey("win", "near"));
    // a form is small: under 400 triangles
    assert.ok(m.geometry.getAttribute("position").count / 3 < 400, m.name);
  }
  // draw calls: at most a mesh per shape used (a style's own, or a form) and facade (here the style's), and one for beacons
  const kinds = new Set(specs.map((t) => `${t.form ?? t.style}|${t.style}`));
  assert.ok(meshes.length <= kinds.size + 1);
  for (const m of meshes) m.geometry.dispose();
  disposeShared();
});

test("glass panes: a uniform on the one glass program, none by default", () => {
  disposeShared();
  const plain = glassMaterial({ tint: "#2c4766" });
  const grid = glassMaterial({ tint: "#2c4766", panes: { size: [0.35, 0.2], bar: 0.008 } });
  assert.notEqual(plain, grid);
  assert.equal(plain.customProgramCacheKey(), grid.customProgramCacheKey());
  assert.deepEqual(plain.userData.glass.uPanes.value.toArray(), [0, 0, 0]);
  assert.deepEqual(grid.userData.glass.uPanes.value.toArray(), [0.35, 0.2, 0.008]);
  const src = noComments(read(`${kit}/glass.ts`));
  assert.match(src, /if \(uPanes\.z > 0\.0\)/);
  assert.match(src, /fwidth\(q\)/, "bars fade where they'd be finer than a pixel");
  disposeShared();
});

test("trees: trunks fork into limbs; the leaf pattern fades both far and up close", () => {
  disposeShared();
  const trees = buildStreetTrees(5, Array.from({ length: 8 }, (_, i) => ({ x: i, z: 0, s: 1 })));
  const trunks = trees.find((m) => m.name === "trees:trunks");
  assert.ok(trunks.geometry.getAttribute("position").count / 3 > 50, "a trunk and its limbs");
  trunks.geometry.computeBoundingBox();
  assert.ok(trunks.geometry.boundingBox.max.y > 0.6, "limbs reach up into the crown");
  assert.ok(trees.length <= 3);
  const src = noComments(read(`${kit}/trees.ts`));
  assert.match(src, /float fade = \(1\.0 - smoothstep\([\d.]+, [\d.]+, cells\)\) \* smoothstep\([\d.]+, [\d.]+, cells\);/);
  for (const m of trees) m.geometry.dispose();
  disposeShared();
});

test("lamp rows: a size scales posts and heads together; pool: false drops the pool's draw call", () => {
  disposeShared();
  const spots = [{ x: 0, y: 1, z: 0 }, { x: 1, y: 1, z: 0 }];
  const plain = buildLampRow(spots, { head: "lantern" });
  const small = buildLampRow(spots, { head: "lantern", size: 0.8, pool: false });
  assert.equal(plain.meshes.length, 3);
  assert.equal(small.meshes.length, 2);
  assert.ok(Math.abs(small.heads[0].y - 1 - (plain.heads[0].y - 1) * 0.8) < 1e-9);
  const m = new THREE.Matrix4();
  small.meshes[0].getMatrixAt(0, m);
  assert.ok(Math.abs(new THREE.Vector3().setFromMatrixScale(m).x - 0.8) < 1e-6);
  plain.dispose();
  small.dispose();
  const thin = buildRailing([new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 0, 0)]);
  const stout = buildRailing([new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 0, 0)], { post: 0.03 });
  thin.geometry.computeBoundingBox();
  stout.geometry.computeBoundingBox();
  assert.ok(stout.geometry.boundingBox.max.z > thin.geometry.boundingBox.max.z);
  thin.geometry.dispose();
  stout.geometry.dispose();
  disposeShared();
});

test("paving's mortar and variety join its cache key only when asked for; merged panels are four draws at most", () => {
  const tex = noComments(read(`${kit}/textures.ts`));
  assert.match(tex, /const look = mortar === "#6c6c6c" && vary === 34 \? "" : `:\$\{mortar\}:\$\{vary\}`;/);
  const signs = noComments(read(`${kit}/signs.ts`));
  assert.match(signs, /export function buildPanels\(list: readonly PanelSpec\[\]\): THREE\.Group/);
  assert.match(signs, /face\.name = `panels:\$\{tone\}`/);
  assert.match(signs, /frame\.name = "panels:frames"/);
});
