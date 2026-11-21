import * as THREE from "three";
import { rng, type Rng } from "../rng";

// The city's canvas textures, painted from a seed: panels of text, masks
// and glows, the clock's face, soft dots, and (neon.ts) the faces of
// screens and signs. Nothing is downloaded. Textures with words wait for
// the site's fonts and redraw once they've loaded. Every texture the kit
// makes is counted by textureBytes(), the tiers' texture budget
// (tiers.ts: textureMB).

const cache = new Map<string, THREE.CanvasTexture>();

// Every texture the kit has made and not yet disposed (textureBytes)
const live = new Set<THREE.Texture>();

// Counts a texture the kit made (here or in neon.ts) until it's disposed
export function track<T extends THREE.Texture>(t: T): T {
  if (live.has(t)) return t;
  live.add(t);
  const gone = () => {
    live.delete(t);
    t.removeEventListener("dispose", gone);
  };
  t.addEventListener("dispose", gone);
  return t;
}

// What one texture holds on the GPU: four bytes a pixel, a third more for
// its mipmaps
function bytesOf(t: THREE.Texture): number {
  const img = t.image as { width?: number; height?: number } | undefined;
  if (!img?.width || !img?.height) return 0;
  const base = img.width * img.height * 4;
  return t.generateMipmaps && t.minFilter !== THREE.LinearFilter && t.minFilter !== THREE.NearestFilter ? Math.round((base * 4) / 3) : base;
}

// The texture memory of every texture the kit has made and not disposed,
// or, given a scene (or any object), of every distinct texture its
// meshes' materials hold, whoever made it: bytes, for the tiers' budget
// (tiers.ts: textureMB, in MB of 2^20 bytes)
export function textureBytes(root?: THREE.Object3D): number {
  const seen = new Set<THREE.Texture>();
  if (root) {
    root.traverse((o) => {
      const m = (o as THREE.Mesh).material;
      if (!m) return;
      for (const mat of Array.isArray(m) ? m : [m])
        for (const v of Object.values(mat as unknown as Record<string, unknown>)) if (v instanceof THREE.Texture) seen.add(v);
    });
  } else for (const t of live) seen.add(t);
  // (clones share their source's one upload: counted once)
  const sources = new Set<unknown>();
  let sum = 0;
  for (const t of seen) {
    if (sources.has(t.source)) continue;
    sources.add(t.source);
    sum += bytesOf(t);
  }
  return sum;
}

// Every texture this file cached is disposed and forgotten (the canvas
// going away: City3D.tsx, beside disposeShared())
export function disposeTextures() {
  for (const t of cache.values()) t.dispose();
  cache.clear();
}

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")!] as const;
}

function texture(key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D, r: Rng) => void, opts: { repeat?: boolean; text?: boolean; anisotropy?: number } = {}) {
  const hit = cache.get(key);
  if (hit) return hit;
  const [c, g] = canvas(w, h);
  const paintIt = () => {
    g.clearRect(0, 0, w, h);
    draw(g, rng(hash(key)));
  };
  const t = track(new THREE.CanvasTexture(c));
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = opts.anisotropy ?? 4;
  if (opts.repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  // Each texture's painting time, on the performance timeline
  const paint = () => {
    const start = performance.now();
    paintIt();
    performance.measure(`tex:${key}`, { start, end: performance.now() });
    t.needsUpdate = true;
  };
  if (opts.text && typeof document !== "undefined" && document.fonts && !fontsLoaded) {
    // Words wait for the fonts (a moment, at the start): drawn before
    // them, the panel would have to be painted again anyway.
    fontsReady().then(paint);
  } else {
    paint();
  }
  cache.set(key, t);
  return t;
}

// A canvas doesn't make the browser fetch a font the way page text does,
// so the weights the city draws with are asked for up front, before
// anything is painted. Resolves once they're in (or have failed: then the
// fallback faces draw).
let ready: Promise<unknown> | null = null;
let fontsLoaded = false;
export function fontsReady(): Promise<unknown> {
  if (typeof document === "undefined" || !document.fonts) return Promise.resolve();
  if (!ready) {
    const f = fonts();
    ready = Promise.all([
      document.fonts.ready,
      document.fonts.load(`700 40px ${f.display}`, "Ag").catch(() => null),
      document.fonts.load(`600 40px ${f.display}`, "Ag").catch(() => null),
      document.fonts.load(`500 20px ${f.text}`, "Ag").catch(() => null),
    ]).then(() => {
      fontsLoaded = true;
    });
  }
  return ready;
}

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

// The site's own typefaces (next/font sets them as CSS variables on the
// root, app/layout.tsx): Rajdhani for display, Nunito for text
export function fonts() {
  if (typeof document === "undefined") return { display: "sans-serif", text: "sans-serif" };
  const css = getComputedStyle(document.documentElement);
  return {
    display: `${css.getPropertyValue("--font-rajdhani").trim() || "Arial Narrow"}, "Arial Narrow", Arial, sans-serif`,
    text: `${css.getPropertyValue("--font-nunito").trim() || "Arial"}, Arial, sans-serif`,
  };
}

// `fit`: the largest size, from `size` down to `min`, at which `text` set
// in `font(size)` is no wider than `room` (a sign's word always sits
// inside its frame, in any font). Leaves g.font at that size.
export function fit(g: CanvasRenderingContext2D, text: string, font: (size: number) => string, size: number, room: number, min = 8): number {
  for (; size > min; size -= 1) {
    g.font = font(size);
    if (g.measureText(text).width <= room) return size;
  }
  g.font = font(min);
  return min;
}

// Soft patches of colour over a surface
function blotches(g: CanvasRenderingContext2D, r: Rng, w: number, h: number, count: number, colors: string[], size: [number, number]) {
  for (let i = 0; i < count; i++) {
    const x = r() * w;
    const y = r() * h;
    const rad = r.range(size[0], size[1]);
    const grad = g.createRadialGradient(x, y, 0, x, y, rad);
    grad.addColorStop(0, r.pick(colors));
    grad.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = grad;
    g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
}

function speckle(g: CanvasRenderingContext2D, r: Rng, w: number, h: number, count: number, color: string, size = 1.5) {
  g.fillStyle = color;
  for (let i = 0; i < count; i++) g.fillRect(r() * w, r() * h, r.range(0.5, size), r.range(0.5, size));
}

// ---------------------------------------------------------------------
// Things with writing on them

type TextLine = { text: string; size: number; font?: "display" | "text"; color?: string; weight?: number; gap?: number; align?: CanvasTextAlign };

export type PanelOptions = { background?: string; lines: TextLine[]; padding?: number; grain?: boolean; rule?: string; wrap?: boolean; valign?: "top" | "middle"; fit?: boolean };

// A panel of text: timetable rows, labels, screens. `key`
// must change when the text does.
export function textPanel(key: string, w: number, h: number, opts: PanelOptions) {
  return texture(`text-${key}`, w, h, (g, r) => drawPanel(g, r, w, h, opts), { text: true });
}


// Just the words of a panel, white on black and in exactly the same
// place: what glows on a sign (its emissive map), or, blurred, the glow
// around it. Same key and options as the panel it goes with.
export function textMask(key: string, w: number, h: number, opts: PanelOptions, blur = 0) {
  return texture(
    `mask-${key}-${blur}`,
    w,
    h,
    (g, r) => {
      drawPanel(g, r, w, h, { ...opts, background: "#000000", grain: false, rule: undefined, lines: opts.lines.map((l) => ({ ...l, color: "#ffffff" })) });
      if (blur) blurCanvas(g, w, h, blur);
    },
    { text: true },
  );
}

// White strokes on black, blurred: the glow around a shape drawn in code
// (neon tubes)
export function glowMask(key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, blur: number) {
  return texture(`glow-${key}-${blur}`, w, h, (g) => {
    g.fillStyle = "#000000";
    g.fillRect(0, 0, w, h);
    draw(g);
    blurCanvas(g, w, h, blur);
  });
}

// Blurs what's on a canvas: with the canvas's own filter where there is
// one, otherwise shrunk and grown back (smooth enough for a glow)
function blurCanvas(g: CanvasRenderingContext2D, w: number, h: number, px: number) {
  const [copy, cg] = canvas(w, h);
  cg.drawImage(g.canvas, 0, 0);
  g.fillStyle = "#000000";
  g.fillRect(0, 0, w, h);
  if (typeof g.filter === "string") {
    g.filter = `blur(${px}px)`;
    g.drawImage(copy, 0, 0);
    g.filter = "none";
    return;
  }
  const k = Math.max(2, px / 1.5);
  const [small, sg] = canvas(Math.max(1, Math.round(w / k)), Math.max(1, Math.round(h / k)));
  sg.imageSmoothingQuality = "high";
  sg.drawImage(copy, 0, 0, small.width, small.height);
  g.imageSmoothingQuality = "high";
  g.drawImage(small, 0, 0, w, h);
}

function drawPanel(g: CanvasRenderingContext2D, r: Rng, w: number, h: number, opts: PanelOptions) {
  const f = fonts();
  if (opts.background) {
    g.fillStyle = opts.background;
    g.fillRect(0, 0, w, h);
  }
  if (opts.grain) {
    blotches(g, r, w, h, 24, ["rgba(120,95,60,0.12)", "rgba(255,250,235,0.15)"], [20, 80]);
    speckle(g, r, w, h, (w * h) / 300, "rgba(90,70,40,0.15)");
  }
  if (opts.rule) {
    g.strokeStyle = opts.rule;
    g.lineWidth = 1.5;
    for (let y = 70; y < h; y += 34) {
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(w, y);
      g.stroke();
    }
  }
  const pad = opts.padding ?? 24;
  // `fit`: a line too wide for the board is set smaller until it fits
  // (signs: the words always sit inside their frame, in any font)
  const lines = opts.fit
    ? opts.lines.map((line) => ({ ...line, size: fit(g, line.text, (size) => `${line.weight ?? 500} ${size}px ${line.font === "display" ? f.display : f.text}`, line.size, w - pad * 2) }))
    : opts.lines;
  // Lay the lines out first so they can be centred vertically
  const laid: { text: string; y: number; line: TextLine }[] = [];
  let y = pad;
  for (const line of lines) {
    g.font = `${line.weight ?? 500} ${line.size}px ${line.font === "display" ? f.display : f.text}`;
    const words = opts.wrap ? line.text.split(" ") : [line.text];
    let current = "";
    const rows: string[] = [];
    for (const word of words) {
      const attempt = current ? `${current} ${word}` : word;
      if (opts.wrap && g.measureText(attempt).width > w - pad * 2 && current) {
        rows.push(current);
        current = word;
      } else current = attempt;
    }
    rows.push(current);
    for (const row of rows) {
      y += line.size * 1.25;
      laid.push({ text: row, y, line });
    }
    y += line.gap ?? line.size * 0.35;
  }
  const shift = opts.valign === "middle" ? Math.max(0, (h - y) / 2) : 0;
  for (const { text, y: ly, line } of laid) {
    g.font = `${line.weight ?? 500} ${line.size}px ${line.font === "display" ? f.display : f.text}`;
    g.fillStyle = line.color ?? "#2b2f27";
    g.textAlign = line.align ?? "left";
    const x = line.align === "center" ? w / 2 : line.align === "right" ? w - pad : pad;
    g.fillText(text, x, ly + shift - line.size * 0.2);
  }
}

// A clock's face (the Bund's clock tower) that tells the time: `hour`
// is the local hour, 0 up to 24 with the minutes as a fraction (the
// store's `hour`). One texture, redrawn only when the minute changes
// (setClockHour); 256 × 256, 0.35 MB with its mipmaps.
let clockAt = -1;
let clockPaint: ((hour: number) => void) | null = null;
function paintClock(g: CanvasRenderingContext2D, hour: number) {
  g.clearRect(0, 0, 256, 256);
  g.fillStyle = "#efe6cf";
  g.beginPath();
  g.arc(128, 128, 124, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = "#2b2f27";
  g.lineWidth = 6;
  g.stroke();
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * Math.PI * 2;
    const long = i % 5 === 0;
    g.lineWidth = long ? 6 : 2;
    g.beginPath();
    g.moveTo(128 + Math.cos(a) * (long ? 92 : 104), 128 + Math.sin(a) * (long ? 92 : 104));
    g.lineTo(128 + Math.cos(a) * 112, 128 + Math.sin(a) * 112);
    g.stroke();
  }
  const hand = (turn: number, len: number, width: number) => {
    const a = turn * Math.PI * 2 - Math.PI / 2;
    g.lineWidth = width;
    g.lineCap = "round";
    g.beginPath();
    g.moveTo(128, 128);
    g.lineTo(128 + Math.cos(a) * len, 128 + Math.sin(a) * len);
    g.stroke();
  };
  const h = ((hour % 12) + 12) % 12;
  const minutes = (hour - Math.floor(hour)) * 60;
  hand(h / 12, 58, 9);
  hand(Math.floor(minutes) / 60, 92, 5);
  // Age: a stain across the glass
  const grad = g.createLinearGradient(0, 0, 256, 256);
  grad.addColorStop(0, "rgba(120,100,60,0.25)");
  grad.addColorStop(0.6, "rgba(120,100,60,0)");
  g.fillStyle = grad;
  g.beginPath();
  g.arc(128, 128, 120, 0, Math.PI * 2);
  g.fill();
}
/** The clock's face at `hour` (see above); the same texture every call, redrawn if the minute differs */
export function clockFace(hour = 12): THREE.CanvasTexture {
  const t = texture("clock", 256, 256, (g) => {
    clockPaint = (at: number) => paintClock(g, at);
    paintClock(g, hour);
    clockAt = Math.floor(hour * 60);
  });
  setClockHour(hour);
  return t;
}
/** Moves the clock's hands to `hour`; true if it redrew (the caller asks for a frame) */
export function setClockHour(hour: number): boolean {
  const minute = Math.floor(hour * 60);
  const t = cache.get("clock");
  if (!t || !clockPaint || minute === clockAt) return false;
  clockAt = minute;
  clockPaint(hour);
  t.needsUpdate = true;
  return true;
}

// Paving, as the plates paint it: slabs of stone with dark joints, each a
// little different in tone, a few flecks; grey on white, so it multiplies
// whatever colour the surface is. `cols` × `rows` slabs fill one tile;
// `repeat` how often the tile repeats across the surface's UVs (a
// clone of the one tile, sharing its upload). `kind`: "slabs" (laid in
// courses, every other row shifted half a slab), "grid" (square, as on a
// platform) or "setts" (small stones). 256 × 256: 0.35 MB with mipmaps,
// once per kind and seed. Works under wetPaving and surface (their `map`).
// `mortar`: the joints' grey (#6c6c6c by default); `vary`: how much the
// slabs differ in tone, 0..255 (34 by default)
export type PavingOptions = { seed: number; kind?: "slabs" | "grid" | "setts"; cols?: number; rows?: number; joint?: number; repeat?: [number, number]; mortar?: string; vary?: number };
export function pavingTexture(o: PavingOptions): THREE.Texture {
  const kind = o.kind ?? "slabs";
  const cols = o.cols ?? (kind === "setts" ? 8 : 4);
  const rows = o.rows ?? (kind === "setts" ? 8 : kind === "grid" ? 4 : 6);
  const joint = o.joint ?? (kind === "setts" ? 2 : 3);
  const mortar = o.mortar ?? "#6c6c6c";
  const vary = o.vary ?? 34;
  const look = mortar === "#6c6c6c" && vary === 34 ? "" : `:${mortar}:${vary}`;
  const base = texture(`paving:${kind}:${o.seed}:${cols}x${rows}:${joint}${look}`, 256, 256, (g, r) => {
    g.fillStyle = mortar;
    g.fillRect(0, 0, 256, 256);
    const sw = 256 / cols;
    const sh = 256 / rows;
    for (let row = 0; row < rows; row++) {
      const shift = kind === "slabs" && row % 2 ? sw / 2 : 0;
      for (let col = -1; col < cols + 1; col++) {
        const x = col * sw + shift;
        const y = row * sh;
        const v = Math.min(250, 218 + Math.round((r() - 0.5) * vary));
        const warm = Math.round((r() - 0.5) * 8);
        g.fillStyle = `rgb(${v + warm},${v},${v - warm})`;
        g.fillRect(x + joint / 2, y + joint / 2, sw - joint, sh - joint);
        // a soft worn patch and a few flecks
        g.fillStyle = `rgba(255,255,255,${(r() * 0.08).toFixed(3)})`;
        g.fillRect(x + sw * 0.2, y + sh * 0.25, sw * (0.3 + r() * 0.4), sh * (0.2 + r() * 0.4));
        for (let k = 0; k < 6; k++) {
          g.fillStyle = `rgba(60,60,60,${(0.08 + r() * 0.1).toFixed(3)})`;
          g.fillRect(x + r() * sw, y + r() * sh, 1 + r() * 2, 1 + r() * 2);
        }
      }
    }
  }, { repeat: true, anisotropy: 8 });
  if (!o.repeat) return base;
  const t = base.clone();
  t.repeat.set(o.repeat[0], o.repeat[1]);
  t.needsUpdate = true;
  return t;
}

// A soft round dot, warm: dust or rain in the light
export const softDot = () =>
  texture("soft-dot", 64, 64, (g) => {
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, "rgba(255,248,225,1)");
    grad.addColorStop(0.4, "rgba(255,240,200,0.5)");
    grad.addColorStop(1, "rgba(255,240,200,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
  });

// Old glass in a window: small panes, a few still catching warm light
