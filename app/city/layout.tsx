import type { ReactNode } from "react";
import CityShell from "../components/city3d/CityShell";
import SkyDriver from "../components/weather/SkyDriver";
import "./city-pages.css";

// Every page of the 3D city (/city, /city/<section>): the root layout's top
// bar, sky driver and résumé already wrap it. Here: the shell that will
// mount the canvas (CityShell.tsx) and the driver that tells the city's
// store Richmond Hill's sky.
export default function CityLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <CityShell />
      <SkyDriver />
    </>
  );
}
