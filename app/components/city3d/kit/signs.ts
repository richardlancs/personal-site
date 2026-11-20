import { invalidate } from "@react-three/fiber";
import * as THREE from "three";
import { world } from "../store";
import { rng } from "../rng";
import { neonMaterial, SCENE_TONES, screenMaterial } from "./neon";
import { surface } from "./surface";
import { fit, fonts, fontsReady } from "./textures";

// The city's signs. Two kinds, and only two:
//
// - buildSign: a sign that says where it goes, the only words in the
//   scene (the five sections' titles on the riverside's boards). A soft
//   black board (the interface's --panel, #181b23) with the word in its
//   text colour (--text, #e6e9ee) in the display face (Rajdhani 700), set
//   smaller if it would outrun the board (textures.ts: fit), and a thin
//   lit edge in its tone (the riverside's: cyan, the interface's --cyan).
//   The face shows exactly as painted through the tone mapping
//   (neon.ts: screenMaterial), so the word measures as the tokens do; the
//   edge is neon, so it blooms at night. Painted at once in whatever face
//   is there, and again once the display face has loaded.
// - buildMarkSign: decorative signage, as on the plates' streets: a panel
//   of light in a tone with bars, frames and dots on it, never letters.
//
// Three shapes for either: "board" (a flat board, its back and frame
// behind it), "blade" (a panel standing out from a wall, the same face
// both sides, on two arms reaching left to the wall) and "roof" (a board
// on two legs and a rail, for a roof or a gantry). The group's origin is
// the board's middle; it faces +z. Its size is the face's: a board of
// w × h has a back w + 0.16 by h + 0.16 and 0.12 deep, the face 0.07 in
// front of the back's middle (the riverside's boards, unchanged).
//
// Each sign is three draw calls (frame, face, edge) and a few dozen
// triangles. Materials are the kit's, shared; the caller disposes the
// geometry with disposeSign(group). On the mobile tier, which has no
// bloom, glowPoints(group) gives the points for neon.ts: glowSprites
// (mark signs only; a word's board keeps its contrast without one).
// The face's canvas is 1024 px along its long side on the desktop tiers,
// 512 on mobile (under 1.5 MB with mipmaps, per distinct sign).

export type SignKind = "board" | "blade" | "roof";
// A mark sign's shape: a sign's, or "panel": a plain glowing rectangle on a
// wall bracket (both faces, a hair-thin rim, no dark back, no bars)
export type MarkKind = SignKind | "panel";
type Tone = keyof typeof SCENE_TONES;

// The interface's tokens (app/city.css): --panel, --text; the frame's grey
const BOARD = "#181b23";
const WORD = "#e6e9ee";
const FRAME = "#22252b";

const BACK_LIP = 0.08; // how far the back stands out round the face
const BACK_DEPTH = 0.12;
const FACE_Z = 0.07;
const EDGE_NIGHT = 0.45; // the edge's brightness at night, of the full neon's

// The face's canvas: its long side 1024 px (512 on mobile)
function canvasSize(w: number, h: number): [number, number] {
  const long = world.get().quality === "mobile" ? 512 : 1024;
  return w >= h ? [long, Math.max(32, Math.round((long * h) / w))] : [Math.max(32, Math.round((long * w) / h)), long];
}

// Boxes [w, h, d, x, y, z] in one geometry (one draw call)
function boxes(list: readonly (readonly [number, number, number, number, number, number])[]): THREE.BufferGeometry {
  const parts = list.map(([w, h, d, x, y, z]) => new THREE.BoxGeometry(w, h, d).translate(x, y, z).toNonIndexed());
  const out = new THREE.BufferGeometry();
  for (const name of ["position", "normal", "uv"] as const) {
    const size = parts[0].getAttribute(name).itemSize;
    const data = new Float32Array(parts.reduce((n, p) => n + p.getAttribute(name).array.length, 0));
    let at = 0;
    for (const p of parts) {
      data.set(p.getAttribute(name).array as Float32Array, at);
      at += p.getAttribute(name).array.length;
    }
    out.setAttribute(name, new THREE.BufferAttribute(data, size));
  }
  parts.forEach((p) => p.dispose());
  out.computeBoundingSphere();
  return out;
}

// The face: one plane in front, and for a blade a second facing back
// (turned, not mirrored, so it reads the same from either side)
function faceGeometry(w: number, h: number, kind: MarkKind): THREE.BufferGeometry {
  const front = new THREE.PlaneGeometry(w, h).translate(0, 0, FACE_Z);
  if (kind !== "blade" && kind !== "panel") return front;
  const back = new THREE.PlaneGeometry(w, h).rotateY(Math.PI).translate(0, 0, -FACE_Z);
  const out = new THREE.BufferGeometry();
  for (const name of ["position", "normal", "uv"] as const) {
    const a = front.getAttribute(name).array as Float32Array;
    const b = back.getAttribute(name).array as Float32Array;
    const data = new Float32Array(a.length + b.length);
    data.set(a);
    data.set(b, a.length);
    out.setAttribute(name, new THREE.BufferAttribute(data, front.getAttribute(name).itemSize));
  }
  const fi = front.getIndex()!.array;
  out.setIndex([...fi, ...Array.from(back.getIndex()!.array, (i) => i + front.getAttribute("position").count)]);
  front.dispose();
  back.dispose();
  out.computeBoundingSphere();
  return out;
}

// What holds the board: its back, and the arms (blade) or legs and rail
// (roof); a panel's, a thin rim between its faces and the blade's arms
function frameGeometry(w: number, h: number, kind: MarkKind): THREE.BufferGeometry {
  const lip = Math.min(0.02, Math.min(w, h) * 0.04);
  const list: [number, number, number, number, number, number][] = [kind === "panel" ? [w + lip * 2, h + lip * 2, FACE_Z * 1.4, 0, 0, 0] : [w + BACK_LIP * 2, h + BACK_LIP * 2, BACK_DEPTH, 0, 0, 0]];
  const bar = Math.max(0.04, Math.min(w, h) * 0.05);
  if (kind === "panel") {
    const reach = 0.3;
    for (const y of [h * 0.35, -h * 0.35]) list.push([reach, bar * 0.6, bar * 0.6, -(w / 2 + lip + reach / 2), y, 0]);
  }
  if (kind === "blade") {
    const reach = 0.3;
    for (const y of [h * 0.35, -h * 0.35]) list.push([reach, bar, bar, -(w / 2 + BACK_LIP + reach / 2), y, 0]);
  }
  if (kind === "roof") {
    const leg = h * 0.45;
    for (const x of [-w * 0.35, w * 0.35]) list.push([bar, leg, bar, x, -(h / 2 + BACK_LIP + leg / 2), -0.12]);
    list.push([w * 0.85, bar, bar, 0, -(h / 2 + BACK_LIP + leg - bar / 2), -0.12]);
  }
  return boxes(list);
}

// The lit edge: four thin bars on the face's rim, through the board's
// depth (so a blade shows it from both sides)
function edgeGeometry(w: number, h: number): THREE.BufferGeometry {
  const t = Math.min(0.08, Math.max(0.015, Math.min(w, h) * 0.025));
  const d = BACK_DEPTH + 0.04;
  return boxes([
    [w, t, d, 0, h / 2 - t / 2, 0],
    [w, t, d, 0, -h / 2 + t / 2, 0],
    [t, h - t * 2, d, -w / 2 + t / 2, 0, 0],
    [t, h - t * 2, d, w / 2 - t / 2, 0, 0],
  ]);
}

// Where a mark sign's glow sits on the mobile tier: dots along its long
// side, on its face (glowSprites draws each toward the camera, so it
// glows over the panel as the bloom does, without cutting into it)
function glowAlong(w: number, h: number, color: string, strength: number) {
  const long = Math.max(w, h);
  const short = Math.min(w, h);
  const n = Math.max(1, Math.round(long / short));
  const out: { pos: THREE.Vector3; color: string; size: number }[] = [];
  for (let i = 0; i < n; i++) {
    const k = (i + 0.5) / n - 0.5;
    out.push({ pos: new THREE.Vector3(w >= h ? k * w : 0, w >= h ? 0 : k * h, FACE_Z), color, size: short * strength });
  }
  return out;
}

function assemble(w: number, h: number, kind: MarkKind, tone: Tone, face: THREE.Material, glow: number | null) {
  const group = new THREE.Group();
  const frame = new THREE.Mesh(frameGeometry(w, h, kind), surface({ color: FRAME }));
  frame.name = "sign-frame";
  const faceMesh = new THREE.Mesh(faceGeometry(w, h, kind), face);
  faceMesh.name = "sign-face";
  // By day the tone itself; at night a dimmed tone (EDGE_NIGHT × NEON_HDR,
  // just over the bloom threshold), so its glow stays on the rim and off
  // the word, however small the board is on screen
  const lit = `#${new THREE.Color(SCENE_TONES[tone]).multiplyScalar(EDGE_NIGHT).getHexString()}`;
  const edge = new THREE.Mesh(edgeGeometry(w, h), neonMaterial(lit, { dayColor: SCENE_TONES[tone] }));
  edge.name = "sign-edge";
  group.add(frame, faceMesh);
  // a panel is its own light: no edge round it
  if (kind !== "panel") group.add(edge);
  else edge.geometry.dispose();
  // (a word's board has none: a glow over it would cost the word its
  // contrast; its edge is bright enough on its own)
  group.userData.glow = glow ? glowAlong(w, h, SCENE_TONES[tone], glow) : [];
  return { group, face: faceMesh };
}

// A word, centred, as large as the board allows (up to 60% of its height,
// and 84% of its width: the riverside's proportions), along a blade's
// length when the blade is tall
function paintWord(text: string, edge: string, vertical: boolean) {
  return (g: CanvasRenderingContext2D, w: number, h: number) => {
    const s = Math.min(w, h) / 174; // the riverside's 512 × 174 board is s = 1
    g.fillStyle = BOARD;
    g.fillRect(0, 0, w, h);
    g.strokeStyle = edge;
    g.lineWidth = 4 * s;
    g.strokeRect(2 * s, 2 * s, w - 4 * s, h - 4 * s);
    const display = fonts().display;
    const [along, across] = vertical ? [h, w] : [w, h];
    g.save();
    g.translate(w / 2, h / 2);
    if (vertical) g.rotate(-Math.PI / 2);
    const size = fit(g, text, (px) => `700 ${px}px ${display}`, Math.round(across * 0.6), along * 0.84, 8);
    g.fillStyle = WORD;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(text, 0, size * 0.04);
    g.restore();
  };
}

export function buildSign(o: { text: string; tone: Tone; w: number; h: number; kind: SignKind }): { group: THREE.Group; face: THREE.Mesh; anchor: THREE.Vector3 } {
  const [cw, ch] = canvasSize(o.w, o.h);
  const vertical = o.kind === "blade" && o.h > o.w * 1.3;
  const face = screenMaterial(paintWord(o.text, SCENE_TONES[o.tone], vertical), { w: cw, h: ch, key: `sign:${o.text}:${o.tone}:${vertical ? "v" : "h"}:${cw}x${ch}` });
  const built = assemble(o.w, o.h, o.kind, o.tone, face, null);
  built.group.name = `sign:${o.text}`;
  // Again once the display face is in, and a frame drawn to show it
  fontsReady().then(
    () => {
      (face.userData.redraw as () => void)();
      invalidate();
    },
    () => {},
  );
  return { ...built, anchor: new THREE.Vector3(0, 0, FACE_Z) };
}

// A mark sign's face: a panel lit in its tone, brightest in the middle,
// with bars (like lines of writing seen too far off to read), a frame
// inset from the edge and a few dots, all from the seed
function paintMarks(seed: number, tone: string, vertical: boolean) {
  return (g: CanvasRenderingContext2D, w: number, h: number) => {
    const r = rng(seed);
    const c = new THREE.Color(tone);
    const css = (k: number, a = 1) => `rgba(${Math.round(Math.min(1, c.r * k) * 255)},${Math.round(Math.min(1, c.g * k) * 255)},${Math.round(Math.min(1, c.b * k) * 255)},${a})`;
    const bg = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.7);
    bg.addColorStop(0, "rgba(255,246,252,1)");
    bg.addColorStop(0.35, css(1.05));
    bg.addColorStop(1, css(0.55));
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    const s = Math.min(w, h);
    const pad = s * 0.1;
    g.strokeStyle = css(0.35, 0.75);
    g.lineWidth = Math.max(2, s * 0.025);
    g.strokeRect(pad, pad, w - pad * 2, h - pad * 2);
    // Bars: rows across a board, blocks down a tall blade
    g.fillStyle = css(0.3, 0.7);
    const rows = 1 + Math.floor(r() * 3);
    const inner = { x: pad * 1.8, y: pad * 1.8, w: w - pad * 3.6, h: h - pad * 3.6 };
    for (let i = 0; i < rows; i++) {
      if (vertical) {
        const bw = inner.w / rows;
        let y = inner.y;
        while (y < inner.y + inner.h * 0.92) {
          const len = inner.h * r.range(0.08, 0.2);
          g.fillRect(inner.x + i * bw + bw * 0.15, y, bw * 0.7, Math.min(len, inner.y + inner.h - y));
          y += len + inner.h * r.range(0.03, 0.06);
        }
      } else {
        const bh = inner.h / rows;
        let x = inner.x;
        while (x < inner.x + inner.w * 0.92) {
          const len = inner.w * r.range(0.06, 0.18);
          g.fillRect(x, inner.y + i * bh + bh * 0.2, Math.min(len, inner.x + inner.w - x), bh * 0.6);
          x += len + inner.w * r.range(0.02, 0.05);
        }
      }
    }
    // Dots, in a row along one end
    g.fillStyle = "rgba(255,255,255,0.8)";
    const dots = Math.floor(r() * 4);
    for (let i = 0; i < dots; i++) {
      g.beginPath();
      const at = pad * 0.5 + (i + 0.5) * s * 0.07;
      if (vertical) g.arc(w / 2, h - at, s * 0.022, 0, Math.PI * 2);
      else g.arc(w - at, h / 2, s * 0.022, 0, Math.PI * 2);
      g.fill();
    }
  };
}

// A panel's face: its tone, brightest (near white) in a soft band down its
// middle, a little deeper at its ends: a lit box seen from the street
function paintPanel(tone: string, vertical: boolean) {
  return (g: CanvasRenderingContext2D, w: number, h: number) => {
    const c = new THREE.Color(tone);
    const css = (k: number) => `rgb(${Math.round(Math.min(1, c.r * k) * 255)},${Math.round(Math.min(1, c.g * k) * 255)},${Math.round(Math.min(1, c.b * k) * 255)})`;
    const across = vertical ? g.createLinearGradient(0, 0, w, 0) : g.createLinearGradient(0, 0, 0, h);
    across.addColorStop(0, css(0.82));
    across.addColorStop(0.5, css(1.12));
    across.addColorStop(1, css(0.82));
    g.fillStyle = across;
    g.fillRect(0, 0, w, h);
    const along = vertical ? g.createLinearGradient(0, 0, 0, h) : g.createLinearGradient(0, 0, w, 0);
    along.addColorStop(0, "rgba(0,0,0,0.12)");
    along.addColorStop(0.2, "rgba(255,255,255,0.08)");
    along.addColorStop(0.8, "rgba(255,255,255,0.08)");
    along.addColorStop(1, "rgba(0,0,0,0.12)");
    g.fillStyle = along;
    g.fillRect(0, 0, w, h);
  };
}

export function buildMarkSign(o: { seed: number; tone: Tone; w: number; h: number; kind: MarkKind }): THREE.Group {
  if (o.kind === "panel") {
    // no detail at all: a small canvas does
    const vertical = o.h > o.w;
    const [pw, ph] = vertical ? [16, 64] : [64, 16];
    const face = screenMaterial(paintPanel(SCENE_TONES[o.tone], vertical), { w: pw, h: ph, key: `panel:${o.tone}:${vertical ? "v" : "h"}`, glow: 1.6 });
    const { group } = assemble(o.w, o.h, "panel", o.tone, face, 2.2);
    group.name = `panel:${o.seed}`;
    return group;
  }
  const [cw, ch] = canvasSize(o.w, o.h);
  const [mw, mh] = [Math.max(32, cw >> 2), Math.max(32, ch >> 2)]; // marks need no fine detail: a quarter the size
  const vertical = o.h > o.w * 1.3;
  const face = screenMaterial(paintMarks(o.seed, SCENE_TONES[o.tone], vertical), { w: mw, h: mh, key: `mark:${o.seed}:${o.tone}:${vertical ? "v" : "h"}:${mw}x${mh}`, glow: 1.6 });
  const { group } = assemble(o.w, o.h, o.kind, o.tone, face, 2.2);
  group.name = `mark:${o.seed}`;
  return group;
}

// The points mobile's glow sprites go on (neon.ts: glowSprites), for
// every sign under `root`, in world space: call once the signs are
// placed (it updates the world matrices)
export function glowPoints(root: THREE.Object3D): { pos: THREE.Vector3; color: string; size: number }[] {
  root.updateWorldMatrix(true, true);
  const out: { pos: THREE.Vector3; color: string; size: number }[] = [];
  root.traverse((o) => {
    const glow = o.userData.glow as { pos: THREE.Vector3; color: string; size: number }[] | undefined;
    if (!glow) return;
    const scale = o.getWorldScale(new THREE.Vector3()).x;
    for (const p of glow) out.push({ pos: o.localToWorld(p.pos.clone()), color: p.color, size: p.size * scale });
  });
  return out;
}

// A sign's geometry, freed (its materials are shared: kit/materials.ts)
export function disposeSign(group: THREE.Object3D) {
  group.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).geometry.dispose();
  });
}
