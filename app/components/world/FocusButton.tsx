"use client";

import { world } from "../world3d/store";

// Turns the camera toward something in the current place (wide screens
// only: the flat layout has no camera). It stands on its own, not inside
// a sentence, so it keeps a 24px target (WCAG 2.5.8)
export default function FocusButton({ focus, children }: { focus: string; children: React.ReactNode }) {
  return (
    <button type="button" className="text-link only-world min-h-6 items-center text-sm font-medium inline-flex" onClick={() => world.set({ focus })}>
      {children}
    </button>
  );
}
