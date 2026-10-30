"use client";

import type { Experience } from "../../data/portfolio";
import { useWorld, world } from "../world3d/store";

const when = (stop: Experience) => (stop.endDate ? `${stop.startDate} – ${stop.endDate}` : stop.startDate);

// The station timetable. The board on the platform wall
// (world3d/scenes/Station.tsx) shows the same lines; choosing one here or
// there turns its flap over, and the notice for it turns over below,
// line by line.
export default function Timetable({ stops }: { stops: Experience[] }) {
  const selected = useWorld((s) => s.sel.line);
  const stop = stops[selected];

  function choose(index: number) {
    world.select("line", index);
    world.set({ focus: "timetable" });
  }

  return (
    <div className="take-clicks">
      <div className="timetable">
        <div className="timetable-head" aria-hidden="true">
          <span>时刻表</span>
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
                  <button type="button" className="timetable-line" aria-pressed={index === selected} aria-controls="timetable-notice" onClick={() => choose(index)}>
                    {item.role}
                  </button>
                </td>
                <td>{item.organization}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
