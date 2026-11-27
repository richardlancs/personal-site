import type { ReactNode } from "react";
import { interests, type Interest } from "../../../data/portfolio";
import { interestPhotos } from "../../../lib/interestPhotos";
import Scrapbook from "../Scrapbook";
import Figures from "../Figures";
import Heading from "../Heading";
import { order } from "../Station";
import "../../../scrapbook.css";

// The interests: one row per interest, a single column on the ground with
// a little room between them. Each row is a native <details>
// (name="interests", so opening one closes the others where the browser
// supports it), its summary a full-width glass key ("Show", "Hide" and a
// chevron at its end; city.css, "A fold"); the first starts open, and the
// open one's edge turns to the accent. Inside: a scrapbook page
// (scrapbook.css), the description beside the interest's photos as a stack
// of polaroids to flip through (Scrapbook.tsx), read from
// public/interests/<scene>/ (lib/interestPhotos.ts,
// docs/adding-interest-photos.md). No photos, no stack. The rows arrive in
// order as they scroll in (reveal.css).

// Line marks on a 24-unit grid, in the second accent (currentColor). Decoration only.
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

// A photo's caption: its own from the data file, else "Placeholder photo"
// for a generated stand-in, else none (the polaroid's margin left blank)
const placeholderCaption = "Placeholder photo";

// The rows lay themselves out by the list's own width (@container: the
// description beside the photos from 37.5rem, the photos' column at most
// 19rem). One column that may shrink (grid-cols-1: minmax(0, 1fr)): an
// auto column grows to the rows' longest unbroken run (an icon, a heading's
// word at 200% text, Show and the chevron side by side), wider than a
// phone, and the page then scrolls sideways.
export default function Interests() {
  return (
    <div className="@container interests mt-6 grid grid-cols-1 gap-2">
      {interests.map((interest, i) => {
        const photos = interestPhotos(interest.scene, interest.name, interest.captions);
        return (
          <details
            key={interest.scene}
            name="interests"
            open={i === 0}
            className="interest reveal group"
            style={order(i)}
          >
            <summary className="glass w-full list-none [&::-webkit-details-marker]:hidden">
              <svg
                aria-hidden="true"
                focusable="false"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-8 shrink-0 text-accent-2"
              >
                {marks[interest.scene]}
              </svg>
              <Heading level={3} className="min-w-0 flex-1 font-display text-2xl font-semibold text-text break-words">{interest.name}</Heading>
              {/* (said by the row's own open state, so hidden from
                  assistive technology) */}
              <span aria-hidden="true" className="text-sm text-muted">
                <span className="group-open:hidden">Show</span>
                <span className="hidden group-open:inline">Hide</span>
              </span>
              <svg
                aria-hidden="true"
                focusable="false"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="chevron size-6 shrink-0 text-muted group-open:rotate-180 group-open:text-accent-2"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </summary>
            <div className="scrapbook mt-3 mb-6 grid grid-cols-1 gap-6 @min-[37.5rem]:grid-cols-[minmax(0,1fr)_minmax(0,19rem)] @min-[37.5rem]:items-center">
              <p className="max-w-[65ch] text-base leading-relaxed text-text break-words"><Figures>{interest.description}</Figures></p>
              {photos.length > 0 && (
                <Scrapbook
                  photos={photos.map((photo) => {
                    const own = interest.captions?.[photo.file];
                    return {
                      src: photo.src,
                      file: photo.file,
                      // (a caption of its own says what the photo shows)
                      alt: own ? "" : photo.alt,
                      caption: own ?? (photo.placeholder ? placeholderCaption : undefined),
                    };
                  })}
                />
              )}
            </div>
          </details>
        );
      })}
    </div>
  );
}
