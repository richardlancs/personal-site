"use client";

import { useEffect } from "react";
import { watchArrivals } from "./arrive";

// The press on every glass button (.glass in globals.css), from one pair
// of listeners for the whole page, so any .glass element gets it, however
// it got onto the page. A pointer press starts the ripple where it landed;
// a keyboard (or assistive tech) activation, a click with no pointer
// behind it, starts it from the middle. Nothing here waits or prevents
// anything: the button's action happens as it always would.
//
// Two attributes, both set in the pointerdown itself, so the key answers
// in the same frame (city.css): data-held, the give, a transition that
// lasts while the pointer is down and springs back when it lets go (a
// keyboard press holds until the light has passed); and data-pressed, the
// light (a ripple and a sweep), a CSS animation. Pressing again restarts
// the light (the attribute comes off, a reflow, and back on) rather than
// stacking a second one, and it comes off when the light ends. Only one
// button is pressed at a time. No timers. A pointer let go outside the
// window (it loses focus) lets go of the key too.
//
// The same effect starts the page's one-time arrival (arrive.ts), so it
// needs no client component of its own.
export default function GlassPress() {
  useEffect(() => {
    const stopArrivals = watchArrivals();
    let current: HTMLElement | null = null;
    let held: HTMLElement | null = null; // under a pointer that's still down

    const release = (el: HTMLElement) => {
      el.removeAttribute("data-pressed");
      if (held !== el) el.removeAttribute("data-held");
      if (current === el) current = null;
    };

    const letGo = () => {
      held?.removeAttribute("data-held");
      held = null;
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
      el.setAttribute("data-held", "");
      current = el;
    };

    const glassFrom = (target: EventTarget | null) => (target instanceof Element ? target.closest<HTMLElement>(".glass") : null);

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      const el = glassFrom(event.target);
      if (!el) return;
      letGo();
      press(el, event.clientX, event.clientY);
      if (el === current) held = el;
    };

    // A touch that turns into a scroll (or is otherwise taken over by the
    // browser) wasn't a press: let the button go at once
    const onPointerCancel = () => {
      letGo();
      if (current) release(current);
    };

    // A menu that closes as its row is chosen hides the row mid-press,
    // and a hidden element's animation may never report its end
    const onToggle = (event: Event) => {
      if (current && (event as ToggleEvent).newState === "closed" && event.target instanceof Node && event.target.contains(current)) release(current);
    };

    // detail 0: a click from the keyboard or assistive tech, not a pointer
    const onClick = (event: MouseEvent) => {
      if (event.detail !== 0) return;
      const el = glassFrom(event.target);
      if (el) press(el);
    };

    // The light (the ripple, or still view's tint) is the longest; when it
    // ends, or is cancelled (its page hidden), the press is over. A restart
    // cancels the old one too, but then a new one is already running: keep it.
    const light = /^glass-(ripple|tint)$/;
    const onEnd = (event: AnimationEvent) => {
      const el = event.target;
      if (!light.test(event.animationName) || !(el instanceof HTMLElement) || !el.hasAttribute("data-pressed")) return;
      if (event.type === "animationcancel" && el.getAnimations({ subtree: true }).some((a) => light.test((a as CSSAnimation).animationName))) return;
      release(el);
    };

    document.addEventListener("pointerdown", onPointerDown, { capture: true, passive: true });
    document.addEventListener("pointercancel", onPointerCancel, { capture: true, passive: true });
    document.addEventListener("pointerup", letGo, { capture: true, passive: true });
    document.addEventListener("toggle", onToggle, { capture: true });
    document.addEventListener("click", onClick, { capture: true });
    document.addEventListener("animationend", onEnd);
    document.addEventListener("animationcancel", onEnd);
    addEventListener("blur", letGo);
    return () => {
      stopArrivals();
      removeEventListener("blur", letGo);
      document.removeEventListener("pointerdown", onPointerDown, { capture: true });
      document.removeEventListener("pointercancel", onPointerCancel, { capture: true });
      document.removeEventListener("pointerup", letGo, { capture: true });
      document.removeEventListener("toggle", onToggle, { capture: true });
      document.removeEventListener("click", onClick, { capture: true });
      document.removeEventListener("animationend", onEnd);
      document.removeEventListener("animationcancel", onEnd);
    };
  }, []);

  return null;
}
