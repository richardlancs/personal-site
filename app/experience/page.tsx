import type { Metadata } from "next";
import LocationPage from "../components/world/LocationPage";
import { experience } from "../data/portfolio";
import { placeById } from "../data/world";

export const metadata: Metadata = {
  title: "Experience",
  description: "Richard Lan's experience and education.",
};

// Like a station timetable: one row per stop, newest first as listed in
// app/data/portfolio.ts
export default function ExperiencePage() {
  return (
    <LocationPage place={placeById("station")}>
      <p className="leading-relaxed text-muted sm:text-lg">Work and education, in one timetable.</p>
      <ol className="mt-8 divide-y divide-border border-y border-border">
        {experience.map((job) => (
          <li key={`${job.role}-${job.organization}`} className="grid gap-3 py-7 sm:grid-cols-[9rem_1fr] sm:gap-8">
            <p className="text-sm font-semibold tabular-nums text-warm sm:pt-1.5">
              {/* "2026 – Present", or just "2026" if there's no end date */}
              {job.endDate ? `${job.startDate} – ${job.endDate}` : job.startDate}
            </p>
            <div>
              <h2 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">{job.role}</h2>
              <p className="mt-1 text-muted">
                {job.organization}
                {job.location && `, ${job.location}`}
              </p>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-[15px] leading-6 text-muted marker:text-warm">
                {job.highlights.map((highlight) => (
                  <li key={highlight}>{highlight}</li>
                ))}
              </ul>
            </div>
          </li>
        ))}
      </ol>
    </LocationPage>
  );
}
