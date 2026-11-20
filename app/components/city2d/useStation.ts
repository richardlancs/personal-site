"use client";

import { useSyncExternalStore } from "react";
import { pageSections as stations, type SectionId } from "../../sections/registry";

// Which station you're at: the one whose <section> crosses a line a third
// of the way down the screen (the stations are stacked, so it is one at a
// time; between two, the last one seen stays). Read by the Sections menu
// (SectionsMenu.tsx).
//
// One IntersectionObserver for the page, whoever is reading: it starts
// with the first reader and is disconnected when the last one goes. On the
// server, and before it has run, you're at home.

let current: SectionId = "home";
let observer: IntersectionObserver | null = null;
const listeners = new Set<() => void>();
const crossing = new Set<SectionId>();

const anchor = (id: SectionId) => (id === "home" ? "home" : stations.find((s) => s.id === id)!.hash);

function start() {
  if (typeof IntersectionObserver === "undefined") return;
  const byElement = new Map<Element, SectionId>();
  for (const s of stations) {
    const el = document.getElementById(anchor(s.id));
    if (el) byElement.set(el, s.id);
  }
  // A line (no height: the edges count as crossing it) a third of the way
  // down the screen
  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const id = byElement.get(entry.target);
        if (!id) continue;
        if (entry.isIntersecting) crossing.add(id);
        else crossing.delete(id);
      }
      const next = stations.find((s) => crossing.has(s.id))?.id;
      if (next && next !== current) {
        current = next;
        listeners.forEach((l) => l());
      }
    },
    { rootMargin: "-33% 0px -67% 0px" },
  );
  for (const el of byElement.keys()) observer.observe(el);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) start();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      observer?.disconnect();
      observer = null;
      crossing.clear();
    }
  };
}

const getSnapshot = () => current;
const getServerSnapshot = (): SectionId => "home";

export function useStation(): SectionId {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
