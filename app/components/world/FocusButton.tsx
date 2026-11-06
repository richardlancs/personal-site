"use client";

import { world } from "../world3d/store";

// Turns the camera toward something in the current place (wide screens
// only: the flat layout has no camera)
export default function FocusButton({ focus, children }: { focus: string; children: React.ReactNode }) {
  return (
    <button type="button" className="text-link only-world text-sm font-medium" onClick={() => world.set({ focus })}>
      {children}
    </button>
  );
}
