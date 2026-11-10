import * as THREE from "three";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import { rng, type Rng } from "../rng";
import { world } from "../store";
import { vegMaterial, type Ramp } from "./shader";

// Foliage as painted masses: every crown, bush and far stand of trees is a
// set of rounded clusters. Each cluster is a lumpy ball (so it is solid,
// never see-through confetti) with a few large cut-out cards at its rim
// that turn to face the eye, so from any side its outline breaks into
// leafy lobes. A card is lit as the ball beneath it, so it reads as part of
// the mass, not as a separate scrap of leaves. Normals are bent between
// the cluster's own and the whole crown's, so light falls across each
// cluster and across the crown as one volume; how open each point is to
// the sky (deep inside or underneath is shaded) is baked per vertex.

export type Foliage = "green" | "ginkgo" | "maple" | "pine" | "bush" | "belt";

// Light, middle and shade, as they should read in the park's afternoon
// light. The green kinds take the reference's yellow-greens and deep teal;
// the maples and ginkgo keep their autumn colour with cool shade.
export const ramps: Record<Foliage, Ramp> = {
  green: { light: "#a9c47a", mid: "#6a9659", shadow: "#24525b" },
  bush: { light: "#a6c46e", mid: "#5f8c54", shadow: "#214d55" },
  pine: { light: "#93ad68", mid: "#4a7552", shadow: "#1b414b" },
  belt: { light: "#8aa86e", mid: "#527d5e", shadow: "#264f5a" },
  ginkgo: { light: "#f0d474", mid: "#cf9f3e", shadow: "#5f6651" },
  maple: { light: "#d4936a", mid: "#a54f35", shadow: "#4f3a42" },
};

export type Cluster = { center: THREE.Vector3; radius: number; squash?: number };

// One cut-out card: a rounded mass of overlapping leafy lobes, white with
// a little shading low in each lobe (the colour comes from the light)
let cardTexture: THREE.CanvasTexture | null = null;
function card() {
  if (cardTexture) return cardTexture;
  const S = 128;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const g = c.getContext("2d")!;
  const r = rng(4242);
  const lobes: [number, number, number][] = [[64, 66, 32]];
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + r.range(-0.25, 0.25);
    const d = r.range(25, 34);
    lobes.push([64 + Math.cos(a) * d, 66 + Math.sin(a) * d * 0.92, r.range(17, 24)]);
  }
  // Draw from the bottom up, so upper lobes overlap lower ones
  lobes.sort((a, b) => b[1] - a[1]);
  for (const [x, y, rad] of lobes) {
    const grad = g.createRadialGradient(x, y - rad * 0.35, rad * 0.2, x, y, rad);
    grad.addColorStop(0, "#ffffff");
    grad.addColorStop(0.75, "#f4f4f4");
    grad.addColorStop(1, "#d8d8d8");
    g.fillStyle = grad;
    g.beginPath();
    // A lobe with a few soft teeth, like a bunch of leaves seen together
    for (let k = 0; k <= 24; k++) {
      const a = (k / 24) * Math.PI * 2;
      const rr = rad * (1 + 0.09 * Math.sin(a * 5 + x) + 0.05 * Math.sin(a * 9 + y));
      g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    g.fill();
  }
  // A few leaf tips standing out of the mass
  g.fillStyle = "#f0f0f0";
  for (let i = 0; i < 7; i++) {
    const a = r() * Math.PI * 2;
    const d = r.range(46, 54);
    g.save();
    g.translate(64 + Math.cos(a) * d, 66 + Math.sin(a) * d * 0.92);
    g.rotate(a + Math.PI / 2);
    g.beginPath();
    g.ellipse(0, 0, r.range(3, 4.5), r.range(7, 10), 0, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }
  cardTexture = new THREE.CanvasTexture(c);
  cardTexture.colorSpace = THREE.SRGBColorSpace;
  cardTexture.anisotropy = 4;
  return cardTexture;
}

const materials = new Map<string, THREE.MeshLambertMaterial>();
export function foliageMaterial(kind: Foliage, height: number, amp = 0.26) {
  const key = `${kind}-${height.toFixed(1)}-${amp}`;
  let m = materials.get(key);
  if (!m) {
    // Soft cut-out edges only with the high tier's 4x multisampling: with
    // 2x (phones, low-power machines) coverage shows as a dither, and a
    // plain cut is cleaner. (The tier is in the store before any scene is
    // built: World3D.tsx sets it as it mounts.)
    m = vegMaterial({ ramp: ramps[kind], map: card(), wind: { amp, height }, coverage: world.get().quality === "high" });
    materials.set(key, m);
  }
  return m;
}

// Unit spheres to build clusters from, welded so the normals come out smooth
const spheres = new Map<number, { pos: Float32Array; index: ArrayLike<number> }>();
function sphere(detail: number) {
  let s = spheres.get(detail);
  if (!s) {
    const g = mergeVertices(new THREE.IcosahedronGeometry(1, detail).deleteAttribute("normal").deleteAttribute("uv"));
    s = { pos: g.attributes.position.array as Float32Array, index: g.index!.array };
    spheres.set(detail, s);
  }
  return s;
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// Everything that grows together: clusters of each crown (a crown is lit
// as one volume), written straight into one geometry.
// detail: the subdivision of a crown's largest masses (the smaller ones,
// whose outline the cards break up anyway, get one step); cards: rim
// cards per square metre of cluster (0 for none).
export function foliageGeometry(r: Rng, crowns: Cluster[][], { detail = 2, cards = 1 }: { detail?: number; cards?: number } = {}) {
  const balls = crowns.map((cl) => {
    const big = Math.max(...cl.map((c) => c.radius)) * 0.7;
    return cl.map((c) => sphere(c.radius >= big ? detail : Math.min(detail, 1)));
  });
  const counts = crowns.map((cl) => cl.map((c) => (cards > 0 ? Math.round((4 + c.radius * c.radius * 3) * cards) : 0)));
  let verts = 0;
  let tris = 0;
  crowns.forEach((cl, i) =>
    cl.forEach((_, j) => {
      verts += balls[i][j].pos.length / 3 + counts[i][j] * 4;
      tris += balls[i][j].index.length / 3 + counts[i][j] * 2;
    }),
  );
  const pos = new Float32Array(verts * 3);
  const nor = new Float32Array(verts * 3);
  const uv = new Float32Array(verts * 2);
  const veg = new Float32Array(verts * 4);
  const cardAt = new Float32Array(verts * 2);
  const index = verts > 65535 ? new Uint32Array(tris * 3) : new Uint16Array(tris * 3);
  let vi = 0;
  let ii = 0;
  const p = new THREE.Vector3();
  const n = new THREE.Vector3();
  const cn = new THREE.Vector3();
  let reach = 0;

  for (let ci = 0; ci < crowns.length; ci++) {
    const cl = crowns[ci];
    // The crown's centre and extent, for its volume and its shading
    const C = new THREE.Vector3();
    let w = 0;
    for (const c of cl) {
      const k = c.radius ** 3;
      C.addScaledVector(c.center, k);
      w += k;
    }
    C.divideScalar(w || 1);
    let RH = 0.1;
    let top = -Infinity;
    let bottom = Infinity;
    for (const c of cl) {
      RH = Math.max(RH, Math.hypot(c.center.x - C.x, c.center.z - C.z) + c.radius);
      top = Math.max(top, c.center.y + c.radius);
      bottom = Math.min(bottom, c.center.y - c.radius * 0.7);
    }
    const RV = Math.max(0.1, (top - bottom) / 2);
    const CY = (top + bottom) / 2;
    // Writes one vertex: its normal leans between the cluster's and the
    // crown's, and up a little toward the sky; deep inside the crown and
    // underneath a cluster it is shaded
    const vertex = (c: Cluster, x: number, y: number, z: number, u: number, v: number) => {
      cn.set(x - c.center.x, y - c.center.y, z - c.center.z).normalize();
      n.set((x - C.x) / RH, (y - CY) / RV, (z - C.z) / RH);
      const depth = Math.min(1, n.length());
      n.normalize().multiplyScalar(0.55).addScaledVector(cn, 0.45);
      n.y += 0.12;
      n.normalize();
      const open = (0.42 + 0.58 * smooth(0.3, 0.95, depth)) * (0.8 + 0.2 * (cn.y * 0.5 + 0.5)) * (0.85 + 0.15 * smooth(-1, 1, (y - CY) / RV));
      pos.set([x, y, z], vi * 3);
      nor.set([n.x, n.y, n.z], vi * 3);
      uv.set([u, v], vi * 2);
      veg.set([c.center.x, c.center.y, c.center.z, open], vi * 4);
      return vi++;
    };

    cl.forEach((c, j) => {
      const R = c.radius;
      const sq = c.squash ?? 0.85;
      const s0 = r() * 10;
      const s1 = r() * 10;
      const s2 = r() * 10;
      // The ball: lumpy, flatter underneath like a cloud
      const base = vi;
      const ball = balls[ci][j];
      for (let k = 0; k < ball.pos.length / 3; k++) {
        const x = ball.pos[k * 3];
        const y = ball.pos[k * 3 + 1];
        const z = ball.pos[k * 3 + 2];
        const lump = 1 + 0.13 * (Math.sin(x * 2.3 + s0) * Math.sin(y * 2.9 + s1) * Math.sin(z * 2.1 + s2) + 0.6 * Math.sin(x * 4.1 + s1) * Math.sin(z * 3.7 + s0));
        const yy = y < 0 ? y * 0.78 : y;
        vertex(c, c.center.x + x * R * lump, c.center.y + yy * R * lump * sq, c.center.z + z * R * lump, 0.5, 0.45);
      }
      for (let k = 0; k < ball.index.length; k++) index[ii++] = base + ball.index[k];
      // Cards around the rim, mostly on the cluster's outer side; they face
      // the eye (shader.ts), so the outline breaks into leafy lobes
      const out = new THREE.Vector3().subVectors(c.center, C).setY(0);
      if (out.lengthSq() > 1e-4) out.normalize();
      for (let k = 0; k < counts[ci][j]; k++) {
        p.set(r() - 0.5, r() * 0.9 - 0.25, r() - 0.5).normalize().addScaledVector(out, 0.5).normalize();
        const size = R * r.range(0.95, 1.25);
        reach = Math.max(reach, size * 0.707);
        const cx = c.center.x + p.x * R * 0.8;
        const cy = c.center.y + p.y * R * 0.8 * sq;
        const cz = c.center.z + p.z * R * 0.8;
        // Turned a little at random, so no two cards repeat the same outline
        const roll = r() * Math.PI * 2;
        const a = vi;
        for (let m = 0; m < 4; m++) {
          const u = m & 1;
          const v = m < 2 ? 1 : 0;
          const ang = roll + Math.atan2(v - 0.5, u - 0.5);
          vertex(c, cx, cy, cz, u, v);
          cardAt.set([Math.cos(ang) * size * 0.707, Math.sin(ang) * size * 0.707], (vi - 1) * 2);
        }
        index.set([a, a + 2, a + 1, a + 2, a + 3, a + 1], ii);
        ii += 6;
      }
    });
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  g.setAttribute("aVeg", new THREE.BufferAttribute(veg, 4));
  g.setAttribute("aCard", new THREE.BufferAttribute(cardAt, 2));
  g.setIndex(new THREE.BufferAttribute(index, 1));
  g.computeBoundingSphere();
  // The cards turn to face the eye, so they can reach past their centres
  g.boundingSphere!.radius += reach;
  return g;
}

// A crown's clusters around where its branches end: each end carries a
// mass with smaller ones on its upper and outer side, so the outline is
// layered and lobed rather than a row of equal balls. Clusters buried
// deep in the crown are left out (nothing sees them); one core mass
// fills the middle so no sky shows through the heart of the tree.
export function crownClusters(r: Rng, ends: Cluster[], { satellites = 3, squash = 0.85 } = {}) {
  const out: Cluster[] = [];
  for (const e of ends) {
    out.push({ center: e.center.clone(), radius: e.radius * 0.85, squash });
    const n = Math.max(1, Math.round(satellites * r.range(0.6, 1.3)));
    for (let i = 0; i < n; i++) {
      const a = r() * Math.PI * 2;
      const d = new THREE.Vector3(Math.cos(a), r.range(-0.1, 0.8), Math.sin(a)).normalize();
      out.push({ center: e.center.clone().addScaledVector(d, e.radius * r.range(0.55, 0.85)), radius: e.radius * r.range(0.42, 0.62), squash });
    }
  }
  const C = new THREE.Vector3();
  for (const c of out) C.add(c.center);
  C.divideScalar(out.length || 1);
  let R = 0;
  for (const c of out) R = Math.max(R, c.center.distanceTo(C) + c.radius);
  // (the lower ones stay: they're seen from below, and hold the branch ends)
  const kept = out.filter((c) => c.center.distanceTo(C) + c.radius > R * 0.55 || c.center.y < C.y);
  kept.push({ center: C.clone(), radius: R * 0.5, squash: 0.8 });
  return kept;
}
