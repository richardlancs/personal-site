import * as THREE from "three";
import { rng, type Rng } from "./rng";

// Every texture in the world, painted on a canvas from a seed. Nothing is
// downloaded except the project screenshots. Textures with words wait for
// the site's fonts and redraw once they've loaded.

const cache = new Map<string, THREE.CanvasTexture>();

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")!] as const;
}

function texture(key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D, r: Rng) => void, opts: { repeat?: boolean; text?: boolean } = {}) {
  const hit = cache.get(key);
  if (hit) return hit;
  const [c, g] = canvas(w, h);
  const paintIt = () => {
    g.clearRect(0, 0, w, h);
    draw(g, rng(hash(key)));
  };
  paintIt();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (opts.repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (opts.text && typeof document !== "undefined" && document.fonts) {
    fontsReady().then(() => {
      paintIt();
      t.needsUpdate = true;
    });
  }
  cache.set(key, t);
  return t;
}

// Every Chinese character on a sign or notice in the world. A canvas
// doesn't make the browser fetch a font's Unicode slices the way page text
// does, so they're asked for up front, before the signs are painted.
const CHINESE = "工坊光明公园站游戏厅导览图寻猫启事联系夏日祭傍晚开始通知冰镇用电话车凉亭时刻表";
let ready: Promise<unknown> | null = null;
function fontsReady() {
  if (!ready) {
    const f = fonts();
    ready = Promise.all([
      document.fonts.ready,
      document.fonts.load(`600 40px ${f.display}`, CHINESE).catch(() => null),
      document.fonts.load(`500 40px ${f.display}`, "Ag").catch(() => null),
      document.fonts.load(`500 20px ${f.text}`, "Ag").catch(() => null),
    ]);
  }
  return ready;
}

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

// The site's own typefaces (next/font sets them as CSS variables)
export function fonts() {
  if (typeof document === "undefined") return { display: "serif", text: "sans-serif" };
  const css = getComputedStyle(document.documentElement);
  // Latin from Shippori Mincho, Chinese from Noto Serif SC
  const chinese = css.getPropertyValue("--font-noto-sc").trim();
  return {
    display: `${css.getPropertyValue("--font-shippori").trim() || "serif"}, ${chinese ? `${chinese}, ` : ""}"Songti SC", serif`,
    text: `${css.getPropertyValue("--font-zen-kaku").trim() || "sans-serif"}, "Hiragino Sans", sans-serif`,
  };
}

const hsl = (h: number, s: number, l: number, a = 1) => `hsla(${h},${s}%,${l}%,${a})`;

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
// Surfaces

// Old flagstones with grass and moss in the joints
export const flagstones = () =>
  texture(
    "flagstones",
    512,
    512,
    (g, r) => {
      g.fillStyle = "#5b5a44";
      g.fillRect(0, 0, 512, 512);
      const cols = 4;
      const rows = 5;
      for (let row = 0; row < rows; row++) {
        const offset = (row % 2) * 0.5;
        for (let col = -1; col < cols + 1; col++) {
          const x0 = ((col + offset) / cols) * 512;
          const y0 = (row / rows) * 512;
          const w = 512 / cols;
          const hgt = 512 / rows;
          const j = () => r.range(-5, 5);
          const pts = [
            [x0 + 5 + j(), y0 + 5 + j()],
            [x0 + w - 5 + j(), y0 + 5 + j()],
            [x0 + w - 5 + j(), y0 + hgt - 5 + j()],
            [x0 + 5 + j(), y0 + hgt - 5 + j()],
          ];
          const l = r.range(56, 70);
          g.fillStyle = hsl(r.range(36, 48), r.range(8, 16), l);
          g.beginPath();
          pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
          g.closePath();
          g.fill();
          // Worn top, darker edge
          g.strokeStyle = hsl(40, 10, l - 14, 0.6);
          g.lineWidth = 3;
          g.stroke();
          // A crack now and then
          if (r() < 0.35) {
            g.strokeStyle = hsl(40, 10, 30, 0.7);
            g.lineWidth = 1.2;
            g.beginPath();
            let cx = x0 + r.range(10, w - 10);
            let cy = y0 + 6;
            g.moveTo(cx, cy);
            for (let k = 0; k < 5; k++) {
              cx += r.range(-14, 14);
              cy += hgt / 5;
              g.lineTo(cx, cy);
            }
            g.stroke();
          }
        }
      }
      blotches(g, r, 512, 512, 60, ["rgba(90,110,50,0.35)", "rgba(70,60,40,0.25)", "rgba(230,220,190,0.2)"], [10, 50]);
      // Grass in the joints
      for (let i = 0; i < 260; i++) {
        const x = r() * 512;
        const y = Math.round(r() * 5) * (512 / 5) + r.range(-3, 3);
        g.strokeStyle = hsl(r.range(70, 95), 40, r.range(28, 42), 0.9);
        g.lineWidth = 1.5;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + r.range(-5, 5), y - r.range(3, 10));
        g.stroke();
      }
      speckle(g, r, 512, 512, 2500, "rgba(40,35,25,0.25)");
    },
    { repeat: true },
  );

// Boards: weathered wood, with faded paint if `paint` is given
export const planks = (tone: "light" | "dark" | "red" = "light") =>
  texture(
    `planks-${tone}`,
    512,
    512,
    (g, r) => {
      const base = tone === "light" ? [32, 30, 52] : tone === "dark" ? [24, 32, 30] : [10, 40, 36];
      const boards = 6;
      for (let i = 0; i < boards; i++) {
        const x = (i / boards) * 512;
        const l = base[2] + r.range(-6, 6);
        g.fillStyle = hsl(base[0] + r.range(-4, 4), base[1], l);
        g.fillRect(x, 0, 512 / boards, 512);
        // Grain
        for (let k = 0; k < 18; k++) {
          g.strokeStyle = hsl(base[0], base[1], l - r.range(6, 14), 0.35);
          g.lineWidth = r.range(0.6, 1.6);
          g.beginPath();
          const gx = x + r.range(4, 512 / boards - 4);
          g.moveTo(gx, 0);
          for (let y = 0; y <= 512; y += 32) g.lineTo(gx + Math.sin(y * 0.02 + k) * r.range(1, 4), y);
          g.stroke();
        }
        if (r() < 0.5) {
          g.fillStyle = hsl(base[0], base[1], l - 18, 0.6);
          g.beginPath();
          g.ellipse(x + r.range(15, 60), r() * 512, 4, 7, 0, 0, Math.PI * 2);
          g.fill();
        }
        // Gap between boards
        g.fillStyle = "rgba(25,18,10,0.7)";
        g.fillRect(x, 0, 2.5, 512);
      }
      blotches(g, r, 512, 512, 40, ["rgba(255,240,210,0.15)", "rgba(40,30,20,0.25)", "rgba(80,100,60,0.15)"], [20, 80]);
      speckle(g, r, 512, 512, 1500, "rgba(30,20,10,0.2)");
    },
    { repeat: true },
  );

// Plaster with water stains running down from the top
export const plaster = (tone: "cream" | "grey" | "green" = "cream") =>
  texture(
    `plaster-${tone}`,
    512,
    512,
    (g, r) => {
      g.fillStyle = tone === "cream" ? "#d9cdb0" : tone === "grey" ? "#b8b3a5" : "#9fb09a";
      g.fillRect(0, 0, 512, 512);
      blotches(g, r, 512, 512, 80, ["rgba(255,250,235,0.3)", "rgba(120,100,70,0.18)", "rgba(90,100,80,0.15)"], [20, 90]);
      for (let i = 0; i < 26; i++) {
        const x = r() * 512;
        const len = r.range(60, 400);
        const grad = g.createLinearGradient(0, 0, 0, len);
        grad.addColorStop(0, "rgba(70,60,40,0.35)");
        grad.addColorStop(1, "rgba(70,60,40,0)");
        g.fillStyle = grad;
        g.fillRect(x, 0, r.range(3, 14), len);
      }
      g.strokeStyle = "rgba(60,50,35,0.45)";
      g.lineWidth = 1;
      for (let i = 0; i < 6; i++) {
        g.beginPath();
        let x = r() * 512;
        let y = r() * 512;
        g.moveTo(x, y);
        for (let k = 0; k < 6; k++) {
          x += r.range(-18, 18);
          y += r.range(5, 22);
          g.lineTo(x, y);
        }
        g.stroke();
      }
      speckle(g, r, 512, 512, 3000, "rgba(60,50,35,0.18)");
    },
    { repeat: true },
  );

// The face of an empty building: storeys of windows, some broken, some
// open, with stains and climbing green
export const facade = (variant: number) =>
  texture(
    `facade-${variant}`,
    256,
    512,
    (g, r) => {
      const hue = r.pick([38, 30, 200, 90, 20]);
      const sat = r.range(5, 14);
      const l = r.range(58, 72);
      g.fillStyle = hsl(hue, sat, l);
      g.fillRect(0, 0, 256, 512);
      blotches(g, r, 256, 512, 40, [hsl(hue, sat, l + 10, 0.4), hsl(hue, sat, l - 15, 0.3)], [15, 60]);
      const cols = 4;
      const rows = 8;
      for (let row = 0; row < rows; row++) {
        // A balcony rail on some floors
        const y = row * 64;
        g.fillStyle = hsl(hue, sat, l - 12, 0.6);
        g.fillRect(0, y + 58, 256, 4);
        for (let col = 0; col < cols; col++) {
          const x = col * 64 + 12;
          const dark = r() < 0.8;
          g.fillStyle = dark ? hsl(210, 20, r.range(14, 24)) : hsl(40, 30, r.range(55, 70));
          g.fillRect(x, y + 14, 40, 36);
          if (r() < 0.3) {
            // Broken pane
            g.fillStyle = "rgba(10,12,15,0.8)";
            g.beginPath();
            g.moveTo(x + r.range(5, 35), y + 14);
            g.lineTo(x + 40, y + r.range(20, 45));
            g.lineTo(x + 40, y + 14);
            g.fill();
          } else {
            g.fillStyle = "rgba(200,220,230,0.18)";
            g.fillRect(x + 3, y + 17, 12, 30);
          }
          g.fillStyle = hsl(hue, sat, l - 20);
          g.fillRect(x - 2, y + 50, 44, 3);
        }
      }
      // Stains under every sill
      for (let i = 0; i < 30; i++) {
        const x = r() * 256;
        const y = r() * 512;
        const grad = g.createLinearGradient(0, y, 0, y + 80);
        grad.addColorStop(0, "rgba(50,45,35,0.35)");
        grad.addColorStop(1, "rgba(50,45,35,0)");
        g.fillStyle = grad;
        g.fillRect(x, y, r.range(3, 8), 80);
      }
      // Ivy climbing from the bottom and falling from the roof
      for (let i = 0; i < 2; i++) {
        const fromTop = i === 1;
        const x0 = r() * 256;
        for (let k = 0; k < 340; k++) {
          const t = r();
          const y = fromTop ? t * r.range(80, 300) : 512 - t * r.range(120, 420);
          const x = x0 + (r() - 0.5) * (60 + t * 70) + Math.sin(y * 0.03) * 12;
          g.fillStyle = hsl(r.range(80, 110), r.range(25, 45), r.range(22, 40), 0.9);
          g.beginPath();
          g.ellipse(x, y, r.range(3, 6), r.range(2, 4), r() * 3, 0, Math.PI * 2);
          g.fill();
        }
      }
      speckle(g, r, 256, 512, 1200, "rgba(40,35,25,0.2)");
    },
    { repeat: true },
  );

export const roofTiles = (tone: "grey" | "rust" = "grey") =>
  texture(
    `roof-${tone}`,
    256,
    256,
    (g, r) => {
      const hue = tone === "grey" ? 210 : 14;
      const sat = tone === "grey" ? 8 : 35;
      for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
          const l = r.range(30, 42);
          g.fillStyle = hsl(hue, sat, l);
          g.fillRect(col * 32, row * 32, 32, 32);
          const grad = g.createLinearGradient(0, row * 32, 0, row * 32 + 32);
          grad.addColorStop(0, "rgba(255,255,255,0.12)");
          grad.addColorStop(1, "rgba(0,0,0,0.35)");
          g.fillStyle = grad;
          g.fillRect(col * 32, row * 32, 32, 32);
          g.fillStyle = "rgba(0,0,0,0.4)";
          g.fillRect(col * 32, row * 32, 2, 32);
        }
      }
      blotches(g, r, 256, 256, 30, ["rgba(110,130,60,0.5)", "rgba(200,190,150,0.25)"], [8, 30]);
    },
    { repeat: true },
  );

// Painted metal: green enamel worn through to rust at the edges
export const enamel = (hue: number, sat: number, light: number) =>
  texture(
    `enamel-${hue}-${sat}-${light}`,
    256,
    256,
    (g, r) => {
      g.fillStyle = hsl(hue, sat, light);
      g.fillRect(0, 0, 256, 256);
      blotches(g, r, 256, 256, 40, [hsl(hue, sat, light + 8, 0.4), hsl(hue, sat - 10, light - 10, 0.35)], [10, 50]);
      for (let i = 0; i < 40; i++) {
        g.fillStyle = hsl(r.range(15, 30), 50, r.range(25, 38), r.range(0.4, 0.8));
        g.beginPath();
        g.ellipse(r() * 256, r() * 256, r.range(1, 6), r.range(1, 4), r() * 3, 0, Math.PI * 2);
        g.fill();
      }
      speckle(g, r, 256, 256, 800, "rgba(30,20,10,0.25)");
    },
    { repeat: true },
  );

// Grass and earth for the ground, seen from a little way off
export const groundTexture = () =>
  texture(
    "ground",
    512,
    512,
    (g, r) => {
      g.fillStyle = "#6d7a3c";
      g.fillRect(0, 0, 512, 512);
      blotches(g, r, 512, 512, 140, ["rgba(140,150,70,0.45)", "rgba(80,95,40,0.5)", "rgba(150,120,60,0.35)", "rgba(190,160,80,0.3)"], [12, 60]);
      for (let i = 0; i < 5000; i++) {
        g.strokeStyle = hsl(r.range(55, 95), r.range(30, 50), r.range(25, 55), 0.5);
        g.lineWidth = 1;
        const x = r() * 512;
        const y = r() * 512;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + r.range(-2, 2), y - r.range(2, 6));
        g.stroke();
      }
    },
    { repeat: true },
  );

// ---------------------------------------------------------------------
// Foliage

// A cluster of leaves on transparent ground, for leaf cards. `palette`
// picks the season of the tree.
export type Palette = "green" | "ginkgo" | "maple" | "ivy" | "bush";
const palettes: Record<Palette, [number, number, number][]> = {
  // Lush and sunlit: yellow-green on top, deep blue-green within
  green: [
    [92, 46, 30],
    [100, 42, 38],
    [84, 52, 48],
    [72, 60, 58],
    [140, 30, 24],
  ],
  ginkgo: [
    [48, 75, 55],
    [44, 80, 50],
    [52, 70, 62],
    [38, 70, 45],
    [60, 50, 45],
  ],
  maple: [
    [18, 70, 45],
    [10, 65, 40],
    [28, 75, 50],
    [36, 70, 52],
    [6, 55, 35],
  ],
  ivy: [
    [95, 40, 26],
    [100, 35, 32],
    [85, 40, 36],
  ],
  bush: [
    [86, 44, 34],
    [76, 50, 44],
    [130, 32, 26],
    [60, 52, 50],
  ],
};

export const leafCluster = (palette: Palette) =>
  texture(`leaves-${palette}`, 256, 256, (g, r) => {
    const colors = palettes[palette];
    const leaves = palette === "ivy" ? 22 : 46;
    for (let i = 0; i < leaves; i++) {
      const a = r() * Math.PI * 2;
      const d = Math.sqrt(r()) * 92;
      const x = 128 + Math.cos(a) * d;
      const y = 128 + Math.sin(a) * d;
      const [h, s, l] = r.pick(colors);
      const size = r.range(12, 22) * (palette === "ivy" ? 1.4 : 1);
      g.save();
      g.translate(x, y);
      g.rotate(a + Math.PI / 2 + r.range(-0.6, 0.6));
      // Lighter toward the top of the cluster, where the sun is
      const lift = (128 - y) / 128;
      g.fillStyle = hsl(h, s, l + lift * 9 + r.range(-4, 4));
      g.beginPath();
      if (palette === "ginkgo") {
        g.moveTo(0, size * 0.4);
        g.arc(0, size * 0.4, size, Math.PI * 1.2, Math.PI * 1.8);
        g.closePath();
      } else if (palette === "maple") {
        for (let k = 0; k < 5; k++) {
          const ang = -Math.PI / 2 + (k - 2) * 0.55;
          g.lineTo(Math.cos(ang) * size, Math.sin(ang) * size);
          g.lineTo(Math.cos(ang + 0.27) * size * 0.45, Math.sin(ang + 0.27) * size * 0.45);
        }
        g.lineTo(0, size * 0.3);
        g.closePath();
      } else {
        g.ellipse(0, 0, size * 0.42, size, 0, 0, Math.PI * 2);
      }
      g.fill();
      g.strokeStyle = hsl(h, s, l - 12, 0.5);
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(0, size * 0.6);
      g.lineTo(0, -size * 0.7);
      g.stroke();
      g.restore();
    }
  });

// A single fallen leaf (for leaves on the ground and in the air)
export const singleLeaves = () =>
  texture("fallen-leaves", 256, 64, (g, r) => {
    const colors = [
      [30, 70, 45],
      [18, 65, 40],
      [44, 75, 52],
      [26, 45, 32],
    ];
    for (let i = 0; i < 4; i++) {
      const [h, s, l] = colors[i];
      g.save();
      g.translate(i * 64 + 32, 32);
      g.rotate(r.range(-0.3, 0.3));
      g.fillStyle = hsl(h, s, l);
      g.beginPath();
      g.ellipse(0, 0, 11, 26, 0, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = hsl(h, s, l - 15);
      g.beginPath();
      g.moveTo(0, 28);
      g.lineTo(0, -24);
      g.stroke();
      g.restore();
    }
  });

// ---------------------------------------------------------------------
// Things with writing on them

type TextLine = { text: string; size: number; font?: "display" | "text"; color?: string; weight?: number; gap?: number; align?: CanvasTextAlign };

// A panel of text: signs, timetable rows, notebook pages, screens. `key`
// must change when the text does.
export function textPanel(
  key: string,
  w: number,
  h: number,
  opts: { background?: string; lines: TextLine[]; padding?: number; grain?: boolean; rule?: string; wrap?: boolean; valign?: "top" | "middle" },
) {
  return texture(
    `text-${key}`,
    w,
    h,
    (g, r) => {
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
      // Lay the lines out first so they can be centred vertically
      const laid: { text: string; y: number; line: TextLine }[] = [];
      let y = pad;
      for (const line of opts.lines) {
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
    },
    { text: true },
  );
}

// The station clock, stopped at 4:17
export const clockFace = () =>
  texture("clock", 256, 256, (g) => {
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
    hand((4 + 17 / 60) / 12, 58, 9);
    hand(17 / 60, 92, 5);
    // Age: a stain across the glass
    const grad = g.createLinearGradient(0, 0, 256, 256);
    grad.addColorStop(0, "rgba(120,100,60,0.25)");
    grad.addColorStop(0.6, "rgba(120,100,60,0)");
    g.fillStyle = grad;
    g.beginPath();
    g.arc(128, 128, 120, 0, Math.PI * 2);
    g.fill();
  });

// Posters and notices on the board: a map, a lost cat, a festival
export const notice = (kind: "map" | "cat" | "festival" | "faded") =>
  texture(
    `notice-${kind}`,
    256,
    320,
    (g, r) => {
      const f = fonts();
      const bg = kind === "festival" ? "#e8c9a0" : kind === "faded" ? "#d8d4c4" : "#efe7d2";
      g.fillStyle = bg;
      g.fillRect(0, 0, 256, 320);
      blotches(g, r, 256, 320, 20, ["rgba(140,110,60,0.2)", "rgba(255,255,240,0.2)"], [20, 70]);
      g.fillStyle = "#2b2f27";
      g.strokeStyle = "#2b2f27";
      if (kind === "map") {
        g.font = `600 26px ${f.display}`;
        g.fillText("公园导览图", 20, 40);
        g.font = `500 14px ${f.text}`;
        g.fillText("Park map", 20, 60);
        g.lineWidth = 3;
        g.setLineDash([8, 6]);
        const paths = [
          [128, 300, 128, 200],
          [128, 200, 50, 110],
          [128, 200, 128, 90],
          [128, 200, 210, 120],
          [128, 200, 40, 220],
          [128, 200, 215, 230],
        ];
        for (const [a, b, c, d] of paths) {
          g.beginPath();
          g.moveTo(a, b);
          g.lineTo(c, d);
          g.stroke();
        }
        g.setLineDash([]);
        g.beginPath();
        g.ellipse(128, 200, 22, 12, 0, 0, Math.PI * 2);
        g.stroke();
        g.fillStyle = "#8f4a26";
        for (const [x, y] of [
          [50, 110],
          [128, 90],
          [210, 120],
          [40, 220],
          [215, 230],
        ]) {
          g.beginPath();
          g.arc(x, y, 7, 0, Math.PI * 2);
          g.fill();
        }
      } else if (kind === "cat") {
        g.font = `600 30px ${f.display}`;
        g.fillText("寻猫启事", 20, 46);
        g.font = `500 15px ${f.text}`;
        g.fillText("Lost cat. Grey tabby,", 20, 74);
        g.fillText("answers to Mantou.", 20, 94);
        g.fillStyle = "#9a9384";
        g.fillRect(40, 116, 176, 130);
        g.fillStyle = "#6e6a5e";
        g.beginPath();
        g.ellipse(128, 200, 50, 34, 0, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.moveTo(98, 172);
        g.lineTo(108, 146);
        g.lineTo(120, 170);
        g.moveTo(136, 170);
        g.lineTo(148, 146);
        g.lineTo(158, 172);
        g.fill();
        // Tear-off tabs
        g.fillStyle = "#2b2f27";
        for (let i = 0; i < 6; i++) {
          g.save();
          g.translate(24 + i * 38, 270);
          g.rotate(-Math.PI / 2);
          g.font = `400 10px ${f.text}`;
          g.fillText("联系 ...", -40, 4);
          g.restore();
        }
      } else if (kind === "festival") {
        g.fillStyle = "#a8432a";
        g.beginPath();
        g.arc(190, 80, 46, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = "#2b2f27";
        g.font = `600 40px ${f.display}`;
        g.fillText("夏日祭", 20, 170);
        g.font = `500 16px ${f.text}`;
        g.fillText("Summer festival", 22, 196);
        g.fillText("8.24  傍晚开始", 22, 222);
        g.strokeStyle = "rgba(43,47,39,0.6)";
        for (let i = 0; i < 6; i++) {
          g.beginPath();
          g.arc(60 + i * 30, 270, 8, 0, Math.PI * 2);
          g.stroke();
        }
      } else {
        g.globalAlpha = 0.35;
        g.font = `600 22px ${f.display}`;
        g.fillText("通知", 20, 46);
        g.font = `400 13px ${f.text}`;
        for (let i = 0; i < 9; i++) g.fillRect(20, 80 + i * 22, r.range(120, 210), 6);
        g.globalAlpha = 1;
      }
    },
    { text: true },
  );

// A screen's glow when nothing is on it
export const deadScreen = () =>
  texture("dead-screen", 128, 96, (g, r) => {
    const grad = g.createRadialGradient(50, 40, 5, 64, 48, 80);
    grad.addColorStop(0, "#34403a");
    grad.addColorStop(1, "#0d100e");
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 96);
    speckle(g, r, 128, 96, 200, "rgba(200,220,210,0.08)");
  });

// A soft round dot, for dust in the light
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
// from inside, most dark, one or two broken, all of them dirty
export const windowPanes = (lit: number) =>
  texture(`panes-${lit}`, 128, 128, (g, r) => {
    for (let y = 0; y < 2; y++)
      for (let x = 0; x < 3; x++) {
        const on = r() < lit;
        const l = on ? r.range(62, 78) : r.range(16, 30);
        const grad = g.createLinearGradient(0, y * 64, 0, y * 64 + 64);
        grad.addColorStop(0, hsl(on ? 38 : 200, on ? 70 : 12, l + 6));
        grad.addColorStop(1, hsl(on ? 30 : 200, on ? 65 : 12, l - 6));
        g.fillStyle = grad;
        g.fillRect(x * 42.7 + 2, y * 64 + 2, 38.7, 60);
        if (r() < 0.18) {
          g.fillStyle = "rgba(8,10,10,0.85)";
          g.beginPath();
          g.moveTo(x * 42.7 + r.range(4, 30), y * 64 + 2);
          g.lineTo(x * 42.7 + 40, y * 64 + r.range(10, 50));
          g.lineTo(x * 42.7 + 40, y * 64 + 2);
          g.fill();
        }
      }
    blotches(g, r, 128, 128, 16, ["rgba(120,100,60,0.3)", "rgba(40,50,40,0.3)"], [8, 30]);
    g.fillStyle = "#2b2a24";
    g.fillRect(41, 0, 3, 128);
    g.fillRect(84, 0, 3, 128);
    g.fillRect(0, 62, 128, 4);
  });
