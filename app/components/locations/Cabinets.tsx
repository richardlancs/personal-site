"use client";

import type { Interest } from "../../data/portfolio";
import { useWorld, world } from "../world3d/store";
import { onChoiceKey } from "./selector";

const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

// A small drawing for each interest, like the ones on its cabinet screen.
// Drawn on the icons' 24-unit grid; shown larger than an icon, so the
// stroke doesn't scale with it (.sketch in globals.css): 1.5px wherever
// it's shown, like the places' drawings.
function Sketch({ scene }: { scene: Interest["scene"] }) {
  const common = {
    viewBox: "0 0 24 24",
    width: 44,
    height: 44,
    className: "sketch",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    focusable: false,
  };
  switch (scene) {
    case "basketball":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="7.5" />
          <path d="M4.5 12h15M12 4.5v15M6.75 6.75c2.5 2 2.5 8.5 0 10.5M17.25 6.75c-2.5 2-2.5 8.5 0 10.5" />
        </svg>
      );
    case "badminton":
      return (
        <svg {...common}>
          <path d="M10 17c-1.25 0-2-.75-2-2s.75-2 2-2 2 .75 2 2" />
          <path d="M9 13.5 5 4.5M10.5 13l1.5-9M11.5 13.5l6-7M5 4.5c2.5-1 4.5-1 7-.5M12 4c2 .5 4 1 5.5 2.5" />
        </svg>
      );
    case "chess":
      return (
        <svg {...common}>
          <path d="M8 19.5h9M9 17.5h7l-1-3c1.5-1 2.5-3 2-5.5-.5-2-2.5-4-5.5-4l-.5 1.5-2 1.5-2.5 3.5 1 1 2.5-1.5 1 1-2 2.5Z" />
          <circle cx="10.5" cy="8.5" r="0.4" fill="currentColor" />
        </svg>
      );
    case "poker":
      return (
        <svg {...common}>
          <rect x="5.5" y="5" width="10" height="14" rx="1.25" transform="rotate(-8 10.5 12)" />
          <rect x="9" y="4.5" width="10" height="14" rx="1.25" transform="rotate(7 14 11.5)" />
          <path d="M14 9c-1.5 1.5-2.5 2.5-2.5 3.5a1.2 1.2 0 0 0 2.2.65L13.5 14.5h1l-.2-1.35A1.2 1.2 0 0 0 16.5 12.5c0-1-1-2-2.5-3.5Z" />
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
              className="glass cabinet-button"
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
            so the new card is announced. The card has nothing to focus in
            it, so the panel itself is the next tab stop after the chosen
            cabinet (the APG tabs pattern): Tab reads it, Shift+Tab goes
            back to the cabinet. */}
        <div id="cabinet-card" role="tabpanel" tabIndex={0} aria-labelledby={`cabinet-${slug(interest.name)}`} aria-live="polite" className="cabinet-panel">
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
