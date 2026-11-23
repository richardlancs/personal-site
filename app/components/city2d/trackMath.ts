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

/**
 * The panorama along the journey (CityTrack.tsx): how far it has moved left
 * (`p`, pixels) at each place along the track (`x`), straight between them.
 * At each stop's start it stands at that stop's stretch (`starts`, in the
 * panorama's own pixels, drawn `scale` times as big): its segment
 * (`segment` wide) from its left edge, or centred where the screen is
 * narrower than a segment; at the journey's end, its own end. Never past
 * either end, never back.
 */
export function panoKeys(offsets: number[], vw: number, scale: number, starts: number[], width: number, segment: number): { x: number[]; p: number[] } {
  const n = offsets.length - 1;
  const travel = Math.max(0, offsets[n] - vw);
  const end = Math.max(0, width * scale - vw);
  const x: number[] = [];
  const p: number[] = [];
  for (let k = 0; k < n && offsets[k] < travel; k++) {
    x.push(offsets[k]);
    p.push(Math.min(end, Math.max(p[k - 1] ?? 0, scale * (starts[k] ?? 0) + Math.max(0, (scale * segment - vw) / 2))));
  }
  x.push(travel);
  p.push(end);
  return { x, p };
}

/** Where the panorama stands (panoKeys) at x along the track */
export function panoAt(x: number, keys: { x: number[]; p: number[] }): number {
  const { x: xs, p } = keys;
  if (x <= xs[0]) return p[0];
  for (let k = 1; k < xs.length; k++) if (x <= xs[k]) return p[k - 1] + ((p[k] - p[k - 1]) * (x - xs[k - 1])) / (xs[k] - xs[k - 1] || 1);
  return p[p.length - 1];
}
