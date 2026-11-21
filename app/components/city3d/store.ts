"use client";

import { useSyncExternalStore } from "react";
import type { SkyState } from "../../lib/sky.ts";
import { REDUCED_MOTION, STILL_KEY, storedStill, systemStill } from "../../lib/still.ts";
import type { Quality } from "./tiers.ts";

// What the 3D city and its pages share (city3d/, app/city/): what the
// camera is looking at in the current place, what's been chosen in each
// place, what the visitor is pointing at, and what the world needs to know
// about the time, the weather and still view. The pages' HTML controls and
// the scenes' clicks both write here, so the two stay in step.
//
// The 2D page imports this file too (Still view), so it may import only
// React and app/lib/ (tests/city3d-bundle.test.mjs).

// The renderer's tier (tiers.ts decides it)
export type { Quality };

export type Selection = {
  project: number;
  shot: number;
  line: number;
  interest: number;
};

export type WorldState = {
  focus: string | null; // a focus pose in the current place, e.g. "screen-1" (districts/<id>.def.ts: focus)
  hover: string | null; // the Hitbox under the pointer (common.tsx)
  arrived: boolean; // the camera has settled in the current place
  quality: Quality; // the renderer's tier (CityShell.tsx picks it)
  still: boolean; // still view (lib/still.ts): nothing moves, the camera cuts
  // Richmond Hill's weather and time of day, as the city should show them
  // (lib/sky.ts). Set by the weather driver (weather/SkyDriver.tsx) from
  // the live reading and the clock, or by the development preview.
  sky: SkyState;
  // Richmond Hill's local hour, 0 up to 24 with the minutes as a fraction,
  // from the same clock as the 2D page's time (SkyDriver.tsx); while the
  // sky is a preview, the hour that preview stands for (lib/cityWindows.ts:
  // previewHour). The lit windows follow it.
  hour: number;
  // How many things in the city are moving right now (common.tsx: useLive):
  // the canvas draws every frame only while this is above 0 and still view
  // is off; otherwise only when something changes
  live: number;
  // How many things are only the place's own quiet life right now (a
  // painted place's water, sky and glass, its small moving lights, the
  // arcade's attract mode: common.tsx, useLive(on, true)): at rest the
  // canvas draws for them at most 30 times a second, and not at all after
  // a minute with no input (City3D.tsx: RestTicker)
  ambient: number;
  sel: Selection;
  // The arcade machine (arcade/arcadeMachine.ts): the page's play button
  // counts presses, the machine says how each turned out
  arcadePress: number;
  arcadeStatus: string;
};

let state: WorldState = {
  focus: null,
  hover: null,
  arrived: false,
  quality: "high",
  still: false,
  sky: { preset: "neutral", daylight: "day", progress: 0, source: "fallback" },
  hour: 12,
  live: 0,
  ambient: 0,
  sel: { project: 0, shot: 0, line: 0, interest: 0 },
  arcadePress: 0,
  arcadeStatus: "",
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

// Something has started moving (common.tsx: useLive): the canvas draws
// every frame until every holder has let go. The returned release counts
// once, however often it's called.
export function holdLive(ambient = false): () => void {
  const key = ambient ? "ambient" : "live";
  world.set({ [key]: state[key] + 1 });
  let held = true;
  return () => {
    if (!held) return;
    held = false;
    world.set({ [key]: Math.max(0, state[key] - 1) });
  };
}

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
