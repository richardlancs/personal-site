import * as THREE from "three";
import type { Mover } from "../common";
import type { PlaceDef, PlateDef, PlateMover, Quad, SceneId, UV, V3 } from "../scenes";
import type { Quality } from "../tiers";
import { shared } from "./materials";
import { track } from "./textures";
import { envUniforms, glowOn, materialKey, neonUniforms } from "./uniforms";
import { precip } from "../atmosphere/state";
import type { PlateArt } from "./plateArt";

// The painted places' engine (docs/superpowers/plans/2026-11-21-city-
// painted-25d.md, Task 1): a place is its painting, day and night, on one
// plane given depth, with living light in its shader. The data is the
// place's PlaceDef (scenes.ts); PlatePlace.tsx mounts it.
//
// The frame: the plate's group stands at the place's home eye (home.pos),
// turned as a camera there looking at home.target; the painting is the
// plane at z = -distance in it (distance: eye to target), as tall as
// plateFrame.fov shows there and `aspect` times as wide. A point's depth
// is its "pull" (0 in the plane .. 1 at the eye): the vertex shader moves
// it toward the eye, along the line to the eye, by that share, so from
// home.pos the painting is exactly itself and any move of the eye (the
// rest drift, a turn to a spot) makes the near parts slide over the far.
// Where the screen shows more than the painting, or a part off its middle
// (the panel's shift), the painting grows and slides in its plane just
// enough to fill the view (cover): a scale in x and y and a shear, never a
// move in z, so every point stays on its line to the eye. The depth is
// made in code (makeDepth), never painted.
//
// Living light, all in the one shader, every input a uniform (so time,
// weather and the hour change nothing compiled):
// - day and night: the two paintings cross-fade with the night (uDay); the
//   night painting's lights (its light mask, scripts/city/make-masks.mjs)
//   come up early and hold steady through the blend; on the desktop tiers
//   they go over 1.0 after dark (× uGlow) for the bloom
// - regions (the place's data, rasterised into one RGBA texture): water
//   ripples (its reflections waver) and, in rain, rings; wet paving
//   darkens and mirrors the lights above it after rain; sky drifts faint
//   cloud shade by day and shows a few steady stars on a clear night;
//   glass catches a slow, faint sheen by day
// - snow pales everything a little
// Movers (buildMovers): small lights along paths, one instanced draw.
// Nothing flickers; uTime stands still in still view (PlatePlace.tsx).
//
// Colour: the desktop tiers draw through the composer's neutral tone
// mapping (Post.tsx, exposure 1.12), which would dim and flatten the
// painting; there the shader undoes it first (PLATE_UNTONE: the inverse
// of three's NeutralToneMapping), so the painting shows as painted, its
// whites held just under the bloom's threshold. The mobile tier draws
// straight to the screen, untouched (the material isn't tone-mapped).

// ---------- Shared uniforms ----------

// Every plate reads these by reference; the showing place writes them
// each frame (syncPlateUniforms) from the atmosphere's own (kit/uniforms.ts,
// atmosphere/state.ts) and the store's hour
export const plateUniforms = {
  uDay: { value: 1 }, // 1 day .. 0 night (1 - envUniforms.uNight)
  uGlow: { value: 0.3 }, // the lights' extra after dark: the neon level × glowOn (0 under prefers-contrast: more)
  uRain: { value: 0 }, // falling rain, 0..1 (precip.rain)
  uWet: { value: 0 }, // wet ground, 0..1 (envUniforms.uWet)
  uSnow: { value: 0 }, // snow cover, 0..1 (envUniforms.uSnow)
  uTime: { value: 0 }, // seconds; held in still view
  uHour: { value: 12 }, // Richmond Hill's hour (the store's), 0..24, for places that want it
};

export function syncPlateUniforms(hour: number) {
  plateUniforms.uDay.value = 1 - envUniforms.uNight.value;
  plateUniforms.uGlow.value = neonUniforms.uNeon.value * glowOn.value;
  plateUniforms.uRain.value = precip.rain;
  plateUniforms.uWet.value = envUniforms.uWet.value;
  plateUniforms.uSnow.value = envUniforms.uSnow.value;
  plateUniforms.uHour.value = hour;
}

// ---------- What the view must show (the Director's, each frame) ----------
//
// `fill`: the share of the view's height, from its top, the painting must
// cover: 1 on wide screens; on the narrow layout the strip above the sheet
// (City3D.tsx: the sheet is opaque from --hero down, so the painting is
// framed to the strip, not the whole screen). `aim`: for the place whose
// painting is `painting`, the painting point the home axis should aim at
// (a phone's subject), in place of its def's `look`.
// `top`: the share of the view's height, from its top, the painting needn't
// cover (under the narrow layout's opaque bar).
export const plateView: { fill: number; top: number; painting: string | null; aim: UV | null } = { fill: 1, top: 0, painting: null, aim: null };

// ---------- The frame (pure) ----------

export type PlateFrame = { eye: V3; target: V3; distance: number; width: number; height: number };

export function plateFrame(def: PlaceDef): PlateFrame {
  const [ex, ey, ez] = def.home.pos;
  const [tx, ty, tz] = def.home.target;
  const distance = Math.hypot(tx - ex, ty - ey, tz - ez);
  const height = 2 * distance * Math.tan(THREE.MathUtils.degToRad(def.plateFrame.fov) / 2);
  return { eye: def.home.pos, target: def.home.target, distance, width: height * def.plate.aspect, height };
}

// The most a place's painting is pulled toward the eye anywhere: the
// nearest plane its edges can show at (cover() keeps that one filled too)
export function maxPull(plate: PlateDef): number {
  const d = plate.depth;
  if (d.kind === "map") return Math.min(0.85, d.strength);
  return Math.min(0.85, Math.max(d.standing ?? (d.ground ? 0.06 : 0), d.ground?.near ?? 0, ...d.layers.map((l) => l.z)));
}

// The cover's spare growth: room for the rest drift (and a hair)
export const coverMargin = (plate: PlateDef) => 1.004 + 2.4 * plate.drift.amplitude;

// The cover's fit (pure): given the window the view makes in the
// painting's plane (x0..x1, y0..y1, in the home frame, at the plane's
// distance), the least growth `s` that fills it (never shrinking), then
// the slide (cx, cy) nearest to the one that puts `aim` (a painting point;
// none: the painting's middle) on the home axis, that keeps it filled
export function coverFit(win: { x0: number; x1: number; y0: number; y1: number }, frame: Pick<PlateFrame, "width" | "height">, margin: number, aim: UV | null) {
  const ww = (win.x1 - win.x0) * margin, wh = (win.y1 - win.y0) * margin;
  const s = Math.max(1, ww / frame.width, wh / frame.height);
  const roomX = Math.max(0, (s * frame.width - ww) / 2), roomY = Math.max(0, (s * frame.height - wh) / 2);
  const px = aim ? -s * (aim[0] - 0.5) * frame.width : 0;
  const py = aim ? -s * (0.5 - aim[1]) * frame.height : 0;
  const mx = (win.x0 + win.x1) / 2, my = (win.y0 + win.y1) / 2;
  return { s, cx: THREE.MathUtils.clamp(px, mx - roomX, mx + roomX), cy: THREE.MathUtils.clamp(py, my - roomY, my + roomY) };
}

// The window a view makes in a painting's plane (pure): the view's
// corners (`projectionInverse`: its lens and shift; only the top `fill`
// of its height), as rays from the camera (`rel`: the camera's matrix in
// the painting's home frame, eye at the origin looking down -z), where
// they meet the plane at `distance` and the nearer planes its pulled
// parts reach (`pulls`, as the painting point there). From the home pose
// it is the lens's own window, whatever the pulls.
const _wv = new THREE.Vector4();
const _wc = new THREE.Vector3();
const _wo = new THREE.Vector3();
const _wd = new THREE.Vector3();
export function viewWindow(projectionInverse: THREE.Matrix4, rel: THREE.Matrix4, distance: number, pulls: readonly number[], fill = 1, top = 0) {
  _wo.setFromMatrixPosition(rel);
  const low = 1 - 2 * Math.min(1, Math.max(0.05, fill));
  const high = Math.max(low + 0.1, 1 - 2 * Math.max(0, top));
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const [x, y] of [[-1, low], [1, low], [-1, high], [1, high]]) {
    _wv.set(x, y, 1, 1).applyMatrix4(projectionInverse);
    _wc.set(_wv.x / _wv.w, _wv.y / _wv.w, _wv.z / _wv.w);
    _wd.copy(_wc).transformDirection(rel);
    for (const p of pulls) {
      const z = -distance * (1 - p);
      const t = _wd.z < -1e-6 ? (z - _wo.z) / _wd.z : Infinity;
      if (!(t > 0) || !Number.isFinite(t)) continue;
      const px = (_wo.x + _wd.x * t) / (1 - p), py = (_wo.y + _wd.y * t) / (1 - p);
      x0 = Math.min(x0, px);
      x1 = Math.max(x1, px);
      y0 = Math.min(y0, py);
      y1 = Math.max(y1, py);
    }
  }
  return Number.isFinite(x0 + x1 + y0 + y1) ? { x0, x1, y0, y1 } : null;
}

// A direction from a place's home eye, `right` degrees right of its home
// axis and `up` degrees above it, as the painting point it meets (for
// framings the defs give in degrees: portrait yaw and lift, short)
export function aimAt(def: PlaceDef, right: number, up: number): UV {
  const t = Math.tan(THREE.MathUtils.degToRad(def.plateFrame.fov) / 2);
  const deg = (d: number) => Math.tan(THREE.MathUtils.degToRad(d));
  return [0.5 + deg(right) / (2 * t * def.plate.aspect), 0.5 - deg(up) / (2 * t)];
}

// A depth (as the data gives it: a layer's z, a spot's or mover's third
// number) as the share of the distance it is pulled toward the eye
export const pullOf = (plate: PlateDef, depth: number) => (plate.depth.kind === "map" ? depth * plate.depth.strength : depth);

// A point of the painting (u, v from its top left; its pull) in the
// plate group's own coordinates (before the cover's scale)
export function localPoint(frame: PlateFrame, u: number, v: number, pull: number): V3 {
  const k = 1 - pull;
  return [(u - 0.5) * frame.width * k, (0.5 - v) * frame.height * k, -frame.distance * k];
}

// A spot's corner (u, v, depth) in the plate group's coordinates
export const spotPoint = (def: PlaceDef, frame: PlateFrame, c: V3): V3 => localPoint(frame, c[0], c[1], pullOf(def.plate, c[2]));

// A spot's box in the group's coordinates: its middle and size (x, y; a
// thin z), for a Hitbox
export function spotBox(def: PlaceDef, frame: PlateFrame, quad: Quad): { center: V3; size: V3 } {
  const pts = quad.map((c) => spotPoint(def, frame, c));
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]), zs = pts.map((p) => p[2]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const z = zs.reduce((a, b) => a + b, 0) / 4;
  return { center: [(x0 + x1) / 2, (y0 + y1) / 2, z], size: [x1 - x0, y1 - y0, Math.max(0.05, 0.004 * frame.distance)] };
}

// A quad for showing something on a spot (a screenshot on a billboard,
// the arcade's screen): its four corners, a grid between them so a
// picture isn't bent across the diagonal, uv 0..1 with (0, 1) at the top
// left corner. In the group's coordinates, a hair in front of the paint.
export function spotGeometry(def: PlaceDef, frame: PlateFrame, quad: Quad, cells = 8): THREE.BufferGeometry {
  const [tl, tr, br, bl] = quad.map((c) => new THREE.Vector3(...spotPoint(def, frame, [c[0], c[1], Math.min(1, c[2] + 0.002)])));
  const g = new THREE.PlaneGeometry(1, 1, cells, cells);
  const pos = g.attributes.position as THREE.BufferAttribute;
  const uv = g.attributes.uv as THREE.BufferAttribute;
  const top = new THREE.Vector3(), bottom = new THREE.Vector3(), p = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    const s = uv.getX(i), t = uv.getY(i);
    top.lerpVectors(tl, tr, s);
    bottom.lerpVectors(bl, br, s);
    p.lerpVectors(bottom, top, t);
    pos.setXYZ(i, p.x, p.y, p.z);
  }
  g.computeBoundingSphere();
  return g;
}

// The tiers' picture sizes: the paintings' long edge, and the masks' and
// depth's (px)
export const PLATE_EDGE: Record<Quality, { painting: number; mask: number }> = {
  high: { painting: 2560, mask: 1280 },
  low: { painting: 1920, mask: 1280 },
  mobile: { painting: 1024, mask: 640 },
};
// The plane's grid, columns (rows follow the aspect): enough that a
// depth edge stays a clean slope
const COLUMNS: Record<Quality, number> = { high: 320, low: 224, mobile: 128 };

// ---------- Pictures ----------

// next/image's widths (the default deviceSizes): the optimizer serves only these
const WIDTHS = [640, 750, 828, 1080, 1200, 1920, 2048, 3840];

// The address of a picture no longer than `edge`: the file itself when it
// is, else the image optimizer's copy at the next width up (a smaller
// download, AVIF or WebP); toTexture() trims the rest
export function pictureUrl(img: { src: string; width: number; height: number }, edge: number): string {
  const long = Math.max(img.width, img.height);
  if (long <= edge) return img.src;
  const want = Math.ceil((img.width * edge) / long);
  const w = WIDTHS.find((x) => x >= want);
  if (!w || w >= img.width) return img.src;
  return `/_next/image?url=${encodeURIComponent(img.src)}&w=${w}&q=75`;
}

// A painting decoded off the main thread, already at the tier's size and
// flipped for the GPU (createImageBitmap), so neither the decode nor the
// resize lands on a frame; null where the browser can't (loadImage then)
async function loadBitmap(url: string, edge: number): Promise<ImageBitmap | null> {
  if (typeof createImageBitmap !== "function") return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    const probe = await createImageBitmap(blob);
    const long = Math.max(probe.width, probe.height);
    const k = long > edge ? edge / long : 1;
    const w = Math.round(probe.width * k), h = Math.round(probe.height * k);
    probe.close();
    return await createImageBitmap(blob, { imageOrientation: "flipY", resizeWidth: w, resizeHeight: h, resizeQuality: "high" });
  } catch {
    return null;
  }
}

function bitmapTexture(bmp: ImageBitmap, color: boolean): THREE.Texture {
  const t = track(new THREE.Texture(bmp));
  // (flipped when decoded: an ImageBitmap ignores the GL's own flip)
  t.flipY = false;
  t.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = color ? 4 : 1;
  t.needsUpdate = true;
  return t;
}

// A painting as a texture: decoded off the main thread where it can be,
// else through an <img> and a canvas
async function pictureTexture(src: { src: string; width: number; height: number }, edge: number, color: boolean): Promise<THREE.Texture> {
  const url = pictureUrl(src, edge);
  const bmp = await loadBitmap(url, edge);
  if (bmp) return bitmapTexture(bmp, color);
  return toTexture(await loadImage(url), edge, color);
}

// Frees a texture and the bitmap it holds
function freeTexture(t: THREE.Texture) {
  const img = t.image as { close?: () => void } | null;
  t.dispose();
  if (img && typeof ImageBitmap !== "undefined" && img instanceof ImageBitmap) img.close();
}

function loadImage(url: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.decoding = "async";
  img.src = url;
  return img.decode().then(() => img);
}

function toTexture(img: HTMLImageElement, edge: number, color: boolean): THREE.Texture {
  const long = Math.max(img.naturalWidth, img.naturalHeight);
  let source: HTMLImageElement | HTMLCanvasElement = img;
  if (long > edge) {
    const k = edge / long;
    const c = document.createElement("canvas");
    c.width = Math.round(img.naturalWidth * k);
    c.height = Math.round(img.naturalHeight * k);
    const g = c.getContext("2d")!;
    g.imageSmoothingQuality = "high";
    g.drawImage(img, 0, 0, c.width, c.height);
    source = c;
  }
  const t = track(new THREE.Texture(source));
  t.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = color ? 4 : 1;
  t.needsUpdate = true;
  return t;
}

const blank = (value: number, color = false) => {
  const t = new THREE.DataTexture(new Uint8Array([value, value, value, 255]), 1, 1);
  t.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.needsUpdate = true;
  return t;
};
// (shared stand-ins until the pictures land, and after they're let go)
let blanks: { color: THREE.Texture; black: THREE.Texture } | null = null;
const stand = () => (blanks ??= { color: blank(0, true), black: blank(0) });

// The list of paintings and their masks (kit/plateArt.ts, generated by
// scripts/city/make-masks.mjs), its own chunk, fetched once
let artList: Promise<Record<string, PlateArt>> | null = null;
const art = () => (artList ??= import("./plateArt").then((m) => m.PLATE_ART));

// ---------- Rasterised data ----------

const REGION_WIDTH = 512;

function canvas2d(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d", { willReadFrequently: true })!] as const;
}
const tracePoly = (g: CanvasRenderingContext2D, poly: UV[], w: number, h: number) => {
  g.beginPath();
  poly.forEach(([u, v], i) => (i ? g.lineTo(u * w, v * h) : g.moveTo(u * w, v * h)));
  g.closePath();
};
const soften = (g: CanvasRenderingContext2D, px: number) => {
  // (where the browser has canvas filters; elsewhere the texture's own
  // smoothing does)
  if ("filter" in g) g.filter = `blur(${px}px)`;
};

// The regions, one channel each (r water, g wet, b sky, a glass), as a
// texture whose rows run bottom up, as the plane's uv do
function regionTexture(plate: PlateDef): { texture: THREE.DataTexture; sky: Uint8ClampedArray | null; w: number; h: number } {
  const w = REGION_WIDTH, h = Math.max(8, Math.round(REGION_WIDTH / plate.aspect));
  const data = new Uint8Array(w * h * 4);
  const kinds = ["water", "wet", "sky", "glass"] as const;
  let sky: Uint8ClampedArray | null = null;
  const [, g] = canvas2d(w, h);
  kinds.forEach((kind, ch) => {
    const polys = plate.regions.filter((r) => r.kind === kind);
    if (!polys.length) return;
    g.save();
    g.clearRect(0, 0, w, h);
    soften(g, 1.5);
    g.fillStyle = "#fff";
    for (const r of polys) {
      tracePoly(g, r.poly, w, h);
      g.fill();
    }
    g.restore();
    const px = g.getImageData(0, 0, w, h).data;
    if (kind === "sky") sky = new Uint8ClampedArray(w * h);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const v = px[(y * w + x) * 4 + 3];
        data[((h - 1 - y) * w + x) * 4 + ch] = v;
        if (sky) sky[y * w + x] = v;
      }
  });
  const texture = new THREE.DataTexture(data, w, h);
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return { texture: track(texture), sky, w, h };
}

// The depth, made in code (scenes.ts: PlateDepth "layers"): the ground
// below the horizon, what stands above it out of the sky (the sky from
// make-masks' sky mask, bounded by the place's "sky" regions if it has
// any), then the layers; one byte per point, the pull × 255
export function makeDepth(
  depth: Extract<PlateDef["depth"], { kind: "layers" }>,
  w: number,
  h: number,
  sky: ((x: number, y: number) => number) | null,
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(w * h);
  const ground = depth.ground;
  const standing = depth.standing ?? 0.06;
  if (ground) {
    for (let y = 0; y < h; y++) {
      const v = (y + 0.5) / h;
      for (let x = 0; x < w; x++) {
        let pull: number;
        if (v >= ground.horizon) {
          const t = (v - ground.horizon) / Math.max(1e-3, 1 - ground.horizon);
          pull = standing + (ground.near - standing) * Math.pow(t, 1.35);
        } else pull = standing * (1 - (sky ? sky(x, y) : 0));
        out[y * w + x] = Math.round(255 * pull);
      }
    }
  }
  return out;
}

async function depthTexture(plate: PlateDef, pics: PlateArt | undefined, regionSky: Uint8ClampedArray | null, quality: Quality): Promise<{ texture: THREE.Texture; strength: number }> {
  const d = plate.depth;
  if (d.kind === "map") {
    if (!pics?.depthDay) return { texture: stand().black, strength: 0 };
    const img = await loadImage(pictureUrl(pics.depthDay, PLATE_EDGE[quality].mask));
    const t = toTexture(img, PLATE_EDGE[quality].mask, false);
    t.generateMipmaps = false;
    t.minFilter = THREE.LinearFilter;
    return { texture: t, strength: d.strength };
  }
  const w = REGION_WIDTH, h = Math.max(8, Math.round(REGION_WIDTH / plate.aspect));
  let sky: ((x: number, y: number) => number) | null = null;
  if (d.ground && pics?.sky) {
    const img = await loadImage(pictureUrl(pics.sky, PLATE_EDGE.mobile.mask));
    const [, g] = canvas2d(w, h);
    g.drawImage(img, 0, 0, w, h);
    const px = g.getImageData(0, 0, w, h).data;
    sky = (x, y) => (px[(y * w + x) * 4] / 255) * (regionSky ? regionSky[y * w + x] / 255 : 1);
  } else if (d.ground && regionSky) sky = (x, y) => regionSky[y * w + x] / 255;
  const base = makeDepth(d, w, h, sky);
  const [c, g] = canvas2d(w, h);
  const image = g.createImageData(w, h);
  for (let i = 0; i < w * h; i++) {
    image.data[i * 4] = image.data[i * 4 + 1] = image.data[i * 4 + 2] = base[i];
    image.data[i * 4 + 3] = 255;
  }
  g.putImageData(image, 0, 0);
  for (const layer of d.layers) {
    const v = Math.round(255 * layer.z);
    g.fillStyle = `rgb(${v},${v},${v})`;
    tracePoly(g, layer.mask, w, h);
    g.fill();
  }
  // A little softness at the layers' edges, so a cut slopes rather than tears
  const [soft, sg] = canvas2d(w, h);
  soften(sg, 1);
  sg.drawImage(c, 0, 0);
  const t = track(new THREE.CanvasTexture(soft));
  t.colorSpace = THREE.NoColorSpace;
  t.generateMipmaps = false;
  t.minFilter = THREE.LinearFilter;
  return { texture: t, strength: 1 };
}

// ---------- The material ----------

const VERTEX = /* glsl */ `
uniform sampler2D uDepthMap;
uniform float uStrength;
varying vec2 vUv;
void main() {
  vUv = uv;
  float pull = texture2D(uDepthMap, uv).r * uStrength;
  vec3 p = position * (1.0 - pull);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}`;

const FRAGMENT = /* glsl */ `
uniform sampler2D uDayMap;
uniform sampler2D uNightMap;
uniform sampler2D uLightMap;
uniform sampler2D uRegionMap;
uniform float uDay;
uniform float uGlow;
uniform float uRain;
uniform float uWet;
uniform float uSnow;
uniform float uTime;
uniform float uAspect;
varying vec2 vUv;

const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), u.x), mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), u.x), u.y);
}
// Rain rings: one ring a cell, each at its own moment, flattened by the
// look down onto the ground
float rings(vec2 p, float t) {
  vec2 cell = floor(p);
  vec2 f = fract(p) - 0.5;
  float h = hash12(cell);
  float life = fract(t * 0.7 + h);
  vec2 c = (vec2(hash12(cell + 7.1), hash12(cell + 3.7)) - 0.5) * 0.5;
  vec2 d = f - c;
  d.y *= 2.6;
  float r = length(d);
  return smoothstep(0.05, 0.0, abs(r - life * 0.45)) * (1.0 - life);
}
#ifdef PLATE_UNTONE
// The inverse of three's NeutralToneMapping at the composer's exposure
// (1.12), so the painting comes out of Post.tsx as painted; held under the
// bloom's threshold (1.0)
vec3 untone(vec3 y) {
  const float S = 0.76;
  const float D = 0.24;
  // Scale, don't clamp per channel: a clamp turns a saturated sky's hue
  // (blue at its limit, green catching up: cyan)
  y *= min(1.0, 0.97 / max(max(y.r, max(y.g, y.b)), 1e-4));
  float peak = max(y.r, max(y.g, y.b));
  if (peak >= S) {
    float p = D * D / (1.0 - peak) - D + S;
    y *= p / peak;
  }
  float m = min(y.r, min(y.g, y.b));
  float x = m >= 0.04 ? m + 0.04 : sqrt(max(m, 0.0) / 6.25);
  y += x - m;
  y /= 1.12;
  return y * min(1.0, 0.985 / max(max(y.r, max(y.g, y.b)), 1e-4));
}
#endif

void main() {
  vec4 reg = texture2D(uRegionMap, vUv);
  float n = 1.0 - uDay;
  float t = uTime;
  vec2 uv = vUv;
  float water = reg.r;
  if (water > 0.002) {
    float row = vUv.y * 260.0;
    float wob = sin(row + t * 0.8 + sin(vUv.x * 9.0 + t * 0.3) * 2.0) * 0.65 + sin(row * 0.43 - t * 0.55 + vUv.x * 31.0) * 0.35;
    uv.x += water * wob * 0.0016;
    uv.y += water * sin(vUv.x * 70.0 + t * 0.6) * 0.0005;
  }
  vec3 day = texture2D(uDayMap, uv).rgb;
  vec3 night = texture2D(uNightMap, uv).rgb;
  float lit = texture2D(uLightMap, uv).r;
  // The two paintings never line up exactly: the crossover runs through the
  // middle of the dusk (n 0.3 .. 0.7), so no long half-and-half double
  // image; continuous in n, so never a pop
  vec3 col = mix(day, night, smoothstep(0.3, 0.7, n));
  // The lights come up early and hold steady through the blend
  float early = smoothstep(0.15, 0.55, n);
  vec3 lights = night * lit;
  col = max(col, lights * early);

  float sky = reg.b;
  if (sky > 0.002) {
    vec2 q = vec2(vUv.x * uAspect, vUv.y) * 3.0 + vec2(t * 0.004, 0.0);
    float cl = vnoise(q) * 0.6 + vnoise(q * 2.3 + 5.0) * 0.4;
    col *= 1.0 + sky * uDay * (cl - 0.5) * 0.07;
    vec2 sp = vec2(vUv.x * uAspect, vUv.y) * 180.0;
    vec2 sc = floor(sp);
    vec2 so = fract(sp) - 0.5 - (vec2(hash12(sc + 1.3), hash12(sc + 2.9)) - 0.5) * 0.6;
    float star = step(0.986, hash12(sc)) * smoothstep(0.22, 0.0, length(so)) * (0.4 + 0.6 * hash12(sc + 9.1));
    float dark = 1.0 - smoothstep(0.05, 0.16, dot(night, LUMA));
    float clear = (1.0 - uRain) * (1.0 - uSnow) * (1.0 - 0.6 * uWet);
    col += vec3(0.85, 0.9, 1.0) * star * sky * dark * clear * smoothstep(0.6, 0.95, n) * 0.55;
  }
  float glass = reg.a;
  if (glass > 0.002) {
    float band = fract(vUv.x * 0.8 + vUv.y * 0.5 - t / 26.0);
    float sheen = smoothstep(0.0, 0.08, band) * smoothstep(0.2, 0.08, band);
    col += glass * sheen * uDay * 0.05 * (1.0 - 0.7 * uRain);
  }
  float wet = reg.g * uWet;
  if (wet > 0.002) {
    col *= 1.0 - 0.16 * wet;
    vec3 refl = vec3(0.0);
    for (int i = 1; i <= 5; i++) {
      float k = float(i);
      vec2 q = uv + vec2(sin(vUv.y * 340.0 + t * 1.1 + k) * 0.0012 * wet, 0.011 * k);
      refl += texture2D(uNightMap, q).rgb * texture2D(uLightMap, q).r * (1.0 - k * 0.16);
    }
    col += refl * 0.28 * wet * early;
  }
  float rainy = max(water, reg.g) * uRain;
  if (rainy > 0.002) {
    vec2 rp = vec2(vUv.x * uAspect, vUv.y) * 70.0;
    float r = rings(rp, t) + rings(rp * 1.37 + 11.0, t * 1.13);
    col += mix(vec3(0.5, 0.56, 0.66), vec3(0.3, 0.32, 0.4), n) * r * rainy * 0.09;
  }
  col = mix(col, vec3(dot(col, LUMA)) * 1.06 + 0.03, 0.18 * uSnow);
#ifdef PLATE_UNTONE
  col = untone(col);
  // After dark the lights go over 1.0, where the bloom takes them
  col += lights * n * uGlow * 0.3;
#endif
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`;

// Whether a tier draws through the composer (Post.tsx), whose tone
// mapping the plate undoes
const toned = (quality: Quality) => quality !== "mobile";

type PlateMaterial = THREE.ShaderMaterial & { plateTextures?: Record<string, THREE.Texture | null> };

// The plate's material, one per painting and tone (kit/materials.ts),
// every plate sharing one program (customProgramCacheKey: the tone only)
export function plateMaterial(opts: { painting: string; quality: Quality; depth: PlateDef["depth"] }): THREE.ShaderMaterial {
  const tone = toned(opts.quality) ? "hdr" : "screen";
  return shared(materialKey("plate", `${opts.painting}:${tone}`), () => {
    const s = stand();
    const m = new THREE.ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      defines: tone === "hdr" ? { PLATE_UNTONE: "" } : {},
      uniforms: {
        ...plateUniforms,
        uDayMap: { value: s.color },
        uNightMap: { value: s.color },
        uLightMap: { value: s.black },
        uRegionMap: { value: s.black },
        uDepthMap: { value: s.black },
        uStrength: { value: 0 },
        uAspect: { value: 1 },
      },
      fog: false,
      toneMapped: false,
    }) as PlateMaterial;
    const key = materialKey("plate", tone);
    m.customProgramCacheKey = () => key;
    return m;
  });
}

// What textureBytes() (kit/textures.ts) counts reads a material's own
// properties, not a shader's uniforms: the plate's pictures are set on it
// as properties too
function expose(m: THREE.ShaderMaterial, maps: Record<string, THREE.Texture | null>) {
  const pm = m as PlateMaterial;
  for (const [k, t] of Object.entries(maps)) (pm as unknown as Record<string, unknown>)[k] = t;
}

// ---------- Wanted places ----------

// The place the camera is going to (City3D.tsx: the Director sets it as
// soon as a journey is planned), so its pictures are fetched before it
// arrives; the showing place keeps its own
let wanted: SceneId | null = null;
const wantListeners = new Set<() => void>();
export function wantPlate(id: SceneId | null) {
  if (wanted === id) return;
  wanted = id;
  wantListeners.forEach((l) => l());
}
export const wantedPlate = () => wanted;
// A place about to be wanted: a press (or Enter) on a link to it, before
// the address changes, so its pictures start on their way at the click
// (held a few seconds; the journey's wantPlate takes over)
const hinted = new Map<SceneId, number>();
const HINT_MS = 6000;
export function hintPlate(id: SceneId) {
  const fresh = !hinted.has(id);
  hinted.set(id, performance.now());
  if (fresh) wantListeners.forEach((l) => l());
  window.setTimeout(() => {
    if (performance.now() - (hinted.get(id) ?? 0) < HINT_MS - 50) return;
    hinted.delete(id);
    wantListeners.forEach((l) => l());
  }, HINT_MS);
}
export const hintedPlate = (id: SceneId) => hinted.has(id);
export function onWantPlate(listener: () => void) {
  wantListeners.add(listener);
  return () => void wantListeners.delete(listener);
}

// Whether a place's painting is still on its way (the Director waits at
// the threshold for it, and the first frame for the first place)
export function placePending(root: THREE.Object3D | undefined): boolean {
  if (!root) return false;
  let pending = false;
  root.traverse((o) => {
    if (o.userData.platePending) pending = true;
  });
  return pending;
}

// ---------- The plate ----------

export type Plate = {
  group: THREE.Group; // at the eye, turned as the home view; scaled by cover()
  mesh: THREE.Mesh;
  frame: PlateFrame;
  material: THREE.ShaderMaterial;
  textures: () => THREE.Texture[]; // what's loaded now (to upload ahead)
  // fetch the pictures (once; again after release); `upload` puts each on
  // the GPU before the plate shows them (PlatePlace.tsx: uploadBetweenFrames)
  load(upload?: (t: THREE.Texture) => Promise<void>): Promise<void>;
  release(): void; // let the pictures go (the place can load them again)
  cover(camera: THREE.Camera): void; // grow and slide to fill what the camera shows, from wherever it is
  dispose(): void;
};

const _m = new THREE.Matrix4();

export function buildPlate(def: PlaceDef, quality: Quality): Plate {
  const plate = def.plate;
  const frame = plateFrame(def);
  const group = new THREE.Group();
  group.name = `plate:${plate.painting}`;
  group.position.set(...frame.eye);
  _m.lookAt(new THREE.Vector3(...frame.eye), new THREE.Vector3(...frame.target), new THREE.Vector3(0, 1, 0));
  group.quaternion.setFromRotationMatrix(_m);
  group.updateMatrix();
  // (its matrix is the home frame times the cover's fit, set in cover())
  const home = group.matrix.clone();
  group.matrixAutoUpdate = false;
  group.userData.platePending = true;

  const cols = COLUMNS[quality];
  const rows = Math.max(8, Math.round(cols / plate.aspect));
  const geometry = new THREE.PlaneGeometry(frame.width, frame.height, cols, rows);
  geometry.translate(0, 0, -frame.distance);
  const material = plateMaterial({ painting: plate.painting, quality, depth: plate.depth });
  const mesh = new THREE.Mesh(geometry, material);
  // (its points move in the shader; it fills the view whenever it shows)
  mesh.frustumCulled = false;
  mesh.visible = false;
  mesh.name = "plate";
  group.add(mesh);

  const regions = regionTexture(plate);
  let maps: { day: THREE.Texture; night: THREE.Texture; light: THREE.Texture | null; depth: THREE.Texture } | null = null;
  let loading: Promise<void> | null = null;
  let generation = 0;
  const s = stand();

  const apply = () => {
    const u = material.uniforms;
    u.uRegionMap.value = regions.texture;
    u.uAspect.value = plate.aspect;
    u.uDayMap.value = maps?.day ?? s.color;
    u.uNightMap.value = maps?.night ?? s.color;
    u.uLightMap.value = maps?.light ?? s.black;
    u.uDepthMap.value = maps?.depth ?? s.black;
    expose(material, { plateDay: maps?.day ?? null, plateNight: maps?.night ?? null, plateLight: maps?.light ?? null, plateDepth: maps?.depth ?? null, plateRegions: regions.texture });
    mesh.visible = !!maps;
    group.userData.platePending = !maps;
  };
  apply();

  const freeMaps = () => {
    if (!maps) return;
    for (const t of [maps.day, maps.night, maps.light, maps.depth]) if (t && t !== s.black && t !== s.color) freeTexture(t);
    maps = null;
  };

  const load = (upload?: (t: THREE.Texture) => Promise<void>) => {
    if (maps) return Promise.resolve();
    if (loading) return loading;
    const mine = ++generation;
    const edge = PLATE_EDGE[quality];
    loading = art()
      .then(async (list) => {
        const pics = list[plate.painting];
        if (!pics) throw new Error(`plate: no painting "${plate.painting}" in kit/plateArt.ts (npm run city:masks)`);
        // (if one picture fails, the ones that did decode are freed, not
        // left for the canvas's end)
        const settled = await Promise.allSettled([
          pictureTexture(pics.day, edge.painting, true),
          pictureTexture(pics.night, edge.painting, true),
          pics.light ? pictureTexture(pics.light, edge.mask, false) : Promise.resolve(null),
          depthTexture(plate, pics, regions.sky, quality),
        ] as const);
        const failed = settled.find((r): r is PromiseRejectedResult => r.status === "rejected");
        if (failed) {
          for (const r of settled) {
            if (r.status !== "fulfilled" || !r.value) continue;
            const t = r.value instanceof THREE.Texture ? r.value : r.value.texture;
            if (t !== s.black && t !== s.color) freeTexture(t);
          }
          throw failed.reason;
        }
        const [day, night, light, depth] = settled.map((r) => (r as PromiseFulfilledResult<unknown>).value) as [
          THREE.Texture,
          THREE.Texture,
          THREE.Texture | null,
          Awaited<ReturnType<typeof depthTexture>>,
        ];
        const all = [day, night, light, depth.texture, regions.texture].filter((t): t is THREE.Texture => !!t && t !== s.black && t !== s.color);
        // Uploaded one at a time, each in a task of its own, between frames
        // (never in the frame that first draws them: no stall at a lift)
        if (upload) for (const t of all) {
          if (mine !== generation) break;
          await upload(t);
        }
        if (mine !== generation) {
          for (const t of [day, night, light, depth.texture]) if (t && t !== s.black) freeTexture(t);
          return;
        }
        maps = { day, night, light, depth: depth.texture };
        material.uniforms.uStrength.value = depth.strength;
        apply();
      })
      .finally(() => {
        if (mine === generation) loading = null;
      });
    return loading;
  };

  // Scratch for cover(): the home frame in the world (through the place's
  // group: its offset, and a flight's pull-back, so not even a lift ever
  // shows the painting's edge), and the camera in it
  const fit = new THREE.Matrix4();
  const last = { s: 1, x: 0, y: 0 };
  const margin = coverMargin(plate);
  const pulls = [0, maxPull(plate)];
  const homeInv = new THREE.Matrix4();
  const rel = new THREE.Matrix4();
  const unit = new THREE.Vector3(1, 1, 1);

  return {
    group,
    mesh,
    frame,
    material,
    textures: () => (maps ? [maps.day, maps.night, maps.light, maps.depth, regions.texture].filter((t): t is THREE.Texture => !!t) : []),
    load,
    release() {
      generation++;
      loading = null;
      freeMaps();
      apply();
    },
    cover(camera) {
      // The window the view makes in the painting (viewWindow: from where
      // the camera really is, only the part of the view's height that
      // must be filled, the nearest pulled plane too), filled
      const parent = group.parent;
      if (parent) {
        parent.updateWorldMatrix(true, false);
        homeInv.multiplyMatrices(parent.matrixWorld, home).invert();
      } else homeInv.copy(home).invert();
      rel.compose(camera.position, camera.quaternion, unit).premultiply(homeInv);
      const win = viewWindow((camera as THREE.PerspectiveCamera).projectionMatrixInverse, rel, frame.distance, pulls, plateView.fill, plateView.top);
      if (!win) return;
      const D = frame.distance;
      const aim = plateView.painting === plate.painting && plateView.aim ? plateView.aim : (plate.look ?? null);
      const { s, cx, cy } = coverFit(win, frame, margin, aim);
      if (Math.abs(last.s - s) < 1e-5 && Math.abs(last.x - cx) < 1e-5 && Math.abs(last.y - cy) < 1e-5) return;
      last.s = s;
      last.x = cx;
      last.y = cy;
      // (a point in the plane moves by (cx, cy); one pulled toward the eye
      // by its share of that: along its line to the eye)
      fit.set(s, 0, -cx / D, 0, 0, s, -cy / D, 0, 0, 0, 1, 0, 0, 0, 0, 1);
      group.matrix.multiplyMatrices(home, fit);
      group.matrixWorldNeedsUpdate = true;
    },
    dispose() {
      generation++;
      freeMaps();
      regions.texture.dispose();
      geometry.dispose();
    },
  };
}

// ---------- Movers ----------

// Small moving lights over the painting (scenes.ts: PlateMover), one
// instanced draw, as a Mover (common.tsx: useMovers runs and parks it).
// Its object goes in the plate's group (PlatePlace.tsx), so the cover's
// scale carries it.

const MOVER_VERTEX = /* glsl */ `
attribute vec3 aPos;
attribute vec2 aDir;
attribute vec3 aColor;
attribute vec4 aShape; // width, length, level, night-only
uniform float uDay;
varying vec2 vQ;
varying vec3 vColor;
void main() {
  vec3 right = vec3(aDir, 0.0);
  vec3 up = vec3(-aDir.y, aDir.x, 0.0);
  vec3 p = aPos + right * position.x * aShape.y + up * position.y * aShape.x;
  vQ = position.xy * 2.0;
  float night = mix(1.0, smoothstep(0.15, 0.6, 1.0 - uDay), aShape.w);
  vColor = aColor * aShape.z * night;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}`;

const MOVER_FRAGMENT = /* glsl */ `
uniform float uGlow;
varying vec2 vQ;
varying vec3 vColor;
void main() {
  float a = exp(-(vQ.x * vQ.x * 2.5 + vQ.y * vQ.y * 5.0)) - 0.02;
  vec3 col = vColor * max(a, 0.0);
#ifdef PLATE_UNTONE
  col *= 1.0 + uGlow * 1.4;
#endif
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`;

function moverMaterial(quality: Quality): THREE.ShaderMaterial {
  const tone = toned(quality) ? "hdr" : "screen";
  return shared(materialKey("plate-movers", tone), () => {
    const m = new THREE.ShaderMaterial({
      vertexShader: MOVER_VERTEX,
      fragmentShader: MOVER_FRAGMENT,
      defines: tone === "hdr" ? { PLATE_UNTONE: "" } : {},
      uniforms: { uDay: plateUniforms.uDay, uGlow: plateUniforms.uGlow },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
      toneMapped: false,
    });
    const key = materialKey("plate-movers", tone);
    m.customProgramCacheKey = () => key;
    return m;
  });
}

type Track = { pts: THREE.Vector3[]; at: number[]; total: number };
const trackOf = (pts: THREE.Vector3[]): Track => {
  const at = [0];
  for (let i = 1; i < pts.length; i++) at.push(at[i - 1] + pts[i].distanceTo(pts[i - 1]));
  return { pts, at, total: at[at.length - 1] || 1 };
};
// The point a share s of the way along, and the way it's heading
function along(tr: Track, s: number, out: THREE.Vector3, dir: THREE.Vector2) {
  const d = s * tr.total;
  let i = 1;
  while (i < tr.at.length - 1 && tr.at[i] < d) i++;
  const a = tr.pts[i - 1], b = tr.pts[i] ?? a;
  const seg = tr.at[i] - tr.at[i - 1] || 1;
  out.lerpVectors(a, b, Math.min(1, Math.max(0, (d - tr.at[i - 1]) / seg)));
  dir.set(b.x - a.x, b.y - a.y);
  if (dir.lengthSq() < 1e-12) dir.set(1, 0);
  dir.normalize();
}
// Lights fade in and out at a path's ends, never pop
const ends = (s: number) => Math.min(1, s / 0.06, (1 - s) / 0.06);

export type PlateMovers = Mover & { dispose(): void; count: number };

export function buildMovers(def: PlaceDef, quality: Quality = "high"): PlateMovers | null {
  const list = def.plate.movers ?? [];
  if (!list.length) return null;
  const frame = plateFrame(def);
  type Light = { m: PlateMover; tr: Track; i: number; n: number; w: number; len: number; color: THREE.Color };
  const lights: Light[] = [];
  for (const m of list) {
    const pull = pullOf(def.plate, m.depth ?? 0) + 0.003;
    const pts = m.path.map(([u, v]) => new THREE.Vector3(...localPoint(frame, u, v, pull)));
    const w = m.size * frame.height * (1 - pull);
    const color = new THREE.Color(m.color);
    if (m.kind === "beacon") pts.forEach((p, i) => lights.push({ m, tr: trackOf([p]), i, n: pts.length, w, len: w, color }));
    else {
      const n = Math.max(1, m.count ?? (m.kind === "trail" ? 12 : 1));
      const tr = trackOf(pts);
      for (let i = 0; i < n; i++) lights.push({ m, tr, i, n, w, len: m.kind === "trail" ? w * 4 : w * 1.6, color });
    }
  }
  const count = lights.length;
  const base = new THREE.PlaneGeometry(1, 1);
  const geometry = new THREE.InstancedBufferGeometry();
  geometry.index = base.index;
  geometry.setAttribute("position", base.getAttribute("position"));
  const pos = new THREE.InstancedBufferAttribute(new Float32Array(count * 3), 3).setUsage(THREE.DynamicDrawUsage);
  const dir = new THREE.InstancedBufferAttribute(new Float32Array(count * 2), 2).setUsage(THREE.DynamicDrawUsage);
  const col = new THREE.InstancedBufferAttribute(new Float32Array(count * 3), 3);
  const shape = new THREE.InstancedBufferAttribute(new Float32Array(count * 4), 4).setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute("aPos", pos);
  geometry.setAttribute("aDir", dir);
  geometry.setAttribute("aColor", col);
  geometry.setAttribute("aShape", shape);
  geometry.instanceCount = count;
  lights.forEach((l, k) => col.setXYZ(k, l.color.r, l.color.g, l.color.b));
  // (the painting's whole extent, for useMovers' in-view test)
  geometry.boundingBox = new THREE.Box3(new THREE.Vector3(-frame.width / 2, -frame.height / 2, -frame.distance), new THREE.Vector3(frame.width / 2, frame.height / 2, -frame.distance * 0.1));
  geometry.boundingSphere = geometry.boundingBox.getBoundingSphere(new THREE.Sphere());
  const mesh = new THREE.Mesh(geometry, moverMaterial(quality));
  mesh.name = "plate-movers";
  mesh.frustumCulled = false;
  mesh.renderOrder = 1;

  const p = new THREE.Vector3();
  const d = new THREE.Vector2();
  const place = (t: number, parked: boolean) => {
    lights.forEach((l, k) => {
      const m = l.m;
      let level = 1;
      if (m.kind === "beacon") {
        along(l.tr, 0, p, d);
        d.set(1, 0);
        if (!parked && m.period > 0) level = 0.55 + 0.45 * (0.5 + 0.5 * Math.sin((2 * Math.PI * t) / m.period + l.i * 1.7));
      } else if (m.kind === "trail") {
        const s = (((parked ? 0 : t / m.period) + l.i / l.n) % 1 + 1) % 1;
        along(l.tr, s, p, d);
        level = ends(s);
      } else {
        const s = ((parked ? 0.5 : t / m.period) % 1 + 1) % 1;
        along(l.tr, s, p, d);
        p.x += d.x * l.w * 1.5 * (l.i - (l.n - 1) / 2);
        p.y += d.y * l.w * 1.5 * (l.i - (l.n - 1) / 2);
        level = ends(s);
      }
      pos.setXYZ(k, p.x, p.y, p.z);
      dir.setXY(k, d.x, d.y);
      shape.setXYZW(k, l.w, l.len, level, m.night === false ? 0 : 1);
    });
    pos.needsUpdate = dir.needsUpdate = shape.needsUpdate = true;
  };
  place(0, true);
  col.needsUpdate = true;

  return {
    object: mesh,
    count,
    update: (t) => place(t, false),
    park: () => place(0, true),
    dispose() {
      geometry.dispose();
      base.dispose();
    },
  };
}
