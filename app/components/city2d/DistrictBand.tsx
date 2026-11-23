"use client";

import Image from "next/image";
import { useRef, useState, type CSSProperties } from "react";
import { platesNeeded, type Plate } from "../../lib/cityLook";
import type { DistrictId } from "../../sections/registry";
import { useCityBlend } from "./citySky";
import { paintedHomePlate } from "./homePlate";
import { BAND_SIZES, BELOW_SIZES, HOME_QUALITY, focal, plates } from "./plates";
import { useNear } from "./useNear";

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
// once and asks for its plate first; its plate is usually already painted
// as its background by the head script (lib/platePreload.ts), and its
// <img> reuses that very file. Each plate stays clear until it has
// loaded, then fades in over the gradient (no blurred placeholder to snap
// out of; no fade in still view). A plate that fails to load is dropped for
// good, leaving the gradient: the band is decoration, so it isn't retried.
// Without scripts, the night plate (lazy below the first band). On the
// journey (city-track.css) the band is its stop's stretch of the city,
// behind the stop's panel; the weather is drawn once over the whole stage
// (CityTrack.tsx), not per band. Today's six plates stand in for the
// continuous panorama: `plates` (plates.ts) is the one place they come from.

// Opened on a deep link (/#projects, …), which lands below the home band
function deepLinked(): boolean {
  if (typeof location === "undefined") return false;
  const hash = location.hash;
  return hash !== "" && hash !== "#" && hash !== "#home";
}

export default function DistrictBand({ district, priority = false }: { district: DistrictId; priority?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  // The home band loads at once, unless the page opened on a deep link
  // (/#projects, …), which lands below it: then it waits to come near like
  // the others (and the head script left it alone too: lib/platePreload.ts).
  // Read during hydration, but nothing it decides is drawn until the sky
  // is known, after hydration.
  const near = useNear(ref, priority && !deepLinked());
  const blend = useCityBlend();
  const [failed, setFailed] = useState<Plate[]>([]);
  const [loaded, setLoaded] = useState<Plate[]>([]);
  const pair = plates[district];
  const shown = blend === null || !near ? [] : platesNeeded(blend).filter((p) => !failed.includes(p));
  // The home plate the head script already fetched and painted as the
  // band's background (city.css: .band[data-home]): the same file, so it
  // comes from the cache. Read only once plates mount, after hydration.
  const painted = priority && shown.length ? paintedHomePlate() : null;

  return (
    <div ref={ref} className="band" data-home={priority ? "" : undefined} aria-hidden="true" style={{ "--focal": focal[district] } as CSSProperties}>
      {shown.map((plate) => (
        <div key={plate} className={`band-plate band-${plate}`} data-loaded={loaded.includes(plate) ? "" : undefined}>
          <Image
            {...(painted?.plate === plate ? { src: painted.src, unoptimized: true } : { src: pair[plate], sizes: priority ? BAND_SIZES : BELOW_SIZES, quality: priority ? HOME_QUALITY : undefined })}
            alt=""
            fill
            loading={priority ? "eager" : undefined}
            fetchPriority={priority ? "high" : "low"}
            onLoad={() => setLoaded((l) => (l.includes(plate) ? l : [...l, plate]))}
            onError={() => setFailed((f) => (f.includes(plate) ? f : [...f, plate]))}
          />
        </div>
      ))}
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
