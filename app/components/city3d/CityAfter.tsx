"use client";

import SkyDriver from "../weather/SkyDriver";
import CityShell from "./CityShell";
import CityPanel from "./panels/CityPanel";

// What every /city page loads once it is up, in one chunk (CityLoader.tsx):
// the 3D city's shell (CityShell.tsx: the WebGL2 probe, the tier, the
// canvas, itself loaded later still), the driver that tells the city
// Richmond Hill's sky and hour (weather/SkyDriver.tsx), and the panel's
// behaviour (panels/CityPanel.tsx: focus on a journey, the section's
// picker).
export default function CityAfter() {
  return (
    <>
      <CityShell />
      <SkyDriver />
      <CityPanel />
    </>
  );
}
