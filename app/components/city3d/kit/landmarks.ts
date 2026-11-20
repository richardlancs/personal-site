import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

// The four towers of the far bank's skyline, built from primitives in code
// (lofts, spheres, a lathe, an extrusion with a hole). Real heights at 1:10,
// so one unit is ten metres; each stands on y = 0 with its axis on x = z = 0.
//
// Every builder returns at most three meshes, one per material (body, glass,
// lit), so a landmark costs at most three draw calls. Every geometry carries
// position, normal and uv, and its uv means the same thing everywhere:
//   u = distance around the part's outline, in world units (10 m),
//   v = height above the ground, in world units.
// So a window shader can lay a grid of a fixed size in metres on any face,
// lit bands and crowns included, and pick a floor from v alone.
//
// "far" is the skyline seen across the river (phones too): very few
// triangles, silhouette only. "near" is the street: rounder curves, the
// notch's crease, ties and ribs, lit edges.
//
// Nothing here is random: the same call gives the same geometry.

export type LandmarkMaterials = { body: THREE.Material; glass: THREE.Material; lit: THREE.Material };
export type Landmark = { group: THREE.Group; height: number; lit: THREE.Mesh[]; anchor: THREE.Vector3 };
type Detail = "near" | "far";

// Heights in world units (real metres ÷ 10)
export const LANDMARK_HEIGHTS = { pearl: 46.8, shanghaiTower: 63.2, jinMao: 42.1, worldFinancialCenter: 49.2 } as const;

type P2 = readonly [number, number]; // a point in plan: [x, z]
type Ring = { y: number; pts: P2[] }; // a horizontal section, its points in order of increasing atan2(z, x)
type Parts = { body: THREE.BufferGeometry[]; glass: THREE.BufferGeometry[]; lit: THREE.BufferGeometry[] };

const TAU = Math.PI * 2;
const parts = (): Parts => ({ body: [], glass: [], lit: [] });

// ---------------------------------------------------------------------
// Primitives

export const circle = (r: number, n: number, cx = 0, cz = 0, phase = 0): P2[] =>
  Array.from({ length: n }, (_, j) => {
    const a = phase + (j / n) * TAU;
    return [cx + r * Math.cos(a), cz + r * Math.sin(a)] as const;
  });

// A surface through a stack of horizontal sections, all with the same number
// of points. Smooth: normals averaged across faces (round towers). Flat: each
// face its own vertices (crisp facets). Faces point outward.
function loft(rings: Ring[], o: { smooth?: boolean; capBottom?: boolean; capTop?: boolean } = {}) {
  const pos: number[] = [];
  const nor: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  const R = rings.length;
  const n = rings[0].pts.length;
  const P = (i: number, j: number) => {
    const r = rings[Math.min(R - 1, Math.max(0, i))];
    const p = r.pts[((j % n) + n) % n];
    return new THREE.Vector3(p[0], r.y, p[1]);
  };
  const normal = (U: THREE.Vector3, T: THREE.Vector3, at: THREE.Vector3) => {
    const N = U.clone().cross(T);
    if (N.lengthSq() < 1e-18) N.set(at.x, 0, at.z);
    if (N.lengthSq() < 1e-18) N.set(1, 0, 0);
    return N.normalize();
  };
  // Distance around each ring up to point j
  const arc = rings.map((_, i) => {
    const s = [0];
    for (let j = 1; j <= n; j++) s.push(s[j - 1] + P(i, j).distanceTo(P(i, j - 1)));
    return s;
  });
  const put = (p: THREE.Vector3, N: THREE.Vector3, u: number) => {
    pos.push(p.x, p.y, p.z);
    nor.push(N.x, N.y, N.z);
    uv.push(u, p.y);
  };
  if (o.smooth) {
    for (let i = 0; i < R; i++)
      for (let j = 0; j <= n; j++) {
        const p = P(i, j);
        const T = P(i, j + 1).sub(P(i, j - 1));
        const U = P(i + 1, j).sub(P(i - 1, j));
        put(p, normal(U, T, p), arc[i][j]);
      }
    for (let i = 0; i < R - 1; i++)
      for (let j = 0; j < n; j++) {
        const a = i * (n + 1) + j;
        const b = a + 1;
        const c = a + n + 1;
        const d = c + 1;
        idx.push(a, c, b, b, c, d);
      }
  } else {
    let base = 0;
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < R; i++) {
        const a = P(i, j);
        const b = P(i, j + 1);
        const mid = (k: number) => P(k, j).add(P(k, j + 1)).multiplyScalar(0.5);
        const N = normal(mid(i + 1).sub(mid(i - 1)), b.clone().sub(a), a.clone().add(b));
        put(a, N, arc[i][j]);
        put(b, N, arc[i][j + 1]);
      }
      for (let i = 0; i < R - 1; i++) {
        const a = base + i * 2;
        idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
      }
      base += R * 2;
    }
  }
  const cap = (ring: Ring, up: boolean) => {
    const c0 = pos.length / 3;
    const cx = ring.pts.reduce((s, p) => s + p[0], 0) / n;
    const cz = ring.pts.reduce((s, p) => s + p[1], 0) / n;
    const N = new THREE.Vector3(0, up ? 1 : -1, 0);
    put(new THREE.Vector3(cx, ring.y, cz), N, 0);
    uv[uv.length - 2] = cx;
    uv[uv.length - 1] = cz;
    for (const [x, z] of ring.pts) {
      put(new THREE.Vector3(x, ring.y, z), N, 0);
      uv[uv.length - 2] = x;
      uv[uv.length - 1] = z;
    }
    for (let j = 0; j < n; j++) {
      const a = c0 + 1 + j;
      const b = c0 + 1 + ((j + 1) % n);
      if (up) idx.push(c0, b, a);
      else idx.push(c0, a, b);
    }
  };
  if (o.capBottom) cap(rings[0], false);
  if (o.capTop) cap(rings[R - 1], true);
  return geometry(pos, nor, uv, idx);
}

function geometry(pos: number[], nor: number[], uv: number[], idx: number[]) {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

// A straight prism between two heights: a column, a collar, a band
const prism = (pts: P2[], y0: number, y1: number, o: { smooth?: boolean; caps?: boolean } = {}) =>
  loft(
    [
      { y: y0, pts },
      { y: y1, pts },
    ],
    { smooth: o.smooth, capBottom: o.caps, capTop: o.caps },
  );

// Three's own round shapes, given the shared uv meaning: u around in world
// units (the fraction around × the part's circumference), v the height
function worldUV(g: THREE.BufferGeometry, circumference: number) {
  const uv = g.attributes.uv as THREE.BufferAttribute;
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * circumference, p.getY(i));
  return g;
}

function sphere(r: number, y: number, w: number, h: number) {
  const g = new THREE.SphereGeometry(r, w, h);
  g.translate(0, y, 0);
  return worldUV(g, TAU * r);
}

// Extrusions come unindexed; index them so everything merges the same way
function indexed(g: THREE.BufferGeometry) {
  if (!g.index) g.setIndex(Array.from({ length: g.attributes.position.count }, (_, i) => i));
  g.clearGroups();
  return g;
}

// Drop zero-area triangles (a cone's tip, a vanishing facet)
function clean(g: THREE.BufferGeometry) {
  const p = g.attributes.position as THREE.BufferAttribute;
  const index = g.index!;
  const keep: number[] = [];
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  for (let t = 0; t < index.count; t += 3) {
    const i = index.getX(t);
    const j = index.getX(t + 1);
    const k = index.getX(t + 2);
    a.fromBufferAttribute(p, i);
    b.fromBufferAttribute(p, j).sub(a);
    c.fromBufferAttribute(p, k).sub(a);
    if (b.cross(c).length() * 0.5 > 1e-6) keep.push(i, j, k);
  }
  g.setIndex(keep);
  return g;
}

function finish(name: string, all: Parts, m: LandmarkMaterials, height: number, anchor: THREE.Vector3): Landmark {
  const group = new THREE.Group();
  group.name = name;
  const lit: THREE.Mesh[] = [];
  for (const key of ["body", "glass", "lit"] as const) {
    if (!all[key].length) continue;
    const g = clean(mergeGeometries(all[key], false)!);
    g.computeBoundingBox();
    g.computeBoundingSphere();
    const mesh = new THREE.Mesh(g, m[key]);
    mesh.name = key;
    group.add(mesh);
    if (key === "lit") lit.push(mesh);
  }
  return { group, height, lit, anchor };
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// ---------------------------------------------------------------------
// The tower with the pink spheres: three straight columns and three
// splayed legs, a big sphere low, a smaller one higher up, a small one
// above, then the mast. The spheres are the lit parts (rose at night).

export function buildPearlTower(detail: Detail, m: LandmarkMaterials): Landmark {
  const near = detail === "near";
  const H = LANDMARK_HEIGHTS.pearl;
  const all = parts();
  const round = near ? 16 : 6;
  const low = { y: 0.22 * H, r: 2.5 };
  const high = { y: 0.56 * H, r: 2.2 };
  const top = { y: 0.75 * H, r: 0.75 };

  // Three columns from the ground into the upper sphere
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * TAU;
    all.body.push(prism(circle(0.38, round, 0.8 * Math.cos(a), 0.8 * Math.sin(a)), 0, high.y + 0.8, { smooth: true }));
  }
  // Three legs, splayed, from the ground into the lower sphere's underside
  const legRings = near ? 4 : 2;
  for (let k = 0; k < 3; k++) {
    const a = Math.PI / 3 + (k / 3) * TAU;
    const rings: Ring[] = [];
    for (let i = 0; i < legRings; i++) {
      const t = i / (legRings - 1);
      const d = lerp(4.0, 1.25, t);
      rings.push({ y: lerp(0, 8.6, t), pts: circle(0.36, round, d * Math.cos(a), d * Math.sin(a)) });
    }
    all.body.push(loft(rings, { smooth: true }));
  }
  // Collars tying the columns together, below and between the spheres
  for (const y of [5.4, 14.8, 17.6, 20.4, 23.0]) all.body.push(prism(circle(1.32, near ? 24 : 9), y, y + 0.24, { smooth: true, caps: true }));
  // The shaft from the upper sphere to the small one, with rings
  all.body.push(prism(circle(0.55, near ? 16 : 8), high.y, top.y + 0.2, { smooth: true }));
  if (near) for (const y of [29.6, 31.4, 33.0]) all.body.push(prism(circle(0.72, 16), y, y + 0.18, { smooth: true, caps: true }));
  // The mast: a lathe, thick at its foot with a disc, thinning to a needle
  const mast: [number, number][] = near
    ? [
        [0.42, 35.6],
        [0.36, 37.1],
        [0.52, 37.4],
        [0.52, 37.75],
        [0.3, 38.0],
        [0.25, 40.2],
        [0.33, 40.45],
        [0.33, 40.7],
        [0.2, 40.9],
        [0.12, 43.2],
        [0.06, 45.4],
        [0.02, H],
      ]
    : [
        [0.42, 35.6],
        [0.3, 38.0],
        [0.18, 41.0],
        [0.07, 44.5],
        [0.02, H],
      ];
  const lathe = new THREE.LatheGeometry(
    mast.map(([r, y]) => new THREE.Vector2(r, y)),
    near ? 16 : 6,
  );
  all.body.push(worldUV(lathe, TAU * 0.42));

  // The spheres: the lit parts
  all.lit.push(sphere(low.r, low.y, near ? 48 : 14, near ? 32 : 10));
  all.lit.push(sphere(high.r, high.y, near ? 48 : 14, near ? 32 : 10));
  all.lit.push(sphere(top.r, top.y, near ? 24 : 10, near ? 16 : 8));
  // Near: the band of windows round each big sphere's middle
  if (near) for (const s of [low, high]) all.glass.push(prism(circle(s.r * 1.003, 64), s.y - 0.18, s.y + 0.18, { smooth: true }));

  return finish("landmark-pearl", all, m, H, new THREE.Vector3(0, high.y, 0));
}

// ---------------------------------------------------------------------
// The tallest: a rounded triangle in plan that turns 120° on the way up
// and narrows to 55%, a V-shaped notch running up one corner (turning with
// it, so it draws the spiral line), and nine lit bands (gold at night), the
// ninth at the top as its crown.

export const SHANGHAI_TOWER_TWIST = TAU / 3;

export function buildShanghaiTower(detail: Detail, m: LandmarkMaterials): Landmark {
  const near = detail === "near";
  const H = LANDMARK_HEIGHTS.shanghaiTower;
  const all = parts();
  const n = near ? 160 : 48;
  const levels = near ? 64 : 12;
  const R0 = 4.0;
  const notchWidth = near ? 0.2 : 0.27; // radians either side of the corner
  const radius = (t: number) => R0 * (1 - 0.45 * Math.pow(t, 1.15));
  // The section at height y: sampled so one point always sits in the notch
  const plan = (y: number, grow = 1): P2[] => {
    const t = y / H;
    const turn = SHANGHAI_TOWER_TWIST * t;
    const R = radius(t) * grow;
    return Array.from({ length: n }, (_, j) => {
      const d = (j / n) * TAU; // angle from the notch
      const off = Math.min(d, TAU - d);
      const r = R * (1 + 0.07 * Math.cos(3 * d)) * (1 - 0.17 * Math.max(0, 1 - off / notchWidth));
      const a = turn + d;
      return [r * Math.cos(a), r * Math.sin(a)] as const;
    });
  };
  const rings: Ring[] = [];
  for (let i = 0; i < levels; i++) {
    const y = (i / (levels - 1)) * H;
    rings.push({ y, pts: plan(y) });
  }
  all.glass.push(loft(rings, { smooth: true, capBottom: true, capTop: true }));
  // Nine bands, a little proud of the glass, the last one at the top
  const band = 0.42;
  for (let k = 1; k <= 9; k++) {
    const y1 = k === 9 ? H - 0.02 : (k / 9) * H - 0.6;
    const y0 = y1 - band;
    all.lit.push(
      loft(
        [
          { y: y0, pts: plan(y0, 1.018) },
          { y: y1, pts: plan(y1, 1.018) },
        ],
        { smooth: true, capBottom: true, capTop: true },
      ),
    );
  }
  return finish("landmark-twisted", all, m, H, new THREE.Vector3(0, H - 1.5, 0));
}

// ---------------------------------------------------------------------
// The pagoda: a square plan with notched corners, sixteen tiers each 1/8
// shorter than the one below, an eave stepping out at each tier's top, then
// a crown of six small stepped tiers (lit gold at night) and a spire.

export const JIN_MAO_TIERS = 16;

export function buildJinMao(detail: Detail, m: LandmarkMaterials): Landmark {
  const near = detail === "near";
  const H = LANDMARK_HEIGHTS.jinMao;
  const all = parts();
  // Square with notched corners (near), or chamfered (far)
  const plan = (a: number): P2[] => {
    if (!near) {
      const c = 0.7 * a;
      return [
        [a, -c],
        [a, c],
        [c, a],
        [-c, a],
        [-a, c],
        [-a, -c],
        [-c, -a],
        [c, -a],
      ];
    }
    const c = 0.8 * a;
    return [
      [a, -c],
      [a, c],
      [c, c],
      [c, a],
      [-c, a],
      [-c, c],
      [-a, c],
      [-a, -c],
      [-c, -c],
      [-c, -a],
      [c, -a],
      [c, -c],
    ];
  };
  const tiersTop = 32.5;
  const sum = (1 - Math.pow(7 / 8, JIN_MAO_TIERS)) / (1 / 8);
  const h0 = tiersTop / sum;
  const half = (y: number) => 2.8 * (1 - 0.3 * Math.pow(y / tiersTop, 2.6));
  let y = 0;
  for (let i = 0; i < JIN_MAO_TIERS; i++) {
    const h = h0 * Math.pow(7 / 8, i);
    const top = i === JIN_MAO_TIERS - 1 ? tiersTop : y + h;
    const a0 = half(y);
    const a1 = half(top) * 0.985;
    all.glass.push(
      loft([
        { y, pts: plan(a0) },
        { y: top, pts: plan(a1) },
      ]),
    );
    // The eave at the tier's top
    const eave = Math.min(0.16, h * 0.18);
    all.body.push(prism(plan(a0 * 1.08), top - eave, top, { caps: true }));
    // Near: vertical ribs on each face
    if (near)
      for (let f = 0; f < 4; f++) {
        const rot = (f / 4) * TAU;
        for (const s of [-0.55, -0.22, 0.22, 0.55]) {
          const rib = (a: number, yy: number): Ring => {
            const pts: P2[] = [
              [a - 0.02, s * a - 0.05],
              [a + 0.06, s * a - 0.05],
              [a + 0.06, s * a + 0.05],
              [a - 0.02, s * a + 0.05],
            ];
            const c = Math.cos(rot);
            const sn = Math.sin(rot);
            return { y: yy, pts: pts.map(([x, z]) => [x * c - z * sn, x * sn + z * c] as const) };
          };
          all.body.push(loft([rib(a0, y), rib(a1, top - eave)]));
        }
      }
    y = top;
  }
  all.glass.push(prism(plan(half(tiersTop) * 0.985), tiersTop - 0.01, tiersTop, { caps: true }));
  // The crown: six quick steps inward, each with its eave
  const crown: [number, number][] = [
    [1.7, 1.3],
    [1.4, 1.15],
    [1.1, 1.0],
    [0.8, 0.95],
    [0.55, 0.85],
    [0.38, 0.75],
  ];
  y = tiersTop;
  for (const [a, h] of crown) {
    all.lit.push(prism(plan(a), y, y + h - 0.12, { caps: true }));
    all.lit.push(prism(plan(a * 1.1), y + h - 0.12, y + h, { caps: true }));
    y += h;
  }
  // The spire
  const spireRound = near ? 8 : 6;
  all.body.push(
    loft(
      [
        { y, pts: circle(0.32, spireRound) },
        { y: y + 1.2, pts: circle(0.2, spireRound) },
        { y: y + 2.6, pts: circle(0.09, spireRound) },
        { y: H, pts: circle(0.015, spireRound) },
      ],
      { smooth: true, capTop: true },
    ),
  );
  return finish("landmark-pagoda", all, m, H, new THREE.Vector3(0, tiersTop + 2.4, 0));
}

// ---------------------------------------------------------------------
// The opener: square at its foot, its depth narrowing in two gentle arcs
// to a blade at the top while its face widens a little, and through the
// top a trapezoid opening, wider at its top (about 50 m), framed in light.
// The opening looks along z: a viewer on the z axis sees through it.

export const WORLD_FINANCIAL_CENTER_OPENING = { top: 48.6, bottom: 44.0, topWidth: 5.0, bottomWidth: 3.5 } as const;

export function buildWorldFinancialCenter(detail: Detail, m: LandmarkMaterials): Landmark {
  const near = detail === "near";
  const H = LANDMARK_HEIGHTS.worldFinancialCenter;
  const all = parts();
  const cut = 42.0; // where the extruded top begins
  const levels = near ? 40 : 8;
  const width = (y: number) => lerp(2.6, 3.1, y / cut);
  const depth = (y: number) => 0.6 + 2.0 * Math.pow(Math.cos((y / cut) * (Math.PI / 2)), 1.2);
  const chamfer = (y: number) => depth(y) * (0.08 + 0.6 * Math.sin((y / cut) * Math.PI));
  const plan = (y: number): P2[] => {
    const w = width(y);
    const d = depth(y);
    const k = chamfer(y);
    return [
      [w, -d],
      [w, d - k],
      [w - k, d],
      [-w, d],
      [-w, -d + k],
      [-w + k, -d],
    ];
  };
  const rings: Ring[] = [];
  for (let i = 0; i < levels; i++) {
    const y = (i / (levels - 1)) * cut;
    rings.push({ y, pts: plan(y) });
  }
  all.glass.push(loft(rings, { capBottom: true }));

  // The top: the face's outline with the opening, extruded through the blade
  const O = WORLD_FINANCIAL_CENTER_OPENING;
  const frame = 0.1;
  const trapezoid = (grow: number) =>
    new THREE.Path([
      new THREE.Vector2(-(O.bottomWidth / 2 + grow), O.bottom - grow),
      new THREE.Vector2(O.bottomWidth / 2 + grow, O.bottom - grow),
      new THREE.Vector2(O.topWidth / 2 + grow, O.top + grow),
      new THREE.Vector2(-(O.topWidth / 2 + grow), O.top + grow),
    ]);
  const w1 = width(cut);
  const w2 = w1 + 0.05;
  const thick = depth(cut) * 2;
  const outline = new THREE.Shape([new THREE.Vector2(-w1, cut), new THREE.Vector2(w1, cut), new THREE.Vector2(w2, H), new THREE.Vector2(-w2, H)]);
  outline.holes.push(trapezoid(frame));
  const head = indexed(new THREE.ExtrudeGeometry(outline, { depth: thick, bevelEnabled: false }));
  head.translate(0, 0, -thick / 2);
  all.glass.push(head);
  // The opening's frame: the lit part
  const rim = new THREE.Shape(trapezoid(frame).getPoints());
  rim.holes.push(trapezoid(0));
  const lit = indexed(new THREE.ExtrudeGeometry(rim, { depth: thick + 0.06, bevelEnabled: false }));
  lit.translate(0, 0, -(thick + 0.06) / 2);
  all.lit.push(lit);

  // Near: thin lit lines up the corners, as on the night painting
  if (near) {
    const e = 0.04;
    const strip = (x: number, z: number): P2[] => [
      [x + e, z - e],
      [x + e, z + e],
      [x - e, z + e],
      [x - e, z - e],
    ];
    for (let c = 0; c < 6; c++) all.lit.push(loft(rings.map((r) => ({ y: r.y, pts: strip(r.pts[c][0], r.pts[c][1]) }))));
    for (const sx of [-1, 1])
      for (const sz of [-1, 1])
        all.lit.push(
          loft([
            { y: cut, pts: strip(sx * w1, (sz * thick) / 2) },
            { y: H, pts: strip(sx * w2, (sz * thick) / 2) },
          ]),
        );
  }
  return finish("landmark-opener", all, m, H, new THREE.Vector3(0, (O.top + O.bottom) / 2, 0));
}
