import type { Metadata } from "next";
import PlantingBeds from "../components/locations/PlantingBeds";
import Location from "../components/world/Location";
import { interests } from "../data/portfolio";
import { placeById } from "../data/world";

export const metadata: Metadata = {
  title: "Interests",
  description: "What Richard Lan does away from the keyboard.",
};

// The greenhouse: markers in the planting beds, one for each interest
export default function InterestsPage() {
  return (
    <Location place={placeById("greenhouse")} side="left" intro="Someone kept the beds going under the broken glass. Pull up a marker.">
      <PlantingBeds interests={interests} />
    </Location>
  );
}
