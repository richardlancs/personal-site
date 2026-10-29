"use client";

import { useEffect, useState } from "react";

const world = () => document.querySelector<HTMLElement>(".world");

// "Show places": every place in the park shows its name tag. On a first
// visit the tags also come up once by themselves, a moment after the park
// appears, so it's clear what can be visited, then go again.
export default function ShowPlaces() {
  const [on, setOn] = useState(false);

  useEffect(() => {
    let seen = true;
    try {
      seen = sessionStorage.getItem("looked-around") === "1";
      sessionStorage.setItem("looked-around", "1");
    } catch {
      // Storage can be unavailable; then skip the hint
    }
    if (seen) return;
    const show = window.setTimeout(() => world()?.setAttribute("data-labels", ""), 1800);
    const hide = window.setTimeout(() => world()?.removeAttribute("data-labels"), 6200);
    return () => {
      window.clearTimeout(show);
      window.clearTimeout(hide);
      world()?.removeAttribute("data-labels");
    };
  }, []);

  // Leaving the park takes the tags with it
  useEffect(() => () => world()?.removeAttribute("data-labels"), []);

  function toggle() {
    const next = !on;
    setOn(next);
    world()?.toggleAttribute("data-labels", next);
  }

  return (
    <button type="button" aria-pressed={on} onClick={toggle} className="text-link max-md:hidden">
      {on ? "Hide places" : "Show places"}
    </button>
  );
}
