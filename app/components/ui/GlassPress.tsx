"use client";

import { useEffect } from "react";

// The press on every glass button (.glass in globals.css), from one pair
// of listeners for the whole page, so any .glass element gets it, however
// it got onto the page. A pointer press starts the ripple where it landed;
// a keyboard (or assistive tech) activation, a click with no pointer
// behind it, starts it from the middle. Nothing here waits or prevents
// anything: the button's action happens as it always would.
//
// The press is a CSS animation keyed on data-pressed. Pressing again
// restarts it (the attribute comes off, a reflow, and back on) rather
// than stacking a second one, and it comes off when the animation ends.
// Only one button is pressed at a time. No timers.
export default function GlassPress() {
  useEffect(() => {
    let current: HTMLElement | null = null;

    const release = (el: HTMLElement) => {
      el.removeAttribute("data-pressed");
      if (current === el) current = null;
    };

    const press = (el: HTMLElement, x?: number, y?: number) => {
      if (el.matches(":disabled, [aria-disabled='true']")) return;
      const box = el.getBoundingClientRect();
      const px = x === undefined ? box.width / 2 : x - box.left;
      const py = y === undefined ? box.height / 2 : y - box.top;
      // The ripple's radius reaches the farthest corner
      const r = Math.hypot(Math.max(px, box.width - px), Math.max(py, box.height - py));
      if (current && current !== el) release(current);
      el.style.setProperty("--press-x", `${px}px`);
      el.style.setProperty("--press-y", `${py}px`);
      el.style.setProperty("--press-r", `${r}px`);
      if (el.hasAttribute("data-pressed")) {
        el.removeAttribute("data-pressed");
        void el.offsetWidth; // restart the animation, not a second one
      }
      el.setAttribute("data-pressed", "");
      current = el;
    };

    const glassFrom = (target: EventTarget | null) => (target instanceof Element ? target.closest<HTMLElement>(".glass") : null);

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      const el = glassFrom(event.target);
      if (el) press(el, event.clientX, event.clientY);
    };

    // detail 0: a click from the keyboard or assistive tech, not a pointer
    const onClick = (event: MouseEvent) => {
      if (event.detail !== 0) return;
      const el = glassFrom(event.target);
      if (el) press(el);
    };

    // The button's own animation is the longest; when it ends, or is
    // cancelled (its page hidden), the press is over. A restart cancels
    // the old one too, but then a new one is already running: keep it.
    const onEnd = (event: AnimationEvent) => {
      const el = event.target;
      if (event.pseudoElement || !(el instanceof HTMLElement) || !el.hasAttribute("data-pressed")) return;
      if (event.type === "animationcancel" && el.getAnimations().length) return;
      release(el);
    };

    document.addEventListener("pointerdown", onPointerDown, { capture: true, passive: true });
    document.addEventListener("click", onClick, { capture: true });
    document.addEventListener("animationend", onEnd);
    document.addEventListener("animationcancel", onEnd);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, { capture: true });
      document.removeEventListener("click", onClick, { capture: true });
      document.removeEventListener("animationend", onEnd);
      document.removeEventListener("animationcancel", onEnd);
    };
  }, []);

  return null;
}
