import CityPage from "../components/city3d/CityPage";
import { cityMetadata } from "../sections/registry";

export const metadata = cityMetadata("home");

// The riverside: home, from which every other section can be seen
export default function Page() {
  return <CityPage id="home" />;
}
