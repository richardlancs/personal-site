// Each place as the notice board's map draws it: a few strokes of ink.
// `d` is in the map's own coordinates (app/map/page.tsx draws them in
// place); `box` frames one by itself, for lists. Kept apart from the
// component so the registry and the tests can read it without React.
export const glyphs = {
  // A tiled roof on posts
  pavilion: { d: "M78 196 q18 -14 36 0 M84 196 v12 M108 196 v12 M84 208 h24", box: "72 180 48 34" },
  // A sawtooth roof
  workshop: { d: "M384 90 v-12 l8 8 v-8 l8 8 v-8 l8 8 v-8 l8 8 v12 Z", box: "376 67 48 34" },
  // The clock tower
  station: { d: "M305 60 v-22 l7 -9 l7 9 v22 Z M308.8 43 a3.2 3.2 0 1 0 6.4 0 a3.2 3.2 0 1 0 -6.4 0", box: "288 27 48 34" },
  // A glass dome
  arcade: { d: "M212 76 a16 15 0 0 1 32 0 Z M220 76 a8 13 0 0 1 16 0 M228 61 v15", box: "204 51 48 34" },
  // The phone booth
  booth: { d: "M504 228 v-20 h12 v20 Z M502 208 l8 -5 l8 5 M507 214 h6", box: "486 198 48 34" },
  // The notice board, with the map pinned to it
  board: { d: "M4 6 h24 v15 h-24 Z M8 21 v9 M24 21 v9 M2 6 l14 -4 l14 4 M11 10 h10 v7 h-10 Z", box: "-8 -1 48 34" },
  // A glasshouse: a pitched roof over panes (the starter section's)
  greenhouse: { d: "M6 26 v-12 l12 -8 l12 8 v12 Z M6 14 h24 M12 14 v12 M18 6 v20 M24 14 v12", box: "-6 0 48 34" },
} as const;

export type GlyphId = keyof typeof glyphs;
