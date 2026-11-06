import Timetable from "../components/locations/Timetable";
import Location from "../components/world/Location";
import { experience } from "../data/portfolio";
import { section, sectionMetadata } from "../sections/registry";

export const metadata = sectionMetadata("experience");

// The station under the clock tower: the timetable, newest first as
// listed in app/data/portfolio.ts
export default function ExperiencePage() {
  return (
    <Location section={section("experience")}>
      <Timetable stops={experience} />
    </Location>
  );
}
