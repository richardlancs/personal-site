"use client";

import { useState } from "react";
import type { Experience } from "../../data/portfolio";

const when = (stop: Experience) => (stop.endDate ? `${stop.startDate} – ${stop.endDate}` : stop.startDate);

// The station timetable: an enamel board with one line per stop, and the
// notice for the chosen line below it. Choosing a line turns the notice
// over line by line, like the flaps of an old departures board.
export default function Timetable({ stops }: { stops: Experience[] }) {
  const [selected, setSelected] = useState(0);
  const stop = stops[selected];

  return (
    <div className="take-clicks">
      <div className="timetable">
        <div className="timetable-head" aria-hidden="true">
          <span>時刻表</span>
          <span>Timetable</span>
        </div>
        <table className="timetable-table">
          <caption className="sr-only">Work and education. Choose a line to read about it.</caption>
          <thead>
            <tr>
              <th scope="col">When</th>
              <th scope="col">Service</th>
              <th scope="col">To</th>
            </tr>
          </thead>
          <tbody>
            {stops.map((item, index) => (
              <tr key={`${item.role}-${item.organization}`} data-selected={index === selected || undefined}>
                <td className="tabular-nums">{when(item)}</td>
                <td>
                  <button
                    type="button"
                    className="timetable-line"
                    aria-pressed={index === selected}
                    aria-controls="timetable-notice"
                    onClick={() => setSelected(index)}
                  >
                    {item.role}
                  </button>
                </td>
                <td>{item.organization}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* The notice for the chosen line */}
      <section id="timetable-notice" key={selected} aria-live="polite" className="timetable-notice">
        <p className="flap tabular-nums text-sm font-semibold text-warm" style={{ "--i": 0 } as React.CSSProperties}>
          {when(stop)}
          {stop.location && `, ${stop.location}`}
        </p>
        <h2 className="flap mt-1 font-display text-2xl font-semibold tracking-tight" style={{ "--i": 1 } as React.CSSProperties}>
          {stop.role}
        </h2>
        <p className="flap text-muted" style={{ "--i": 2 } as React.CSSProperties}>
          {stop.organization}
        </p>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-[15px] leading-6 text-muted marker:text-warm">
          {stop.highlights.map((highlight, i) => (
            <li key={highlight} className="flap" style={{ "--i": i + 3 } as React.CSSProperties}>
              {highlight}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
