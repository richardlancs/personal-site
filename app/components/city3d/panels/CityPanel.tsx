"use client";

import { Suspense, lazy, useEffect, useSyncExternalStore, type ComponentType } from "react";
import type { SectionId } from "../../../sections/registry";

// What a /city page's panel does, beyond its words (CityPage.tsx renders
// the panel, its heading and the section, all on the server; this sits
// right after the heading).
//
// Focus on a journey: whenever a /city page comes up after another page of
// this visit (a board's link, a tap on a board, Back, the 2D/3D switch,
// the Sections menu), focus goes to its heading, the panel's h1, at once,
// without scrolling, so the keyboard carries on from the new section and
// a screen reader reads where it has arrived (the heading's text). Not on
// the page the visit started on: a fresh load leaves focus at the top.
// Rendered inside the page, so its effect runs once the page's own HTML is
// in the document and hydrated, and again whenever the router shows the
// page again (Back to a page it kept).
//
// The section's picker: the row of keys that chooses what its scene shows
// (a project's screen, a line on the board, the arcade machine's mode).
// They only mean something while the 3D city is drawing
// (html[data-city3d="on"], CityShell.tsx), so each loads in its own chunk
// then, never in the page's first load (cityInitialJs has little room).
// Escape back to the riverside is City3D.tsx's, in the 3D chunk.

const PICKERS: Partial<Record<SectionId, ComponentType>> = {
  projects: lazy(() => import("./ScreenPicker")),
  experience: lazy(() => import("./BoardLines")),
  interests: lazy(() => import("./ArcadeControls")),
};

// The address the visit started on (the document's own navigation)
const startedOn = () => {
  const entry = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
  try {
    return entry ? new URL(entry.name).pathname : null;
  } catch {
    return null;
  }
};
// Whether the visit has been anywhere but where it started: until then,
// the page showing is the one loaded, and keeps the focus where it is
// (however often its effect runs). Module-level: each page mounts its own
// panel.
let moved = false;

// Whether the 3D city is drawing (CityShell.tsx sets the attribute)
const watchDrawing = (onChange: () => void) => {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributeFilter: ["data-city3d"] });
  return () => observer.disconnect();
};
const drawing = () => document.documentElement.dataset.city3d === "on";
const notYet = () => false;

export default function CityPanel({ section }: { section: SectionId }) {
  useEffect(() => {
    if (location.pathname !== startedOn()) moved = true;
    if (!moved) return;
    document.querySelector<HTMLElement>(`main.city-page[data-section="${section}"] h1`)?.focus({ preventScroll: true });
  }, [section]);

  const on = useSyncExternalStore(watchDrawing, drawing, notYet);
  const Picker = PICKERS[section];
  if (!on || !Picker) return null;
  return (
    <Suspense fallback={null}>
      <Picker />
    </Suspense>
  );
}
