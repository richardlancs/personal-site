import Image from "next/image";
import Link from "next/link";
import park from "../../assets/park/park-v04.png";
import { profile } from "../../data/portfolio";
import { noticeBoard, PAINTING, places, type Box } from "../../data/world";
import ParkStage from "./ParkStage";

// A box on the painting as CSS percentages of the painting
const boxStyle = ([left, top, right, bottom]: Box) =>
  ({
    "--l": `${(left / PAINTING.width) * 100}%`,
    "--t": `${(top / PAINTING.height) * 100}%`,
    "--w": `${((right - left) / PAINTING.width) * 100}%`,
    "--h": `${((bottom - top) / PAINTING.height) * 100}%`,
  }) as React.CSSProperties;

// Name tags sit above their object, except where that would run into the
// navbar (the clock tower) or the introduction (pavilion, workshop)
const labelBelow = new Set(["station", "pavilion", "workshop"]);
// On phones the painting is cropped around the notice board; these places
// fall outside it and are reached from the list below instead
const hiddenInPortrait = new Set(["pavilion", "workshop"]);

// The home page: the park, with a painted object for every part of the
// site. The notice board in the middle opens a map of all of them.
export default function Park() {
  return (
    <ParkStage>
      <div className="park-intro">
        <h1 className="park-name font-display font-semibold tracking-tight">{profile.name}</h1>
        <p className="mt-2 text-[17px] font-medium">{profile.headline}</p>
        <p className="mt-3 text-[15px] leading-relaxed text-muted">{profile.intro}</p>
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-medium">
          <button
            type="button"
            data-open-map
            className="hover-grow rounded-full bg-foreground px-4 py-2 text-background"
          >
            Open the map
          </button>
          <button type="button" data-show-places aria-pressed="false" className="text-link max-md:hidden">
            Show places
          </button>
        </div>
      </div>

      <div className="park-view">
        <div className="park-stage">
          <Image
            src={park}
            alt=""
            fill
            preload
            placeholder="blur"
            quality={85}
            sizes="(min-aspect-ratio: 3/2) 100vw, 150vh"
            className="object-cover"
          />

          {places.map((place) => (
            <a
              key={place.id}
              href={place.href}
              data-place
              data-label={labelBelow.has(place.id) ? "below" : undefined}
              data-portrait={hiddenInPortrait.has(place.id) ? "hidden" : undefined}
              className="spot"
              style={boxStyle(place.box)}
            >
              <span className="spot-light" aria-hidden="true" />
              <span className="spot-label">
                <span className="spot-place">{place.name}</span>
                <span className="spot-section">{place.section}</span>
              </span>
            </a>
          ))}

          <button type="button" data-open-map className="spot" style={boxStyle(noticeBoard)}>
            <span className="spot-light" aria-hidden="true" />
            <span className="spot-label">
              <span className="spot-place">The notice board</span>
              <span className="spot-section">Map of the park</span>
            </span>
          </button>
        </div>
      </div>

      {/* Phones: every place as a plain list under the painting */}
      <nav aria-label="Places in the park" className="park-places mx-auto max-w-[40rem] px-5 pb-12 pt-4">
        <PlaceList />
      </nav>

      <dialog id="park-map" aria-labelledby="park-map-title" className="map-dialog">
        <div className="paper p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id="park-map-title" className="font-display text-2xl font-semibold">
                Map of the park
              </h2>
              <p className="mt-1 text-sm text-muted">Pinned to the notice board. Choose where to go.</p>
            </div>
            <form method="dialog">
              <button type="submit" className="text-link text-sm font-medium">
                Close
              </button>
            </form>
          </div>
          <div className="mt-5">
            <PlaceList />
          </div>
        </div>
      </dialog>
    </ParkStage>
  );
}

function PlaceList() {
  return (
    <ul className="divide-y divide-border border-y border-border">
      {places.map((place) => (
        <li key={place.id}>
          <Link
            href={place.href}
            className="group grid gap-0.5 py-3.5 sm:grid-cols-[11rem_1fr] sm:gap-6"
          >
            <span className="font-display text-lg font-semibold group-hover:text-accent">
              {place.section}
            </span>
            <span className="text-[15px] text-muted">
              {place.name}: {place.summary}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
