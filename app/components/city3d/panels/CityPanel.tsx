"use client";

import { usePathname, useRouter } from "next/navigation";
import { Suspense, lazy, useEffect, useState, useSyncExternalStore, type ComponentType } from "react";
import { createPortal } from "react-dom";
import type { Interest } from "../../../data/portfolio";
import { cityPath } from "../../../lib/cityRoutes";

// What a /city page's panel does beyond its words, for every /city page:
// mounted once in the layout, in the chunk that comes after the page is up
// (CityLoader.tsx, with the 3D city's shell), so none of it is in /city's
// first load. CityPage.tsx renders the panel, its heading, the section and
// the picker's slot, all on the server.
//
// Focus on a journey: whenever a /city page comes up after another page of
// this visit (a board's link, a tap on a board, Back, the 2D/3D switch,
// the Sections menu), focus goes to its heading, the panel's h1, at once,
// without scrolling, so the keyboard carries on from the new section and
// a screen reader reads where it has arrived (the heading's text). Not on
// the page the visit started on: a fresh load leaves focus at the top.
//
// The section's picker: the row of keys that chooses what its scene shows
// (a project's screen, a line on the board, the arcade machine's mode),
// drawn into its page's slot (.city-picker-slot, whose data-picks holds
// what it lists, written by the server). They only mean something while
// the 3D city is drawing (html[data-city3d="on"], CityShell.tsx), so each
// loads in its own chunk then.
//
// Escape on a section's page goes back to Home, whether the scene draws
// or not (no WebGL2, Save-Data, a lost context), unless a dialog or menu
// is open (they take Escape themselves).

// What the pickers list, from the server (CityPage.tsx, the slot's
// data-picks): the pickers import no data of their own
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
// (however often its effect runs).
let moved = false;

// Whether the 3D city is drawing (CityShell.tsx sets html[data-city3d]),
// and the page has hydrated: the picker is drawn into the page's own
// server-rendered slot, which must not change under React's hydration.
// html[data-arrive] is set by the page's last client component
// (ui/Arrivals.tsx), so its effect runs once the page is hydrated.
const watchDrawing = (onChange: () => void) => {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributeFilter: ["data-city3d", "data-arrive"] });
  return () => observer.disconnect();
};
const drawing = () => document.documentElement.dataset.city3d === "on" && document.documentElement.hasAttribute("data-arrive");
const notYet = () => false;
const arrived = () => document.documentElement.hasAttribute("data-arrive");

// Where the arrow keys belong to what has focus (the place dock leaves them)
const typing = (el: Element | null) =>
  !!el?.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="slider"], [role="radiogroup"], [role="tablist"], [role="toolbar"], [role="listbox"], [role="menu"], [role="grid"], [data-choice]');

export default function CityPanel() {
  // The section showing: its page's main (the router may keep earlier
  // pages, hidden), read once the address has changed
  const pathname = usePathname();
  const [section, setSection] = useState<string | undefined>();
  useEffect(() => {
    if (!section) return;
    if (location.pathname !== startedOn()) moved = true;
    if (!moved) return;
    document.querySelector<HTMLElement>(`[data-section="${section}"] h1`)?.focus({ preventScroll: true });
  }, [section]);
  useEffect(() => {
    const mains = [...document.querySelectorAll<HTMLElement>("main.city-page")];
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read from the page's own DOM, once it is in the document
    setSection((mains.find((m) => m.checkVisibility?.() ?? true) ?? mains.at(-1))?.dataset.section);
  }, [pathname]);

  const router = useRouter();
  useEffect(() => {
    if (!section || section === "home") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      if (document.documentElement.classList.contains("resume-lock") || document.querySelector(":popover-open, dialog[open]")) return;
      router.push(cityPath("home"));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [section, router]);

  // The place dock (PlaceDock.tsx): ← and → go to the previous and the
  // next place, unless the key is meant for something else (a modifier
  // held, typing in a field, a row of choices that takes the arrows itself:
  // selector.ts prevents the default) or a dialog, a menu or the résumé is
  // open; and on the narrow layout the current place is brought into view
  // in the dock's row, without moving the page
  // (once the page has hydrated: the row's fades are set on its style,
  // which must not change under React's hydration)
  const hydrated = useSyncExternalStore(watchDrawing, arrived, notYet);
  useEffect(() => {
    const dock = section && hydrated ? document.querySelector<HTMLElement>(`[data-section="${section}"] .place-dock`) : null;
    if (!dock) return;
    const row = dock.querySelector<HTMLElement>(".place-dock-row");
    const here = row?.querySelector<HTMLElement>('[aria-current="page"]');
    if (row && here) row.scrollLeft = here.offsetLeft - row.offsetLeft - (row.clientWidth - here.offsetWidth) / 2;
    // Where the row scrolls: the side with more fades out, and a key that
    // takes focus comes into view, clear of the fades (city-pages.css)
    const fade = () => {
      if (!row) return;
      const more = row.scrollWidth - row.clientWidth;
      row.style.setProperty("--fade-l", row.scrollLeft > 1 ? "24px" : "0px");
      row.style.setProperty("--fade-r", more - row.scrollLeft > 1 ? "24px" : "0px");
    };
    const onFocus = (e: FocusEvent) => (e.target as HTMLElement).scrollIntoView?.({ inline: "nearest", block: "nearest" });
    // (a mouse's wheel turns the row sideways, while it has further to go)
    const onWheel = (e: WheelEvent) => {
      if (!row || Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      const more = row.scrollWidth - row.clientWidth;
      if (more <= 1 || (e.deltaY < 0 ? row.scrollLeft <= 0 : row.scrollLeft >= more - 1)) return;
      e.preventDefault();
      row.scrollBy({ left: e.deltaY, behavior: "smooth" });
    };
    fade();
    row?.addEventListener("scroll", fade, { passive: true });
    row?.addEventListener("focusin", onFocus);
    row?.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("resize", fade);
    const onKey = (e: KeyboardEvent) => {
      if ((e.key !== "ArrowLeft" && e.key !== "ArrowRight") || e.defaultPrevented) return;
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      if (typing(e.target as Element | null) || typing(document.activeElement)) return;
      if (document.documentElement.classList.contains("resume-lock") || document.querySelector(":popover-open, dialog[open]")) return;
      e.preventDefault();
      dock.querySelector<HTMLElement>(`[data-dock="${e.key === "ArrowLeft" ? "previous" : "next"}"]`)?.click();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", fade);
      row?.removeEventListener("scroll", fade);
      row?.removeEventListener("focusin", onFocus);
      row?.removeEventListener("wheel", onWheel);
    };
  }, [section, hydrated]);

  const on = useSyncExternalStore(watchDrawing, drawing, notYet);
  const slot = section ? document.querySelector<HTMLElement>(`[data-section="${section}"] .city-picker-slot`) : null;
  const Picker = PICKERS[section as keyof Picks] as Picker | undefined;
  if (!Picker || !slot || !on) return null;
  const items = JSON.parse(slot.dataset.picks ?? "[]") as Picks[keyof Picks];
  return createPortal(
    <Suspense fallback={null}>
      <Picker items={items} />
    </Suspense>,
    slot,
  );
}
