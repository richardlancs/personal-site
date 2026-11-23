// Where the page is, as a position on the metro map's line
// (components/city2d/ProgressLine.tsx): 0 at the first section, 5 at the
// sixth, and fractions in between, so the line's fill can follow the
// scroll continuously. Pure, so it is tested without a browser.

/** Section tops in page pixels, in order; first is 0. */
export type Marks = number[];

/** How far back past a reached point the page must go before it lets go. */
export const DEAD_ZONE = 0.1;

/** How close below a point counts as on it (floating point and rounding). */
const ARRIVE = 0.01;

/** 0..(n-1): the index of the section reached, plus the fraction of the way to the next. */
export function progressAt(scrollY: number, marks: Marks, viewport: number, pageHeight: number): number {
  const n = marks.length;
  const end = Math.max(0, pageHeight - viewport);
  if (n < 2 || end <= 0) return 0;
  if (scrollY <= 0) return 0;
  if (scrollY >= end) return n - 1;
  // A section whose top the page can't scroll to (the last, shorter than
  // the screen): it and any after it share the remaining scroll evenly, so
  // the very bottom of the page is the last point
  let k = n;
  for (let i = 1; i < n; i++)
    if (marks[i] >= end) {
      k = i;
      break;
    }
  const at = (i: number) => (i < k ? marks[i] : marks[k - 1] + ((end - marks[k - 1]) * (i - (k - 1))) / (n - k));
  for (let i = 0; i < n - 1; i++) {
    const a = at(i);
    const b = at(i + 1);
    if (scrollY < b) return b > a ? i + (scrollY - a) / (b - a) : i;
  }
  return n - 1;
}

/** The section that counts as "reached" for a progress value, with a small dead zone so a point does not flicker at its threshold. */
export function reached(progress: number, previous: number): number {
  const base = Math.floor(progress + ARRIVE);
  // Just back above the point last reached: it stays lit until clearly left
  if (previous === base + 1 && progress > previous - DEAD_ZONE) return previous;
  return base;
}

/** How close to a point, either side, the fill locks onto it: a few percent of a segment. */
export const SNAP = 0.04;

/** The point the fill is locked onto (within SNAP of it, either side), or null while it runs between points. */
export function lockedAt(progress: number): number | null {
  const k = Math.round(progress);
  return Math.abs(progress - k) < SNAP ? k : null;
}

/** Where the fill's end is drawn: on a point while the scroll is within SNAP of it (it has locked on), the scroll itself anywhere else. */
export function shown(progress: number): number {
  return lockedAt(progress) ?? progress;
}

/** A move between two frames this large is a fast scroll: the fill jumps with it, never eased, so it never trails. */
export const FAST = 0.15;
