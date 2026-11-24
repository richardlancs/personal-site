import type { MouseEvent } from "react";

// A jump to a section from a list of them (the Sections menu, the
// metro map): the link's own navigation scrolls to the anchor; this hands
// focus to the section there (each can take focus, tabIndex -1), so the
// keyboard carries on from it. Home is the top of the page, so its focus
// scrolls there too. A click with a modifier key or another button is
// the browser's (a new tab, a new window): nothing is done here.
export function isPlainClick(e: MouseEvent) {
  return e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
}

// The panel a jump on the journey lands on: the element itself if it is
// one (a project, Skills), the one it is in, or a stop's first
export function panelOf(el: Element): HTMLElement {
  return (el.closest(".panel") ?? el.querySelector(".panel") ?? el) as HTMLElement;
}

// Focus there, never scrolling: on the journey the stop is brought on by
// CityTrack.tsx. The panel, not its section, so Arrow, PageDown and Space
// scroll a long one first (CityTrack makes one that overflows a region in
// the Tab order); one that can't take focus yet can from now (tabIndex -1)
export function focusPanel(el: Element) {
  const p = panelOf(el);
  if (!p.hasAttribute("tabindex")) p.tabIndex = -1;
  p.focus({ preventScroll: true });
}

export function focusAnchor(href: string) {
  const hash = href.split("#")[1];
  const track = document.documentElement.dataset.track === "on";
  const el = document.getElementById(hash || "home");
  if (el && track) return focusPanel(el);
  el?.focus({ preventScroll: Boolean(hash) || track });
}

// Where a list's link to a section points: home is the top of the page, so
// "/#home", a jump in place rather than a fresh load of "/" (and still a
// plain link with JavaScript off); every other section its own anchor
export function jumpHref(href: string) {
  return href === "/" ? "/#home" : href;
}
