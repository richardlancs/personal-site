// The city of the journey: one continuous panorama, by day and by night,
// joined from six segments and cut into tiles by scripts/city-panorama.mjs
// (written by it: run it again rather than edit this). Pixels of the
// joined strip, which is HEIGHT tall. Each stop's stretch of the city
// starts where its segment does (stops: Home, About, Projects,
// Experience, Interests, Contact) and runs to the next one's start (the
// last to WIDTH); a segment is SEGMENT wide, so at a stop's start its
// segment shows as it was painted. The pictures: panoramaImages.ts, each
// SCALE times its tile's size here (upscaled, for 2x screens).
export const WIDTH = 7196;
export const HEIGHT = 941;
export const SEGMENT = 1672;
export const SCALE = 2;
export const stops = [0, 1115, 2230, 3353, 4473, 5608];

/** The tiles, left to right: where each starts and how wide it is */
export const tiles = [{ x: 0, w: 1661 }, { x: 1661, w: 1121 }, { x: 2782, w: 1126 }, { x: 3908, w: 1108 }, { x: 5016, w: 1176 }, { x: 6192, w: 1004 }];

/** Where each cut between two segments runs (its leftmost and rightmost column): tests/city-panorama.test.mjs */
export const joins = [[1328, 1472], [2369, 2560], [3677, 3862], [4668, 4764], [5891, 6046]];
