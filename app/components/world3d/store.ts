"use client";

import { useSyncExternalStore } from "react";
import type { SkyState } from "../../lib/sky";
import { REDUCED_MOTION, STILL_KEY, storedStill, systemStill } from "./still";

// What the world and the pages share: which object the camera is looking
// at, what's been chosen in each place, and what the visitor is pointing
// at. Pages set these from their HTML controls; the 3D scenes set them
// from clicks on objects. Both stay in step.

// How much the renderer does: brushwork and 4x antialiasing on a good
// desktop GPU; no brushwork on weaker ones; and on phones a capped pixel
// ratio, 2x antialiasing and small shadow maps
export type Quality = "high" | "low" | "mobile";

export type Selection = {
  project: number;
  shot: number;
  line: number;
  interest: number;
  page: number;
};

export type WorldState = {
  focus: string | null; // an object in the current place, e.g. "monitor-1"
  hover: string | null;
  phoneUp: boolean;
  fountain: number; // when the fountain was last turned on (ms), 0 if never
  doorOpen: boolean;
  arrived: boolean; // the camera has settled in the current place
  quality: Quality; // the renderer's tier (World3D.tsx decides it)
  still: boolean; // still view (still.ts): no decorative motion, the camera cuts
  // Richmond Hill's weather and time of day, as the world should show
  // them (lib/sky.ts). Set by the weather driver from the live reading
  // and the clock, or by the development preview controls.
  sky: SkyState;
  sel: Selection;
};

let state: WorldState = {
  focus: null,
  hover: null,
  phoneUp: false,
  fountain: 0,
  doorOpen: false,
  arrived: false,
  quality: "high",
  still: false,
  sky: { preset: "neutral", daylight: "day", progress: 0, source: "fallback" },
  sel: { project: 0, shot: 0, line: 0, interest: 0, page: 0 },
};

const listeners = new Set<() => void>();

export const world = {
  get: () => state,
  set(patch: Partial<WorldState>) {
    state = { ...state, ...patch };
    listeners.forEach((l) => l());
  },
  select(key: keyof Selection, value: number) {
    if (state.sel[key] === value) return;
    state = { ...state, sel: { ...state.sel, [key]: value } };
    listeners.forEach((l) => l());
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

export function useWorld<T>(pick: (s: WorldState) => T): T {
  return useSyncExternalStore(
    world.subscribe,
    () => pick(state),
    () => pick(state),
  );
}

// For looking at the world's state from the browser console in development
if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
  (window as unknown as { __world: typeof world }).__world = world;
}

// Still view, the one source of truth for motion. The page's script
// (still.ts) has set <html data-still> before anything ran; from here on
// the store and that attribute change together. Until the visitor chooses,
// it follows the system's setting, live.
let sessionChoice: boolean | null = null; // a choice storage couldn't keep

// What the setting should be now: the visitor's choice, or the system's
const currentStill = () => sessionChoice ?? storedStill() ?? systemStill();

function applyStill(on: boolean) {
  document.documentElement.setAttribute("data-still", on ? "on" : "off");
  if (state.still !== on) world.set({ still: on });
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
  state = { ...state, still: currentStill() };
  matchMedia(REDUCED_MOTION).addEventListener("change", () => applyStill(currentStill()));
  // A choice made in another tab
  window.addEventListener("storage", (event) => {
    if (event.key === STILL_KEY || event.key === null) applyStill(currentStill());
  });
}

// How long the fountain runs once turned on
export const FOUNTAIN_MS = 7000;

export function runFountain() {
  world.set({ fountain: performance.now() });
}
