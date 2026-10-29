import type { Project } from "../data/portfolio";

const linkStyle =
  "text-accent underline decoration-transparent underline-offset-4 transition-colors duration-200 hover:text-accent-hover hover:decoration-current";

// One project, as a note pinned to the notice board. `tilt` turns it a
// fraction of a degree so the board looks hand-pinned; it straightens on hover.
export default function ProjectCard({
  title,
  description,
  technologies,
  githubUrl,
  liveUrl,
  tilt = 0,
}: Project & { tilt?: number }) {
  return (
    <article
      className="paper pinned h-full p-6 sm:p-7"
      style={{ "--tilt": `${tilt}deg` } as React.CSSProperties}
    >
      <h3 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">{title}</h3>
      <p className="mt-3 text-[15px] leading-6 text-muted">{description}</p>
      <p className="mt-4 text-[13px] leading-5 text-muted">{technologies.join(" · ")}</p>

      <div className="mt-5 flex gap-6 text-sm font-medium">
        <a
          href={githubUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={linkStyle}
        >
          Code
        </a>
        {/* Only show the demo link when a liveUrl was provided */}
        {liveUrl && (
          <a
            href={liveUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={linkStyle}
          >
            Live demo
          </a>
        )}
      </div>
    </article>
  );
}
