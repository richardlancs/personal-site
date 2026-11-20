"use client";

import type { MouseEvent } from "react";
import { stations } from "../../sections/registry";
import { focusAnchor, isPlainClick } from "./jump";
import { useStation } from "./useStation";

// Where you are on the line (city.css, "The metro line"): a small, quiet
// strip fixed at the bottom right, the six stops drawn as rings on a
// vertical line, named as the stations are (Lujiazui, Longtang, …). The
// stop you're at (useStation.ts) is a filled ring with a bolder name and
// aria-current="location", so not by colour alone. Each stop is a 44px
// link down the page.
//
// It is shown only where the screen's right margin holds it whole (from
// 97rem), always open: nothing to expand or collapse, so it can never sit
// open over the page. On its own near-solid ground, so its names never sit
// on a painting. Narrower screens get the stop as a line in the top bar
// (StationHere.tsx), and phones the hero's list of stations and the
// Sections menu.
export default function MetroLine() {
  const here = useStation();

  const go = (href: string) => (e: MouseEvent) => {
    if (!isPlainClick(e)) return;
    focusAnchor(href);
  };

  return (
    <nav aria-label="Where you are" className="metro-line">
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
