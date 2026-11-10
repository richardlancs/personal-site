"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { listed } from "../../sections/registry";
import MusicToggle from "../MusicToggle";

// The few controls that sit over the world, in its corners. There is no
// row of tabs: you get around by going to places in the park. The
// Sections menu is the plain alternative, one step from anywhere, on both
// layouts; its entries come from the section registry, each with its
// place in the park beside it on wide screens.
export default function WorldControls() {
  const pathname = usePathname();
  const router = useRouter();
  const inPark = pathname === "/" || pathname === "/map";

  // Escape goes back to the park from anywhere else. An open Sections menu
  // takes the key first (the browser closes it).
  useEffect(() => {
    if (pathname === "/") return;
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape" || event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
      if (document.querySelector(":popover-open")) return;
      router.push("/");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pathname, router]);

  // The site had a light/dark toggle once; the theme is fixed now. Clear
  // the preference it saved, so nothing of it is left behind.
  useEffect(() => {
    try {
      localStorage.removeItem("theme");
    } catch {
      // Storage can be unavailable (some private windows); nothing to clear
    }
  }, []);

  // Close the menu once a place is chosen (the page changes underneath)
  const close = () => document.getElementById("places-menu")?.hidePopover();

  const menu = listed.filter((s) => s.id !== "map");

  return (
    <div className="world-controls">
      {!inPark || pathname === "/map" ? (
        <Link href="/" className="control-tag hover-grow" title="Back to the park (Esc)">
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14.5 5.5 8 12l6.5 6.5" />
          </svg>
          <span className="only-flat">Home</span>
          <span className="only-world">Back to the park</span>
        </Link>
      ) : (
        <span />
      )}

      <div className="flex items-center gap-2">
        {/* A popover button: the browser exposes it as expanded or
            collapsed and returns focus to it when Escape closes the menu.
            No aria-haspopup: the menu is a list of links, not a menu widget */}
        <button type="button" popoverTarget="places-menu" className="control-tag hover-grow">
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            {/* A folded paper map */}
            <path d="M3.5 6.5 9 4.5l6 2 5.5-2v13l-5.5 2-6-2-5.5 2Z" />
            <path d="M9 4.5v13M15 6.5v13" />
          </svg>
          Sections
        </button>
        <span className="control-round">
          <MusicToggle />
        </span>
      </div>

      <nav id="places-menu" popover="auto" aria-label="Sections" className="places-menu paper">
        <ul>
          {menu.map((s) => (
            <li key={s.id}>
              <Link href={s.href} onClick={close} aria-current={pathname === s.href ? "page" : undefined}>
                <span className="places-menu-section">{s.title}</span>
                <span className="places-menu-place only-world">{s.place}</span>
              </Link>
              {s.subsections?.map((sub) => (
                <Link key={sub.href} href={sub.href} onClick={close}>
                  <span className="places-menu-section">{sub.title}</span>
                  <span className="places-menu-place only-world">{sub.place}</span>
                </Link>
              ))}
            </li>
          ))}
        </ul>
        <Link href="/map" onClick={close} className="places-menu-map text-link">
          <span className="only-flat">Open the map</span>
          <span className="only-world">Open the map on the notice board</span>
        </Link>
      </nav>
    </div>
  );
}
