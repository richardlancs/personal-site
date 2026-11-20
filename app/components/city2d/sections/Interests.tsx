import Image from "next/image";
import type { ReactNode } from "react";
import { interests, type Interest } from "../../../data/portfolio";
import { interestPhotos } from "../../../lib/interestPhotos";
import { newTab } from "../ProfileLinks";

// The interests: one row per interest, a single column on the ground with
// hairlines between them. Each row is a native <details> (name="interests",
// so opening one closes the others where the browser supports it); the
// first starts open, and the open one's top hairline turns cyan. Inside:
// the description, then the interest's photos when it has any, read from
// public/interests/<scene>/ (lib/interestPhotos.ts,
// docs/adding-interest-photos.md). No photos, no gallery.

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

export default function Interests() {
  return (
    <div className="interests mt-10 border-b border-line">
      {interests.map((interest, i) => {
        const photos = interestPhotos(interest.scene, interest.name, interest.captions);
        return (
          <details
            key={interest.scene}
            name="interests"
            open={i === 0}
            className="interest group border-t border-line open:border-t-cyan"
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
              <h3 className="min-w-0 flex-1 font-display text-2xl font-semibold text-text break-words">{interest.name}</h3>
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
            <div className="pb-8 min-[480px]:pl-12">
              <p className="max-w-[65ch] text-base leading-relaxed text-text break-words">{interest.description}</p>
              {photos.length > 0 && (
                <ul role="list" className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
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
  );
}
