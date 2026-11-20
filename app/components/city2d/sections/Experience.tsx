import { experience, type Experience as Entry } from "../../../data/portfolio";

const months: Record<string, string> = {
  jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
  jul: "07", aug: "08", sep: "09", sept: "09", oct: "10", nov: "11", dec: "12",
};

// A date as written in the data ("Oct. 2026", "May 2025", "2024") as a
// machine value for <time dateTime> ("2026-10", "2025-05", "2024"), or
// undefined for anything else ("Present", a season, free text), which is
// then shown without one rather than guessed at.
export function machineDate(value: string): string | undefined {
  const text = value.trim();
  if (/^\d{4}$/.test(text)) return text;
  const match = /^([A-Za-z]+)\.?\s+(\d{4})$/.exec(text);
  if (!match) return undefined;
  const name = match[1].toLowerCase();
  // An abbreviation ("Oct", "Sept") or the month's full name, nothing looser
  const full = fullNames.indexOf(name);
  const month = full >= 0 ? String(full + 1).padStart(2, "0") : months[name];
  return month ? `${match[2]}-${month}` : undefined;
}

const fullNames = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

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
