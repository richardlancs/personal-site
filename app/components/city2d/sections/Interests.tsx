import { Fragment, type CSSProperties, type ReactNode } from "react";
import { interests, type Interest } from "../../../data/portfolio";
import { interestPhotos } from "../../../lib/interestPhotos";
import Scrapbook from "../Scrapbook";
import Figures from "../Figures";
import Heading from "../Heading";
import { order } from "../Station";

// The interests: a key per interest to choose it, and the chosen one's
// scrapbook page
// (city.css, "The interests' scrapbook pages"), the description beside the interest's photos as a stack
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

// A picker, by the list's own width (@container): from 40rem the four
// interests are a column of keys on the left and the chosen one's page
// takes the rest, most of it its photos; narrower, the keys one under
// another, the chosen one's page under its key. Each key is the label of a
// native radio button (visually hidden, name="interest", the first chosen),
// so it works without scripts, arrow keys move the choice, and the page
// shown is pure CSS (city.css, "The interests' picker"). The keys arrive in
// order as they scroll in (reveal.css).
export default function Interests() {
  return (
    <div className="@container interests mt-6">
      <div className="picker" style={{ "--n": interests.length } as CSSProperties}>
        {interests.map((interest, i) => {
          const photos = interestPhotos(interest.scene, interest.name, interest.captions);
          const id = `interest-${interest.scene}`;
          return (
            <Fragment key={interest.scene}>
              <input type="radio" name="interest" id={`pick-${interest.scene}`} className="pick sr-only" defaultChecked={i === 0} />
              <label htmlFor={`pick-${interest.scene}`} className="glass pick-key reveal" style={order(i)}>
                <svg
                  aria-hidden="true"
                  focusable="false"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="size-7 shrink-0 text-accent-2"
                >
                  {marks[interest.scene]}
                </svg>
                <span className="min-w-0 font-display text-xl font-semibold break-words">{interest.name}</span>
              </label>
              <section aria-labelledby={id} className="scrapbook pick-pane @container">
                <div className="grid gap-5 @min-[37.5rem]:grid-cols-[minmax(0,1fr)_minmax(0,23rem)] @min-[37.5rem]:items-center">
                  <div>
                    <Heading level={3} id={id} className="font-display text-2xl font-semibold text-text break-words">{interest.name}</Heading>
                    <p className="mt-2 max-w-[65ch] text-base leading-relaxed text-text break-words"><Figures>{interest.description}</Figures></p>
                  </div>
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
              </section>
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
