"use client";

import { stations, stopNumber } from "../../sections/registry";
import { useStation } from "./useStation";

// The stop you're at, as a quiet line in the top bar ("03 / 06 · Century
// Avenue"), on screens whose margin can't hold the metro line and whose
// bar has room for it (from 53rem to 97rem; city.css, "The top bar").
// Not a control. Hidden from assistive technology: the Sections menu
// already marks the same stop with aria-current="location", and a line
// that changes as the page scrolls would only be noise read out.
export default function StationHere() {
  const here = useStation();
  const at = stations.find((s) => s.id === here) ?? stations[0];
  return (
    <p className="top-bar-here" aria-hidden="true">
      <span className="top-bar-here-number">
        {stopNumber(at)} / {stopNumber(stations[stations.length - 1])}
      </span>
      <span className="top-bar-here-name"> · {at.station}</span>
    </p>
  );
}
