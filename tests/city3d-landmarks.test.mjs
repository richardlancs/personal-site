// The four landmark towers (app/components/city3d/kit/landmarks.ts): heights
// at 1:10, budgets, clean geometry, and the proportions that make each one
// recognisable from across the river.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import * as THREE from "three";
import {
  buildJinMao,
  buildPearlTower,
  buildShanghaiTower,
  buildWorldFinancialCenter,
  JIN_MAO_TIERS,
  SHANGHAI_TOWER_TWIST,
} from "../app/components/city3d/kit/landmarks.ts";

const materials = () => ({ body: new THREE.MeshBasicMaterial(), glass: new THREE.MeshBasicMaterial(), lit: new THREE.MeshBasicMaterial() });
const builders = { pearl: buildPearlTower, shanghaiTower: buildShanghaiTower, jinMao: buildJinMao, worldFinancialCenter: buildWorldFinancialCenter };
const real = { pearl: 468, shanghaiTower: 632, jinMao: 421, worldFinancialCenter: 492 };
const meshes = (l) => l.group.children.filter((c) => c.isMesh);
const triangles = (l) => meshes(l).reduce((s, m) => s + m.geometry.index.count / 3, 0);
const box = (l) => new THREE.Box3().setFromObject(l.group);
const built = {};
for (const [name, build] of Object.entries(builders)) for (const detail of ["far", "near"]) built[`${name} ${detail}`] = build(detail, materials());

// The brief's cases

test("each height is within 2% of the real height ÷ 10", () => {
  for (const [name, build] of Object.entries(builders))
    for (const detail of ["far", "near"]) {
      const l = build(detail, materials());
      assert.ok(Math.abs(l.height - real[name] / 10) <= (real[name] / 10) * 0.02, `${name} ${detail}: ${l.height}`);
    }
});
test("the Tower is tallest, then the opener, the spheres, the pagoda", () => {
  const h = (b) => b("far", materials()).height;
  assert.ok(h(buildShanghaiTower) > h(buildWorldFinancialCenter));
  assert.ok(h(buildWorldFinancialCenter) > h(buildPearlTower));
  assert.ok(h(buildPearlTower) > h(buildJinMao));
});
test("far ≤ 6,000 and near ≤ 40,000 triangles", () => {
  for (const [key, l] of Object.entries(built)) assert.ok(triangles(l) <= (key.endsWith("far") ? 6000 : 40000), `${key}: ${triangles(l)}`);
});
test("the Pearl's lit parts include its spheres", () => {
  for (const detail of ["far", "near"]) {
    const l = buildPearlTower(detail, materials());
    assert.equal(sphereClusters(l).length, 3);
  }
});
test("each landmark is at most 4 meshes, merged per material", () => {
  for (const [key, l] of Object.entries(built)) {
    const ms = meshes(l);
    assert.ok(ms.length <= 4, key);
    assert.equal(new Set(ms.map((m) => m.material)).size, ms.length, key);
  }
});
test("landmarks.ts imports nothing from ./surface, ./windows or ./neon", () => {
  const src = readFileSync(new URL("../app/components/city3d/kit/landmarks.ts", import.meta.url), "utf8");
  for (const m of src.matchAll(/from\s+["']([^"']+)["']/g)) assert.ok(!/\.\/(surface|windows|neon)/.test(m[1]), m[1]);
  assert.ok(!/Math\.random/.test(src));
  // Nothing from the park's folders, which are going away
  assert.ok(!/world3d|components\/world\/|locations/.test(src));
});

// Beyond the brief's cases

test("the bounding box matches the stated height within 1%, the base sits at y = 0", () => {
  for (const [key, l] of Object.entries(built)) {
    const b = box(l);
    assert.ok(Math.abs(b.max.y - l.height) <= l.height * 0.01, `${key}: top ${b.max.y}`);
    assert.ok(Math.abs(l.height - real[key.split(" ")[0]] / 10) <= (real[key.split(" ")[0]] / 10) * 0.01, key);
    assert.ok(Math.abs(b.min.y) < 1e-6, `${key}: base ${b.min.y}`);
  }
});
test("each stands on its axis: its footprint is centred on x = z = 0", () => {
  for (const [key, l] of Object.entries(built)) {
    // Each distinct point once (a round section repeats its seam)
    const seen = new Set();
    let sx = 0, sz = 0, n = 0;
    eachVertex(l, (p) => {
      const k = `${p.x.toFixed(4)},${p.z.toFixed(4)}`;
      if (p.y > 1e-4 || seen.has(k)) return;
      seen.add(k);
      sx += p.x;
      sz += p.z;
      n++;
    });
    assert.ok(n > 0, key);
    assert.ok(Math.abs(sx / n) < 0.05 && Math.abs(sz / n) < 0.05, `${key}: ${sx / n}, ${sz / n}`);
  }
});
test("far has fewer triangles than near", () => {
  for (const name of Object.keys(builders)) assert.ok(triangles(built[`${name} far`]) < triangles(built[`${name} near`]), name);
});
test("every position, normal and uv is finite", () => {
  for (const [key, l] of Object.entries(built))
    for (const m of meshes(l))
      for (const a of ["position", "normal", "uv"]) {
        const attr = m.geometry.attributes[a];
        assert.ok(attr, `${key} ${m.name} has ${a}`);
        assert.ok(attr.array.every(Number.isFinite), `${key} ${m.name} ${a}`);
      }
});
test("no degenerate triangles, and every face's winding agrees with its normals", () => {
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), n = new THREE.Vector3(), t = new THREE.Vector3();
  for (const [key, l] of Object.entries(built))
    for (const m of meshes(l)) {
      const { position: p, normal: nn } = m.geometry.attributes;
      const index = m.geometry.index;
      let against = 0;
      for (let k = 0; k < index.count; k += 3) {
        const [i, j, h] = [index.getX(k), index.getX(k + 1), index.getX(k + 2)];
        a.fromBufferAttribute(p, i);
        b.fromBufferAttribute(p, j).sub(a);
        c.fromBufferAttribute(p, h).sub(a);
        const face = b.cross(c);
        assert.ok(face.length() / 2 > 1e-7, `${key} ${m.name}: triangle ${k / 3} has no area`);
        n.fromBufferAttribute(nn, i).add(t.fromBufferAttribute(nn, j)).add(t.fromBufferAttribute(nn, h));
        if (face.dot(n) <= 0) against++;
      }
      assert.equal(against, 0, `${key} ${m.name}: ${against} faces wound against their normals`);
    }
});
test("deterministic: two calls give the same geometry", () => {
  for (const [name, build] of Object.entries(builders))
    for (const detail of ["far", "near"]) {
      const [x, y] = [build(detail, materials()), build(detail, materials())];
      const [mx, my] = [meshes(x), meshes(y)];
      assert.equal(mx.length, my.length);
      mx.forEach((m, i) => {
        assert.deepEqual(m.geometry.attributes.position.array, my[i].geometry.attributes.position.array, `${name} ${detail}`);
        assert.deepEqual(m.geometry.index.array, my[i].geometry.index.array, `${name} ${detail}`);
      });
    }
});
test("the lit list is non-empty and every entry is a mesh in the group, on the lit material", () => {
  for (const [key, l] of Object.entries(built)) {
    assert.ok(l.lit.length > 0, key);
    for (const m of l.lit) {
      assert.ok(m.isMesh && m.parent === l.group, key);
      assert.equal(m.name, "lit");
    }
    assert.ok(l.anchor.y > 0 && l.anchor.y <= l.height, key);
  }
});
test("uses the materials it is given and makes none", () => {
  const m = materials();
  const l = buildJinMao("near", m);
  for (const mesh of meshes(l)) assert.ok(Object.values(m).includes(mesh.material));
});
test("the lit parts' uv is world units: v is the height, u runs round the outline", () => {
  const l = built["shanghaiTower near"];
  const g = l.lit[0].geometry;
  const { position: p, uv } = g.attributes;
  let maxU = 0;
  for (let i = 0; i < p.count; i++) {
    const side = Math.abs(g.attributes.normal.getY(i)) < 0.5;
    if (side) {
      assert.ok(Math.abs(uv.getY(i) - p.getY(i)) < 1e-4);
      maxU = Math.max(maxU, uv.getX(i));
    }
  }
  // A band's outline is about 2π × 4.3 world units round at its widest
  assert.ok(maxU > 20 && maxU < 35, `${maxU}`);
});

// The silhouettes

test("the spheres: centres at 22%, 56% and 75% of the height, radii 2.5 and 2.2", () => {
  for (const detail of ["far", "near"]) {
    const l = buildPearlTower(detail, materials());
    const s = sphereClusters(l);
    const want = [
      [0.22, 2.5],
      [0.56, 2.2],
      [0.75, 0.75],
    ];
    s.forEach(({ lo, hi }, i) => {
      const centre = (lo + hi) / 2;
      assert.ok(Math.abs(centre / l.height - want[i][0]) < 0.01, `${detail} sphere ${i}: ${centre / l.height}`);
      assert.ok(Math.abs((hi - lo) / 2 - want[i][1]) < 0.05, `${detail} sphere ${i}: r ${(hi - lo) / 2}`);
    });
  }
});
test("the spheres stand on three legs and three columns", () => {
  for (const detail of ["far", "near"]) {
    const l = buildPearlTower(detail, materials());
    const feet = [];
    eachVertex(l, (p) => {
      if (p.y > 1e-4) return;
      const f = feet.find((q) => Math.hypot(q.x - p.x, q.z - p.z) < 1);
      if (!f) feet.push({ x: p.x, z: p.z });
    });
    const r = feet.map((f) => Math.hypot(f.x, f.z)).sort((a, b) => a - b);
    assert.equal(feet.length, 6, detail);
    // Columns close in, legs splayed wide
    assert.ok(r.slice(0, 3).every((d) => d < 1.5) && r.slice(3).every((d) => d > 3), `${detail}: ${r}`);
  }
});
test("the Tower turns 120° from foot to top, and narrows to 55%", () => {
  for (const detail of ["far", "near"]) {
    const l = buildShanghaiTower(detail, materials());
    const glass = meshes(l).find((m) => m.name === "glass").geometry;
    const at = (y) => {
      const pts = [];
      const p = glass.attributes.position;
      const n = glass.attributes.normal;
      for (let i = 0; i < p.count; i++) if (Math.abs(p.getY(i) - y) < 1e-3 && Math.abs(n.getY(i)) < 0.5) pts.push([p.getX(i), p.getZ(i)]);
      const cx = pts.reduce((s, q) => s + q[0], 0) / pts.length;
      const cz = pts.reduce((s, q) => s + q[1], 0) / pts.length;
      const polar = pts.map(([x, z]) => [Math.hypot(x - cx, z - cz), Math.atan2(z - cz, x - cx)]);
      const mean = polar.reduce((s, q) => s + q[0], 0) / polar.length;
      // The notch: the deepest point
      const notch = polar.reduce((m, q) => (q[0] < m[0] ? q : m));
      return { mean, notch: notch[1] };
    };
    const foot = at(0);
    const top = at(l.height);
    let turn = top.notch - foot.notch;
    while (turn < 0) turn += Math.PI * 2;
    assert.ok(Math.abs(turn - (2 * Math.PI) / 3) < (2 * Math.PI) / 180, `${detail}: ${(turn * 180) / Math.PI}°`);
    assert.equal(SHANGHAI_TOWER_TWIST, (2 * Math.PI) / 3);
    assert.ok(Math.abs(top.mean / foot.mean - 0.55) < 0.03, `${detail}: ${top.mean / foot.mean}`);
  }
});
test("the Tower has nine lit bands", () => {
  for (const detail of ["far", "near"]) {
    const l = buildShanghaiTower(detail, materials());
    assert.equal(clusters(l.lit[0].geometry, 1).length, 9, detail);
  }
});
test("the pagoda: sixteen setbacks below the crown, each tier 1/8 shorter", () => {
  for (const detail of ["far", "near"]) {
    const l = buildJinMao(detail, materials());
    const ray = new THREE.Raycaster();
    const steps = [];
    let last = null;
    for (let y = 0.1; y < l.height * 0.79; y += 0.02) {
      ray.set(new THREE.Vector3(-50, y, 0), new THREE.Vector3(1, 0, 0));
      const hit = ray.intersectObject(l.group, true)[0];
      assert.ok(hit, `${detail}: nothing at ${y}`);
      const half = -hit.point.x;
      if (last !== null && half < last - 0.05) steps.push(y);
      last = half;
    }
    assert.equal(steps.length, JIN_MAO_TIERS, `${detail}: ${steps.map((s) => s.toFixed(2))}`);
    const rises = [steps[0], ...steps.slice(1).map((s, i) => s - steps[i])];
    for (let i = 1; i < rises.length - 1; i++) assert.ok(Math.abs(rises[i] / rises[i - 1] - 7 / 8) < 0.06, `${detail}: tier ${i} ${rises[i] / rises[i - 1]}`);
    // Crown and spire above
    assert.ok(box(l).max.y - steps.at(-1) > 0.15 * l.height);
  }
});
test("the opener: a trapezoid opening inside the top fifth, about 50 m wide at its top", () => {
  for (const detail of ["far", "near"]) {
    const l = buildWorldFinancialCenter(detail, materials());
    const ray = new THREE.Raycaster();
    const through = (x, y) => {
      ray.set(new THREE.Vector3(x, y, -50), new THREE.Vector3(0, 0, 1));
      return ray.intersectObject(l.group, true).length === 0;
    };
    const open = [];
    for (let y = 0.05; y < l.height; y += 0.05) if (through(0, y)) open.push(y);
    assert.ok(open.length > 0, detail);
    const [lo, hi] = [open[0], open.at(-1)];
    // One opening, in one piece, in the top fifth, closed above
    assert.ok(open.length >= Math.floor((hi - lo) / 0.05) - 1, detail);
    assert.ok(lo > 0.8 * l.height && hi < l.height - 0.3, `${detail}: ${lo}..${hi}`);
    const width = (y) => {
      let w = 0;
      // Inside the face's outline only (6.1 wide at the top)
      for (let x = -2.9; x <= 2.9; x += 0.02) if (through(x, y)) w += 0.02;
      return w;
    };
    const top = width(hi - 0.1);
    const bottom = width(lo + 0.1);
    assert.ok(Math.abs(top - 5.0) < 0.4, `${detail}: top ${top}`);
    assert.ok(top > bottom + 0.8, `${detail}: ${top} over ${bottom}`);
    // Everywhere else the tower is solid in front of the viewer
    for (const y of [1, 20, 40, lo - 0.5, l.height - 0.15]) assert.ok(!through(0, y), `${detail}: hole at ${y}`);
  }
});
test("the opener's foot is square and its top a blade", () => {
  for (const detail of ["far", "near"]) {
    const l = buildWorldFinancialCenter(detail, materials());
    const extent = (y0, y1) => {
      const b = new THREE.Box3();
      eachVertex(l, (p) => {
        if (p.y >= y0 && p.y <= y1) b.expandByPoint(p);
      });
      return b;
    };
    const foot = extent(0, 0.01);
    const head = extent(l.height - 0.5, l.height);
    const fw = foot.max.x - foot.min.x, fd = foot.max.z - foot.min.z;
    const hw = head.max.x - head.min.x, hd = head.max.z - head.min.z;
    assert.ok(Math.abs(fw / fd - 1) < 0.05, `${detail}: foot ${fw} × ${fd}`);
    assert.ok(hw / hd > 4, `${detail}: head ${hw} × ${hd}`);
  }
});

// Helpers

function eachVertex(l, f) {
  const p = new THREE.Vector3();
  for (const m of meshes(l)) {
    const pos = m.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) f(p.fromBufferAttribute(pos, i));
  }
}
// Separate pieces along y: runs of vertex heights with gaps over `gap`
function clusters(g, gap) {
  const ys = [...g.attributes.position.array.filter((_, i) => i % 3 === 1)].sort((a, b) => a - b);
  const out = [{ lo: ys[0], hi: ys[0] }];
  for (const y of ys) {
    const c = out.at(-1);
    if (y - c.hi > gap) out.push({ lo: y, hi: y });
    else c.hi = y;
  }
  return out;
}
function sphereClusters(l) {
  return clusters(l.lit[0].geometry, 1);
}
