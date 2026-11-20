import CityPage from "../../components/city3d/CityPage";
import { cityMetadata } from "../../sections/registry";

export const metadata = cityMetadata("projects");

export default function Page() {
  return <CityPage id="projects" />;
}
