// Still view: nothing moves on its own. The page's own animations are off,
// and in the 3D city nothing sways, loops or drifts and the camera cuts
// from place to place instead of travelling. It starts from the system's
// reduced-motion setting; once a visitor chooses (the key in the top bar,
// city2d/StillViewToggle.tsx), their choice is kept and wins over the
// system's.
//
// One attribute on <html> carries it, data-still="on" or "off": the CSS
// keys on it (city.css, reveal.css), and the store (store.ts:
// still) follows it for the world. This file has no "use client", so the
// root layout can put the script below in the page's <head>, where it sets
// the attribute before the first paint.

export const STILL_KEY = "still-view"; // localStorage: "on" | "off", absent until chosen
export const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

export const STILL_SCRIPT = `(function(){var c=null;try{c=localStorage.getItem("${STILL_KEY}")}catch(e){}var on=c==="on"||(c!=="off"&&matchMedia("${REDUCED_MOTION}").matches);document.documentElement.setAttribute("data-still",on?"on":"off")})()`;

// The visitor's own choice, if they've made one
export function storedStill(): boolean | null {
  try {
    const value = localStorage.getItem(STILL_KEY);
    return value === "on" ? true : value === "off" ? false : null;
  } catch {
    // Storage can be unavailable (some private windows): no choice kept
    return null;
  }
}

export const systemStill = () => matchMedia(REDUCED_MOTION).matches;
