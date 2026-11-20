"use client";

import { useEffect, useRef } from "react";
import { projects } from "../../../data/portfolio";
import { useWorld, world } from "../store";
import { onChoiceKey } from "./selector";

// Projects' own ids (city2d/sections/Projects.tsx: each row's id, and its
// heading's `project-<slug>`)
const slug = (title: string) => title.toLowerCase().replace(/[^a-z0-9]+/g, "-");

function show(index: number) {
  world.select("project", index);
  world.set({ focus: `screen-${index}` });
}

// The towers' screens, one per project (districts/towers.def.ts:
// "screen-<n>"): a key here lights that project's screen and turns the
// camera to it. The other way round, a screen chosen in the scene (its
// Hitbox writes sel.project) brings that project's row in the panel into
// view and puts the keyboard on its heading. The index's links (#<slug>)
// choose a screen too. Every key is a tab stop; the arrows also move along
// the row (selector.ts).
export default function ScreenPicker() {
  const selected = useWorld((s) => s.sel.project);
  // The last choice this row made or followed: any other change of
  // sel.project came from the scene
  const known = useRef(selected);

  function choose(index: number) {
    known.current = index;
    show(index);
  }

  useEffect(() => {
    const fromHash = () => {
      const index = projects.findIndex((project) => slug(project.title) === location.hash.slice(1));
      if (index < 0) return;
      known.current = index;
      show(index);
    };
    fromHash();
    addEventListener("hashchange", fromHash);
    return () => removeEventListener("hashchange", fromHash);
  }, []);

  useEffect(() => {
    if (selected === known.current) return;
    known.current = selected;
    const row = document.getElementById(slug(projects[selected].title));
    if (!row) return;
    row.scrollIntoView({ block: "start", behavior: world.get().still ? "auto" : "smooth" });
    const heading = row.querySelector<HTMLElement>("h2");
    if (!heading) return;
    if (!heading.hasAttribute("tabindex")) heading.tabIndex = -1;
    heading.focus({ preventScroll: true });
  }, [selected]);

  return (
    <div
      role="group"
      aria-label="Project screens"
      className="city-picker"
      data-picker="screens"
      onKeyDown={(event) => onChoiceKey(event, selected, projects.length, choose)}
    >
      {projects.map((project, index) => (
        <button
          key={project.title}
          type="button"
          aria-pressed={index === selected}
          data-choice
          className="glass city-picker-key"
          onClick={() => choose(index)}
        >
          {project.title}
        </button>
      ))}
    </div>
  );
}
