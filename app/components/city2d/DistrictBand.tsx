"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { platesNeeded, type Plate } from "../../lib/cityLook";
import { pageSections } from "../../sections/registry";
import { useCityBlend } from "./citySky";
import { HOME_QUALITY, paintedHomePlate, tileSizes } from "./homePlate";
import { HEIGHT } from "./panorama";
import type { BandTile } from "./panoramaImages";
import { useNear } from "./useNear";

// The city's painting: the panorama's tiles (panorama.ts), each by day, by
// night, or one fading into the other, as Richmond Hill's clock has it
// (CityDriver.tsx sets the blend; city.css, "The band", does the fading,
// the twilight grade and the fade into the ground at the foot).
// Decorative: the stations' headings name them in words.
//
// Two of them: on the journey (city-track.css) the whole panorama, one
// row of tiles behind every stop, which CityTrack.tsx moves along with the
// street (each stop's start shows its own stretch of the city); read top to
// bottom (no scripts, a tiny screen, print) each station's band shows its
// own tile (`stop`). Only the one that shows loads anything. The tiles come
// as props from server components (panoramaImages.ts: bandTiles), so the
// pictures' imports stay out of the page's JS.
//
// Before the driver has run (the server's HTML, the first paint) a tile is
// the dark gradient alone. Then only the plates in use are mounted, and
// only once the tile is near the screen (useNear.ts); the first tile of the
// band that shows mounts at once and asks for its plate first, usually
// already painted as its background by the head script
// (lib/platePreload.ts), and its <img> reuses that very file. Each plate
// stays clear until it has loaded, then fades in over the gradient. A
// plate that fails to load is dropped for good, leaving the gradient.
// A long jump (CityTrack: "trackjump") mounts its stop's tile at once, its
// plates asked for first. Without scripts, the night plate.

// Opened on a deep link (/#projects, …), which lands past the home stop
function deepLinked(): boolean {
  if (typeof location === "undefined") return false;
  const hash = location.hash;
  return hash !== "" && hash !== "#" && hash !== "#home";
}

// Whether this band is the one that shows: the journey's, or a station's
function showing(whole: boolean): boolean {
  return typeof document !== "undefined" && (document.documentElement.dataset.track === "on") === whole;
}

function Tile({ tile, i, whole }: { tile: BandTile; i: number; whole: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const home = i === 0 && whole;
  // The first tile of whichever band shows (the journey's, or Home's
  // station's read top to bottom) skips the wait. Read during hydration,
  // but nothing it decides is drawn until the sky is known
  const seen = useNear(ref, i === 0 && showing(whole) && !deepLinked());
  // A long jump to this tile's stop (CityTrack's "trackjump", sent before
  // it starts) asks for its plates at once, ahead of the rest
  const target = useJumpTarget(whole ? pageSections[i]?.id : undefined);
  const near = seen || target;
  const blend = useCityBlend();
  const [failed, setFailed] = useState<Plate[]>([]);
  const [loaded, setLoaded] = useState<Plate[]>([]);
  const shown = blend === null || !near ? [] : platesNeeded(blend).filter((p) => !failed.includes(p));
  // The plate the head script already fetched and painted as this tile's
  // background (city.css: [data-home]): the same file, from the cache
  const painted = home && shown.length ? paintedHomePlate() : null;
  const props = (plate: Plate) =>
    painted?.plate === plate ? { src: painted.src, unoptimized: true } : { src: tile[plate], sizes: whole ? tileSizes(tile.w) : "100vw", quality: home ? HOME_QUALITY[plate] : undefined };
  // Twilight on the journey: the night plate's windows come on ahead of
  // the dark (a copy of it, the same file, lightening only what it lights:
  // city-track.css, "Lights"), once the night plate itself has loaded
  const lights = whole && shown.length > 1 && loaded.includes("night");

  return (
    <div ref={ref} className="band-tile" data-home={home ? "" : undefined} style={whole ? ({ aspectRatio: `${tile.w} / ${HEIGHT}` } as CSSProperties) : undefined}>
      {shown.map((plate) => (
        <div key={plate} className={`band-plate band-${plate}`} data-loaded={loaded.includes(plate) ? "" : undefined}>
          <Image
            {...props(plate)}
            alt=""
            fill
            // (mounted only once near: useNear is the lazy loading; the browser's own would wait for the stage's clip)
            loading="eager"
            fetchPriority={home || target ? "high" : "low"}
            onLoad={() => setLoaded((l) => (l.includes(plate) ? l : [...l, plate]))}
            onError={() => setFailed((f) => (f.includes(plate) ? f : [...f, plate]))}
          />
        </div>
      ))}
      {lights && (
        <div className="band-plate band-lights" data-loaded="">
          <Image {...props("night")} alt="" fill loading="eager" fetchPriority="low" />
        </div>
      )}
      {!whole && (
        <noscript>
          {/* eslint-disable-next-line @next/next/no-img-element -- no script, so no next/image */}
          <img src={tile.night.src} alt="" width={tile.night.width} height={tile.night.height} loading={i ? "lazy" : undefined} decoding="async" className="band-noscript" />
        </noscript>
      )}
    </div>
  );
}

// Whether a long jump along the journey is headed for this stop (`id`):
// false until CityTrack sends "trackjump" with it, true for good after
function useJumpTarget(id: string | undefined): boolean {
  const [target, setTarget] = useState(false);
  useEffect(() => {
    if (!id || target) return;
    const onJump = (e: Event) => {
      if ((e as CustomEvent<{ to?: string }>).detail?.to === id) setTarget(true);
    };
    addEventListener("trackjump", onJump);
    return () => removeEventListener("trackjump", onJump);
  }, [id, target]);
  return target;
}

/** A station's band (`stop`: its index, `tiles`: its own tile), or without one the journey's whole panorama (`tiles`: all of them) */
export default function DistrictBand({ tiles, stop }: { tiles: BandTile[]; stop?: number }) {
  const whole = stop === undefined;
  return (
    <div className={whole ? "band pano" : "band"} aria-hidden="true">
      {whole ? tiles.map((tile, i) => <Tile key={i} tile={tile} i={i} whole />) : <Tile tile={tiles[0]} i={stop} whole={false} />}
    </div>
  );
}
