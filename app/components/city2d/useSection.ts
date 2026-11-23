"use client";

import { useSyncExternalStore } from "react";
import type { SectionId } from "../../sections/registry";

// Which section you're at, the one source of it for the whole page. The
// metro map (ProgressLine.tsx) works it out from the scroll, with the
// map's own dead zone so it doesn't flicker at a threshold, and writes it
// here; the map itself and the Sections menu (SectionsMenu.tsx) read it.
// It observes nothing on its own. On the server, and before the map has
// run, you're at home.

let current: SectionId = "home";
const listeners = new Set<() => void>();

export function setSection(id: SectionId) {
  if (id === current) return;
  current = id;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const getSnapshot = () => current;
const getServerSnapshot = (): SectionId => "home";

export function useSection(): SectionId {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
