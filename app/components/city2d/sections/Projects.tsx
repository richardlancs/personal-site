import type { CSSProperties } from "react";
import Image from "next/image";
import { projects, skillGroups, type Project, type Screenshot } from "../../../data/portfolio";
import { newTab } from "../ProfileLinks";
import Figures from "../Figures";
import Heading from "../Heading";
import { section } from "../../../sections/registry";
import { NextStop, StationHead, order } from "../Station";
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

// One frame, the picture's own shape (no empty bands; --ar, the shape, is
// set on the cover's cell in the article), the cover inside it whole.
// When the cover and the screenshot after it are both portrait, the two
// share the frame side by side. Each picture opens the full image in a new
// tab. Nothing is cropped. A wide cover under the title, once the words
// are beside it, grows to their height (the picture whole and centred in
// it), so the panel has no empty well. Around the frame, its depth on a
// fine pointer (reveal.css, "Depth"; Tilt.tsx).
function Picture({ shots, side }: { shots: Screenshot[]; side: boolean }) {
  return (
    <div className="depth rounded-[var(--radius-in)] @min-[45.5rem]:flex-1" data-tilt="">
      <figure className={`flex aspect-(--ar) items-stretch justify-center overflow-hidden rounded-[var(--radius-in)] border border-line bg-ink-2 ${side ? "" : "@min-[45.5rem]:h-full @min-[45.5rem]:aspect-auto"}`}>
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
// link to its panel. Then one panel per project, in the document in the
// order a phone reads it: the title, the keys, the summary and role, the
// cover (whole, never cropped, no empty bands), then what I did ("My
// part", under a cyan rule, its first four points) or, when the data has
// no contributions, what it does; then the stack on one line. The rest of
// my part, the team's features (when my part took their place) and the
// other screenshots, each as wide as the column, fold into a <details>,
// which opens inside the panel (the panel scrolls). Then Skills, the
// row's last panel, with the way on to the next stop. Everything is in the HTML; each panel arrives sideways
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
                {/* The gloss wraps under a long title, never cut short */}
                <span className="flex min-w-0 flex-wrap items-baseline gap-x-2">
                  <span className="max-w-full shrink-0 break-words font-display text-lg font-semibold text-text underline decoration-cyan decoration-1 underline-offset-4 group-hover:decoration-2">
                    {project.title}
                  </span>
                  <span className="min-w-0 text-muted"> {gloss(project.summary)}</span>
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
          // On a narrow panel everything stacks in the document's order. A
          // tall cover (a phone's screen, or a pair) stands beside the
          // words from 27.5rem; on a wide panel (45.5rem) the words go in
          // two columns: the title (with the keys level with it at the
          // right), the summary and a wide cover under it at the left (the
          // cover growing to the words' height), what I did at the right,
          // so no line runs long; or a tall cover, the title and summary,
          // then the keys and what I did: three columns
          const side = Boolean(cover && tall(cover));
          return (
            <article
              key={project.title}
              id={slug(project.title)}
              aria-labelledby={titleId}
              className="panel project @container reveal"
              style={order(index + 1)}
            >
              <div
                className={`grid grid-cols-1 gap-y-5 @min-[45.5rem]:grid-rows-[auto_auto_1fr] @min-[45.5rem]:gap-x-10 ${
                  side
                    ? "@min-[27.5rem]:grid-cols-[auto_minmax(0,1fr)] @min-[27.5rem]:gap-x-6 @min-[45.5rem]:grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)]"
                    : "@min-[45.5rem]:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]"
                }`}
              >
              <Heading level={3} id={titleId} className={`min-w-0 break-words font-display text-3xl font-semibold tracking-tight text-text @min-[45.5rem]:row-start-1 ${side ? "@min-[27.5rem]:col-start-2" : ""}`}>
                <span aria-hidden="true" className="mr-3 align-middle text-base font-normal text-muted tabular-nums">
                  {String(index + 1).padStart(2, "0")}
                </span>
                {project.title}
              </Heading>

              <div className={`min-w-0 @min-[45.5rem]:row-start-1 ${side ? "@min-[27.5rem]:col-start-2 @min-[45.5rem]:col-start-3" : "@min-[45.5rem]:col-start-2"}`}>
                <Keys project={project} />
              </div>

              <div className={`min-w-0 break-words @min-[45.5rem]:row-start-2 ${side ? "@min-[27.5rem]:col-start-2" : "@min-[45.5rem]:col-start-1"}`}>
                <p className="max-w-[65ch] text-lg text-text"><Figures>{project.summary}</Figures></p>
                {project.role && <p className="mt-2 max-w-[65ch] text-muted"><Figures>{project.role}</Figures></p>}
              </div>

              {/* The cover: on a phone after the words and at most a
                  quarter of the screen tall (--ar, its shape, gives the
                  width for that), so the title, the keys and the summary
                  keep the sheet; beside the words, free of that */}
              {cover && (
                <div
                  className={`mx-auto w-full min-w-0 max-w-[calc(25svh*var(--ar))] ${side ? `@min-[27.5rem]:col-start-1 @min-[27.5rem]:row-span-4 @min-[27.5rem]:row-start-1 @min-[27.5rem]:max-w-none @min-[45.5rem]:row-span-3 ${pair ? "@min-[27.5rem]:w-80" : "@min-[27.5rem]:w-48"}` : "@min-[45.5rem]:col-start-1 @min-[45.5rem]:row-start-3 @min-[45.5rem]:flex @min-[45.5rem]:max-w-none @min-[45.5rem]:flex-col"}`}
                  style={{ "--ar": shown.reduce((w, s) => w + s.width / s.height, 0) } as CSSProperties}
                >
                  <Picture shots={shown} side={side} />
                </div>
              )}

              <div className={`min-w-0 break-words @min-[45.5rem]:row-span-2 @min-[45.5rem]:row-start-2 ${side ? "@min-[27.5rem]:col-start-2 @min-[45.5rem]:col-start-3" : "@min-[45.5rem]:col-start-2"}`}>
                {part.length > 0 ? (
                  <section className="border-l-2 border-cyan pl-5">
                    <Heading level={4} className={h4}>My part</Heading>
                    <ul role="list" className="points mt-3 space-y-2 text-text">
                      {part.slice(0, SHOWN_PART).map((contribution) => (
                        <li key={contribution}><Figures>{contribution}</Figures></li>
                      ))}
                    </ul>
                  </section>
                ) : (
                  <section>
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
                      <ul aria-label={`More ${project.title} screenshots`} className="mt-4 grid gap-4 pb-2">
                        {/* Each as wide as the column (a tall one as tall
                            as most of the screen), so it can be read */}
                        {extra.map((shot) => (
                          <li key={shot.src}>
                            <a
                              href={shot.src}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex min-h-11 justify-center overflow-hidden rounded-[var(--radius-in)] border border-line bg-ink-2"
                            >
                              <Image
                                src={shot.src}
                                alt={shot.alt}
                                width={shot.width}
                                height={shot.height}
                                sizes={coverSizes}
                                loading="lazy"
                                className={tall(shot) ? "h-auto max-h-[70svh] w-auto" : "h-auto w-full"}
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

      <section id="skills" aria-labelledby="skills-title" tabIndex={-1} className="panel project-skills @container reveal break-words" style={order(projects.length + 1)}>
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
        {/* The way on, at the row's last panel (Station puts it at the foot
            of a stop of one panel) */}
        <NextStop section={section("projects")} />
      </section>
    </>
  );
}
