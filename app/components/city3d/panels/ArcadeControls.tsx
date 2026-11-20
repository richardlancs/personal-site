"use client";

import { useEffect, useState } from "react";
import type { Interest } from "../../../data/portfolio";
import { ACTIONS } from "../arcade/arcadeLogic";
import { useWorld, world } from "../store";
import { onChoiceKey } from "./selector";

// How long the machine waits, untouched, before it shows the next interest
const IDLE_CYCLE_MS = 10000;

// The arcade's one machine (districts/nanjing-road.def.ts: "machine"):
// every interest is a mode of it. A key here boots it into that mode and
// turns the camera to its screen; "Play" does the mode's one thing ("Shoot",
// "Deal"…), what a click on the screen does (arcade/arcadeMachine.ts), and
// how it turned out is read out from the line beside it. Left alone after
// arriving, the machine moves on to the next interest every ten seconds,
// until anything on the page is touched or pointed at; never in still view
// or a hidden tab. Every key is a tab stop; the arrows also move along the
// modes (selector.ts). The interests themselves are written out in the
// panel under this row (city2d/sections/Interests.tsx).
export default function ArcadeControls({ items: interests }: { items: Pick<Interest, "name" | "scene">[] }) {
  const selected = useWorld((s) => s.sel.interest);
  const arrived = useWorld((s) => s.arrived);
  const still = useWorld((s) => s.still);
  const status = useWorld((s) => s.arcadeStatus);
  const action = ACTIONS[interests[selected].scene];
  // Whether the visitor has done anything here yet; until then the
  // machine cycles on its own
  const [touched, setTouched] = useState(false);
  const [hovering, setHovering] = useState(false);

  useEffect(() => {
    if (touched) return;
    const touch = () => setTouched(true);
    addEventListener("pointerdown", touch);
    addEventListener("keydown", touch);
    return () => {
      removeEventListener("pointerdown", touch);
      removeEventListener("keydown", touch);
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
    world.set({ focus: "machine" });
  }

  return (
    <div className="city-picker" data-picker="arcade" onPointerEnter={() => setHovering(true)} onPointerLeave={() => setHovering(false)}>
      <div role="group" aria-label="Machine modes" className="city-picker-row" onKeyDown={(event) => onChoiceKey(event, selected, interests.length, choose)}>
        {interests.map((interest, index) => (
          <button
            key={interest.scene}
            type="button"
            aria-pressed={index === selected}
            data-choice
            className="glass city-picker-key"
            onClick={() => choose(index)}
          >
            {interest.name}
          </button>
        ))}
      </div>
      <div className="city-picker-play">
        <button
          type="button"
          className="glass glass-primary city-picker-key"
          onClick={() => world.set({ focus: "machine", arcadePress: world.get().arcadePress + 1 })}
        >
          Play <span className="city-picker-sub">· {action.label}</span>
        </button>
        <p className="city-picker-status" aria-live="polite">{status}</p>
      </div>
    </div>
  );
}
