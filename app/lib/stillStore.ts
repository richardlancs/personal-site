"use client";

import { REDUCED_MOTION, STILL_KEY, storedStill, systemStill } from "./still.ts";

// Still view, the one source of truth for motion on the page. The head
// script (still.ts) has set <html data-still> before anything ran; from
// here on this store and that attribute change together. Until the visitor
// chooses (the key in the top bar, city2d/StillViewToggle.tsx), it follows
// the system's setting, live. Imports nothing but still.ts.

let still = false;
let sessionChoice: boolean | null = null; // a choice storage couldn't keep

const listeners = new Set<() => void>();

export const getStill = () => still;

export function subscribeStill(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// What the setting should be now: the visitor's choice, or the system's
const currentStill = () => sessionChoice ?? storedStill() ?? systemStill();

function applyStill(on: boolean) {
  document.documentElement.setAttribute("data-still", on ? "on" : "off");
  if (still !== on) {
    still = on;
    listeners.forEach((l) => l());
  }
}

// The visitor chooses: kept for their next visit, and it wins over the
// system's setting from now on
export function chooseStill(on: boolean) {
  try {
    localStorage.setItem(STILL_KEY, on ? "on" : "off");
  } catch {
    // Storage unavailable: the choice lasts for this visit only
    sessionChoice = on;
  }
  applyStill(on);
}

// Puts the attribute back (React's development remount of <html> clears
// what the script set; in production it's already right)
export const syncStill = () => applyStill(currentStill());

if (typeof window !== "undefined") {
  still = currentStill();
  matchMedia(REDUCED_MOTION).addEventListener("change", () => applyStill(currentStill()));
  // A choice made in another tab
  window.addEventListener("storage", (event) => {
    if (event.key === STILL_KEY || event.key === null) applyStill(currentStill());
  });
}
