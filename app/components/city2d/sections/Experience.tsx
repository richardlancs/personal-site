import { experience, type Experience as Entry } from "../../../data/portfolio";
import { machineDate } from "../../../lib/machineDate";

function When({ value }: { value: string }) {
  return <time dateTime={machineDate(value)}>{value}</time>;
}

// The station's departure board: every line written out, one row each, a
// hairline between them. On wide screens the dates are the board's left
// column, in display type with tabular figures; on phones they sit above
// the role. Work and education are all one list in the data, so they stay
// one board.
export default function Experience() {
  return (
    <ol role="list" className="mt-10 rounded-lg border border-line bg-panel">
      {experience.map((entry: Entry) => (
        <li key={`${entry.role}-${entry.organization}`} className="border-t border-line first:border-t-0">
          <article className="grid gap-x-8 gap-y-3 p-5 sm:grid-cols-[minmax(0,13rem)_minmax(0,1fr)] sm:p-8">
            <p className="flex items-start gap-3 font-display text-2xl font-semibold leading-tight text-text tabular-nums">
              <span aria-hidden="true" className="mt-[0.35em] h-[0.6em] w-1 shrink-0 rounded-sm bg-amber" />
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
            <div className="min-w-0">
              <h3 className="font-display text-2xl font-bold leading-tight text-text break-words">{entry.role}</h3>
              <p className="mt-1 text-base text-muted break-words">
                {entry.organization}
                {entry.location && <span> · {entry.location}</span>}
              </p>
              <ul role="list" className="mt-4 list-disc space-y-2 pl-5 text-base text-text marker:text-muted">
                {entry.highlights.map((highlight) => (
                  <li key={highlight} className="break-words">
                    {highlight}
                  </li>
                ))}
              </ul>
            </div>
          </article>
        </li>
      ))}
    </ol>
  );
}
