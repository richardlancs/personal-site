// Two layouts. On wide screens the 3D world fills the window and pages sit
// over it. On phones, portrait tablets and short windows the site is flat:
// the painting of the park at the top of each page, then the page, with no
// 3D at all (it is never downloaded there).
//
// globals.css uses the same two queries; keep them in step.
// "Flat" is the narrow layout: one column, the world in the upper part of
// the screen and the page as a sheet over the rest (globals.css). The
// world is drawn on both layouts; what differs is where the page sits.
export const FLAT_QUERY = "(orientation: portrait), (max-width: 767px), (max-height: 480px)";
export const WORLD_QUERY = "(orientation: landscape) and (min-width: 768px) and (min-height: 481px)";

export const isFlat = () => matchMedia(FLAT_QUERY).matches;

export function watchFlat(onChange: () => void) {
  const query = matchMedia(FLAT_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}
