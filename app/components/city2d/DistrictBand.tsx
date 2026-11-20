"use client";

import Image from "next/image";
import { useState } from "react";
import { platesNeeded, type Plate } from "../../lib/cityLook";
import type { DistrictId } from "../../sections/registry";
import { useCityBlend } from "./citySky";
import { plates } from "./plates";

// A station's band of painting: its district by day, by night, or one
// fading into the other, as Richmond Hill's clock has it (CityDriver.tsx
// sets the blend; city.css, "The band", does the fading, the twilight
// grade and the fade into the ground at the foot). Decorative: the
// station's header names the place in words.
//
// Before the driver has run (the server's HTML, the first paint) it is the
// dark gradient alone, which already holds the band's height; then only
// the plates in use are mounted. A plate that fails to load is dropped,
// leaving the gradient. Only the home band asks for its plate early; the
// others load as they come near the screen (next/image's lazy loading).
// Without scripts, the night plate.
export default function DistrictBand({ district, priority = false }: { district: DistrictId; priority?: boolean }) {
  const blend = useCityBlend();
  const [failed, setFailed] = useState<Plate[]>([]);
  const pair = plates[district];
  const shown = blend === null ? [] : platesNeeded(blend).filter((p) => !failed.includes(p));

  return (
    <div className="band" aria-hidden="true">
      {shown.map((plate) => (
        <div key={plate} className={`band-plate band-${plate}`}>
          <Image
            src={pair[plate]}
            alt=""
            fill
            // Under 768px the band is a 4:3 crop of a 21:9 plate: the plate
            // is drawn about 1.75 times the screen's width
            sizes="(max-width: 767px) 175vw, 100vw"
            placeholder="blur"
            loading={priority ? "eager" : undefined}
            fetchPriority={priority ? "high" : undefined}
            onError={() => setFailed((f) => (f.includes(plate) ? f : [...f, plate]))}
          />
        </div>
      ))}
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element -- no script, so no next/image */}
        <img src={pair.night.src} alt="" width={pair.night.width} height={pair.night.height} className="band-noscript" />
      </noscript>
    </div>
  );
}
