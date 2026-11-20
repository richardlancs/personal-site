"use client";

import { Suspense, lazy, useEffect, useSyncExternalStore, type ComponentType } from "react";
import type { Interest } from "../../../data/portfolio";
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

// What the pickers list, from the server (CityPage.tsx): the pickers
// import no data of their own
export type Picks = {
  projects: string[]; // the projects' titles, in portfolio order
  experience: { role: string; organization: string }[]; // newest first
  interests: Pick<Interest, "name" | "scene">[];
};

const PICKERS = {
  projects: lazy(() => import("./ScreenPicker")),
  experience: lazy(() => import("./BoardLines")),
  interests: lazy(() => import("./ArcadeControls")),
};

// Each picker takes what it lists as `items` (its own key of Picks)
type Picker = ComponentType<{ items: Picks[keyof Picks] }>;

// The address the visit started on (the document's own navigation: its
// name is the document's URL)
const startedOn = () => new URL(performance.getEntriesByType("navigation")[0]?.name ?? location.href).pathname;
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

export default function CityPanel({ section, picks }: { section: SectionId; picks: Picks }) {
  useEffect(() => {
    if (location.pathname !== startedOn()) moved = true;
    if (!moved) return;
    document.querySelector<HTMLElement>(`[data-section="${section}"] h1`)?.focus({ preventScroll: true });
  }, [section]);

  const on = useSyncExternalStore(watchDrawing, drawing, notYet);
  const Picker = PICKERS[section as keyof Picks] as Picker | undefined;
  if (!Picker) return null;
  // The slot is in the server's HTML, so its height can be kept while the
  // 3D city starts (city-pages.css: .city-picker-slot) and the panel
  // doesn't move when the row arrives
  return <div className="city-picker-slot">{on && <Suspense fallback={null}><Picker items={picks[section as keyof Picks]} /></Suspense>}</div>;
}
