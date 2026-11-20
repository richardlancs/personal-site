"use client";

import { useEffect } from "react";

// The pictures' tilt toward a fine pointer (reveal.css, "Depth"): one
// passive pointermove listener for the whole page writes where the pointer
// is over the hovered [data-tilt] element, as --tilt-x and --tilt-y (-0.5
// to 0.5), at most once a frame. The CSS turns that into at most 3° each
// way, and only while hovered, so a stale value never shows. Listens only
// on a fine pointer that hovers, with motion welcome; does nothing in
// still view. Mounted once (sections/Projects.tsx). Renders nothing.
const FINE = "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)";

export default function Tilt() {
  useEffect(() => {
    const mq = matchMedia(FINE);
    let el: HTMLElement | null = null;
    let frame = 0;
    let x = 0;
    let y = 0;
    const set = (tx: number, ty: number) => {
      el?.style.setProperty("--tilt-x", tx.toFixed(3));
      el?.style.setProperty("--tilt-y", ty.toFixed(3));
    };
    const reset = () => set(0, 0);
    const draw = () => {
      frame = 0;
      const r = el?.getBoundingClientRect();
      if (r) set((x - r.left) / r.width - 0.5, (y - r.top) / r.height - 0.5);
    };
    const move = (e: PointerEvent) => {
      const over = (e.target as Element).closest<HTMLElement>("[data-tilt]");
      // Left the picture (pointerleave, delegated): back to flat
      if (over !== el) {
        reset();
        el = over;
      }
      if (!el || document.documentElement.dataset.still === "on") return;
      x = e.clientX;
      y = e.clientY;
      frame ||= requestAnimationFrame(draw);
    };
    const listen = () => (mq.matches ? addEventListener("pointermove", move, { passive: true }) : removeEventListener("pointermove", move));
    listen();
    mq.addEventListener("change", listen);
    return () => {
      mq.removeEventListener("change", listen);
      removeEventListener("pointermove", move);
      cancelAnimationFrame(frame);
      reset();
    };
  }, []);
  return null;
}
