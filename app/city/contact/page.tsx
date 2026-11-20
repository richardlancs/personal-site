import CityPage from "../../components/city3d/CityPage";
import { cityMetadata } from "../../sections/metadata";

export const metadata = cityMetadata("contact");

export default function Page() {
  return <CityPage id="contact" />;
}
