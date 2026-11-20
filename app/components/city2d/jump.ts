import type { MouseEvent } from "react";

// A jump to a station from a list of them (the Sections menu, the metro
// line): the link's own navigation scrolls to the anchor; this hands
// focus to the section there (each can take focus, tabIndex -1), so the
// keyboard carries on from it. Home is the top of the page, so its focus
// scrolls there too. A click with a modifier key or another button is
// the browser's (a new tab, a new window): nothing is done here.
export function isPlainClick(e: MouseEvent) {
  return e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
}

export function focusAnchor(href: string) {
  const hash = href.split("#")[1];
  document.getElementById(hash || "home")?.focus({ preventScroll: Boolean(hash) });
}
