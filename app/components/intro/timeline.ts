// The home page's intro (Intro.tsx), as plain functions of time: where
// each painted layer is, where the kid is, and the wipe into the park.
// No drawing here, so tests/intro.test.mjs can check it.
//
// 0–0.6 s     cream fades to the painting, high on the hillside
// 0.6–7 s     the camera drifts forward and down the path (parallax)
// 1.4–2.4 s   the kid runs in past the camera, from the lower left
// 2.4–7 s     the kid runs on down the path, smaller and smaller
// 6.9–8.5 s   the tall grass rises across the frame: the wipe
// 8.3–9.2 s   the painting fades to the park underneath
// 9.2 s       done (gone by 9.5); never later than 10 s, whatever happens

export const DURATION = 9.2;
export const CAP_MS = 10000;

export type Layer = "sky" | "far" | "mid" | "near" | "front";
export const LAYERS: Layer[] = ["sky", "far", "mid", "near", "front"];

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const smooth = (x: number) => {
  const k = clamp01(x);
  return k * k * (3 - 2 * k);
};
const span = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));

// How far the camera has come down the hill, 0..1, eased
export const travel = (t: number) => smooth(span(t, 0.4, 8.2));

// The paintings' size: each layer is laid out as this box, covering the
// screen, anchored to its foot (globals.css: .intro-layer)
export const ART = { w: 1672, h: 941 };

// Each layer moves with the camera by its depth: the nearer, the more it
// grows and the further it slides up and away, about `ORIGIN` (where the
// park is, so the camera pushes toward it). `base` is where the layer sits
// at the start, as a fraction of the box's height: the paintings were made
// separately, so the far coast is lifted and the hillside lowered until
// they read as one view. All fractions are of the layer's box.
const DEPTH: Record<Layer, { base: number; grow: number; rise: number; drift: number }> = {
  sky: { base: 0, grow: 0.03, rise: 0.01, drift: -0.004 },
  far: { base: -0.19, grow: 0.08, rise: 0.02, drift: 0 },
  mid: { base: -0.06, grow: 0.22, rise: 0.05, drift: 0 },
  near: { base: 0.13, grow: 0.55, rise: 0.1, drift: 0 },
  front: { base: 0.04, grow: 1.0, rise: 0.08, drift: 0 },
};
export const ORIGIN = { x: 0.72, y: 0.68 };

export function layer(name: Layer, t: number) {
  const d = DEPTH[name];
  const k = travel(t);
  let scale = 1 + d.grow * k;
  let y = d.base - d.rise * k;
  // The front grass rises across the frame for the wipe
  if (name === "front") {
    const w = smooth(span(t, 6.9, 8.4));
    scale += w * 1.6;
    y -= w * 0.55;
  }
  return { scale, x: d.drift * t, y, base: d.base };
}

// Where a point painted on a layer (u, v: fractions of the composed
// picture at the start) is at time t, in the same fractions
export function onLayer(name: Layer, t: number, u: number, v: number) {
  const l = layer(name, t);
  return { x: ORIGIN.x + (u - ORIGIN.x) * l.scale + l.x, y: ORIGIN.y + (v - l.base - ORIGIN.y) * l.scale + l.y, scale: l.scale };
}

// The cream cover at the start: 1 opaque, 0 gone
export const cover = (t: number) => 1 - smooth(span(t, 0, 0.6));

// The wipe: the dense grass layer's rise, 0 (below the frame) to 1 (over
// all of it), and then the whole painting's opacity as it fades to the park
export const wipe = (t: number) => smooth(span(t, 7.0, 8.3));
export const painting = (t: number) => 1 - smooth(span(t, 8.3, 9.2));

// The kid's path, in the composed picture at the start (fractions of the
// box): from just behind the camera at the lower left, onto the hillside
// path, down it and along the fields' path to the park's arches under the
// clock tower. Points are [u, v, height], the height a fraction of the box.
export const KID_PATH: [number, number, number][] = [
  [0.33, 1.62, 1.2], // behind the camera: only the top of them shows
  [0.43, 1.12, 0.5],
  [0.5, 0.975, 0.24],
  [0.575, 0.9, 0.12],
  [0.625, 0.865, 0.075],
  [0.7, 0.8, 0.048],
  [0.72, 0.745, 0.032],
  [0.755, 0.705, 0.02],
];

// Where along the path the kid is at time t: a fast close pass, then a
// steady run away
export function kidProgress(t: number) {
  if (t < 1.4) return null;
  if (t > 7.2) return null;
  const close = span(t, 1.4, 2.4);
  const away = span(t, 2.4, 7.2);
  return t < 2.4 ? close * (2 / (KID_PATH.length - 1)) : 2 / (KID_PATH.length - 1) + away * (1 - 2 / (KID_PATH.length - 1));
}

// The kid at time t: position and height (fractions of the screen, in the
// near layer's frame), stride phase, and opacity (fading out far away)
export function kid(t: number) {
  const p = kidProgress(t);
  if (p == null) return null;
  const f = p * (KID_PATH.length - 1);
  const i = Math.min(KID_PATH.length - 2, Math.floor(f));
  const k = f - i;
  const [x0, y0, h0] = KID_PATH[i];
  const [x1, y1, h1] = KID_PATH[i + 1];
  const x = x0 + (x1 - x0) * k;
  const y = y0 + (y1 - y0) * k;
  // Height falls off geometrically, as distance does
  const h = h0 * Math.pow(h1 / h0, k);
  // Strides: about 3 a second, a little quicker close up
  const phase = (t * 3.1) % 1;
  const alpha = 1 - smooth(span(t, 6.6, 7.2));
  // The hillside carries the kid at first, the fields further on
  const field = smooth((p - 0.35) / 0.4);
  return { x, y, h, phase, alpha, field };
}
