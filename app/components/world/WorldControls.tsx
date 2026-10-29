"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { places, sceneFor } from "../../data/world";
import MusicToggle from "../MusicToggle";
import ThemeToggle from "../ThemeToggle";

// The few controls that sit over the world, in its corners. There is no
// row of tabs: you get around by going to places in the park. The Places
// menu is the plain alternative, one step from anywhere.
export default function WorldControls() {
  const pathname = usePathname();
  const scene = sceneFor(pathname);

  // Close the menu once a place is chosen (the page changes underneath)
  const close = () => document.getElementById("places-menu")?.hidePopover();

  return (
    <div className="world-controls">
      {scene !== "park" ? (
        <Link href="/" className="control-tag hover-grow" title="Back to the park (Esc)">
          <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12.5 4.5 7 10l5.5 5.5" />
          </svg>
          Back to the park
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
          Places
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
            <Link href="/" onClick={close} aria-current={scene === "park" ? "page" : undefined}>
              <span className="places-menu-section">The park</span>
              <span className="places-menu-place">Home</span>
            </Link>
          </li>
          {places.map((place) => (
            <li key={place.id}>
              <Link href={place.href} onClick={close} aria-current={scene === place.id ? "page" : undefined}>
                <span className="places-menu-section">{place.section}</span>
                <span className="places-menu-place">{place.name}</span>
              </Link>
            </li>
          ))}
          <li>
            <Link href="/projects#skills" onClick={close}>
              <span className="places-menu-section">Skills</span>
              <span className="places-menu-place">The workshop&apos;s tool wall</span>
            </Link>
          </li>
        </ul>
        <Link href="/map" onClick={close} className="places-menu-map text-link">
          Open the map on the notice board
        </Link>
      </nav>
    </div>
  );
}
