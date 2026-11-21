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
