"use client";

import { REDUCED_MOTION, systemStill } from "./still.ts";

// Still view, kept in step with the system's reduced-motion setting while
// the page is open. The head script (still.ts) has set <html data-still>
// before anything ran; from here on a change of the setting changes the
// attribute, live. Imports nothing but still.ts.

const applyStill = () => document.documentElement.setAttribute("data-still", systemStill() ? "on" : "off");

// Puts the attribute back (React's development remount of <html> clears
// what the script set; in production it's already right): SectionsMenu.tsx
// calls it once, after hydration
export const syncStill = applyStill;

if (typeof window !== "undefined") matchMedia(REDUCED_MOTION).addEventListener("change", applyStill);
