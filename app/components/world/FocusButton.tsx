"use client";

import { world } from "../world3d/store";

// Turns the camera toward something in the current place
export default function FocusButton({ focus, children }: { focus: string; children: React.ReactNode }) {
  return (
    <button type="button" className="text-link text-sm font-medium" onClick={() => world.set({ focus })}>
      {children}
    </button>
  );
}
