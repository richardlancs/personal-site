import type { ReactNode } from "react";
import { stopNumber, type Section } from "../../sections/registry";

// One section of the page, as a stop on the line (city.css, "Stations"):
// its district's band of art across the full width (a dark placeholder
// until the plates are wired in), then a centred column with the stop's
// number and name, the section's heading, a line naming the place, and
// the section itself. The band carries no words.
//
// It can be focused (tabIndex -1), so the Sections menu moves focus to the
// section it jumps to. The home station has the page's h1 instead of an
// h2: pass it as `heading`, with the id `home-title`.
export default function Station({ section, heading, children }: { section: Section; heading?: ReactNode; children?: ReactNode }) {
  const id = section.hash || "home";
  const titleId = `${id}-title`;
  return (
    <section id={id} aria-labelledby={titleId} tabIndex={-1} className="station" data-district={section.district}>
      <div className="band" aria-hidden="true" />
      <div className="station-body">
        <p className="station-stop">
          <span className="station-number">{stopNumber(section)}</span> {section.station}
        </p>
        {heading ?? (
          <h2 id={titleId} className="station-title">
            {section.title}
          </h2>
        )}
        <p className="station-line">{section.districtLine}</p>
        {children}
      </div>
    </section>
  );
}
