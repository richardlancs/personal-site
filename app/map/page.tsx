import type { Metadata } from "next";
import Link from "next/link";
import { places } from "../data/world";

export const metadata: Metadata = {
  title: "Map of the park",
  description: "A map of the park and every place in it: about, projects, experience, interests and contact.",
};

// Where each place is drawn on the map (percent of the sheet), seen from
// above: the same layout as the painting, folded flat
const pins: Record<string, { x: number; y: number }> = {
  pavilion: { x: 16, y: 55.5 },
  workshop: { x: 66.7, y: 23.5 },
  station: { x: 52, y: 13 },
  arcade: { x: 81, y: 27 },
  booth: { x: 85, y: 60.5 },
};

// The map pinned to the notice board. The camera has moved up close to the
// board (World.tsx); the map is drawn in ink on a sheet over it. Every
// place on it is a link.
export default function MapPage() {
  return (
    <main className="over-world location" data-side="middle">
      <div className="map-sheet arrive take-clicks">
        <div className="map-head">
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight">Map of the park</h1>
            <p className="mt-1 text-sm text-muted">Pinned to the notice board. Choose where to go.</p>
          </div>
          <Link href="/" className="text-link text-sm font-medium">
            Back to the park
          </Link>
        </div>

        <div className="map-drawing">
          <svg viewBox="0 0 600 360" preserveAspectRatio="none" aria-hidden="true" className="map-ink">
            {/* Paths, from the steps up to the fountain and out to every place */}
            <g className="map-path">
              <path d="M300 352 C300 320 302 290 300 262" />
              <path d="M300 236 C318 190 360 135 400 92" />
              <path d="M300 236 C306 190 310 120 312 47" />
              <path d="M320 240 C380 220 430 160 470 100" />
              <path d="M326 250 C390 250 450 236 500 215" />
              <path d="M274 250 C220 252 160 220 112 195" />
            </g>
            {/* The fountain */}
            <ellipse cx="300" cy="249" rx="34" ry="14" className="map-feature" />
            <ellipse cx="300" cy="249" rx="5" ry="3" className="map-feature" />
            {/* Fence and trees */}
            <path d="M60 175 C140 165 200 168 250 172 M360 172 C420 168 500 160 560 168" className="map-fence" />
            <path
              d="M24 128 q11 -15 22 0 q11 -15 22 0 q11 -15 22 0 M380 120 q10 -14 20 0 q10 -14 20 0 M30 300 q10 -14 20 0 q10 -14 20 0 M410 320 q10 -14 20 0 q10 -14 20 0 M530 300 q10 -14 20 0 q10 -14 20 0"
              className="map-trees"
            />
            {/* The places, drawn small */}
            <g className="map-building">
              {/* Pavilion: a tiled roof on posts */}
              <path d="M78 196 q18 -14 36 0 M84 196 v12 M108 196 v12 M84 208 h24" />
              {/* Workshop: a sawtooth roof */}
              <path d="M384 90 v-12 l8 8 v-8 l8 8 v-8 l8 8 v-8 l8 8 v12 Z" />
              {/* Station: the clock tower */}
              <path d="M305 60 v-22 l7 -9 l7 9 v22 Z" />
              <circle cx="312" cy="43" r="3.2" />
              {/* Greenhouse: a glass dome */}
              <path d="M470 106 a16 15 0 0 1 32 0 Z M478 106 a8 13 0 0 1 16 0 M486 91 v15" />
              {/* Phone booth */}
              <path d="M504 228 v-20 h12 v20 Z M502 208 l8 -5 l8 5 M507 214 h6" />
            </g>
            {/* The steps */}
            <path d="M282 340 h36 M286 347 h28 M290 354 h20" className="map-feature" />
            {/* You are here: the notice board */}
            <circle cx="348" cy="190" r="5" className="map-here" />
          </svg>
          <span className="map-here-label" style={{ left: "58%", top: "52.8%" }}>
            You are here
          </span>
          <span className="map-small-label" style={{ left: "50%", top: "77%" }}>
            fountain
          </span>
          <span className="map-small-label" style={{ left: "50%", top: "99%" }}>
            steps
          </span>

          <ul>
            {places.map((place) => (
              <li key={place.id}>
                <Link
                  href={place.href}
                  className="map-pin"
                  style={{ left: `${pins[place.id].x}%`, top: `${pins[place.id].y}%` }}
                >
                  <span className="map-pin-label">
                    <span className="map-pin-section">{place.section}</span>
                    <span className="map-pin-place">{place.name}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* The same places as a list, with what's there */}
        <ul className="map-key">
          {places.map((place) => (
            <li key={place.id}>
              <Link href={place.href} className="group">
                <span className="font-display font-semibold group-hover:text-accent">{place.section}</span>
                <span className="text-muted">{place.summary}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
