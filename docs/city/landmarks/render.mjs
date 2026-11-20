// Renders the four landmarks side by side to PNGs in this folder, with a
// small software rasteriser (orthographic, z-buffered, flat-shaded): no
// WebGL, no dev server, no new dependency. Not served.
//
//   node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON docs/city/landmarks/render.mjs
//
// landmarks-far.png       the "far" level, turned a little, shaded
// landmarks-near.png      the "near" level, the same view
// landmarks-silhouette.png the "far" level straight on, flat grey on black
//                          (what the skyline across the river has to carry)
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import * as THREE from "three";
import { buildJinMao, buildPearlTower, buildShanghaiTower, buildWorldFinancialCenter } from "../../../app/components/city3d/kit/landmarks.ts";

const require = createRequire(import.meta.url);
const sharp = require("sharp");
const here = fileURLToPath(new URL(".", import.meta.url));

const SS = 2; // supersampling
const SCALE = 14; // pixels per world unit (10 m) in the output
const materials = () => ({ body: new THREE.MeshBasicMaterial(), glass: new THREE.MeshBasicMaterial(), lit: new THREE.MeshBasicMaterial() });
// Left to right as on the plate: the spheres, the opener, the pagoda, the tallest
const order = [
  ["pearl", buildPearlTower, [236, 120, 170]],
  ["opener", buildWorldFinancialCenter, [110, 220, 240]],
  ["pagoda", buildJinMao, [245, 190, 100]],
  ["twisted", buildShanghaiTower, [245, 190, 100]],
];
const colours = { body: [205, 200, 195], glass: [120, 160, 205] };

function render(detail, { yaw, pitch, silhouette }) {
  const towers = order.map(([name, build, lit]) => ({ name, lit, l: build(detail, materials()) }));
  const rot = new THREE.Matrix4().makeRotationX(pitch).multiply(new THREE.Matrix4().makeRotationY(yaw));
  // Lay them out along x with gaps, measured in the view
  const s = SCALE * SS;
  const gap = 3;
  let x = gap;
  const placed = towers.map((t) => {
    const b = new THREE.Box3();
    const p = new THREE.Vector3();
    for (const m of t.l.group.children) {
      const pos = m.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) b.expandByPoint(p.fromBufferAttribute(pos, i).applyMatrix4(rot));
    }
    const at = x - b.min.x;
    x += b.max.x - b.min.x + gap;
    return { ...t, at, box: b };
  });
  const top = Math.max(...placed.map((t) => t.box.max.y)) + 2;
  const bottom = Math.min(...placed.map((t) => t.box.min.y)) - 1;
  const W = Math.ceil(x * s);
  const H = Math.ceil((top - bottom) * s);
  const rgb = new Uint8Array(W * H * 3);
  const depth = new Float32Array(W * H).fill(-Infinity);
  // Background: a dusk-blue gradient, or black for the silhouette
  for (let py = 0; py < H; py++)
    for (let px = 0; px < W; px++) {
      const k = (py * W + px) * 3;
      const t = py / H;
      const bg = silhouette ? [0, 0, 0] : [40 + 50 * t, 70 + 60 * t, 120 + 60 * t];
      rgb.set(bg, k);
    }
  const light = new THREE.Vector3(-0.5, 0.6, 0.8).normalize();
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  for (const t of placed)
    for (const m of t.l.group.children) {
      const g = m.geometry;
      const pos = g.attributes.position;
      const idx = g.index;
      const base = m.name === "lit" ? t.lit : colours[m.name];
      for (let k = 0; k < idx.count; k += 3) {
        a.fromBufferAttribute(pos, idx.getX(k)).applyMatrix4(rot);
        b.fromBufferAttribute(pos, idx.getX(k + 1)).applyMatrix4(rot);
        c.fromBufferAttribute(pos, idx.getX(k + 2)).applyMatrix4(rot);
        const n = b.clone().sub(a).cross(c.clone().sub(a)).normalize();
        if (n.z <= 0 && !silhouette) continue; // back face
        const shade = 0.45 + 0.55 * Math.max(0, n.dot(light));
        const col = silhouette ? [150, 150, 150] : base.map((v) => Math.min(255, v * shade));
        const P = [a, b, c].map((v) => [(v.x + t.at) * s, (top - v.y) * s, v.z]);
        fill(P, col);
      }
    }
  function fill(P, col) {
    const [[x0, y0, z0], [x1, y1, z1], [x2, y2, z2]] = P;
    const minX = Math.max(0, Math.floor(Math.min(x0, x1, x2)));
    const maxX = Math.min(W - 1, Math.ceil(Math.max(x0, x1, x2)));
    const minY = Math.max(0, Math.floor(Math.min(y0, y1, y2)));
    const maxY = Math.min(H - 1, Math.ceil(Math.max(y0, y1, y2)));
    const area = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0);
    if (Math.abs(area) < 1e-9) return;
    for (let py = minY; py <= maxY; py++)
      for (let px = minX; px <= maxX; px++) {
        const X = px + 0.5, Y = py + 0.5;
        const w0 = ((x1 - X) * (y2 - Y) - (x2 - X) * (y1 - Y)) / area;
        const w1 = ((x2 - X) * (y0 - Y) - (x0 - X) * (y2 - Y)) / area;
        const w2 = 1 - w0 - w1;
        if (w0 < 0 || w1 < 0 || w2 < 0) continue;
        const z = w0 * z0 + w1 * z1 + w2 * z2;
        const i = py * W + px;
        if (z <= depth[i]) continue;
        depth[i] = z;
        rgb.set(col, i * 3);
      }
  }
  return sharp(Buffer.from(rgb), { raw: { width: W, height: H, channels: 3 } }).resize(Math.round(W / SS), Math.round(H / SS));
}

const turned = { yaw: -0.35, pitch: 0.08 };
await render("far", turned).png().toFile(here + "landmarks-far.png");
await render("near", turned).png().toFile(here + "landmarks-near.png");
await render("far", { yaw: 0, pitch: 0, silhouette: true }).png().toFile(here + "landmarks-silhouette.png");
console.log("wrote landmarks-far.png, landmarks-near.png, landmarks-silhouette.png");
