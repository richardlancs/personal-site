import type { ReactNode } from "react";
import { stopNumber, type Section } from "../../sections/registry";
import DistrictBand from "./DistrictBand";

// One section of the page, as a stop on the line (city.css, "Stations"):
// its district's band of painting across the full width (DistrictBand,
// following Richmond Hill's clock), then a centred column with the stop's
// number and name, the section's heading, a line naming the place, and
// the section itself. The band carries no words.
//
// It can be focused (tabIndex -1), so the Sections menu moves focus to the
// section it jumps to. The home station has the hero instead of an h2
// (sections/Hero.tsx, with the page's h1, id `home-title`): pass it as
// `heading`. It comes first, so on wide screens it can rise over the foot
// of the band with nothing but the name's backing on the painting; the
// stop and the line follow it. Only the home band loads its plate early.
export default function Station({ section, heading, children }: { section: Section; heading?: ReactNode; children?: ReactNode }) {
  const id = section.hash || "home";
  const titleId = `${id}-title`;
  return (
    <section id={id} aria-labelledby={titleId} tabIndex={-1} className="station" data-district={section.district}>
      <DistrictBand district={section.district} priority={section.id === "home"} />
      <div className="station-body">
        {heading}
        <p className="station-stop">
          <span className="station-number">{stopNumber(section)}</span> {section.station}
        </p>
        {!heading && (
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
