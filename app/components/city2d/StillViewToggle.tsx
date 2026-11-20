"use client";

import { useLayoutEffect, useSyncExternalStore } from "react";
import { chooseStill, syncStill, world } from "../world3d/store";

const isStill = () => world.get().still;
// The server can't know the visitor's setting; the button hydrates as
// off and shows the real state straight after (the page itself is
// already still: the attribute on <html> was set before it was painted)
const unknown = () => false;

// A small glass button in the corner, beside the music: Still view holds
// the world still (world3d/still.ts). Pressed, nothing moves on its own
// and the camera cuts between places instead of travelling.
export default function StillViewToggle() {
  const still = useSyncExternalStore(world.subscribe, isStill, unknown);
  useLayoutEffect(syncStill, []);
  const label = still ? "Still view is on: the world holds still" : "Still view: hold the world still";

  return (
    <button
      type="button"
      onClick={() => chooseStill(!still)}
      aria-label="Still view"
      aria-pressed={still}
      title={label}
      className="glass glass-icon"
    >
      {/* A framed picture of a hill and the sun: a still view. The sun
          fills in while it's on. */}
      <svg
        viewBox="0 0 24 24"
        width="16"
        height="16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        <rect x="3" y="5" width="18" height="14" rx="2.5" />
        <path d="m3 16 5-5 4.5 4.5L15 13l6 5" />
        <circle cx="15.5" cy="9" r="1.5" fill={still ? "currentColor" : "none"} />
      </svg>
    </button>
  );
}
