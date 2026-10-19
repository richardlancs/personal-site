import { experience } from "../data/portfolio";
import Section from "./Section";

export default function Experience() {
  return (
    <Section id="experience" title="Experience & Education" icon="experience" tone="soft">
      <ol className="divide-y divide-border">
        {experience.map((job, index) => (
          <li key={index} className="py-10 first:pt-0 last:pb-0">
            <p className="text-sm text-muted">
              {/* Show "2026 – Present", or just "2026" if there's no end date */}
              {job.endDate ? `${job.startDate} – ${job.endDate}` : job.startDate}
            </p>
            <h3 className="mt-2 text-xl font-semibold tracking-tight">
              {job.role}
            </h3>
            <p className="mt-1 text-lg text-muted">
              {job.location
                ? `${job.organization} · ${job.location}`
                : job.organization}
            </p>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-lg leading-relaxed text-muted marker:text-border">
              {job.highlights.map((highlight, i) => (
                <li key={i}>{highlight}</li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </Section>
  );
}
