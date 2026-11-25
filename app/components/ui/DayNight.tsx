"use client";

import { useEffect, useSyncExternalStore } from "react";
import { DEFAULT_PAPER, NIGHT_PAPER, PAPER_KEY, currentPaper, type Paper } from "../../lib/paper";
import { REDUCED_MOTION } from "../../lib/still";

// The day/night key: one square glass key on the bar, beside Sections and
// the music (the same .glass-icon), pressed at night (aria-pressed). Day is
// the cream paper, night the charcoal (lib/paper.ts).
//
// Its icon is an outline sun that turns into an outline crescent moon
// (city.css, "The day/night key"): the rays draw in and turn away, the disc
// grows, and a second circle slides over it from the upper right, carving
// the crescent (a mask cuts the disc's edge where it passes, and the same
// circle's own edge, clipped to the disc, draws the crescent's inner
// curve). Back again for day. Which one is drawn follows data-paper on
// <html>, which the head script sets before the first paint, so a night
// visitor sees the moon at once and nothing turns on load. Hover gives a
// small part of the turn and takes it back. Still view and reduced
// motion: the other icon at once, nothing on hover.
//
// A press applies at once, no reload: data-paper on <html>, saved in
// localStorage for the head script. The colours cross-fade where the
// browser can (a view transition over --t-slow, city.css); in still view,
// at once. The browser's theme-color follows the paper's own ground.

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-paper"] });
  return () => observer.disconnect();
}

// The browser's bar colour (theme-color) is the paper's ground
function syncThemeColor() {
  const paper = getComputedStyle(document.documentElement).getPropertyValue("--paper").trim();
  if (!paper) return;
  for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) meta.content = paper;
}

function choose(paper: Paper) {
  const html = document.documentElement;
  try {
    localStorage.setItem(PAPER_KEY, paper);
  } catch {
    // Storage blocked: the choice still holds for this visit
  }
  const apply = () => {
    html.setAttribute("data-paper", paper);
    syncThemeColor();
  };
  const still = html.getAttribute("data-still") === "on" || matchMedia(REDUCED_MOTION).matches;
  if (!still && typeof document.startViewTransition === "function") document.startViewTransition(apply);
  else apply();
}

export default function DayNight() {
  // (on the server the paper isn't known: drawn as day, unpressed, until
  // the page is here; the icon itself already follows data-paper)
  const paper = useSyncExternalStore<Paper | null>(subscribe, currentPaper, () => null);
  const night = paper === NIGHT_PAPER;
  // The saved paper's theme-color, once the page is here
  useEffect(syncThemeColor, []);

  return (
    <button
      type="button"
      className="glass glass-icon day-night"
      aria-label="Night mode"
      aria-pressed={night}
      title="Night mode"
      onClick={() => choose(night ? DEFAULT_PAPER : NIGHT_PAPER)}
    >
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
        <defs>
          {/* The carving circle: where it covers the disc, the disc's edge goes */}
          <mask id="day-night-cut" maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24">
            <rect x="0" y="0" width="24" height="24" fill="#fff" />
            <circle className="day-night-cutter" cx="14.5" cy="9.5" r="4.5" fill="#000" stroke="none" />
          </mask>
          {/* The disc: the carving circle's edge is drawn only inside it */}
          <clipPath id="day-night-disc">
            <circle cx="12" cy="12" r="5" />
          </clipPath>
        </defs>
        <g className="day-night-rays">
          <path d="M12 2.75v1.9M12 19.35v1.9M2.75 12h1.9M19.35 12h1.9M5.46 5.46l1.34 1.34M17.2 17.2l1.34 1.34M5.46 18.54l1.34-1.34M17.2 6.8l1.34-1.34" />
        </g>
        <g className="day-night-body">
          <circle cx="12" cy="12" r="5" mask="url(#day-night-cut)" />
          {/* (the clip on a group of its own, so it stays on the disc while the circle moves) */}
          <g clipPath="url(#day-night-disc)">
            <circle className="day-night-cutter" cx="14.5" cy="9.5" r="4.5" />
          </g>
        </g>
      </svg>
    </button>
  );
}
