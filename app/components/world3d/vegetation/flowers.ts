import * as THREE from "three";
import { mat } from "../props";
import { paint } from "../paint";
import { rng } from "../rng";

// What grows tall at the paths' edges and low in the grass in the intro
// film: pampas grass (susuki), its feathery seed heads catching the light,
// and small white daisies. Each is a pair of crossed cards with a painted
// picture on it, instanced, so hundreds cost one draw call each.

function card(draw: (g: CanvasRenderingContext2D, w: number, h: number) => void, w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d")!, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// A susuki stem: a thin stalk, a few long leaves at the foot, and a plume
// of fine pale threads drooping from the top, warm in the sun
function plumeTexture() {
  const r = rng(61);
  return card(
    (g, w, h) => {
      g.lineCap = "round";
      // Leaves at the foot, long and sunlit
      for (let i = 0; i < 4; i++) {
        g.strokeStyle = `hsl(${r.range(70, 86)}, ${r.range(40, 55)}%, ${r.range(48, 62)}%)`;
        g.lineWidth = r.range(4, 6);
        const x = w / 2 + r.range(-6, 6);
        g.beginPath();
        g.moveTo(x, h);
        g.quadraticCurveTo(x + r.range(-30, 30), h * 0.62, x + r.range(-50, 50), h * r.range(0.45, 0.6));
        g.stroke();
      }
      // The stalk
      g.strokeStyle = "#a8b56a";
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(w / 2, h);
      g.quadraticCurveTo(w / 2 + 4, h * 0.5, w / 2 + 10, h * 0.26);
      g.stroke();
      // The plume: a soft drooping body of pale gold, then threads over it
      g.fillStyle = "rgba(234, 215, 176, 0.75)";
      g.beginPath();
      g.moveTo(w / 2 + 10, h * 0.27);
      g.bezierCurveTo(w / 2 + 30, h * 0.18, w / 2 + 28, h * 0.05, w / 2 + 16, h * 0.03);
      g.bezierCurveTo(w / 2 + 4, h * 0.07, w / 2 + 4, h * 0.2, w / 2 + 10, h * 0.27);
      g.fill();
      for (let i = 0; i < 46; i++) {
        const t = i / 46;
        const x0 = w / 2 + 10 + t * 6;
        const y0 = h * (0.27 - t * 0.22);
        const len = r.range(16, 30) * (1 - t * 0.4);
        const a = -0.2 + r.range(-0.6, 0.9);
        g.strokeStyle = `rgb(${r.range(236, 252)}, ${r.range(222, 236)}, ${r.range(186, 206)})`;
        g.lineWidth = r.range(2, 3.2);
        g.beginPath();
        g.moveTo(x0, y0);
        g.quadraticCurveTo(x0 + Math.cos(a) * len * 0.6, y0 + Math.sin(a) * len * 0.4, x0 + Math.cos(a) * len, y0 + len * 0.5);
        g.stroke();
      }
    },
    128,
    256,
  );
}

// A daisy: white petals round a yellow eye, a short stem
function daisyTexture() {
  const r = rng(62);
  return card(
    (g, w, h) => {
      g.strokeStyle = "#6f9a4a";
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(w / 2, h);
      g.lineTo(w / 2 + 2, h * 0.42);
      g.stroke();
      const cx = w / 2 + 2;
      const cy = h * 0.36;
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2 + r.range(-0.1, 0.1);
        g.fillStyle = i % 3 ? "#fffaf0" : "#efe9dd";
        g.beginPath();
        g.ellipse(cx + Math.cos(a) * 9, cy + Math.sin(a) * 5, 7, 3, a, 0, Math.PI * 2);
        g.fill();
      }
      g.fillStyle = "#f2c23e";
      g.beginPath();
      g.arc(cx, cy, 4.5, 0, Math.PI * 2);
      g.fill();
    },
    48,
    64,
  );
}

// Two cards crossed, each made of a front and a back face (single-sided:
// a double-sided face would turn its "up" normal down on the back and fall
// into shade), all lit as if facing up so they read alike from any side
function crossedCard(w: number, h: number) {
  const base = new THREE.PlaneGeometry(w, h).translate(0, h / 2, 0);
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  for (let k = 0; k < 4; k++) {
    const p = base.clone().rotateY((k * Math.PI) / 2);
    const start = pos.length / 3;
    pos.push(...Array.from(p.attributes.position.array));
    uv.push(...Array.from(p.attributes.uv.array));
    idx.push(...Array.from(p.index!.array).map((i) => i + start));
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("normal", new THREE.Float32BufferAttribute(pos.map((_, i) => (i % 3 === 1 ? 1 : 0)), 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  return geo;
}

function instanced(geo: THREE.BufferGeometry, material: THREE.Material, spots: { x: number; z: number; s: number }[], seed: number) {
  const mesh = new THREE.InstancedMesh(geo, material, spots.length);
  const r = rng(seed);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  spots.forEach((s, i) => {
    m.compose(new THREE.Vector3(s.x, 0, s.z), q.setFromEuler(e.set(r.range(-0.06, 0.06), r() * Math.PI * 2, r.range(-0.06, 0.06))), new THREE.Vector3(s.s, s.s, s.s));
    mesh.setMatrixAt(i, m);
  });
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  return mesh;
}

export function buildPampas(spots: { x: number; z: number; s: number }[]) {
  const material = mat("pampas", () => paint({ map: plumeTexture(), alphaTest: 0.35, brush: 0.15 }));
  return instanced(crossedCard(0.75, 1.5), material, spots, 63);
}

export function buildDaisies(spots: { x: number; z: number; s: number }[]) {
  const material = mat("daisy", () => paint({ map: daisyTexture(), alphaTest: 0.4, brush: 0.1 }));
  return instanced(crossedCard(0.3, 0.4), material, spots, 64);
}
