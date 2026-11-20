import Image from "next/image";
import { projects, skillGroups, type Project, type Screenshot } from "../../../data/portfolio";
import { newTab } from "../ProfileLinks";
import Figures from "../Figures";
import { order } from "../Station";
import Tilt from "../Tilt";

const slug = (title: string) => title.toLowerCase().replace(/[^a-z0-9]+/g, "-");

// The index's short line for a project: its summary up to the first colon,
// comma or full stop ("A stock market simulator"), so no new copy
const gloss = (summary: string) => summary.split(/[:,.]/)[0].trim();

const tall = (shot: Screenshot) => shot.height > shot.width;

const plural = (n: number) => `${n} more screenshot${n === 1 ? "" : "s"}`;

// How wide a picture is drawn: the full column (the station's 72rem less
// its gutters) under 1024px; the right 7 of 12 columns from 1024px, and
// the right half from 1280px. A portrait pair takes half of that each.
const coverSizes = "(min-width: 1280px) min(33rem, 46vw), (min-width: 1024px) 55vw, calc(100vw - 2.5rem)";
const pairSizes = "(min-width: 1280px) min(16.5rem, 23vw), (min-width: 1024px) 28vw, calc(50vw - 1.5rem)";

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

// One frame, the same shape for every project (16:10, on the alternate
// ground), the cover inside it whole. When the cover and the screenshot
// after it are both portrait, the two share the frame side by side; a
// lone portrait cover sits in the middle. Each picture opens the full
// image in a new tab. Nothing is cropped. Around the frame, its depth on
// a fine pointer (reveal.css, "Depth"; Tilt.tsx).
function Picture({ shots }: { shots: Screenshot[] }) {
  return (
    <div className="depth rounded-[var(--radius-lg)]" data-tilt="">
      <figure
        className={`flex aspect-[16/10] items-stretch justify-center gap-3 overflow-hidden rounded-[var(--radius-lg)] border border-line bg-ink-2 ${
          tall(shots[0]) ? "p-3" : ""
        }`}
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

// The projects section (the site's most important content), then Skills.
// First an index of the projects, each a link to its row. Then one row
// per project, hairlines between them and no panels: from 1024px its text
// in the left 5 of 12 columns and its picture in the right 7 (from 1280px
// half and half, so the text runs wider and the row shorter), the picture
// staying in view while the text goes by; under 1024px title, summary,
// role, picture, then the rest. The text: the keys first, then what I did
// ("My part", under a cyan rule, its first four points) or, when the data
// has no contributions, what it does; then the stack on one line. The rest
// of my part, the team's features (when my part took their place) and the
// other screenshots fold into a <details>.
// Then Skills, on its own edged panel. Everything is in the HTML.
// The index, each row's header, picture and text, and Skills arrive as
// they scroll in (reveal.css); the pictures' tilt is Tilt.tsx, mounted
// here once for the whole page.
export default function Projects() {
  return (
    <div className="mt-10">
      <Tilt />
      <nav aria-label="Projects" className="reveal">
        <ol className="grid grid-cols-1 border-t border-line md:grid-cols-2 md:gap-x-10">
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
                    whole summary is in the row) */}
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

      <div className="mt-6 divide-y divide-line">
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
          return (
            <article
              key={project.title}
              id={slug(project.title)}
              aria-labelledby={titleId}
              className="py-10 sm:py-14 lg:grid lg:grid-cols-12 lg:grid-rows-[auto_1fr] lg:gap-x-12 xl:gap-x-10"
            >
              <header className="reveal min-w-0 break-words lg:col-span-5 lg:col-start-1 lg:row-start-1 xl:col-span-6">
                <h3 id={titleId} className="font-display text-3xl font-semibold tracking-tight text-text">
                  <span aria-hidden="true" className="mr-3 align-middle text-base font-normal text-muted tabular-nums">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {project.title}
                </h3>
                <p className="mt-3 max-w-[65ch] text-lg text-text"><Figures>{project.summary}</Figures></p>
                {project.role && <p className="mt-2 max-w-[65ch] text-muted"><Figures>{project.role}</Figures></p>}
              </header>

              {cover && (
                <div className="reveal mt-6 min-w-0 lg:sticky lg:top-[calc(var(--bar-h)+1.5rem)] lg:col-span-7 lg:col-start-6 lg:row-span-2 lg:row-start-1 lg:mt-0 lg:self-start xl:col-span-6 xl:col-start-7" style={order(1)}>
                  <Picture shots={shown} />
                </div>
              )}

              <div className="reveal mt-6 min-w-0 break-words lg:col-span-5 lg:col-start-1 lg:row-start-2 xl:col-span-6" style={order(2)}>
                <Keys project={project} />

                {part.length > 0 ? (
                  <section className="mt-6 border-l-2 border-cyan pl-5">
                    <h4 className={h4}>My part</h4>
                    <ul role="list" className="points mt-3 space-y-2 text-text">
                      {part.slice(0, SHOWN_PART).map((contribution) => (
                        <li key={contribution}><Figures>{contribution}</Figures></li>
                      ))}
                    </ul>
                  </section>
                ) : (
                  <section className="mt-6">
                    <h4 className={h4}>What it does</h4>
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
                        <h4 className={h5}>More of my part</h4>
                        <ul role="list" className="points points-quiet mt-2 space-y-2 text-text">
                          {morePart.map((contribution) => (
                            <li key={contribution}><Figures>{contribution}</Figures></li>
                          ))}
                        </ul>
                      </section>
                    )}
                    {foldedFeatures && (
                      <section className={subheads ? "mt-6" : undefined}>
                        {subheads && <h4 className={h5}>What it does</h4>}
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
            </article>
          );
        })}
      </div>

      <section id="skills" aria-labelledby="skills-title" tabIndex={-1} className="reveal mt-6 break-words rounded-[var(--radius-lg)] border border-line border-t-2 border-t-cyan bg-panel p-4 min-[400px]:p-5 sm:p-8">
        <h3 id="skills-title" className="font-display text-3xl font-semibold tracking-tight text-text">
          Skills
        </h3>
        <div className="mt-6 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {skillGroups.map((group) => (
            <div key={group.category} className="border-t border-line pt-4">
              <h4 className="text-base font-semibold text-muted">{group.category}</h4>
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
