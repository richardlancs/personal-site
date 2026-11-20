// Rain and snow over a district's band (components/city2d/WeatherOverlay.tsx):
// the particles' maths, pure, so it can be tested without a canvas. The
// overlay seeds a band's particles once for its size and steps them each
// frame; nothing here draws.
//
// Everything is in the band's CSS pixels. The same seed and size give the
// same particles, so a reload looks the same. Counts follow the band's
// area and are capped, and every particle keeps inside the band (it leaves
// one edge and comes back at the other).

export type PrecipKind = "rain" | "snow";

/** At most this many frames a second; the overlay skips frames by timestamp. */
export const FRAME_CAP = 30;
export const FRAME_MS = 1000 / FRAME_CAP;
/** The canvas's pixel ratio is capped here: thin streaks don't need more. */
export const MAX_DPR = 1.5;
/** The one seed every band uses. */
export const PRECIP_SEED = 20261119;

export const MAX_COUNT: Record<PrecipKind, number> = { rain: 140, snow: 90 };
/** The most any streak or flake shows: subtle, never a curtain. */
export const MAX_ALPHA: Record<PrecipKind, number> = { rain: 0.35, snow: 0.6 };
// Particles per square CSS pixel, before the cap (a 1440px band holds the
// cap; a phone's band about a tenth of it)
const DENSITY: Record<PrecipKind, number> = { rain: 1 / 6000, snow: 1 / 10000 };
/** Rain's slant: sideways pixels per pixel of fall. */
export const RAIN_SLANT = 0.18;
// Snow's steady drift to one side, under its sway (px/s)
const SNOW_WIND = 6;

export interface Particle {
  x: number;
  y: number;
  /** Rain: the streak's length. Snow: the flake's radius. */
  size: number;
  /** Fall, px/s */
  speed: number;
  /** Snow's sideways sway: amplitude (px), frequency (Hz) and phase (rad) */
  sway: number;
  freq: number;
  phase: number;
  alpha: number;
}

// mulberry32: small, fast, and the same on every machine
function random(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const wrap = (n: number, size: number) => ((n % size) + size) % size;

/** How many particles a band of this size holds. */
export function particleCount(kind: PrecipKind, width: number, height: number): number {
  if (!(width > 0 && height > 0)) return 0;
  return Math.min(MAX_COUNT[kind], Math.round(width * height * DENSITY[kind]));
}

/** A band's particles, spread over it. */
export function seedParticles(kind: PrecipKind, width: number, height: number, seed: number = PRECIP_SEED): Particle[] {
  const rand = random(seed);
  const between = (lo: number, hi: number) => lo + (hi - lo) * rand();
  const count = particleCount(kind, width, height);
  const out: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const x = rand() * width;
    const y = rand() * height;
    if (kind === "rain") {
      out.push({ x, y, size: between(10, 22), speed: between(520, 760), sway: 0, freq: 0, phase: 0, alpha: between(0.12, MAX_ALPHA.rain) });
    } else {
      out.push({ x, y, size: between(0.8, 2.2), speed: between(18, 40), sway: between(6, 16), freq: between(0.15, 0.35), phase: between(0, Math.PI * 2), alpha: between(0.3, MAX_ALPHA.snow) });
    }
  }
  return out;
}

/** Moves every particle on by `dt` seconds, in place, wrapping inside the band. */
export function stepParticles(kind: PrecipKind, particles: Particle[], dt: number, width: number, height: number): Particle[] {
  if (!(width > 0 && height > 0) || !(dt > 0)) return particles;
  for (const p of particles) {
    const fall = p.speed * dt;
    p.y = wrap(p.y + fall, height);
    p.x = wrap(p.x + (kind === "rain" ? fall * RAIN_SLANT : SNOW_WIND * dt), width);
  }
  return particles;
}

/** Where a flake is drawn at `time` seconds: its place plus its sway, kept inside the band. */
export function flakeX(p: Particle, time: number, width: number): number {
  return wrap(p.x + Math.sin(p.phase + time * p.freq * Math.PI * 2) * p.sway, width);
}
