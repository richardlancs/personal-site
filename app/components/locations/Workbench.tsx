"use client";

import Image from "next/image";
import { useEffect } from "react";
import type { Project } from "../../data/portfolio";
import { useWorld, world } from "../world3d/store";

const slug = (title: string) => title.toLowerCase().replace(/[^a-z0-9]+/g, "-");

// The workshop's notes. The projects' screenshots are on the monitors on
// the benches (world3d/scenes/Workshop.tsx); choosing a project here, or
// its monitor there, switches that monitor on and walks over to it. The
// address keeps the project (#marketlab) so it can be linked to.
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

  // Keep the address in step when a monitor is chosen in the world
  useEffect(() => {
    const hash = `#${slug(projects[selected].title)}`;
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

  return (
    <div className="take-clicks">
      <div role="group" aria-label="Projects on the benches" className="bench-tabs">
        {projects.map((item, index) => (
          <button key={item.title} type="button" aria-pressed={index === selected} aria-controls="project-notes" className="bench-tab" onClick={() => choose(index)}>
            <span className="bench-tab-lamp" aria-hidden="true" />
            {item.title}
          </button>
        ))}
      </div>

      <article id="project-notes" key={project.title} aria-labelledby={titleId} className="project-notes">
        <h2 id={titleId} className="font-display text-3xl font-semibold tracking-tight">
          {project.title}
        </h2>
        <p className="mt-3 leading-relaxed text-muted">{project.description}</p>

        {screenshots.length > 0 && (
          <>
            <h3 className="project-notes-label">On the screen</h3>
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
              Open this screenshot full size
            </a>
          </>
        )}

        <h3 className="project-notes-label">Built with</h3>
        <ul className="project-parts">
          {project.technologies.map((technology) => (
            <li key={technology}>{technology}</li>
          ))}
        </ul>
        <p className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium">
          <a href={project.githubUrl} target="_blank" rel="noopener noreferrer" className="text-link">
            Code on GitHub
          </a>
          {project.liveUrl && (
            <a href={project.liveUrl} target="_blank" rel="noopener noreferrer" className="text-link">
              Live demo
            </a>
          )}
        </p>
      </article>
    </div>
  );
}
