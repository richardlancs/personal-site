"use client";

import { useWorld, world } from "../store";
import { onChoiceKey } from "./selector";

// The station's departures board, one line per entry, newest first: a key
// here chooses that line, the board turns its flaps over to it, and the
// camera turns to the board. The entries themselves are written out in
// the panel under this row (city2d/sections/Experience.tsx), so the row
// only chooses; nothing here is read out twice. Every key is a tab stop;
// the arrows also move along the row (selector.ts).
// `lines`: in the order the board lists them, newest first (CityPage.tsx:
// sortNewestFirst(experience); districts/metro.def.ts: "line-<n>")
export default function BoardLines({ items: lines }: { items: { role: string; organization: string }[] }) {
  const selected = useWorld((s) => s.sel.line);

  function choose(index: number) {
    world.select("line", index);
    world.set({ focus: `line-${index}` });
  }

  return (
    <div
      role="group"
      aria-label="Lines on the board"
      className="city-picker"
      data-picker="lines"
      onKeyDown={(event) => onChoiceKey(event, selected, lines.length, choose)}
    >
      {lines.map((entry, index) => (
        <button
          key={`${entry.role}-${entry.organization}`}
          type="button"
          aria-pressed={index === selected}
          data-choice
          className="glass city-picker-key"
          onClick={() => choose(index)}
        >
          <span className="city-picker-label">{entry.role}</span>{" "}
          <span className="city-picker-sub">{entry.organization}</span>
        </button>
      ))}
    </div>
  );
}
