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
// until anything on the page is touched, pointed at, scrolled or focused;
// never in still view or a hidden tab. Every key is a tab stop; the arrows
// also move along the modes (selector.ts). The interests themselves are
// written out in the panel under this row (city2d/sections/Interests.tsx).

// The panel's list of interests (its <details>)
const panelRows = () => [...document.querySelectorAll<HTMLDetailsElement>('details[name="interests"]')];
// Opens the chosen interest's row in the panel, and only it
function showInPanel(selected: number) {
  panelRows().forEach((row, index) => {
    if (row.open !== (index === selected)) row.open = index === selected;
  });
}
// The interest the idle cycle last moved the machine to, while no visitor
// has chosen since (kept across visits to the page): the idle cycle drives
// the machine only, never the panel's rows, so the panel never opens,
// closes or changes height under a reader
let idleChoice = -1;
// A visitor's choice (a key, the screen, a row): the panel shows it
function chosenByVisitor(index: number) {
  idleChoice = -1;
  showInPanel(index);
}

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
    // Reading counts: a wheel, a touch, a scroll of the page or focus
    // moving (a screen reader's browse mode sends no keys). Scroll and
    // focus only once arrived: a journey itself moves focus to the heading
    const events = ["pointerdown", "keydown", "wheel", "touchstart", ...(arrived ? ["scroll", "focusin"] : [])];
    const options = { capture: true, passive: true };
    events.forEach((type) => addEventListener(type, touch, options));
    return () => events.forEach((type) => removeEventListener(type, touch, options));
  }, [touched, arrived]);

  useEffect(() => {
    if (touched || hovering || still || !arrived) return;
    const id = window.setInterval(() => {
      if (document.hidden) return;
      idleChoice = (world.get().sel.interest + 1) % interests.length;
      world.select("interest", idleChoice);
    }, IDLE_CYCLE_MS);
    return () => window.clearInterval(id);
  }, [touched, hovering, still, arrived, interests.length]);

  // A new mode starts with nothing said about it
  useEffect(() => {
    world.set({ arcadeStatus: "" });
  }, [selected]);

  // One choice, the store's, for what the visitor chooses: the panel's list
  // of interests keeps the visitor's choice open (a key, the screen), and
  // opening a row there chooses it for the machine too. What the idle cycle
  // chooses stays in the scene.
  useEffect(() => {
    if (selected !== idleChoice) chosenByVisitor(selected);
  }, [selected]);
  useEffect(() => {
    const rows = panelRows();
    const onToggle = (event: Event) => {
      const row = event.currentTarget as HTMLDetailsElement;
      if (!row.open) return;
      chosenByVisitor(rows.indexOf(row));
      world.select("interest", rows.indexOf(row));
    };
    rows.forEach((row) => row.addEventListener("toggle", onToggle));
    return () => rows.forEach((row) => row.removeEventListener("toggle", onToggle));
  }, []);

  function choose(index: number) {
    chosenByVisitor(index);
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
