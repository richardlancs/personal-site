"use client";

import { useEffect } from "react";
import { useWorld, world } from "../world3d/store";

// "Show places": every place in the park shows its name tag. On a first
// visit the tags also come up once by themselves, once the camera has
// walked in, so it's clear what can be visited, then go again.
export default function ShowPlaces() {
  const on = useWorld((s) => s.labels);
  const arrived = useWorld((s) => s.arrived);

  useEffect(() => {
    if (!arrived) return;
    let seen = true;
    try {
      seen = sessionStorage.getItem("looked-around") === "1";
      sessionStorage.setItem("looked-around", "1");
    } catch {
      // Storage can be unavailable; then skip the hint
    }
    if (seen) return;
    world.set({ labels: true });
    const hide = window.setTimeout(() => world.set({ labels: false }), 4500);
    return () => window.clearTimeout(hide);
  }, [arrived]);

  // Leaving the park takes the tags with it
  useEffect(() => () => world.set({ labels: false }), []);

  return (
    <button type="button" aria-pressed={on} onClick={() => world.set({ labels: !on })} className="text-link max-md:hidden">
      {on ? "Hide places" : "Show places"}
    </button>
  );
}
