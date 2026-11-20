"use client";

import Image from "next/image";
import { useRef, useState, type CSSProperties } from "react";
import { platesNeeded, type Plate } from "../../lib/cityLook";
import type { DistrictId } from "../../sections/registry";
import { useCityBlend } from "./citySky";
import { BAND_SIZES, focal, plates } from "./plates";
import { useNear } from "./useNear";
import WeatherOverlay from "./WeatherOverlay";

// A station's band of painting: its district by day, by night, or one
// fading into the other, as Richmond Hill's clock has it (CityDriver.tsx
// sets the blend; city.css, "The band", does the fading, the twilight
// grade and the fade into the ground at the foot). Decorative: the
// station's header names the place in words.
//
// Before the driver has run (the server's HTML, the first paint) it is the
// dark gradient alone, which already holds the band's height. Then only
// the plates in use are mounted, and only once the band is near the screen
// (useNear.ts: within half a screen); the home band (`priority`) mounts at
// once and asks for its plate first. Each plate stays clear until it has
// loaded, then fades in over the gradient (no blurred placeholder to snap
// out of; no fade in still view). A plate that fails to load is dropped for
// good, leaving the gradient: the band is decoration, so it isn't retried.
// Over the plates, the weather (WeatherOverlay.tsx). Without scripts, the
// night plate (lazy below the first band).
export default function DistrictBand({ district, priority = false }: { district: DistrictId; priority?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const near = useNear(ref, priority);
  const blend = useCityBlend();
  const [failed, setFailed] = useState<Plate[]>([]);
  const [loaded, setLoaded] = useState<Plate[]>([]);
  const pair = plates[district];
  const shown = blend === null || !near ? [] : platesNeeded(blend).filter((p) => !failed.includes(p));

  return (
    <div ref={ref} className="band" aria-hidden="true" style={{ "--focal": focal[district] } as CSSProperties}>
      {shown.map((plate) => (
        <div key={plate} className={`band-plate band-${plate}`} data-loaded={loaded.includes(plate) ? "" : undefined}>
          <Image
            src={pair[plate]}
            alt=""
            fill
            sizes={BAND_SIZES}
            loading={priority ? "eager" : undefined}
            fetchPriority={priority ? "high" : "low"}
            onLoad={() => setLoaded((l) => (l.includes(plate) ? l : [...l, plate]))}
            onError={() => setFailed((f) => (f.includes(plate) ? f : [...f, plate]))}
          />
        </div>
      ))}
      {/* Haze, rain or snow over the plates (WeatherOverlay.tsx) */}
      <WeatherOverlay />
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element -- no script, so no next/image */}
        <img
          src={pair.night.src}
          alt=""
          width={pair.night.width}
          height={pair.night.height}
          loading={priority ? undefined : "lazy"}
          decoding="async"
          className="band-noscript"
        />
      </noscript>
    </div>
  );
}
