"use client";

import type { Interest } from "../../data/portfolio";
import { useWorld, world } from "../world3d/store";
import { onChoiceKey } from "./selector";

const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

// A small drawing for each interest, like the ones on its cabinet screen
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

// The arcade's cabinets, one for each interest. Choosing one here or in
// the world (world3d/scenes/Arcade.tsx) walks up to that cabinet and
// switches it on; its card comes out below, like a prize from the tray.
// The flat layout has all four cards out already.
export default function Cabinets({ interests }: { interests: Interest[] }) {
  const selected = useWorld((s) => s.sel.interest);
  const interest = interests[selected];

  function choose(index: number) {
    world.select("interest", index);
    world.set({ focus: `cabinet-${index}` });
  }

  return (
    <>
      <ul role="list" className="cabinet-stack only-flat">
        {interests.map((item) => (
          <li key={item.name} className="cabinet-ticket">
            <span className="cabinet-ticket-screen" aria-hidden="true">
              <Sketch scene={item.scene} />
            </span>
            <div className="cabinet-ticket-text">
              <h2 className="font-display text-xl font-semibold tracking-tight">{item.name}</h2>
              <p>{item.description}</p>
            </div>
          </li>
        ))}
      </ul>

      <div className="take-clicks only-world">
        {/* One tab stop for the row; the arrow keys move along it (selector.ts) */}
        <div role="tablist" aria-label="Cabinets" className="cabinet-row" onKeyDown={(event) => onChoiceKey(event, selected, interests.length, choose)}>
          {interests.map((item, index) => (
            <button
              key={item.name}
              type="button"
              role="tab"
              id={`cabinet-${slug(item.name)}`}
              aria-selected={index === selected}
              aria-controls="cabinet-card"
              tabIndex={index === selected ? 0 : -1}
              data-choice
              className="cabinet-button"
              onClick={() => choose(index)}
            >
              <span className="cabinet-button-screen" aria-hidden="true">
                <Sketch scene={item.scene} />
              </span>
              {item.name}
            </button>
          ))}
        </div>

        {/* The live region stays put; only the card inside it is replaced,
            so the new card is announced */}
        <div id="cabinet-card" role="tabpanel" aria-labelledby={`cabinet-${slug(interest.name)}`} aria-live="polite">
          <section key={interest.name} className="cabinet-card">
            <span className="cabinet-card-sketch">
              <Sketch scene={interest.scene} />
            </span>
            <div>
              <h2 className="font-display text-2xl font-semibold tracking-tight">{interest.name}</h2>
              <p className="mt-2 leading-relaxed text-muted">{interest.description}</p>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
