// Still view: nothing moves on its own. The page's own animations, its
// parallax and its moving weather are off. It follows the system's
// reduced-motion setting, and only that: the bar has no key for it (Task
// 11), so a choice a visitor once saved under STILL_KEY (the old key's)
// is cleared, never read.
//
// One attribute on <html> carries it, data-still="on" or "off": the CSS
// keys on it (city.css, reveal.css), and stillStore.ts keeps it in step
// with the system's setting while the page is open. This file has no "use
// client", so the root layout can put the script below in the page's
// <head>, where it sets the attribute before the first paint.

export const STILL_KEY = "still-view"; // the old key's localStorage entry, cleared
export const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

export const STILL_SCRIPT = `(function(){try{localStorage.removeItem("${STILL_KEY}")}catch(e){}document.documentElement.setAttribute("data-still",matchMedia("${REDUCED_MOTION}").matches?"on":"off")})()`;

export const systemStill = () => matchMedia(REDUCED_MOTION).matches;
