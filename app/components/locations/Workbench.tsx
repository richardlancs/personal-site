"use client";

import Image from "next/image";
import { useEffect } from "react";
import type { Project } from "../../data/portfolio";
import { WORLD_QUERY } from "../world/flat";
import { useWorld, world } from "../world3d/store";
import { onChoiceKey } from "./selector";

const slug = (title: string) => title.toLowerCase().replace(/[^a-z0-9]+/g, "-");

// How wide the chosen screenshot is drawn (globals.css, .project-screen):
// the page's column less the notes' padding and the monitor's bezel. On
// wide screens the column is min(36rem, 42vw); on the narrow layout the
// sheet's column is at most 40rem, with 1rem of sheet either side.
const SHOT_SIZES = `${WORLD_QUERY} calc(min(36rem, 42vw) - 4rem), calc(min(40rem, 100vw - 2rem) - 3.25rem)`;

// The workshop's notes. The projects' screenshots are on the monitors on
// the benches (world3d/scenes/Workshop.tsx); choosing a project here, or
// its monitor there, switches that monitor on and walks over to it. The
// address keeps the project (#marketlab) so it can be linked to. The
// chosen screenshot is shown here as well, on every layout, so it can be
// read without the scene.
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
  const current = screenshots[shot] ?? screenshots[0];
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

        {current && (
          <>
            <h3 className="project-notes-label">On the screen</h3>
            {/* The chosen screenshot, on an old monitor, readable here on
                every layout: the monitor in the workshop shows it too, but
                the scene can be still, small or missing. The caption is the
                picture's description, and the link under it opens it full
                size. The picture is a link as well, for a click or a tap;
                keyboards and screen readers get the one text link. */}
            <figure className="project-shot">
              <a href={current.src} target="_blank" rel="noopener noreferrer" className="project-screen" data-tall={current.height > current.width || undefined} tabIndex={-1} aria-hidden="true">
                <Image key={current.src} src={current.src} alt={current.alt} width={current.width} height={current.height} sizes={SHOT_SIZES} />
              </a>
              <figcaption className="shot-caption">{current.alt}</figcaption>
              <a href={current.src} target="_blank" rel="noopener noreferrer" className="text-link shot-open">
                Open this screenshot full size{newTab}
              </a>
            </figure>
            {screenshots.length > 1 && (
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
            )}
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
