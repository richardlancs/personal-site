"use client";

import Image from "next/image";
import { useState, useSyncExternalStore, type CSSProperties } from "react";

// One interest's photos as polaroids on its scrapbook page (scrapbook.css).
// Without scripts, and before hydration, they lie one under another, every
// one readable. With scripts they become a stack: the
// current photo on top, the next two peeking out behind it, turned a
// little, and the "Previous photo" and "Next photo" keys under it flip
// through them (wrapping), with "Photo 2 of 3" said politely. Only the top
// photo is reachable; the rest are inert while they are underneath.
// Plain props from the server component (Interests.tsx), never the data file.

export type ScrapbookPhoto = {
  src: string;
  alt: string;
  caption?: string;
  file: string;
};

// (true once hydrated on the client, false on the server and in the HTML)
const noop = () => () => {};
const useHydrated = () => useSyncExternalStore(noop, () => true, () => false);

// Each photo's own turn on top, so the stack looks laid by hand
const tilts = ["-2.5deg", "2deg", "-1deg", "3deg", "-3.5deg"];

const arrow = (d: string) => (
  <svg
    aria-hidden="true"
    focusable="false"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="size-5"
  >
    <path d={d} />
  </svg>
);

export default function Scrapbook({ photos }: { photos: ScrapbookPhoto[] }) {
  const stack = useHydrated();
  const [at, setAt] = useState(0);
  const n = photos.length;
  const flip = (by: number) => setAt((i) => (i + by + n) % n);

  return (
    <div className="grid min-w-0 justify-items-center gap-2" data-stack={stack ? "" : undefined}>
      <ul role="list" className="polaroids">
        {photos.map((photo, i) => {
          const depth = (i - at + n) % n;
          const under = stack && depth !== 0;
          return (
            <li
              key={photo.file}
              data-depth={stack ? Math.min(depth, 3) : undefined}
              aria-hidden={under || undefined}
              inert={under}
              style={{ "--tilt": tilts[i % tilts.length] } as CSSProperties}
            >
              <figure className="polaroid">
                <span className="relative block aspect-square overflow-hidden">
                  <Image
                    src={photo.src}
                    alt={photo.alt}
                    fill
                    sizes="18rem"
                    loading="lazy"
                    unoptimized={photo.src.endsWith(".svg")}
                    className="object-cover"
                  />
                </span>
                {photo.caption && <figcaption>{photo.caption}</figcaption>}
              </figure>
            </li>
          );
        })}
      </ul>
      {stack && n > 1 && (
        <div className="flex items-center gap-3">
          <button type="button" className="glass glass-icon" aria-label="Previous photo" onClick={() => flip(-1)}>
            {arrow("M19 12H5m6-6-6 6 6 6")}
          </button>
          <p aria-live="polite" className="w-24 text-center text-sm text-muted">
            Photo {at + 1} of {n}
          </p>
          <button type="button" className="glass glass-icon" aria-label="Next photo" onClick={() => flip(1)}>
            {arrow("M5 12h14m-6-6 6 6-6 6")}
          </button>
        </div>
      )}
    </div>
  );
}
