// Seeded randomness, so every model and texture comes out the same on
// every visit (and in every screenshot).

export type Rng = {
  (): number;
  range: (min: number, max: number) => number;
  pick: <T>(items: readonly T[]) => T;
  sign: () => 1 | -1;
};

export function rng(seed: number): Rng {
  let a = seed >>> 0;
  const next = (() => {
    // mulberry32
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }) as Rng;
  next.range = (min, max) => min + next() * (max - min);
  next.pick = (items) => items[Math.floor(next() * items.length)];
  next.sign = () => (next() < 0.5 ? -1 : 1);
  return next;
}
