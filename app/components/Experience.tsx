import { experience } from "../data/portfolio";
import { TrailScene } from "./park/scenes";
import Zone from "./Zone";

export default function Experience() {
  return (
    <Zone id="experience" place="The trail" title="Experience & Education" scene={<TrailScene />}>
      {/* Each stop along the trail, joined by a dotted path */}
      <ol className="trail grid gap-6 walk:flex walk:gap-10">
        {experience.map((job, index) => (
          <li key={index} className="paper relative p-6 sm:p-7 walk:w-[min(25rem,30vw)]">
            <p className="text-sm font-semibold text-warm">
              {/* Show "2026 – Present", or just "2026" if there's no end date */}
              {job.endDate ? `${job.startDate} – ${job.endDate}` : job.startDate}
            </p>
            <h3 className="mt-2 font-display text-xl font-semibold tracking-tight">
              {job.role}
            </h3>
            <p className="mt-1 text-muted">
              {job.location
                ? `${job.organization} · ${job.location}`
                : job.organization}
            </p>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-[15px] leading-6 text-muted marker:text-leaf-dark">
              {job.highlights.map((highlight, i) => (
                <li key={i}>{highlight}</li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </Zone>
  );
}
