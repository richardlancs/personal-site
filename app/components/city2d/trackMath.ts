// The horizontal journey's arithmetic (CityTrack.tsx): pure, so it is
// tested without a browser. The page scrolls down; the track of stops moves
// left by exactly as much, so a scroll of y pixels (from the top of the
// runway) is y pixels along the track.

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

/**
 * A jump's glide (CityTrack.tsx: every jump, however far, travels along
 * the city): how long it takes, in ms, for a distance of `d` px on a
 * screen `vw` px wide. It grows with the square root of the screens
 * crossed, so a long one is quicker per screen than a short one, from
 * GLIDE_MS.min (a hop to the next panel) to GLIDE_MS.max (end to end).
 */
export const GLIDE_MS = { min: 600, perScreen: 700, max: 1600 } as const;
export function glideMs(d: number, vw: number): number {
  const screens = Math.abs(d) / Math.max(1, vw);
  return Math.round(Math.min(GLIDE_MS.max, Math.max(GLIDE_MS.min, GLIDE_MS.perScreen * Math.sqrt(screens))));
}

/** The glide's easing, t from 0 to 1: a gentle start and a soft landing (cubic in and out, near city.css's --ease-in-out), exactly 0 and 1 at the ends */
export function glideEase(t: number): number {
  const u = Math.min(Math.max(t, 0), 1);
  return u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2;
}

/** A glide sent on to a new place while it is under way (a key held, pressed again): no gentle start, it carries straight on and lands softly (cubic out) */
export function glideOn(t: number): number {
  const u = Math.min(Math.max(t, 0), 1);
  return 1 - (1 - u) ** 3;
}

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
