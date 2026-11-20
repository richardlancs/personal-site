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

// A project's keys: "Live demo" is the primary key when there is one and
// "Code" the secondary; "Code" alone is primary. Each is named for its
// project ("Code for MarketLab"), so a list of links tells them apart.
function Keys({ project }: { project: (typeof projects)[number] }) {
  return (
    <p className="flex flex-wrap gap-3">
      {project.liveUrl && (
        <a href={project.liveUrl} target="_blank" rel="noopener noreferrer" className="glass glass-primary">
          Live demo<span className="sr-only"> of {project.title}</span>
          {newTab}
        </a>
      )}
      <a href={project.githubUrl} target="_blank" rel="noopener noreferrer" className={project.liveUrl ? "glass" : "glass glass-primary"}>
        Code<span className="sr-only"> for {project.title}</span>
        {newTab}
      </a>
    </p>
  );
}

// A list of points: at most about 65 characters a line
const points = "max-w-[65ch] list-disc space-y-2 pl-4 text-[1.0625rem] leading-relaxed text-text marker:text-muted min-[400px]:pl-5";

// The projects station (the site's most important content), then Skills.
// One project to a panel: its screenshot, further screenshots as small
// thumbnails (each opening the full image in a new tab) and its keys on
// one side, its notes on the other on wide screens, alternating sides
// down the page; on wide screens the screenshot side stays in view (sticky
// within its panel) while the notes, often much longer, go by. Stacked
// under 1024px, the keys under the screenshots. Then Skills, on its own
// panel. Everything is written out.
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
            className={`rounded-[var(--radius-lg)] border border-line bg-panel p-4 transition-colors duration-200 hover:border-cyan/40 min-[400px]:p-5 sm:p-8 ${
              main ? `lg:grid lg:items-start lg:gap-10 ${first ? "lg:grid-cols-[7fr_5fr]" : "lg:grid-cols-2"}` : ""
            }`}
          >
            {main && (
              <div className={`min-w-0 lg:sticky lg:top-[calc(var(--bar-h)+1.5rem)] ${index % 2 === 1 ? "lg:order-2" : ""}`}>
                <figure>
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
                      className={
                        tall(main)
                          ? "mx-auto h-auto max-h-[20rem] w-auto max-w-full min-[480px]:max-h-[26rem] lg:max-h-[min(36rem,calc(100svh-var(--bar-h)-14rem))]"
                          : "h-auto w-full"
                      }
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
                <div className="mt-6">
                  <Keys project={project} />
                </div>
              </div>
            )}

            <div className={`min-w-0 break-words ${main ? "mt-8 lg:mt-0" : ""}`}>
              <h3 id={titleId} className="font-display text-3xl font-semibold tracking-tight text-text">
                {project.title}
              </h3>
              <p className="mt-3 max-w-[65ch] text-lg text-text">{project.summary}</p>
              {project.role && <p className="mt-3 text-muted">{project.role}</p>}

              <ul className={`mt-6 ${points}`}>
                {project.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>

              {project.contributions && (
                <>
                  <h4 className="mt-8 text-base font-semibold tracking-wide text-muted">My part</h4>
                  <ul className={`mt-3 ${points}`}>
                    {project.contributions.map((contribution) => (
                      <li key={contribution}>{contribution}</li>
                    ))}
                  </ul>
                </>
              )}

              <p className="mt-6 max-w-[65ch] text-muted">
                <span className="sr-only">Built with: </span>
                {project.technologies.join(", ")}
              </p>

              {!main && (
                <div className="mt-6">
                  <Keys project={project} />
                </div>
              )}
            </div>
          </article>
        );
      })}

      <section id="skills" aria-labelledby="skills-title" tabIndex={-1} className="mt-6 break-words rounded-[var(--radius-lg)] border border-line border-t-2 border-t-cyan bg-panel p-4 min-[400px]:p-5 sm:p-8">
        <h3 id="skills-title" className="font-display text-3xl font-semibold tracking-tight text-text">
          Skills
        </h3>
        <div className="mt-6 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {skillGroups.map((group) => (
            <div key={group.category} className="border-t border-line pt-4">
              <h4 className="text-base font-semibold tracking-wide text-muted">{group.category}</h4>
              <ul className="mt-3 space-y-1.5 text-lg text-text">
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
