import type { Project } from "../data/portfolio";

const linkStyle =
  "text-accent underline decoration-transparent underline-offset-4 transition-colors duration-200 hover:text-accent-hover hover:decoration-current";

// One project = one row. The Projects section renders one of these per
// item in the `projects` list, separated by thin lines.
export default function ProjectCard({
  title,
  description,
  technologies,
  githubUrl,
  liveUrl,
}: Project) {
  return (
    <article className="p-6 transition-colors duration-300 sm:p-8 [@media(hover:hover)]:hover:bg-card-hover/60">
      <h3 className="text-xl font-semibold tracking-tight">{title}</h3>
      <p className="mt-3 text-lg leading-relaxed text-muted">{description}</p>
      <p className="mt-4 text-sm text-muted">{technologies.join(", ")}</p>

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
