import type { Metadata } from "next";
import Timetable from "../components/locations/Timetable";
import Location from "../components/world/Location";
import { experience } from "../data/portfolio";
import { placeById } from "../data/world";

export const metadata: Metadata = {
  title: "Experience",
  description: "Richard Lan's experience and education.",
};

// The station under the clock tower: the timetable, newest first as
// listed in app/data/portfolio.ts
export default function ExperiencePage() {
  return (
    <Location place={placeById("station")} side="right" intro="Work and education, on the old timetable. The clock above it stopped long ago.">
      <Timetable stops={experience} />
    </Location>
  );
}
