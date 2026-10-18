"use client";

import { useLayoutEffect, useRef } from "react";

// How long the colors take to fade between themes (matches globals.css).
const FADE_MS = 400;

// A small round button that switches between the light and dark theme.
// The theme is stored as a `data-theme` attribute on <html>, and the CSS
// in globals.css swaps every color based on it. The choice is saved in
// localStorage so it is remembered on the next visit.
export default function ThemeToggle() {
  const fadeTimer = useRef<number | undefined>(undefined);

  // In development, React can reset the <html> attributes set by the
  // script in layout.tsx, so re-apply the saved theme. No-op in production.
  useLayoutEffect(() => {
    try {
      const saved = localStorage.getItem("theme");
      if (saved) document.documentElement.setAttribute("data-theme", saved);
    } catch {
      // localStorage can be unavailable (e.g. some private browsing modes)
    }
  }, []);

  function toggleTheme() {
    const root = document.documentElement;
    const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";

    // Turn on the color fade, switch the theme, then turn the fade off again.
    root.classList.add("theme-transition");
    root.setAttribute("data-theme", next);
    window.clearTimeout(fadeTimer.current);
    fadeTimer.current = window.setTimeout(
      () => root.classList.remove("theme-transition"),
      FADE_MS,
    );

    try {
      localStorage.setItem("theme", next);
    } catch {
      // If saving fails, the theme still changes for this visit.
    }
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Toggle dark mode"
      title="Toggle dark mode"
      className="flex size-8 items-center justify-center rounded-full bg-toggle-bg text-toggle-icon hover-grow hover:bg-toggle-bg-hover"
    >
      <svg
        className="theme-icon"
        viewBox="0 0 24 24"
        width="16"
        height="16"
        aria-hidden="true"
      >
        {/* White shows the shape; the black "bite" circle cuts the crescent */}
        <mask id="theme-icon-mask">
          <rect width="24" height="24" fill="white" />
          <circle className="theme-icon-bite" cx="16" cy="8" r="7" fill="black" />
        </mask>

        <g mask="url(#theme-icon-mask)">
          <circle className="theme-icon-core" cx="12" cy="12" r="5" fill="currentColor" />
        </g>

        <g
          className="theme-icon-rays"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
        >
          <line x1="12" y1="1.5" x2="12" y2="3.5" />
          <line x1="12" y1="20.5" x2="12" y2="22.5" />
          <line x1="1.5" y1="12" x2="3.5" y2="12" />
          <line x1="20.5" y1="12" x2="22.5" y2="12" />
          <line x1="4.6" y1="4.6" x2="6" y2="6" />
          <line x1="18" y1="18" x2="19.4" y2="19.4" />
          <line x1="4.6" y1="19.4" x2="6" y2="18" />
          <line x1="18" y1="6" x2="19.4" y2="4.6" />
        </g>
      </svg>
    </button>
  );
}
