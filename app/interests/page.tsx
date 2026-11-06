import Cabinets from "../components/locations/Cabinets";
import Location from "../components/world/Location";
import { interests } from "../data/portfolio";
import { section, sectionMetadata } from "../sections/registry";

export const metadata = sectionMetadata("interests");

// The arcade: a cabinet for each interest
export default function InterestsPage() {
  return (
    <Location section={section("interests")}>
      <Cabinets interests={interests} />
    </Location>
  );
}
