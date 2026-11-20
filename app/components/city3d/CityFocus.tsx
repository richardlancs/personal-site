"use client";

import { useEffect } from "react";
import type { SectionId } from "../../sections/registry";

// Focus on a journey: whenever a /city page comes up after another page of
// this visit (a board's link, a tap on a board, Back, the 2D/3D switch,
// the Sections menu), focus goes to its heading, the panel's h1, at once,
// without scrolling, so the keyboard carries on from the new section and
// a screen reader reads where it has arrived (the heading's text). Not on
// the page the visit started on: a fresh load leaves focus at the top.
//
// Rendered last in CityPage, inside the page, so its effect runs once the
// page's own HTML is in the document and hydrated; and again whenever the
// router shows the page again (Back to a page it kept).

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
// (however often its effect runs)
let moved = false;

export default function CityFocus({ id }: { id: SectionId }) {
  useEffect(() => {
    if (location.pathname !== startedOn()) moved = true;
    if (!moved) return;
    document.querySelector<HTMLElement>(`main.city-page[data-section="${id}"] h1`)?.focus({ preventScroll: true });
  }, [id]);
  return null;
}
