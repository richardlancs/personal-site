import { experience, type Experience as Entry } from "../../../data/portfolio";
import { groupByKind, isCurrent, sortNewestFirst } from "../../../lib/experience";
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

// One entry: the role (the boldest line), the organisation, the dates,
// then every highlight. On wide screens the grid puts the dates in a left
// column of their own, so they read straight down the section; on phones
// they follow the organisation. The role comes first in the document so
// heading navigation lands on it.
function Row({ entry }: { entry: Entry }) {
  return (
    <article className="grid gap-y-1 @min-[37.5rem]:grid-cols-[10rem_minmax(0,1fr)] @min-[37.5rem]:gap-x-10">
      <Heading level={3} className="font-display text-2xl font-bold leading-tight text-text break-words @min-[37.5rem]:col-start-2 @min-[37.5rem]:row-start-1">
        {entry.role}
      </Heading>
      <p className="text-[1.0625rem] font-semibold text-text break-words @min-[37.5rem]:col-start-2 @min-[37.5rem]:row-start-2">
        {entry.organization}
        {entry.location && <span className="font-normal text-muted"> · {entry.location}</span>}
      </p>
      <div className="mt-2 @min-[37.5rem]:col-start-1 @min-[37.5rem]:row-span-2 @min-[37.5rem]:row-start-1 @min-[37.5rem]:mt-0 @min-[37.5rem]:pt-1">
        <p className="font-display text-lg font-semibold leading-snug text-muted tabular-nums break-words">
          <When value={entry.startDate} />
          {entry.endDate && (
            <>
              {" – "}
              <When value={entry.endDate} />
            </>
          )}
        </p>
        {isCurrent(entry) && (
          <p className="mt-1.5 flex items-center gap-2 text-[0.8125rem] font-semibold uppercase tracking-[0.14em] text-text">
            <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-cyan" />
            Current
          </p>
        )}
      </div>
      <ul
        role="list"
        className="points mt-4 space-y-2 text-[1.0625rem] leading-relaxed text-text @min-[37.5rem]:col-start-2 @min-[37.5rem]:row-start-3"
      >
        {entry.highlights.map((highlight) => (
          <li key={highlight} className="max-w-[62ch] break-words">
            <Figures>{highlight}</Figures>
          </li>
        ))}
      </ul>
    </article>
  );
}

// A row of panels along the metro line (Station's `row`): one station per
// role, newest first, work and education apart, each group's name on a
// plate where its stations begin. The section's heading and the résumé
// open the newest role's panel (as Projects' heading opens its index), so
// the stop lands on a real role, never an empty panel; that first group's
// name follows them in the panel, in reading order, rather than on the
// line. On the journey the line is drawn along the stations'
// tops, a stop on it for each role (lit for the one still running), and
// each role's panel hangs from its stop (city-track.css, "The line");
// stacked, the panels run down the page. Each station arrives as it comes
// on (reveal.css). A role's panel lays itself out by its own width
// (@container: the dates' column from 37.5rem).
export default function Experience() {
  const { work, education } = groupByKind(sortNewestFirst(experience));
  const groups = [
    { id: "experience-work", label: "Work", entries: work },
    { id: "experience-education", label: "Education", entries: education },
  ].filter((group) => group.entries.length > 0);

  return (
    <>
      {groups.map((group, g) => {
        const label = (
          <p id={group.id} className={`exp-label text-sm font-semibold text-text${g === 0 ? " exp-label-in" : ""}`}>
            {group.label}
          </p>
        );
        return (
          <div key={group.id} className="exp-group">
            {g > 0 && label}
            <ol role="list" aria-labelledby={group.id} className="exp-stations">
              {group.entries.map((entry, i) => (
                <li key={`${entry.role}-${entry.organization}`} className="exp-stop" data-current={isCurrent(entry) || undefined} style={order(i + 1)}>
                  <div className="panel @container">
                    {g === 0 && i === 0 && (
                      <div className="reveal">
                        {/* (the résumé beside the heading, so the role starts high in the panel) */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                          <StationHead section={section("experience")} />
                          <p>
                            {/* Opens the résumé over the page (components/resume); in a <p>, so it has the words' scrim */}
                            <ResumeLink className="text-link text-link-solo">Résumé</ResumeLink>
                          </p>
                        </div>
                        {label}
                      </div>
                    )}
                    <Row entry={entry} />
                  </div>
                </li>
              ))}
            </ol>
          </div>
        );
      })}
    </>
  );
}
