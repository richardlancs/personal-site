// The third look round, what's left of it now the places are painted (the
// towers, glass, trees and lamp rows went with the code-built scenes):
// the geometry helpers (shaft, outline; bund.tsx's clock uses merge) and
// paving's cache key.
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

test("paving's mortar and variety join its cache key only when asked for; merged panels are four draws at most", () => {
  const tex = noComments(read(`${kit}/textures.ts`));
  assert.match(tex, /const look = mortar === "#6c6c6c" && vary === 34 \? "" : `:\$\{mortar\}:\$\{vary\}`;/);
  const signs = noComments(read(`${kit}/signs.ts`));
  assert.match(signs, /export function buildPanels\(list: readonly PanelSpec\[\]\): THREE\.Group/);
  assert.match(signs, /face\.name = `panels:\$\{tone\}`/);
  assert.match(signs, /frame\.name = "panels:frames"/);
});
