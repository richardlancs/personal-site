"use client";

import { useState } from "react";
import type { Interest } from "../../data/portfolio";

// A small ink drawing for each interest, on its seed packet
function Sketch({ scene }: { scene: Interest["scene"] }) {
  const common = {
    viewBox: "0 0 48 48",
    width: 44,
    height: 44,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  switch (scene) {
    case "basketball":
      return (
        <svg {...common}>
          <circle cx="24" cy="24" r="15" />
          <path d="M9 24h30M24 9v30M13.5 13.5c5 4 5 17 0 21M34.5 13.5c-5 4-5 17 0 21" />
        </svg>
      );
    case "badminton":
      return (
        <svg {...common}>
          <path d="M20 34c-2.5 0-4-1.5-4-4s1.5-4 4-4 4 1.5 4 4" />
          <path d="M18 27 10 9M21 26l3-18M23 27l12-14M10 9c5-2 9-2 14-1M24 8c4 1 8 2 11 5" />
        </svg>
      );
    case "chess":
      return (
        <svg {...common}>
          <path d="M16 39h18M18 35h14l-2-6c3-2 5-6 4-11-1-4-5-8-11-8l-1 3-4 3-5 7 2 2 5-3 2 2-4 5Z" />
          <circle cx="21" cy="17" r="0.8" fill="currentColor" />
        </svg>
      );
    case "poker":
      return (
        <svg {...common}>
          <rect x="11" y="10" width="20" height="28" rx="2.5" transform="rotate(-8 21 24)" />
          <rect x="18" y="9" width="20" height="28" rx="2.5" transform="rotate(7 28 23)" />
          <path d="M28 18c-3 3-5 5-5 7a2.4 2.4 0 0 0 4.4 1.3L27 29h2l-.4-2.7A2.4 2.4 0 0 0 33 25c0-2-2-4-5-7Z" />
        </svg>
      );
  }
}

// The greenhouse beds: a wooden marker for each interest, pushed into the
// soil. Pulling one up brings out its seed packet with the notes.
export default function PlantingBeds({ interests }: { interests: Interest[] }) {
  const [selected, setSelected] = useState(0);
  const interest = interests[selected];

  return (
    <div className="take-clicks">
      <div role="group" aria-label="Interests" className="bed">
        {interests.map((item, index) => (
          <button
            key={item.name}
            type="button"
            className="marker"
            aria-pressed={index === selected}
            aria-controls="seed-packet"
            style={{ "--tilt": `${[-3, 2, -1.5, 3][index % 4]}deg` } as React.CSSProperties}
            onClick={() => setSelected(index)}
          >
            <span className="marker-head">{item.name}</span>
            <span className="marker-stake" aria-hidden="true" />
          </button>
        ))}
        <span className="bed-soil" aria-hidden="true" />
      </div>

      <section id="seed-packet" key={interest.name} aria-live="polite" className="seed-packet">
        <span className="seed-packet-sketch">
          <Sketch scene={interest.scene} />
        </span>
        <div>
          <h2 className="font-display text-2xl font-semibold tracking-tight">{interest.name}</h2>
          <p className="mt-2 leading-relaxed text-muted">{interest.description}</p>
        </div>
      </section>
    </div>
  );
}
