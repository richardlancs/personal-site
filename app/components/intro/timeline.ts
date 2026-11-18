// The home page's intro (Intro.tsx), as plain functions of time on the
// page's clock (seconds since the page started loading). No drawing here,
// so tests/intro.test.mjs can check it.
//
// 0–0.5 s     cream fades to the film's first frame (the poster)
// 0.3 s on    the film plays: a painted kid runs down the hillside path
//             toward the park (public/intro/, made with AI video tools)
// 7.0–8.3 s   a wall of tall grass rises across the frame: the wipe
// 8.3–9.2 s   the painting fades to the live park underneath
// 9.2 s       done (gone by 9.5); never later than 10 s, whatever happens

export const DURATION = 9.2;
export const CAP_MS = 10000;
// When the film starts (if it isn't ready by then, the poster holds until
// it is: a slow connection never stretches the intro)
export const FILM_START = 0.3;

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const smooth = (x: number) => {
  const k = clamp01(x);
  return k * k * (3 - 2 * k);
};
const span = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));

// The cream cover at the start: 1 opaque, 0 gone
export const cover = (t: number) => 1 - smooth(span(t, 0, 0.5));

// The wipe: the grass wall's rise, 0 (below the frame) to 1 (over all of
// it), and then the whole intro's opacity as it fades to the park
export const wipe = (t: number) => smooth(span(t, 7.0, 8.3));
export const painting = (t: number) => 1 - smooth(span(t, 8.3, 9.2));
// When the park's camera starts to rise out of the grass (World3D.tsx):
// just before the painting starts to fade, so it's moving as it's seen
export const REVEAL = 8.0;
