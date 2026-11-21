"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { listed, type SectionId } from "../../../sections/registry";

// The place dock, on every /city page (CityPage.tsx; city-pages.css, "The
// place dock"): the six places in the registry's order, each a link to its
// page in the city, the one you're at marked (aria-current="page", the
// chosen glass and a dot, so not by colour alone), with the previous and
// the next place at its ends (they wrap: before Home is Contact). Wide
// screens: a glass bar along the foot of the scene, clear of the panel;
// the narrow layout: a row at the top of the sheet that scrolls sideways,
// the current place brought into view.
//
// ← and → go to the previous and the next place, unless the key is meant
// for something else: a modifier held, typing in a field, a row of choices
// that takes the arrows itself (panels/selector.ts prevents the default),
// or a dialog, a menu or the résumé open. The router may keep earlier
// pages, hidden: only the dock on screen answers.
const places = listed;

const typing = (el: Element | null) =>
  !!el?.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="slider"], [role="radiogroup"], [role="tablist"], [role="toolbar"], [role="listbox"], [role="menu"], [role="grid"], [data-choice]');

export default function PlaceDock({ current }: { current: SectionId }) {
  const nav = useRef<HTMLElement>(null);
  const at = Math.max(0, places.findIndex((s) => s.id === current));
  const previous = places[(at - 1 + places.length) % places.length];
  const next = places[(at + 1) % places.length];

  useEffect(() => {
    const dock = nav.current;
    if (!dock) return;
    // The narrow layout's row: the current place in view, without moving
    // the page
    const row = dock.querySelector<HTMLElement>(".place-dock-row");
    const here = row?.querySelector<HTMLElement>('[aria-current="page"]');
    if (row && here && row.scrollWidth > row.clientWidth) {
      row.scrollLeft = here.offsetLeft - (row.clientWidth - here.offsetWidth) / 2;
    }
    const onKey = (e: KeyboardEvent) => {
      if ((e.key !== "ArrowLeft" && e.key !== "ArrowRight") || e.defaultPrevented) return;
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      if (typing(e.target as Element | null) || typing(document.activeElement)) return;
      if (document.documentElement.classList.contains("resume-lock") || document.querySelector(":popover-open, dialog[open]")) return;
      if (!(dock.checkVisibility?.() ?? true)) return;
      e.preventDefault();
      dock.querySelector<HTMLElement>(`[data-dock="${e.key === "ArrowLeft" ? "previous" : "next"}"]`)?.click();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <nav ref={nav} aria-label="Places" className="place-dock">
      <Link href={previous.city} className="glass glass-icon place-dock-step" data-dock="previous" aria-keyshortcuts="ArrowLeft" aria-label={`Previous place: ${previous.title}`}>
        <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 5-7 7 7 7" />
        </svg>
      </Link>
      <ul className="place-dock-row">
        {places.map((s) => (
          <li key={s.id}>
            <Link href={s.city} className="glass place-dock-key" aria-current={s.id === current ? "page" : undefined}>
              {s.title}
              {s.id === current && <span className="place-dock-here" aria-hidden="true" />}
            </Link>
          </li>
        ))}
      </ul>
      <Link href={next.city} className="glass glass-icon place-dock-step" data-dock="next" aria-keyshortcuts="ArrowRight" aria-label={`Next place: ${next.title}`}>
        <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m9 5 7 7-7 7" />
        </svg>
      </Link>
    </nav>
  );
}
