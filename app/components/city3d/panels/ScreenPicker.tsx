"use client";

import { useEffect, useRef } from "react";
import { isFlat } from "../flat";
import { useWorld, world } from "../store";
import { onChoiceKey } from "./selector";

// Projects' own ids (city2d/sections/Projects.tsx: each row's id, and its
// heading's `project-<slug>`)
const slug = (title: string) => title.toLowerCase().replace(/[^a-z0-9]+/g, "-");

function show(index: number) {
  world.select("project", index);
  world.set({ focus: `screen-${index}` });
}

// The panel's index of the projects (city2d/sections/Projects.tsx: its
// links to each row, #<slug>)
const indexLinks = () => [...document.querySelectorAll<HTMLAnchorElement>('.city-page[data-section="projects"] nav[aria-label="Projects"] a[href^="#"]')];

// The towers' screens, one per project (districts/towers.def.ts:
// "screen-<n>"): a key here lights that project's screen and turns the
// camera to it. The other way round, a screen chosen in the scene (its
// Hitbox writes sel.project) brings that project's row in the panel into
// view and puts the keyboard on its heading. The index's links (#<slug>)
// choose a screen too. Every key is a tab stop; the arrows also move along
// the row (selector.ts). Whoever chose, the index marks the project on the
// screen as current (aria-current, city-pages.css: a bar and a heavier
// underline, so not by colour alone). A key chosen here also brings the
// project's write-up into view on the narrow layout (the sheet, the page,
// scrolls there; at once in still view), and keeps the keyboard on the
// key; on the wide layout the page doesn't move: the index row shows it.
export default function ScreenPicker({ items: titles }: { items: string[] }) {
  const selected = useWorld((s) => s.sel.project);
  // The last choice this row made or followed: any other change of
  // sel.project came from the scene
  const known = useRef(selected);

  function choose(index: number) {
    known.current = index;
    show(index);
    if (!isFlat()) return;
    document.getElementById(slug(titles[index]))?.scrollIntoView({ block: "start", behavior: world.get().still ? "auto" : "smooth" });
  }

  useEffect(() => {
    const links = indexLinks();
    links.forEach((link, index) => {
      if (index === selected) link.setAttribute("aria-current", "true");
      else link.removeAttribute("aria-current");
    });
    // gone with the row (a fallback, another page): nothing is on a screen
    return () => links.forEach((link) => link.removeAttribute("aria-current"));
  }, [selected]);

  useEffect(() => {
    const fromHash = () => {
      const index = titles.findIndex((title) => slug(title) === location.hash.slice(1));
      if (index < 0) return;
      known.current = index;
      show(index);
    };
    fromHash();
    addEventListener("hashchange", fromHash);
    return () => removeEventListener("hashchange", fromHash);
  }, [titles]);

  useEffect(() => {
    if (selected === known.current) return;
    known.current = selected;
    const row = document.getElementById(slug(titles[selected]));
    if (!row) return;
    row.scrollIntoView({ block: "start", behavior: world.get().still ? "auto" : "smooth" });
    const heading = row.querySelector<HTMLElement>("h2");
    if (!heading) return;
    if (!heading.hasAttribute("tabindex")) heading.tabIndex = -1;
    heading.focus({ preventScroll: true });
  }, [selected, titles]);

  return (
    <div
      role="group"
      aria-label="Project screens"
      className="city-picker"
      data-picker="screens"
      onKeyDown={(event) => onChoiceKey(event, selected, titles.length, choose)}
    >
      {titles.map((title, index) => (
        <button
          key={title}
          type="button"
          aria-pressed={index === selected}
          data-choice
          className="glass city-picker-key"
          onClick={() => choose(index)}
        >
          {title}
        </button>
      ))}
    </div>
  );
}
