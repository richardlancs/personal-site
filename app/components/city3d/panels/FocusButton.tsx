"use client";

import type { ReactNode } from "react";
import { world } from "../store";

// Turns the camera toward something in the current place: one of its
// focus poses (districts/<id>.def.ts: focus, e.g. "screen-1"). A glass
// key, 44px tall, as wide as its words. For a panel's own words to point
// at the scene; load it the way the pickers are loaded (CityPanel.tsx),
// with the 3D city, never in a page's first load.
export default function FocusButton({ focus, children }: { focus: string; children: ReactNode }) {
  return (
    <button type="button" className="glass city-focus" onClick={() => world.set({ focus })}>
      {children}
    </button>
  );
}
