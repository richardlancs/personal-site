import { experience, type Experience as Entry } from "../../../data/portfolio";
import { machineDate } from "../../../lib/machineDate";

// A date as written in the data, in a <time> only when it is a real date
// ("Present" is plain words: a <time> must hold a valid date)
function When({ value }: { value: string }) {
  const date = machineDate(value);
  return date ? <time dateTime={date}>{value}</time> : <>{value}</>;
}

// The station's departure board: every line written out, one row each, a
// hairline between them. On wide screens the dates are the board's left
// column, in display type with tabular figures; on phones they sit above
// the role. In the document the role comes first (so heading navigation
// lands on it and reads its dates next); the grid places the dates. Work
// and education are all one list in the data, so they stay one board.
export default function Experience() {
  return (
    <ol role="list" className="mt-10 rounded-[var(--radius-lg)] border border-line bg-panel">
      {experience.map((entry: Entry) => (
        <li key={`${entry.role}-${entry.organization}`} className="border-t border-line first:border-t-0">
          <article className="grid gap-x-8 gap-y-3 p-4 min-[400px]:p-5 sm:grid-cols-[minmax(0,13rem)_minmax(0,1fr)] sm:p-8">
            <div className="min-w-0 sm:col-start-2 sm:row-start-1">
              <h3 className="font-display text-2xl font-bold leading-tight text-text break-words">{entry.role}</h3>
              <p className="mt-1 text-base text-muted break-words">
                {entry.organization}
                {entry.location && <span> · {entry.location}</span>}
              </p>
              <ul role="list" className="mt-4 max-w-[65ch] list-disc space-y-2 pl-5 text-[1.0625rem] leading-relaxed text-text marker:text-muted">
                {entry.highlights.map((highlight) => (
                  <li key={highlight} className="break-words">
                    {highlight}
                  </li>
                ))}
              </ul>
            </div>
            <p className="order-first flex items-start gap-3 font-display text-2xl font-semibold leading-tight text-text tabular-nums sm:order-none sm:col-start-1 sm:row-start-1">
              <span aria-hidden="true" className="mt-[0.35em] h-[0.6em] w-1 shrink-0 rounded-sm bg-lantern" />
              <span className="break-words">
                <When value={entry.startDate} />
                {entry.endDate && (
                  <>
                    {" – "}
                    <When value={entry.endDate} />
                  </>
                )}
              </span>
            </p>
          </article>
        </li>
      ))}
    </ol>
  );
}
