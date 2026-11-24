"use client";

import { useEffect, useId, useSyncExternalStore } from "react";
import { PAPER_KEY, PAPERS, currentPaper, type Paper } from "../../lib/paper";
import { REDUCED_MOTION } from "../../lib/still";

// The Paper picker: three keys, cream, charcoal and kraft, each a small dot
// of its paper (--swatch-*, city.css) and its name, the chosen one pressed
// (aria-pressed), in one labelled group. In the bar on wide screens and in
// the Sections menu on phones (TopBar.tsx; city.css shows one), so the bar
// never gains a row. Both copies read the one attribute on <html>
// (lib/paper.ts), so they always agree.
//
// A choice applies at once, no reload: data-paper on <html>, saved in
// localStorage for the head script to set before the next first paint.
// The colours cross-fade where the browser can (a view transition over
// --t-slow, city.css); in still view, at once. The browser's theme-color
// follows the paper's own ground.

const NAMES: Record<Paper, string> = { cream: "Cream", charcoal: "Charcoal", kraft: "Kraft" };

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-paper"] });
  return () => observer.disconnect();
}

// The browser's bar colour (theme-color) is the chosen paper's ground
function syncThemeColor() {
  const paper = getComputedStyle(document.documentElement).getPropertyValue("--paper").trim();
  if (!paper) return;
  for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) meta.content = paper;
}

function choose(paper: Paper) {
  const html = document.documentElement;
  if (html.getAttribute("data-paper") === paper) return;
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

export default function PaperPicker({ where }: { where: "bar" | "menu" }) {
  // (on the server the paper isn't known: no key is drawn pressed until the
  // page is here, rather than cream's for a moment)
  const paper = useSyncExternalStore<Paper | null>(subscribe, currentPaper, () => null);
  const label = useId();
  // The saved paper's theme-color, once the page is here
  useEffect(syncThemeColor, []);

  return (
    <div role="group" aria-labelledby={label} className={`paper-picker paper-picker-${where}`}>
      <span id={label} className="paper-picker-label">
        Paper
      </span>
      <span className="paper-picker-keys">
        {PAPERS.map((p) => (
          <button key={p} type="button" className="glass paper-key" aria-pressed={p === paper} onClick={() => choose(p)}>
            <span className={`paper-dot paper-dot-${p}`} aria-hidden="true" />
            {NAMES[p]}
          </button>
        ))}
      </span>
    </div>
  );
}
