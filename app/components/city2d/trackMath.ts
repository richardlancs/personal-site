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

/**
 * Whether a screen this size takes the journey (smaller: the page reads top
 * to bottom). Also in the head script (TRACK_SCRIPT). The height counts in
 * the root's text size too (`ems`): at 200% text a phone on its side, or a
 * 640px-tall phone, would leave each stop's panel a slit a line or two
 * tall under the bar, so it reads stacked instead (22em: 704px at 200%,
 * 352px at 100%).
 */
export const TRACK_MIN = { width: 320, height: 320, ems: 22 } as const;

/**
 * The room a stop's panel has, in px, on a `w` × `h` screen with root text
 * of `rem` px (city-track.css's layout, the bar taken as one row, 3.5rem):
 * wide, the screen less the bar's line (bar + 0.75rem), the top line
 * (1.5rem; none at 500px tall or less) and the map's foot (44px + 2rem,
 * 0.75rem when short, + 8px + 0.5rem); on a phone or a tall screen, the
 * sheet under the painting's strip (0.8 of the screen under the bar) less
 * the foot. Under ROOM_EMS of it the page reads stacked instead.
 */
export const ROOM_EMS = 20;
export function trackRoom(w: number, h: number, rem = 16): number {
  const r = rem || 16;
  if (w <= h) return 0.8 * (h - 3.5 * r) - (52 + 2.5 * r);
  return h <= 500 ? h - 5.5 * r - 52 : h - 8.25 * r - 52;
}

/** Whether a screen of `w` × `h` with root text of `rem` px takes the journey. */
export function trackFits(w: number, h: number, rem = 16): boolean {
  const r = rem || 16;
  return w >= TRACK_MIN.width && h >= Math.max(TRACK_MIN.height, TRACK_MIN.ems * r) && trackRoom(w, h, r) >= ROOM_EMS * r;
}

/**
 * The panorama along the journey (CityTrack.tsx): how far it has moved left
 * (`p`, pixels) at each place along the track (`x`), straight between them.
 * At each stop's start it stands at that stop's stretch (`starts`, in the
 * panorama's own pixels, drawn `scale` times as big): its segment
 * (`segment` wide) from its left edge, or centred where the screen is
 * narrower than a segment, except Home's, which stands at the panorama's
 * start as the first paint draws it (nothing moves when the scripts
 * arrive); at the journey's end, its own end. Never past either end, never
 * back.
 *
 * In still view (`still`) nothing may move against the street: the
 * panorama moves with it, pixel for pixel, through each stop's first screen
 * from that stop's stretch, then holds behind the rest of a row of panels,
 * and cuts to the next stop's stretch where that stop starts.
 */
export function panoKeys(offsets: number[], vw: number, scale: number, starts: number[], width: number, segment: number, still = false): { x: number[]; p: number[] } {
  const n = offsets.length - 1;
  const travel = Math.max(0, offsets[n] - vw);
  const end = Math.max(0, width * scale - vw);
  const x: number[] = [];
  const p: number[] = [];
  const at = (k: number) => scale * (starts[k] ?? 0);
  for (let k = 0; k < n && offsets[k] < travel; k++) {
    if (still) {
      const to = Math.min(offsets[k + 1], travel);
      const run = Math.min(to - offsets[k], vw);
      const from = Math.max(0, Math.min(at(k), end - run));
      x.push(offsets[k], offsets[k] + run, to);
      p.push(from, from + run, from + run);
    } else {
      x.push(offsets[k]);
      p.push(k ? Math.min(end, Math.max(p[k - 1], at(k) + Math.max(0, (scale * segment - vw) / 2))) : 0);
    }
  }
  // The journey's end: the last stop's stretch in still view (a cut), the panorama's end otherwise
  x.push(travel);
  p.push(still ? Math.max(0, Math.min(at(n - 1), end)) : end);
  return { x, p };
}

/**
 * The journey's places (CityTrack.tsx): one per panel (each stop's, each
 * project's, Skills'), each where that panel stands in the middle of the
 * screen, in order along the track. The snap targets, the keys and the
 * bar's label all come from this one list.
 */

/** The place nearest x: the label's, switching as the next panel's middle passes the screen's */
export function nearestPlace(x: number, places: number[]): number {
  let k = 0;
  for (let i = 1; i < places.length; i++) if (Math.abs(places[i] - x) < Math.abs(places[k] - x)) k = i;
  return k;
}

/** The last place at or before x (half a pixel is rounding): where a key's step starts */
export function placeAt(x: number, places: number[]): number {
  let k = 0;
  for (let i = 1; i < places.length; i++) if (places[i] <= x + 0.5) k = i;
  return k;
}

/** A jump this many screens or more dissolves (fade out, cut, fade in) instead of gliding */
export const FAR = 1.5;

/**
 * Where a sideways swipe or wheel that went from `from` to `x` comes to
 * rest. Where every panel is a stop (`one`, the narrow layout): a nudge
 * (under `nudge` px) goes back, any more the next place the way it went,
 * at most one past where it was let go; elsewhere the nearest place if it
 * is within `near` px, or where it is (null) between them.
 */
export function landing(from: number, x: number, places: number[], one: boolean, near: number, nudge = 24): number | null {
  if (!places.length) return null;
  const d = x - from;
  if (!one) {
    const k = nearestPlace(x, places);
    return Math.abs(places[k] - x) <= near ? k : null;
  }
  if (Math.abs(d) < nudge) return nearestPlace(from, places);
  if (d > 0) {
    for (let i = 0; i < places.length; i++) if (places[i] > from + 0.5 && places[i] >= x - 0.5) return i;
    return places.length - 1;
  }
  for (let i = places.length - 1; i >= 0; i--) if (places[i] < from - 0.5 && places[i] <= x + 0.5) return i;
  return 0;
}

/** Where the panorama stands (panoKeys) at x along the track */
export function panoAt(x: number, keys: { x: number[]; p: number[] }): number {
  const { x: xs, p } = keys;
  if (x <= xs[0]) return p[0];
  for (let k = 1; k < xs.length; k++) if (x <= xs[k]) return p[k - 1] + ((p[k] - p[k - 1]) * (x - xs[k - 1])) / (xs[k] - xs[k - 1] || 1);
  return p[p.length - 1];
}

/** The first place along the track (x) where the panorama has moved at least `p` (panoKeys): where a point of it reaches a given place on the screen */
export function trackXForPano(p: number, keys: { x: number[]; p: number[] }): number {
  const { x: xs, p: ps } = keys;
  if (p <= ps[0]) return xs[0];
  for (let k = 1; k < xs.length; k++) if (ps[k] >= p) return xs[k - 1] + ((xs[k] - xs[k - 1]) * (p - ps[k - 1])) / (ps[k] - ps[k - 1] || 1);
  return xs[xs.length - 1];
}
