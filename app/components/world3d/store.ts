"use client";

import { useSyncExternalStore } from "react";

// What the world and the pages share: which object the camera is looking
// at, what's been chosen in each place, and what the visitor is pointing
// at. Pages set these from their HTML controls; the 3D scenes set them
// from clicks on objects. Both stay in step.

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
  labels: boolean; // "Show places"
  phoneUp: boolean;
  doorOpen: boolean;
  arrived: boolean; // the camera has settled in the current place
  quality: "high" | "low";
  sel: Selection;
};

let state: WorldState = {
  focus: null,
  hover: null,
  labels: false,
  phoneUp: false,
  doorOpen: false,
  arrived: false,
  quality: "high",
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
