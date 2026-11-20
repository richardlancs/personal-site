import CityPage from "../../components/city3d/CityPage";
import { cityMetadata } from "../../sections/registry";

export const metadata = cityMetadata("about");

export default function Page() {
  return <CityPage id="about" />;
}
