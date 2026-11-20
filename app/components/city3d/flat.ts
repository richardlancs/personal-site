// The 3D city's two layouts. On wide landscape screens the scene fills the
// window and the page's panel stands on one side of it. "Flat" is the
// narrow layout (phones, portrait tablets, short windows): one column, the
// scene in the upper part of the screen and the page as a sheet over the
// rest. The scene is drawn on both (the mobile tier on the narrow one);
// what differs is where the page sits.
//
// app/city/city-pages.css uses the same query (marked /* FLAT_QUERY */);
// tests/city3d-shell.test.mjs keeps them equal.
export const FLAT_QUERY = "(orientation: portrait), (max-width: 767px), (max-height: 480px)";
export const WORLD_QUERY = "(orientation: landscape) and (min-width: 768px) and (min-height: 481px)";

export const isFlat = () => matchMedia(FLAT_QUERY).matches;

export function watchFlat(onChange: () => void) {
  const query = matchMedia(FLAT_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}
