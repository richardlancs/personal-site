"use client";

import { useEffect, useState } from "react";
import type { Interest } from "../../data/portfolio";
import { ACTIONS } from "../world3d/scenes/arcadeLogic";
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

// How long the machine waits, untouched, before it shows the next interest
const IDLE_CYCLE_MS = 10000;

// The arcade's machine: every interest is a mode of it. Choosing one here
// or with the machine's own buttons (world3d/scenes/Arcade.tsx) boots it
// into that game, and its card comes out below, like a prize from the
// tray, with the one thing to do in that game ("Shoot", "Deal"…), which
// does what a click on the screen does. Left alone after arriving, it
// moves on to the next interest every ten seconds, until anything on the
// page is touched; never in still view or a hidden tab. The flat layout
// has all four cards out already.
export default function Cabinets({ interests }: { interests: Interest[] }) {
  const selected = useWorld((s) => s.sel.interest);
  const arrived = useWorld((s) => s.arrived);
  const still = useWorld((s) => s.still);
  const status = useWorld((s) => s.arcadeStatus);
  const interest = interests[selected];
  const action = ACTIONS[interest.scene];
  // Whether the visitor has done anything here yet; until then the
  // machine cycles on its own, and its card changes aren't read out
  const [touched, setTouched] = useState(false);
  const [hovering, setHovering] = useState(false);

  useEffect(() => {
    if (touched) return;
    const touch = () => setTouched(true);
    window.addEventListener("pointerdown", touch);
    window.addEventListener("keydown", touch);
    return () => {
      window.removeEventListener("pointerdown", touch);
      window.removeEventListener("keydown", touch);
    };
  }, [touched]);

  useEffect(() => {
    if (touched || hovering || still || !arrived) return;
    const id = window.setInterval(() => {
      if (document.hidden) return;
      world.select("interest", (world.get().sel.interest + 1) % interests.length);
    }, IDLE_CYCLE_MS);
    return () => window.clearInterval(id);
  }, [touched, hovering, still, arrived, interests.length]);

  // A new mode starts with nothing said about it
  useEffect(() => {
    world.set({ arcadeStatus: "" });
  }, [selected]);

  function choose(index: number) {
    world.select("interest", index);
    world.set({ focus: "cabinet" });
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

      <div className="take-clicks only-world" onPointerEnter={() => setHovering(true)} onPointerLeave={() => setHovering(false)}>
        {/* One tab stop for the row; the arrow keys move along it (selector.ts) */}
        <div role="tablist" aria-label="Machine modes" className="cabinet-row" onKeyDown={(event) => onChoiceKey(event, selected, interests.length, choose)}>
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
            so the new card is announced (once the visitor has touched
            anything: while the machine cycles on its own it's quiet). The
            panel is the next tab stop after the chosen tab (the APG tabs
            pattern), then the card's play button; how a press turned out
            is read out from the status line under it. */}
        <div id="cabinet-card" role="tabpanel" tabIndex={0} aria-labelledby={`cabinet-${slug(interest.name)}`} aria-live={touched ? "polite" : "off"} className="cabinet-panel">
          <section key={interest.name} className="cabinet-card">
            <span className="cabinet-card-sketch">
              <Sketch scene={interest.scene} />
            </span>
            <div>
              <h2 className="font-display text-2xl font-semibold tracking-tight">{interest.name}</h2>
              <p className="mt-2 leading-relaxed text-muted">{interest.description}</p>
              <div className="cabinet-play">
                <button
                  type="button"
                  className="glass glass-primary cabinet-action"
                  onClick={() => {
                    world.set({ focus: "cabinet", arcadePress: world.get().arcadePress + 1 });
                  }}
                >
                  {action.label}
                </button>
                <p className="cabinet-status">{status}</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
