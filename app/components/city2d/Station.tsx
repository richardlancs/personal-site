import type { ReactNode } from "react";
import { sectionNumber, type Section } from "../../sections/registry";
import DistrictBand from "./DistrictBand";

// One section of the page (city.css, "Stations"): its district's band of
// painting across the full width (DistrictBand, following Richmond Hill's
// clock), then a centred column with the section's small number ("02")
// beside its heading, and the section itself. The band carries no words,
// and the place it paints isn't named: sections are named as sections.
//
// It can be focused (tabIndex -1), so the Sections menu moves focus to the
// section it jumps to. The home section has the hero instead of an h2
// (sections/Hero.tsx, with the page's h1, id `home-title`): pass it as
// `heading`; nothing comes between the band and the hero. Only the home
// band loads its plate early.
export default function Station({ section, heading, children }: { section: Section; heading?: ReactNode; children?: ReactNode }) {
  const id = section.hash || "home";
  const titleId = `${id}-title`;
  return (
    <section id={id} aria-labelledby={titleId} tabIndex={-1} className="station" data-district={section.district}>
      <DistrictBand district={section.district} priority={section.id === "home"} />
      {heading ? (
        <div className="station-body station-body-home">
          {heading}
          {children}
        </div>
      ) : (
        <div className="station-body">
          <h2 id={titleId} className="station-title">
            <span className="station-number" aria-hidden="true">
              {sectionNumber(section)}
            </span>
            {section.title}
          </h2>
          {children}
        </div>
      )}
    </section>
  );
}
