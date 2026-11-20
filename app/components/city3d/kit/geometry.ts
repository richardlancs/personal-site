import * as THREE from "three";
import { mergeGeometries, mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import type { Rng } from "../rng";

// The city kit's modeling toolkit, carried over from the park's
// (world3d/geometry.ts): merge, box, at, tube, wire, blob; the park's
// trees, bushes, vines and grass are not carried. New here: `prism`, the
// towers' faceted shafts, whose side faces carry `aFace` so a shader can lay
// a whole number of window bays across each face (kit/windows.ts).

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

export const merge = (parts: THREE.BufferGeometry[]) => {
  if (!parts.length) return new THREE.BufferGeometry();
  // Drop attributes not every part has, so they can be merged
  const names = parts.map((p) => new Set(Object.keys(p.attributes)));
  const shared = [...names[0]].filter((n) => names.every((s) => s.has(n)));
  for (const p of parts) {
    for (const n of Object.keys(p.attributes)) if (!shared.includes(n)) p.deleteAttribute(n);
  }
  const indexed = parts.map((p) => (p.index ? p.toNonIndexed() : p));
  return mergeGeometries(indexed, false)!;
};

// A box whose texture keeps the same size per metre on every face
export function box(w: number, h: number, d: number, density = 0.5) {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv as THREE.BufferAttribute;
  const faces = [
    [d, h],
    [d, h],
    [w, d],
    [w, d],
    [w, h],
    [w, h],
  ];
  for (let f = 0; f < 6; f++) {
    for (let k = 0; k < 4; k++) {
      const i = f * 4 + k;
      uv.setXY(i, uv.getX(i) * faces[f][0] * density, uv.getY(i) * faces[f][1] * density);
    }
  }
  return g;
}

export const at = (g: THREE.BufferGeometry, x: number, y: number, z: number, ry = 0, rx = 0, rz = 0) => {
  const m = new THREE.Matrix4().compose(v(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), v(1, 1, 1));
  return g.applyMatrix4(m);
};

// A tube along a curve whose radius changes along it (pipes, cords, rails)
export function tube(points: THREE.Vector3[], radius: (t: number) => number, segments = 12, radial = 6) {
  const curve = new THREE.CatmullRomCurve3(points);
  const frames = curve.computeFrenetFrames(segments, false);
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const index: number[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const p = curve.getPointAt(t);
    const r = radius(t);
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      const n = frames.normals[i].clone().multiplyScalar(Math.cos(a)).add(frames.binormals[i].clone().multiplyScalar(Math.sin(a)));
      positions.push(p.x + n.x * r, p.y + n.y * r, p.z + n.z * r);
      normals.push(n.x, n.y, n.z);
      uvs.push(j / radial, t * curve.getLength() * 0.5);
    }
  }
  for (let i = 0; i < segments; i++)
    for (let j = 0; j < radial; j++) {
      const a = i * (radial + 1) + j;
      const b = a + radial + 1;
      index.push(a, b, a + 1, b, b + 1, a + 1);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(index);
  return g;
}

// A wire hanging between two points
export function wire(a: THREE.Vector3, b: THREE.Vector3, sag: number, r = 0.015) {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    pts.push(a.clone().lerp(b, t).add(v(0, -Math.sin(t * Math.PI) * sag, 0)));
  }
  return tube(pts, () => r, 16, 4);
}

// A lumpy ball (a shrub, a rock, a cushion)
export function blob(r: Rng, radius: number, squash = 0.8, lumps = 0.22, detail = 2) {
  // Welded, so the normals come out smooth: soft masses, not facets
  const g = mergeVertices(new THREE.IcosahedronGeometry(radius, detail).deleteAttribute("normal").deleteAttribute("uv"));
  const p = g.attributes.position as THREE.BufferAttribute;
  const seeds = [r(), r(), r()].map((s) => s * 10);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    const n =
      Math.sin(x * 2.1 + seeds[0]) * Math.sin(y * 2.7 + seeds[1]) * Math.sin(z * 2.3 + seeds[2]) +
      0.5 * Math.sin(x * 5.3 + seeds[1]) * Math.sin(z * 4.7 + seeds[0]);
    const k = 1 + n * lumps;
    p.setXYZ(i, x * k, y * k * squash, z * k);
  }
  g.computeVertexNormals();
  return g;
}

// A straight prism with flat sides, standing on y0 up to y1, its outline a
// regular polygon of `sides` corners stretched to `sx` × `sz` (so sides 4,
// sx = sz = 1, phase π/4 is a unit box), with a flat roof and no floor
// (nothing ever sees under a tower). Non-indexed, flat normals.
//
// Each vertex carries `aFace` (vec3): for a side face, its middle and half
// width measured along the face's own horizontal tangent cross(up, normal)
// in this geometry's units, and the face's number round the outline; for
// the roof (0, 0, -1). After the instance's scale `s` the face's half width
// is aFace.y × length(s × tangent), which is how windows.ts fits a whole
// number of bays to every face.
export function prism(sides: number, sx: number, sz: number, y0: number, y1: number, phase = 0, faceBase = 0) {
  const pos: number[] = [];
  const nor: number[] = [];
  const face: number[] = [];
  const corner = (i: number) => {
    const a = phase + (i / sides) * Math.PI * 2;
    return [Math.cos(a) * sx * 0.5 * (sides === 4 ? Math.SQRT2 : 1), Math.sin(a) * sz * 0.5 * (sides === 4 ? Math.SQRT2 : 1)] as const;
  };
  const up = v(0, 1, 0);
  for (let i = 0; i < sides; i++) {
    const [ax, az] = corner(i);
    const [bx, bz] = corner(i + 1);
    // outward normal of the edge a→b (counter-clockwise seen from above
    // in x/z means the outside is to the right of a→b in x, -z)
    const n = v(bz - az, 0, -(bx - ax)).normalize();
    const mid = v((ax + bx) / 2, 0, (az + bz) / 2);
    if (n.dot(mid) < 0) n.negate();
    const t = new THREE.Vector3().crossVectors(up, n).normalize();
    const c = mid.dot(t);
    const hw = Math.abs(v(bx - ax, 0, bz - az).dot(t)) / 2;
    // two triangles, wound so the outside faces out
    const A = [ax, y0, az];
    const B = [bx, y0, bz];
    const C = [bx, y1, bz];
    const D = [ax, y1, az];
    const quad = [A, B, C, A, C, D];
    // check the winding against the normal; flip if needed
    const e1 = v(B[0] - A[0], B[1] - A[1], B[2] - A[2]);
    const e2 = v(C[0] - A[0], C[1] - A[1], C[2] - A[2]);
    const tris = e1.cross(e2).dot(n) > 0 ? quad : [A, C, B, A, D, C];
    for (const p of tris) {
      pos.push(p[0], p[1], p[2]);
      nor.push(n.x, n.y, n.z);
      face.push(c, hw, faceBase + i);
    }
  }
  // the roof, a fan facing up
  for (let i = 0; i < sides; i++) {
    const [ax, az] = corner(i);
    const [bx, bz] = corner(i + 1);
    const tri = [
      [0, y1, 0],
      [ax, y1, az],
      [bx, y1, bz],
    ];
    const e1 = v(tri[1][0], 0, tri[1][2]);
    const e2 = v(tri[2][0], 0, tri[2][2]);
    const ordered = e1.cross(e2).y > 0 ? tri : [tri[0], tri[2], tri[1]];
    for (const p of ordered) {
      pos.push(p[0], p[1], p[2]);
      nor.push(0, 1, 0);
      face.push(0, 0, -1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute("aFace", new THREE.Float32BufferAttribute(face, 3));
  return g;
}
