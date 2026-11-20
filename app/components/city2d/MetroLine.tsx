"use client";

import { useState, type MouseEvent } from "react";
import { stations, stopNumber } from "../../sections/registry";
import { focusAnchor, isPlainClick } from "./jump";
import { useStation } from "./useStation";

// Where you are on the line (city.css, "The metro line"): a small,
// quiet strip fixed at the bottom right, the six stops drawn as rings on a
// vertical line, named as the stations are (Lujiazui, Longtang, …). The
// stop you're at (useStation.ts) is a filled ring with a bolder name and
// aria-current="location", so not by colour alone. Each stop is a 44px
// link down the page.
//
// It never covers the page: where the screen's right margin is wide
// enough it sits in it, open; where it isn't, it folds to a pill ("03 / 06
// Century Avenue") that opens the line above it when pressed, hovered or
// focused. Under 480px wide it isn't shown: the list of stations in the
// hero (StationIndex.tsx) and the Sections menu serve there.
export default function MetroLine() {
  const here = useStation();
  const [open, setOpen] = useState(false);
  const at = stations.find((s) => s.id === here) ?? stations[0];

  const go = (href: string) => (e: MouseEvent) => {
    if (!isPlainClick(e)) return;
    setOpen(false);
    focusAnchor(href);
  };

  return (
    <nav
      aria-label="Where you are"
      className="metro-line"
      data-open={open || undefined}
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) {
          setOpen(false);
          e.currentTarget.querySelector<HTMLElement>(".metro-pill")?.focus();
        }
      }}
    >
      <button type="button" className="glass metro-pill" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span className="sr-only">Stations: you are at </span>
        <span className="metro-pill-number">
          {stopNumber(at)}
          <span aria-hidden="true"> / </span>
          <span className="sr-only"> of </span>
          {stopNumber(stations[stations.length - 1])}
        </span>{" "}
        {at.station}
      </button>
      <ol className="metro-stops">
        {stations.map((s) => (
          <li key={s.id}>
            <a href={s.href} onClick={go(s.href)} className="metro-stop" aria-current={s.id === here ? "location" : undefined}>
              <span className="metro-ring" aria-hidden="true" />
              <span className="metro-name">
                {s.station}
                <span className="sr-only">, {s.title}</span>
              </span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
