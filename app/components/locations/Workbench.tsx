"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { Project } from "../../data/portfolio";

const slug = (title: string) => title.toLowerCase().replace(/[^a-z0-9]+/g, "-");

// The workshop bench: one old screen per project. Choosing a screen turns
// it on and brings its project up on the big monitor, with the notes for
// it clipped alongside. The URL keeps the project (#marketlab), so it can
// be linked to directly.
export default function Workbench({ projects }: { projects: Project[] }) {
  const [selected, setSelected] = useState(0);
  const [shot, setShot] = useState(0);
  // Bumped on every change so the screen plays its switch-on again
  const [power, setPower] = useState(0);

  useEffect(() => {
    const fromHash = () => {
      const index = projects.findIndex((project) => slug(project.title) === window.location.hash.slice(1));
      if (index >= 0) {
        setSelected(index);
        setShot(0);
        setPower((n) => n + 1);
      }
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, [projects]);

  function choose(index: number) {
    if (index === selected) return;
    setSelected(index);
    setShot(0);
    setPower((n) => n + 1);
    history.replaceState(null, "", `#${slug(projects[index].title)}`);
  }

  const project = projects[selected];
  const screenshots = project.screenshots ?? [];
  const tall = screenshots[0] && screenshots[0].height > screenshots[0].width;
  const titleId = `project-${slug(project.title)}`;

  return (
    <div className="workbench take-clicks">
      {/* The screens on the bench */}
      <div role="group" aria-label="Projects on the bench" className="bench-screens">
        {projects.map((item, index) => (
          <button
            key={item.title}
            type="button"
            aria-pressed={index === selected}
            aria-controls="project-monitor"
            className="bench-screen"
            onClick={() => choose(index)}
          >
            <span className="bench-screen-glass">
              {item.screenshots?.[0] && (
                <Image
                  src={item.screenshots[0].src}
                  alt=""
                  width={item.screenshots[0].width}
                  height={item.screenshots[0].height}
                  sizes="10rem"
                  className="bench-screen-image"
                />
              )}
            </span>
            <span className="bench-screen-tape">{item.title}</span>
          </button>
        ))}
      </div>

      <article id="project-monitor" aria-labelledby={titleId} className="project">
        {/* The big monitor: the project's real screenshots */}
        <div className="monitor">
          <div key={power} className="monitor-screen" data-tall={tall || undefined}>
            {tall ? (
              <div className="monitor-strip">
                {screenshots.map((item) => (
                  <Image key={item.src} src={item.src} alt={item.alt} width={item.width} height={item.height} sizes="(min-width: 1024px) 14rem, 30vw" />
                ))}
              </div>
            ) : (
              screenshots[shot] && (
                <Image
                  key={screenshots[shot].src}
                  src={screenshots[shot].src}
                  alt={screenshots[shot].alt}
                  width={screenshots[shot].width}
                  height={screenshots[shot].height}
                  sizes="(min-width: 1024px) 40rem, 90vw"
                  className="monitor-image"
                />
              )
            )}
          </div>
          <div className="monitor-chin">
            <span className="monitor-lamp" aria-hidden="true" />
            {!tall && screenshots.length > 1 && (
              <span className="monitor-buttons">
                {screenshots.map((item, index) => (
                  <button
                    key={item.src}
                    type="button"
                    aria-label={`Screenshot ${index + 1} of ${screenshots.length}`}
                    aria-pressed={index === shot}
                    onClick={() => setShot(index)}
                    className="monitor-button"
                  />
                ))}
              </span>
            )}
          </div>
        </div>

        {/* The notes clipped beside it */}
        <div className="project-notes">
          <h2 id={titleId} className="font-display text-3xl font-semibold tracking-tight">
            {project.title}
          </h2>
          <p className="mt-3 leading-relaxed text-muted">{project.description}</p>
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
        </div>
      </article>
    </div>
  );
}
