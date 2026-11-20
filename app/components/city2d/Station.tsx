import type { CSSProperties, ReactNode } from "react";
import { sectionNumber, type Section } from "../../sections/registry";
import DistrictBand from "./DistrictBand";

// One section of the page (city.css, "Stations"): its district's band of
// painting across the full width (DistrictBand, following Richmond Hill's
// clock), then a centred column with the section's number ("02", beside
// its heading on the same baseline, outside it and hidden from assistive
// technology, so the heading is named by its title alone), and the
// section itself. The band carries no words,
// and the place it paints isn't named: sections are named as sections.
//
// It can be focused (tabIndex -1), so the Sections menu moves focus to the
// section it jumps to. The home section has the hero instead of an h2
// (sections/Hero.tsx, with the page's h1, id `home-title`): pass it as
// `heading`; nothing comes between the band and the hero. Only the home
// band loads its plate early.
//
// The number and the heading arrive first as the section scrolls in, then
// the section's own items (reveal.css, "Arrival"): each `.reveal` carries
// its place in its group from order(), capped at the sixth step.
export const order = (i: number) => ({ "--i": Math.min(i, 5) }) as CSSProperties;

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
          <div className="station-head">
            {section.listed && (
              <span className="station-number reveal" aria-hidden="true" style={order(0)}>
                {sectionNumber(section)}{" "}
              </span>
            )}
            <h2 id={titleId} className="station-title reveal" style={order(1)}>
              {section.title}
            </h2>
          </div>
          {children}
        </div>
      )}
    </section>
  );
}
