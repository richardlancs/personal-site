// The horizontal journey's arithmetic (CityTrack.tsx): pure, so it is
// tested without a browser. The page scrolls down; the track of stops moves
// left by exactly as much, so a scroll of y pixels (from the top of the
// runway) is y pixels along the city.

/** Where each stop starts along the track, in pixels, then the track's whole width: n + 1 numbers. */
export function stopOffsets(widths: number[]): number[] {
  const out = [0];
  for (const w of widths) out.push(out[out.length - 1] + Math.max(0, w));
  return out;
}

/** The scroll (from the runway's top) that puts stop i at the left edge, never past the end of the track. */
export function scrollYForStop(i: number, offsets: number[], viewportW: number): number {
  const n = offsets.length - 1;
  if (n < 1) return 0;
  const k = Math.min(Math.max(Math.round(i), 0), n - 1);
  const end = Math.max(0, offsets[n] - viewportW);
  return Math.min(offsets[k], end);
}

/** The stop you're at for a scroll (from the runway's top): the last one whose start is at or before it, `lead` pixels counting early. */
export function stopAt(scrollY: number, offsets: number[], lead = 0): number {
  const n = offsets.length - 1;
  let at = 0;
  // Half a pixel either way is rounding, not a move
  for (let i = 1; i < n; i++) if (offsets[i] <= scrollY + lead + 0.5) at = i;
  return at;
}

/** How far a layer at `depth` moves when the street has moved x: depth 0 moves with the street, 1 stays put. */
export function parallax(x: number, depth: number): number {
  return x * (1 - Math.min(Math.max(depth, 0), 1));
}

/** The sky behind the city (city-track.css: it moves 30% as far as the street) */
export const SKY_DEPTH = 0.7;

/** Whether a screen this size takes the journey (smaller: the page reads top to bottom). Also in the head script (TRACK_SCRIPT). */
export const TRACK_MIN = { width: 320, height: 320 } as const;
