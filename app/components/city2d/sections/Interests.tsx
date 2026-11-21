import Image from "next/image";
import type { ReactNode } from "react";
import { interests, type Interest } from "../../../data/portfolio";
import { interestPhotos } from "../../../lib/interestPhotos";
import { CITY3D_LIVE } from "../../../lib/city3dLive";
import CityLink from "../CityLink";
import { newTab } from "../ProfileLinks";
import Figures from "../Figures";
import Heading, { type Where } from "../Heading";
import { order } from "../Station";

// The interests: one row per interest, a single column on the ground with
// hairlines between them. Each row is a native <details> (name="interests",
// so opening one closes the others where the browser supports it); the
// first starts open, and the open one's top hairline turns cyan. Inside:
// the description, then the interest's photos when it has any, read from
// public/interests/<scene>/ (lib/interestPhotos.ts,
// docs/adding-interest-photos.md). No photos, no gallery. The rows arrive
// in order as they scroll in, and each photo's frame has depth on a fine
// pointer (reveal.css; the tilt is Tilt.tsx, mounted in Projects.tsx).

// Line marks on a 24-unit grid, in cyan (currentColor). Decoration only.
const marks: Record<Interest["scene"], ReactNode> = {
  basketball: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3v18M3 12h18" />
      <path d="M5.6 5.6c2.4 2.4 2.4 10.4 0 12.8M18.4 5.6c-2.4 2.4-2.4 10.4 0 12.8" />
    </>
  ),
  badminton: (
    <>
      <circle cx="12" cy="19" r="2" />
      <path d="M10.3 17.6 6 5M13.7 17.6 18 5M12 17V6" />
      <path d="M6 5q6 2 12 0M7.9 11q4.1 1.4 8.2 0" />
    </>
  ),
  chess: (
    <>
      <circle cx="12" cy="6.5" r="2.5" />
      <path d="M9 10.5h6M10.5 10.5 9 17.5h6l-1.5-7" />
      <rect x="7" y="17.5" width="10" height="3" rx="1" />
    </>
  ),
  poker: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M12 8c-2 2.2-3.5 3.5-3.5 5a1.9 1.9 0 0 0 3.5 1 1.9 1.9 0 0 0 3.5-1c0-1.5-1.5-2.8-3.5-5z" />
      <path d="M12 14v3M10.5 17h3" />
    </>
  ),
};

// The gallery: 2 across on phones, 3 from 768px, 4 from 1280px (the
// column stops at 72rem, so a tile is never wider than about 18rem)
const tileSizes = "(min-width: 1280px) 18rem, (min-width: 768px) 33vw, 50vw";

// On the 2D page (where="2d") the list is followed by a link to the arcade
// in the 3D city (CityLink: shown only where WebGL2 exists); in the city
// itself, not. The rows lay themselves out by the list's own width
// (@container: the indent from 27.5rem, the gallery 3 across from 45.5rem
// and 4 from 69.5rem), so the 3D city's half-width panel gets the narrow
// rows; the names take their heading level from where it is drawn.
export default function Interests({ where = "2d" }: { where?: Where }) {
  return (
    <>
    <div className="@container interests mt-10 border-b border-line">
      {interests.map((interest, i) => {
        const photos = interestPhotos(interest.scene, interest.name, interest.captions);
        return (
          <details
            key={interest.scene}
            name="interests"
            open={i === 0}
            className="interest reveal group border-t border-line open:border-t-cyan"
            style={order(i)}
          >
            <summary className="flex min-h-14 cursor-pointer list-none items-center gap-4 py-4 [&::-webkit-details-marker]:hidden">
              <svg
                aria-hidden="true"
                focusable="false"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-8 shrink-0 text-cyan"
              >
                {marks[interest.scene]}
              </svg>
              <Heading level={3} where={where} className="min-w-0 flex-1 font-display text-2xl font-semibold text-text break-words">{interest.name}</Heading>
              <svg
                aria-hidden="true"
                focusable="false"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="chevron size-6 shrink-0 text-muted group-open:rotate-180 group-open:text-cyan"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </summary>
            <div className="pb-8 @min-[27.5rem]:pl-12">
              <p className="max-w-[65ch] text-base leading-relaxed text-text break-words"><Figures>{interest.description}</Figures></p>
              {photos.length > 0 && (
                <ul role="list" className="mt-6 grid grid-cols-2 gap-3 @min-[45.5rem]:grid-cols-3 @min-[69.5rem]:grid-cols-4">
                  {photos.map((photo) => {
                    const caption = interest.captions?.[photo.file];
                    return (
                      <li key={photo.file}>
                        <a
                          href={photo.src}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block rounded-[var(--radius)] text-muted"
                        >
                          <span className="depth block rounded-[var(--radius)]" data-tilt="">
                            <span className="relative block aspect-[4/3] overflow-hidden rounded-[var(--radius)] border border-line bg-panel">
                              <Image
                                src={photo.src}
                                alt={caption ? "" : photo.alt}
                                fill
                                sizes={tileSizes}
                                loading="lazy"
                                className="object-cover"
                              />
                            </span>
                          </span>
                          {caption && <span className="mt-2 block text-base leading-snug md:text-sm break-words">{caption}</span>}
                          {newTab}
                        </a>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </details>
        );
      })}
    </div>
    {where === "2d" && CITY3D_LIVE && (
      <p className="mt-6">
        <CityLink id="interests">Play it in the 3D city</CityLink>
      </p>
    )}
    </>
  );
}
