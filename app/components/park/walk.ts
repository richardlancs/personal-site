// When the park is walked sideways (see ParkWalk.tsx): screens wide and tall
// enough to show a whole scene, for visitors who haven't asked for less
// motion. Everywhere else the sections stack and the page scrolls normally.
// Shared with the pre-paint script in layout.tsx so the layout is right from
// the first frame.
export const WALK_QUERY =
  "(min-width: 1024px) and (min-height: 620px) and (prefers-reduced-motion: no-preference)";

// Put on <html> while walking sideways; the `walk:` Tailwind variant and the
// walk rules in globals.css key off it.
export const WALK_CLASS = "walk-on";
