import Image from "next/image";
import type { Project } from "../../data/portfolio";

// One project: what it is, how it's built, links, and real screenshots.
// Wide screenshots: the first large, the rest in a row below. Tall ones
// (like a browser side panel) side by side.
export default function ProjectEntry({
  title,
  description,
  technologies,
  githubUrl,
  liveUrl,
  screenshots = [],
}: Project) {
  const wide = screenshots[0] && screenshots[0].width > screenshots[0].height;
  const [first, ...rest] = screenshots;

  return (
    <article aria-labelledby={`project-${title}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <h2 id={`project-${title}`} className="font-display text-3xl font-semibold tracking-tight">
          {title}
        </h2>
        <p className="flex gap-5 text-sm font-medium">
          <a href={githubUrl} target="_blank" rel="noopener noreferrer" className="text-link">
            Code on GitHub
          </a>
          {/* Only when the project has a live demo */}
          {liveUrl && (
            <a href={liveUrl} target="_blank" rel="noopener noreferrer" className="text-link">
              Live demo
            </a>
          )}
        </p>
      </div>

      <p className="mt-4 max-w-[65ch] leading-relaxed text-muted">{description}</p>

      <ul aria-label="Built with" className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-muted">
        {technologies.map((technology) => (
          <li key={technology}>{technology}</li>
        ))}
      </ul>

      {wide ? (
        <div className="mt-7 space-y-4">
          <Screenshot {...first} sizes="(min-width: 1024px) 60rem, 92vw" />
          {rest.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2">
              {rest.map((shot) => (
                <Screenshot key={shot.src} {...shot} sizes="(min-width: 1024px) 30rem, 92vw" />
              ))}
            </div>
          )}
        </div>
      ) : (
        screenshots.length > 0 && (
          <div className="mt-7 grid grid-cols-2 gap-4 sm:grid-cols-3">
            {screenshots.map((shot) => (
              <Screenshot key={shot.src} {...shot} sizes="(min-width: 640px) 18rem, 45vw" />
            ))}
          </div>
        )
      )}
    </article>
  );
}

function Screenshot({ src, alt, width, height, sizes }: NonNullable<Project["screenshots"]>[number] & { sizes: string }) {
  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      sizes={sizes}
      className="h-auto w-full rounded border border-border"
    />
  );
}
