import type { ReactNode } from "react";
import CityLoader from "../components/city3d/CityLoader";
import "./city-pages.css";

// Every page of the 3D city (/city, /city/<section>): the root layout's top
// bar and résumé already wrap it. Here: the shell that mounts the canvas
// (CityShell.tsx) and the driver that tells the city's store Richmond
// Hill's sky and hour (weather/SkyDriver.tsx), both loaded once the page
// is up (CityLoader.tsx).
export default function CityLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <CityLoader />
    </>
  );
}
