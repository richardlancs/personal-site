import type { Metadata } from "next";
import Cabinets from "../components/locations/Cabinets";
import Location from "../components/world/Location";
import { interests } from "../data/portfolio";
import { placeById } from "../data/world";

export const metadata: Metadata = {
  title: "Interests",
  description: "What Richard Lan does away from the keyboard.",
};

// The arcade: a cabinet for each interest
export default function InterestsPage() {
  return (
    <Location place={placeById("arcade")} side="left" intro="The power came back on in a few of the cabinets. Choose one to play.">
      <Cabinets interests={interests} />
    </Location>
  );
}
