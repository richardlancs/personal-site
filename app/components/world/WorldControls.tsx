"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef } from "react";
import { places } from "../../data/world";
import MusicToggle from "../MusicToggle";
import ThemeToggle from "../ThemeToggle";

// The few controls that sit over the world, in its corners. There is no
// row of tabs: you get around by going to places in the park. The Places
// menu is the plain alternative, one step from anywhere.
export default function WorldControls() {
  const pathname = usePathname();
  const router = useRouter();
  const inPark = pathname === "/" || pathname === "/map";

  // Escape goes back to the park from anywhere else. An open Places menu
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

  // The first page shows its words almost at once. After that, pages wait
  // for the camera's journey (see --arrive-delay in globals.css): mark the
  // document once the visitor has gone somewhere.
  const arrivedAt = useRef(pathname);
  useLayoutEffect(() => {
    if (arrivedAt.current !== pathname) document.documentElement.dataset.travelled = "";
  }, [pathname]);

  // Close the menu once a place is chosen (the page changes underneath)
  const close = () => document.getElementById("places-menu")?.hidePopover();

  return (
    <div className="world-controls">
      {!inPark || pathname === "/map" ? (
        <Link href="/" className="control-tag hover-grow" title="Back to the park (Esc)">
          <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12.5 4.5 7 10l5.5 5.5" />
          </svg>
          <span className="only-flat">Home</span>
          <span className="only-world">Back to the park</span>
        </Link>
      ) : (
        <span />
      )}

      <div className="flex items-center gap-2">
        <button type="button" popoverTarget="places-menu" className="control-tag hover-grow" aria-haspopup="true">
          <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
            {/* A folded paper map */}
            <path d="M3 5.5 7.5 4l5 1.5L17 4v10.5L12.5 16l-5-1.5L3 16Z" />
            <path d="M7.5 4v10.5M12.5 5.5V16" />
          </svg>
          <span className="only-flat">Sections</span>
          <span className="only-world">Places</span>
        </button>
        <span className="control-round">
          <MusicToggle />
        </span>
        <span className="control-round">
          <ThemeToggle />
        </span>
      </div>

      <nav id="places-menu" popover="auto" aria-label="Places" className="places-menu paper">
        <ul>
          <li>
            <Link href="/" onClick={close} aria-current={pathname === "/" ? "page" : undefined}>
              <span className="places-menu-section">Home</span>
              <span className="places-menu-place only-world">The park</span>
            </Link>
          </li>
          {places.map((place) => (
            <li key={place.id}>
              <Link href={place.href} onClick={close} aria-current={pathname === place.href ? "page" : undefined}>
                <span className="places-menu-section">{place.section}</span>
                <span className="places-menu-place only-world">{place.name}</span>
              </Link>
            </li>
          ))}
          <li>
            <Link href="/projects#skills" onClick={close}>
              <span className="places-menu-section">Skills</span>
              <span className="places-menu-place only-world">The workshop&apos;s tool wall</span>
            </Link>
          </li>
        </ul>
        <Link href="/map" onClick={close} className="places-menu-map text-link">
          <span className="only-flat">Open the map</span>
          <span className="only-world">Open the map on the notice board</span>
        </Link>
      </nav>
    </div>
  );
}
