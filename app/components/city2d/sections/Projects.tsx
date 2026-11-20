import Image from "next/image";
import { projects, skillGroups, type Screenshot } from "../../../data/portfolio";

const newTab = <span className="sr-only"> (opens in a new tab)</span>;

const slug = (title: string) => title.toLowerCase().replace(/[^a-z0-9]+/g, "-");

// How wide the main screenshot is drawn: the full column (the station's
// 72rem less its 1.25rem gutters) under 1024px; on wide screens about half
// of it, a little more for the first project.
const shotSizes = (first: boolean) =>
  first ? "(min-width: 1024px) min(40rem, 56vw), calc(100vw - 2.5rem)" : "(min-width: 1024px) min(34rem, 48vw), calc(100vw - 2.5rem)";

const tall = (shot: Screenshot) => shot.height > shot.width;

// The projects station (the site's most important content), then Skills.
// One project to a row on a panel: its screenshot on one side and its notes
// on the other on wide screens, alternating sides down the page; stacked
// under 1024px. Everything is written out: further screenshots are small
// thumbnails, each opening the full image in a new tab.
export default function Projects() {
  return (
    <div className="mt-10 flex flex-col gap-10 sm:gap-12">
      {projects.map((project, index) => {
        const first = index === 0;
        const [main, ...more] = project.screenshots ?? [];
        const titleId = `project-${slug(project.title)}`;
        return (
          <article
            key={project.title}
            id={slug(project.title)}
            aria-labelledby={titleId}
            className={`rounded-[var(--radius-lg)] border border-line bg-panel p-5 transition-colors duration-200 hover:border-cyan/40 sm:p-8 ${
              main ? `lg:grid lg:items-start lg:gap-10 ${first ? "lg:grid-cols-[7fr_5fr]" : "lg:grid-cols-2"}` : ""
            }`}
          >
            {main && (
              <figure className={`min-w-0 ${index % 2 === 1 ? "lg:order-2" : ""}`}>
                <a
                  href={main.src}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block overflow-hidden rounded-[var(--radius)] border border-line bg-ink"
                >
                  <Image
                    src={main.src}
                    alt={main.alt}
                    width={main.width}
                    height={main.height}
                    sizes={shotSizes(first)}
                    loading="lazy"
                    className={tall(main) ? "mx-auto h-auto max-h-[26rem] w-auto max-w-full lg:max-h-[36rem]" : "h-auto w-full"}
                  />
                  {newTab}
                </a>
                {more.length > 0 && (
                  <ul aria-label={`More ${project.title} screenshots`} className="mt-4 flex flex-wrap gap-3">
                    {more.map((shot) => (
                      <li key={shot.src}>
                        <a
                          href={shot.src}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex min-h-11 min-w-11 items-center justify-center overflow-hidden rounded-[var(--radius)] border border-line bg-ink"
                        >
                          <Image
                            src={shot.src}
                            alt={shot.alt}
                            width={shot.width}
                            height={shot.height}
                            sizes="6rem"
                            loading="lazy"
                            className={tall(shot) ? "h-24 w-auto" : "h-auto w-24"}
                          />
                          {newTab}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </figure>
            )}

            <div className={`min-w-0 break-words ${main ? "mt-8 lg:mt-0" : ""}`}>
              <h3 id={titleId} className="font-display text-3xl font-semibold tracking-tight text-text">
                {project.title}
              </h3>
              <p className="mt-3 text-lg text-text">{project.summary}</p>
              {project.role && <p className="mt-3 text-muted">{project.role}</p>}

              <ul className="mt-6 list-disc space-y-2 pl-5 text-text marker:text-muted">
                {project.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>

              {project.contributions && (
                <>
                  <h4 className="mt-8 text-sm font-semibold uppercase tracking-wider text-muted">My part</h4>
                  <ul className="mt-3 list-disc space-y-2 pl-5 text-text marker:text-muted">
                    {project.contributions.map((contribution) => (
                      <li key={contribution}>{contribution}</li>
                    ))}
                  </ul>
                </>
              )}

              <p className="mt-6 text-muted">
                <span className="sr-only">Built with: </span>
                {project.technologies.join(", ")}
              </p>

              <p className="mt-6 flex flex-wrap gap-3">
                <a
                  href={project.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={project.liveUrl ? "glass" : "glass glass-primary"}
                >
                  Code
                  {newTab}
                </a>
                {project.liveUrl && (
                  <a href={project.liveUrl} target="_blank" rel="noopener noreferrer" className="glass glass-primary">
                    Live demo
                    {newTab}
                  </a>
                )}
              </p>
            </div>
          </article>
        );
      })}

      <section id="skills" aria-labelledby="skills-title" tabIndex={-1} className="mt-6 break-words">
        <h3 id="skills-title" className="font-display text-3xl font-semibold tracking-tight text-text">
          Skills
        </h3>
        <div className="mt-6 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {skillGroups.map((group) => (
            <div key={group.category} className="border-t border-line pt-4">
              <h4 className="text-sm font-semibold uppercase tracking-wider text-muted">{group.category}</h4>
              <ul className="mt-3 space-y-1.5 text-text">
                {group.skills.map((skill) => (
                  <li key={skill}>{skill}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
