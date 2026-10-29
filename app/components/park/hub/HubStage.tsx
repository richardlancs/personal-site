"use client";

import { useEffect, useRef } from "react";

// The interactive part of the central clearing (Hub.tsx):
// - the scene's layers drift apart with the pointer, nearer ones more
// - each path's button grows and leans toward the pointer as it gets close
// - choosing a path flies down it: the scene zooms toward that button with
//   motion blur, then ParkWalk takes the visitor to the section
//   (the "park:goto" event)

const REACH = 260; // px: how close the pointer must be before a button reacts
const TRAVEL_MS = 620; // keep in sync with .hub-traveling in globals.css

export default function HubStage({ children }: { children: React.ReactNode }) {
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const buttons = Array.from(stage.querySelectorAll<HTMLAnchorElement>("a[data-hub]"));
    const calm = matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let pointer: { x: number; y: number } | null = null;
    let timer = 0;

    function draw() {
      frame = 0;
      const box = stage!.getBoundingClientRect();
      if (!pointer || calm.matches) {
        stage!.style.setProperty("--mx", "0");
        stage!.style.setProperty("--my", "0");
        for (const button of buttons) button.style.setProperty("--near", "0");
        return;
      }
      stage!.style.setProperty("--mx", (((pointer.x - box.left) / box.width) * 2 - 1).toFixed(3));
      stage!.style.setProperty("--my", (((pointer.y - box.top) / box.height) * 2 - 1).toFixed(3));
      for (const button of buttons) {
        const disc = button.firstElementChild!.getBoundingClientRect();
        const dx = pointer.x - (disc.left + disc.width / 2);
        const dy = pointer.y - (disc.top + disc.height / 2);
        const near = Math.max(0, 1 - Math.hypot(dx, dy) / REACH);
        // Eased, so buttons wake gently and swell as the pointer arrives
        const eased = near * near * (3 - 2 * near);
        button.style.setProperty("--near", eased.toFixed(3));
        button.style.setProperty("--pull-x", `${(dx * eased * 0.16).toFixed(1)}px`);
        button.style.setProperty("--pull-y", `${(dy * eased * 0.16).toFixed(1)}px`);
      }
    }

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(draw);
    };
    function onMove(event: PointerEvent) {
      if (event.pointerType !== "mouse") return; // touch has nothing to hover
      pointer = { x: event.clientX, y: event.clientY };
      schedule();
    }
    function onLeave() {
      pointer = null;
      schedule();
    }

    function onClick(event: MouseEvent) {
      const link = (event.target as Element).closest<HTMLAnchorElement>("a[data-hub]");
      if (!link || event.metaKey || event.ctrlKey || event.shiftKey) return;
      event.preventDefault();
      const id = link.hash.slice(1);
      const go = () => window.dispatchEvent(new CustomEvent("park:goto", { detail: id }));
      if (calm.matches) return go();

      // Zoom in toward the chosen path's end
      const box = stage!.getBoundingClientRect();
      const disc = link.firstElementChild!.getBoundingClientRect();
      stage!.style.setProperty("--ox", `${disc.left + disc.width / 2 - box.left}px`);
      stage!.style.setProperty("--oy", `${disc.top + disc.height / 2 - box.top}px`);
      stage!.classList.add("hub-traveling");
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        go();
        // Settle back once the clearing is out of view
        requestAnimationFrame(() => stage!.classList.remove("hub-traveling"));
      }, TRAVEL_MS);
    }

    stage.addEventListener("pointermove", onMove);
    stage.addEventListener("pointerleave", onLeave);
    stage.addEventListener("click", onClick);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
      stage.removeEventListener("pointermove", onMove);
      stage.removeEventListener("pointerleave", onLeave);
      stage.removeEventListener("click", onClick);
    };
  }, []);

  return (
    <div ref={stageRef} className="hub-stage">
      {children}
    </div>
  );
}
