import type { MouseEvent } from "react";

// A jump to a section from a list of them (the Sections menu, the
// progress line): the link's own navigation scrolls to the anchor; this hands
// focus to the section there (each can take focus, tabIndex -1), so the
// keyboard carries on from it. Home is the top of the page, so its focus
// scrolls there too. A click with a modifier key or another button is
// the browser's (a new tab, a new window): nothing is done here.
export function isPlainClick(e: MouseEvent) {
  return e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
}

export function focusAnchor(href: string) {
  const hash = href.split("#")[1];
  // On the journey the stop is brought on by CityTrack.tsx, never by focus
  const track = document.documentElement.dataset.track === "on";
  document.getElementById(hash || "home")?.focus({ preventScroll: Boolean(hash) || track });
}

// Where a list's link to a section points: home is the top of the page, so
// "/#home", a jump in place rather than a fresh load of "/" (and still a
// plain link with JavaScript off); every other section its own anchor
export function jumpHref(href: string) {
  return href === "/" ? "/#home" : href;
}
