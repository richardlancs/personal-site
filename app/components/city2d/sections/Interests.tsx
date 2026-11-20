import type { CSSProperties, ReactNode } from "react";
import { interests, type Interest } from "../../../data/portfolio";

// The interests station, on the neon shopping street: one card per
// interest, in a row (four across on wide screens, two under 1024px, one
// under 480px). Each card has a thin accent edge along its top, cycling
// cyan, magenta and amber like the street's signs, and a small line mark
// for its sport or game in the same colour. The marks are decoration only.

// The one list of accents, in order: the edge, the mark and the edge's
// glow (city.css, .interest-card, from --card-accent) all come from it
const accents = [
  { colour: "cyan", edge: "border-t-cyan", mark: "text-cyan" },
  { colour: "magenta", edge: "border-t-magenta", mark: "text-magenta" },
  { colour: "amber", edge: "border-t-amber", mark: "text-amber" },
];

// Line marks on a 24-unit grid, drawn in the card's accent (currentColor)
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

export default function Interests() {
  return (
    <ul role="list" className="interests mt-10 grid grid-cols-1 gap-5 min-[480px]:grid-cols-2 lg:grid-cols-4">
      {interests.map((interest, i) => {
        const { colour, edge, mark } = accents[i % accents.length];
        return (
          <li
            key={interest.scene}
            className={`interest-card flex flex-col gap-3 rounded-[var(--radius-lg)] border border-line border-t-2 ${edge} bg-panel p-6`}
            style={{ "--card-accent": `var(--${colour})` } as CSSProperties}
          >
            <svg
              aria-hidden="true"
              focusable="false"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`size-8 shrink-0 ${mark}`}
            >
              {marks[interest.scene]}
            </svg>
            <h3 className="font-display text-xl text-text break-words">{interest.name}</h3>
            <p className="text-base leading-relaxed text-muted break-words">{interest.description}</p>
          </li>
        );
      })}
    </ul>
  );
}
