"use client";

import Image from "next/image";
import { useEffect } from "react";
import type { Project } from "../../data/portfolio";
import { WORLD_QUERY } from "../world/flat";
import { useWorld, world } from "../world3d/store";
import { onChoiceKey } from "./selector";

const slug = (title: string) => title.toLowerCase().replace(/[^a-z0-9]+/g, "-");

// The workshop's notes. The projects' screenshots are on the monitors on
// the benches (world3d/scenes/Workshop.tsx); choosing a project here, or
// its monitor there, switches that monitor on and walks over to it. The
// address keeps the project (#marketlab) so it can be linked to. The flat
// layout has no monitors, so the chosen screenshot is shown on one here.
export default function Workbench({ projects }: { projects: Project[] }) {
  const selected = useWorld((s) => s.sel.project);
  const shot = useWorld((s) => s.sel.shot);

  useEffect(() => {
    const fromHash = () => {
      const index = projects.findIndex((project) => slug(project.title) === window.location.hash.slice(1));
      if (index >= 0) {
        world.select("project", index);
        world.select("shot", 0);
        world.set({ focus: `monitor-${index}` });
      }
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, [projects]);

  // Keep the address in step when a monitor is chosen in the world. This
  // reads the store, not `selected`: on arrival by a link like #scrollganizer
  // the effect above has just chosen that project, and `selected` here is
  // still the old one, which would write the wrong project back.
  useEffect(() => {
    const hash = `#${slug(projects[world.get().sel.project].title)}`;
    if (window.location.hash && window.location.hash !== hash) history.replaceState(null, "", hash);
  }, [selected, projects]);

  function choose(index: number) {
    world.select("project", index);
    world.select("shot", 0);
    world.set({ focus: `monitor-${index}` });
    history.replaceState(null, "", `#${slug(projects[index].title)}`);
  }

  const project = projects[selected];
  const screenshots = project.screenshots ?? [];
  const titleId = `project-${slug(project.title)}`;
  const newTab = <span className="sr-only"> (opens in a new tab)</span>;

  return (
    <div className="take-clicks">
      {/* One tab stop for the row; the arrow keys move along it (selector.ts) */}
      <div role="tablist" aria-label="Projects on the benches" className="bench-tabs" onKeyDown={(event) => onChoiceKey(event, selected, projects.length, choose)}>
        {projects.map((item, index) => (
          <button
            key={item.title}
            type="button"
            role="tab"
            id={`tab-${slug(item.title)}`}
            aria-selected={index === selected}
            aria-controls="project-notes"
            tabIndex={index === selected ? 0 : -1}
            data-choice
            className="bench-tab"
            onClick={() => choose(index)}
          >
            <span className="bench-tab-lamp" aria-hidden="true" />
            {item.title}
          </button>
        ))}
      </div>

      <article id="project-notes" key={project.title} role="tabpanel" aria-labelledby={`tab-${slug(project.title)}`} className="project-notes">
        <h2 id={titleId} className="font-display text-3xl font-semibold tracking-tight">
          {project.title}
        </h2>
        <p className="project-summary">{project.summary}</p>
        {project.role && (
          <p className="project-role">
            <span className="project-role-label">My role</span> {project.role}
          </p>
        )}
        <p className="project-links">
          <a href={project.githubUrl} target="_blank" rel="noopener noreferrer" className="text-link">
            Code on GitHub{newTab}
          </a>
          {project.liveUrl && (
            <a href={project.liveUrl} target="_blank" rel="noopener noreferrer" className="text-link">
              Live demo{newTab}
            </a>
          )}
        </p>

        <h3 className="project-notes-label">What it does</h3>
        <ul role="list" className="points">
          {project.features.map((feature) => (
            <li key={feature}>{feature}</li>
          ))}
        </ul>

        {project.contributions && (
          <>
            <h3 className="project-notes-label">My part so far</h3>
            <ul role="list" className="points">
              {project.contributions.map((contribution) => (
                <li key={contribution}>{contribution}</li>
              ))}
            </ul>
          </>
        )}

        {screenshots.length > 0 && (
          <>
            <h3 className="project-notes-label">On the screen</h3>
            {screenshots[shot] && (
              <a href={screenshots[shot].src} target="_blank" rel="noopener noreferrer" className="project-screen only-flat">
                <Image
                  key={screenshots[shot].src}
                  src={screenshots[shot].src}
                  alt={screenshots[shot].alt}
                  width={screenshots[shot].width}
                  height={screenshots[shot].height}
                  sizes={`${WORLD_QUERY} 1px, (min-width: 640px) 36rem, 92vw`}
                />
                <span className="sr-only"> (open full size in a new tab)</span>
              </a>
            )}
            <div role="group" aria-label={`${project.title} screenshots`} className="shot-strip">
              {screenshots.map((item, index) => (
                <button
                  key={item.src}
                  type="button"
                  aria-pressed={index === shot}
                  className="shot-thumb"
                  onClick={() => {
                    world.select("shot", index);
                    world.set({ focus: `monitor-${selected}` });
                  }}
                >
                  <Image src={item.src} alt={item.alt} width={item.width} height={item.height} sizes="7rem" />
                </button>
              ))}
            </div>
            <a href={screenshots[shot]?.src} target="_blank" rel="noopener noreferrer" className="text-link mt-2 inline-block text-sm">
              Open this screenshot full size{newTab}
            </a>
          </>
        )}

        <h3 className="project-notes-label">Built with</h3>
        <ul className="project-parts">
          {project.technologies.map((technology) => (
            <li key={technology}>{technology}</li>
          ))}
        </ul>
      </article>
    </div>
  );
}
