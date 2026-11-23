import type { CSSProperties, ReactNode } from "react";
import { sectionNumber, type Section } from "../../sections/registry";
import DistrictBand from "./DistrictBand";

// One section of the page, one stop of the journey (city.css, "Stations";
// city-track.css): its district's band of painting, then its words. The
// band carries no words, and the place it paints isn't named: sections are
// named as sections.
//
// The words sit in panels (`.panel`): on the journey, dark glass on the
// street, each scrolling inside once the journey has stopped with all of
// it on the screen (CityTrack.tsx). A stop of one panel (Home, About,
// Interests, Contact) gets it from here, its number and heading at its
// top; a stop of several in a row along the street (`row`: Projects,
// Experience) gets the row, and its section puts the heading
// (StationHead) in the first of its own panels. Stacked (no scripts),
// panels are plain blocks one under the other.
//
// It can be focused (tabIndex -1), so the Sections menu moves focus to the
// section it jumps to. The home section has the hero instead of an h2
// (sections/Hero.tsx, with the page's h1, id `home-title`): pass it as
// `heading`. Only the home band loads its plate early.
//
// Each `.reveal` arrives once as it comes on (reveal.css, "Arrival"),
// carrying its place in its group from order(), capped at the sixth step.
export const order = (i: number) => ({ "--i": Math.min(i, 5) }) as CSSProperties;

// The section's number ("02") beside its heading on one baseline: outside
// the heading and hidden from assistive technology, so the heading is named
// by its title alone
export function StationHead({ section }: { section: Section }) {
  return (
    <div className="station-head">
      {section.listed && (
        <span className="station-number" aria-hidden="true">
          {sectionNumber(section)}{" "}
        </span>
      )}
      <h2 id={`${section.hash || "home"}-title`} className="station-title">
        {section.title}
      </h2>
    </div>
  );
}

export default function Station({ section, heading, row, children }: { section: Section; heading?: ReactNode; row?: boolean; children?: ReactNode }) {
  const id = section.hash || "home";
  return (
    <section id={id} aria-labelledby={`${id}-title`} tabIndex={-1} className="station" data-district={section.district}>
      <DistrictBand district={section.district} priority={section.id === "home"} />
      {row ? (
        <div className="station-row">{children}</div>
      ) : (
        <div className="station-body panel">
          {heading ?? <StationHead section={section} />}
          {children}
        </div>
      )}
    </section>
  );
}
