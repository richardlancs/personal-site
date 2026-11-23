import { experience, type Experience as Entry } from "../../../data/portfolio";
import { isCurrent, sortNewestFirst } from "../../../lib/experience";
import { machineDate } from "../../../lib/machineDate";
import ResumeLink from "../../resume/ResumeLink";
import Figures from "../Figures";
import Heading from "../Heading";
import { section } from "../../../sections/registry";
import { StationHead, order } from "../Station";

// A date as written in the data, in a <time> only when it is a real date
// ("Present" is plain words: a <time> must hold a valid date)
function When({ value }: { value: string }) {
  const date = machineDate(value);
  return date ? <time dateTime={date}>{value}</time> : <>{value}</>;
}

// One entry, a clear block: what kind it is (Work or Education, in words)
// and "Current" while it runs, over the role (the boldest line), the
// organisation, the dates, then every point. The role comes first in the
// document, so heading navigation lands on it and reads on into the rest;
// the label is drawn above it (order).
function Block({ entry }: { entry: Entry }) {
  return (
    <article className="flex flex-col">
      <Heading level={3} className="mt-2 font-display text-2xl font-bold leading-tight text-text break-words">
        {entry.role}
      </Heading>
      <p className="-order-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.8125rem] font-semibold uppercase tracking-[0.12em] text-text">
        <span className="exp-kind">{entry.kind === "education" ? "Education" : "Work"}</span>
        {isCurrent(entry) && (
          <span className="flex items-center gap-2">
            <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-cyan" />
            Current
          </span>
        )}
      </p>
      <p className="mt-1 text-[1.0625rem] font-semibold text-text break-words">
        {entry.organization}
        {entry.location && <span className="font-normal text-muted"> · {entry.location}</span>}
      </p>
      <p className="mt-1 font-display text-lg font-semibold leading-snug text-muted tabular-nums break-words">
        <When value={entry.startDate} />
        {entry.endDate && (
          <>
            {" – "}
            <When value={entry.endDate} />
          </>
        )}
      </p>
      <ul role="list" className="points mt-4 space-y-2 leading-relaxed text-text">
        {entry.highlights.map((highlight) => (
          <li key={highlight} className="max-w-[62ch] break-words">
            <Figures>{highlight}</Figures>
          </li>
        ))}
      </ul>
    </article>
  );
}

// The section's heading with the résumé (the whole story) beside it,
// obvious and on the same line where there's room (Station's `heading`)
export function ExperienceHead() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
      <StationHead section={section("experience")} />
      <p>
        {/* Opens the résumé over the page (components/resume) */}
        <ResumeLink className="glass">Résumé</ResumeLink>
      </p>
    </div>
  );
}

// The experience section, one stop: every entry at once, newest first, on
// one simple timeline, a line with a dot for each (filled while it runs):
// down the side of the entries on a narrow panel, across their tops in
// three columns once the panel is 45.5rem wide (@container: its own width,
// not the window's). The résumé is beside the heading (ExperienceHead).
// Each entry arrives in turn as the stop comes on (reveal.css).
export default function Experience() {
  return (
    <div className="@container">
      <ol
        role="list"
        aria-label="Work and education, newest first"
        className="mt-6 grid gap-8 border-l border-cyan/60 pl-6 @min-[45.5rem]:grid-cols-3 @min-[45.5rem]:gap-x-8 @min-[45.5rem]:border-t @min-[45.5rem]:border-l-0 @min-[45.5rem]:pt-6 @min-[45.5rem]:pl-0"
      >
        {sortNewestFirst(experience).map((entry, i) => (
          <li
            key={`${entry.role}-${entry.organization}`}
            className="exp-entry reveal relative min-w-0"
            data-current={isCurrent(entry) || undefined}
            style={order(i)}
          >
            <Block entry={entry} />
          </li>
        ))}
      </ol>
    </div>
  );
}
