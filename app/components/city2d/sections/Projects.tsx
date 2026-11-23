import Image from "next/image";
import type { CSSProperties } from "react";
import { projects, skillGroups, type Project, type Screenshot } from "../../../data/portfolio";
import { newTab } from "../ProfileLinks";
import Figures from "../Figures";
import Heading from "../Heading";
import { section } from "../../../sections/registry";
import { StationHead, order } from "../Station";
import Tilt from "../Tilt";

const slug = (title: string) => title.toLowerCase().replace(/[^a-z0-9]+/g, "-");

// The index's short line for a project: its summary up to the first colon,
// comma or full stop ("A stock market simulator"), so no new copy
const gloss = (summary: string) => summary.split(/[:,.]/)[0].trim();

const tall = (shot: Screenshot) => shot.height > shot.width;

const plural = (n: number) => `${n} more screenshot${n === 1 ? "" : "s"}`;

// How wide a picture is drawn: its panel's width (40rem at most; the
// screen's, on a phone). A portrait pair takes half of that each.
const coverSizes = "(min-width: 1024px) 38rem, (min-width: 768px) 70vw, 100vw";
const pairSizes = "(min-width: 1024px) 19rem, (min-width: 768px) 35vw, 50vw";

// "My part" shows its first four points; the rest wait in the row's
// <details>, under "More of my part", so nothing is dropped
const SHOWN_PART = 4;

// A project's keys: "Live demo" is the primary key when there is one and
// "Code" the secondary; "Code" alone is primary. Each is named for its
// project ("Code for MarketLab"), so a list of links tells them apart.
function Keys({ project }: { project: Project }) {
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

// One frame, the picture's own shape (no empty bands), the cover inside it
// whole. When the cover and the screenshot after it are both portrait, the
// two share the frame side by side. Each picture opens the full image in a
// new tab. Nothing is cropped. Around the frame, its depth on a fine
// pointer (reveal.css, "Depth"; Tilt.tsx).
function Picture({ shots }: { shots: Screenshot[] }) {
  return (
    <div className="depth rounded-[var(--radius-in)]" data-tilt="">
      <figure
        className="flex items-stretch justify-center overflow-hidden rounded-[var(--radius-in)] border border-line bg-ink-2"
        style={{ aspectRatio: `${shots.reduce((w, s) => w + s.width / s.height, 0)}` }}
      >
        {shots.map((shot) => (
          <a
            key={shot.src}
            href={shot.src}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-0 min-w-0 flex-1 items-center justify-center"
          >
            <Image
              src={shot.src}
              alt={shot.alt}
              width={shot.width}
              height={shot.height}
              sizes={shots.length > 1 ? pairSizes : coverSizes}
              loading="lazy"
              className="h-full w-full object-contain"
            />
            {newTab}
          </a>
        ))}
      </figure>
    </div>
  );
}

const h4 = "font-display text-xl font-semibold text-text";
// A heading inside the fold: smaller, the fold's summary is above it
const h5 = "font-display text-lg font-semibold text-text";

// The projects section (the site's most important content), then Skills:
// a row of panels along the towers (Station's `row`), each its own stop on
// the street. First the index, under the section's heading, each project a
// link to its panel. Then one panel per project, never all alike (every
// other one a size smaller): the cover leads, whole and as wide as the
// words under it (never cropped, no empty bands), then title, summary, role,
// the keys, then what I did ("My part", under a cyan rule, its first four
// points) or, when the data has no contributions, what it does; then the
// stack on one line. The rest of my part, the team's features (when my
// part took their place) and the other screenshots fold into a <details>,
// which opens inside the panel (the panel scrolls). Then Skills, the
// row's last panel. Everything is in the HTML; each panel arrives sideways
// as it comes on (reveal.css), and the pictures' tilt is Tilt.tsx, mounted
// here once for the whole page.
// Each panel lays itself out by its own width (@container).
export default function Projects() {
  return (
    <>
      <Tilt />
      <div className="panel project-index reveal">
        <StationHead section={section("projects")} />
        <nav aria-label="Projects">
        <ol className="mt-6 grid grid-cols-1 border-t border-line">
          {projects.map((project, index) => (
            <li key={project.title} className="min-w-0 border-b border-line">
              <a
                href={`#${slug(project.title)}`}
                className="group flex min-h-11 items-baseline gap-3 py-3"
              >
                <span aria-hidden="true" className="text-sm text-muted tabular-nums">
                  {String(index + 1).padStart(2, "0")}
                </span>
                {/* One line each: a long gloss ends in an ellipsis (the
                    whole summary is in the panel) */}
                <span className="flex min-w-0 items-baseline gap-2">
                  <span className="max-w-full shrink-0 break-words font-display text-lg font-semibold text-text underline decoration-cyan decoration-1 underline-offset-4 group-hover:decoration-2">
                    {project.title}
                  </span>
                  <span className="min-w-0 truncate text-muted"> {gloss(project.summary)}</span>
                </span>
              </a>
            </li>
          ))}
        </ol>
        </nav>
      </div>

      {projects.map((project, index) => {
          const shots = project.screenshots ?? [];
          const coverIndex = project.cover ?? 0;
          const cover = shots[coverIndex];
          const rest = shots.filter((_, i) => i !== coverIndex);
          const next = rest[0];
          const pair = cover && tall(cover) && next && tall(next);
          const shown = cover ? (pair ? [cover, next] : [cover]) : [];
          const extra = shots.filter((shot) => !shown.includes(shot));
          const part = project.contributions ?? [];
          const morePart = part.slice(SHOWN_PART);
          const foldedFeatures = part.length > 0;
          const folded = foldedFeatures || extra.length > 0;
          // What the fold holds, in the order it holds it
          const summaryText = [
            morePart.length > 0 && "More of my part",
            foldedFeatures && "What it does",
            extra.length > 0 && plural(extra.length),
          ]
            .filter(Boolean)
            .join(" · ");
          // Headings inside the fold, when it holds more than one kind of list
          const subheads = morePart.length > 0;
          const titleId = `project-${slug(project.title)}`;
          // Every other panel a size smaller, its cover with it
          const small = index % 2 === 1;
          // A tall cover (a phone's screen, or a pair) stands beside the
          // words, as tall as they are (on a narrow panel it heads them,
          // centred, at the same size); a wide one heads them, as wide
          const side = Boolean(cover && tall(cover));
          return (
            <article
              key={project.title}
              id={slug(project.title)}
              aria-labelledby={titleId}
              className="panel project @container reveal"
              style={{ ...order(index + 1), "--panel-w": small ? "34rem" : "40rem" } as CSSProperties}
            >
              <div className={`grid gap-y-5 ${side ? "@min-[27.5rem]:grid-cols-[auto_minmax(0,1fr)] @min-[27.5rem]:gap-x-6" : ""}`}>
              <header className={`min-w-0 break-words ${side ? "@min-[27.5rem]:col-start-2" : ""}`}>
                <Heading level={3} id={titleId} className="font-display text-3xl font-semibold tracking-tight text-text">
                  <span aria-hidden="true" className="mr-3 align-middle text-base font-normal text-muted tabular-nums">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {project.title}
                </Heading>
                <p className="mt-3 max-w-[65ch] text-lg text-text"><Figures>{project.summary}</Figures></p>
                {project.role && <p className="mt-2 max-w-[65ch] text-muted"><Figures>{project.role}</Figures></p>}
              </header>

              {cover && (
                <div className={`-order-1 min-w-0 ${side ? `mx-auto max-w-full @min-[27.5rem]:order-none @min-[27.5rem]:row-span-2 @min-[27.5rem]:row-start-1 ${pair ? "w-80" : "w-48"}` : ""}`}>
                  <Picture shots={shown} />
                </div>
              )}

              <div className={`min-w-0 break-words ${side ? "@min-[27.5rem]:col-start-2" : ""}`}>
                <Keys project={project} />

                {part.length > 0 ? (
                  <section className="mt-6 border-l-2 border-cyan pl-5">
                    <Heading level={4} className={h4}>My part</Heading>
                    <ul role="list" className="points mt-3 space-y-2 text-text">
                      {part.slice(0, SHOWN_PART).map((contribution) => (
                        <li key={contribution}><Figures>{contribution}</Figures></li>
                      ))}
                    </ul>
                  </section>
                ) : (
                  <section className="mt-6">
                    <Heading level={4} className={h4}>What it does</Heading>
                    <ul role="list" className="points mt-3 space-y-2 text-text">
                      {project.features.map((feature) => (
                        <li key={feature}><Figures>{feature}</Figures></li>
                      ))}
                    </ul>
                  </section>
                )}

                <p className="mt-6 max-w-[65ch] text-muted">
                  <span className="font-semibold">Built with</span> {project.technologies.join(" · ")}
                </p>

                {folded && (
                  <details className="project-more group mt-6 border-t border-line">
                    <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 py-2 font-semibold text-text [&::-webkit-details-marker]:hidden">
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 16 16"
                        className="chevron size-4 shrink-0 text-cyan group-open:rotate-180"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M3 6l5 5 5-5" />
                      </svg>
                      {summaryText}
                    </summary>
                    {morePart.length > 0 && (
                      <section className="mt-3 border-l-2 border-cyan pl-5">
                        <Heading level={4} className={h5}>More of my part</Heading>
                        <ul role="list" className="points points-quiet mt-2 space-y-2 text-text">
                          {morePart.map((contribution) => (
                            <li key={contribution}><Figures>{contribution}</Figures></li>
                          ))}
                        </ul>
                      </section>
                    )}
                    {foldedFeatures && (
                      <section className={subheads ? "mt-6" : undefined}>
                        {subheads && <Heading level={4} className={h5}>What it does</Heading>}
                        <ul role="list" className={`points points-quiet space-y-2 text-text ${subheads ? "mt-2" : "mt-3"}`}>
                          {project.features.map((feature) => (
                            <li key={feature}><Figures>{feature}</Figures></li>
                          ))}
                        </ul>
                      </section>
                    )}
                    {extra.length > 0 && (
                      <ul aria-label={`More ${project.title} screenshots`} className="mt-4 flex flex-wrap gap-3 pb-2">
                        {extra.map((shot) => (
                          <li key={shot.src}>
                            <a
                              href={shot.src}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex min-h-11 min-w-11 items-center justify-center overflow-hidden rounded-[var(--radius)] border border-line bg-ink-2"
                            >
                              <Image
                                src={shot.src}
                                alt={shot.alt}
                                width={shot.width}
                                height={shot.height}
                                sizes="8rem"
                                loading="lazy"
                                className={tall(shot) ? "h-28 w-auto" : "h-auto w-32"}
                              />
                              {newTab}
                            </a>
                          </li>
                        ))}
                      </ul>
                    )}
                  </details>
                )}
              </div>
              </div>
            </article>
          );
        })}

      <section id="skills" aria-labelledby="skills-title" tabIndex={-1} className="panel project-skills @container reveal break-words" style={{ ...order(projects.length + 1), "--panel-w": "34rem" } as CSSProperties}>
        <Heading level={3} id="skills-title" className="font-display text-3xl font-semibold tracking-tight text-text">
          Skills
        </Heading>
        <div className="mt-6 grid gap-8 @min-[27.5rem]:grid-cols-2">
          {skillGroups.map((group) => (
            <div key={group.category} className="border-t border-line pt-4">
              <Heading level={4} className="text-base font-semibold text-muted">{group.category}</Heading>
              <ul className="mt-3 space-y-1.5 text-lg text-text">
                {group.skills.map((skill) => (
                  <li key={skill}>{skill}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
