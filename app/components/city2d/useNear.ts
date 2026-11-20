"use client";

import { useEffect, useState, type RefObject } from "react";

// Whether an element has come near the screen: false until then, true for
// good after. Every band below the first (DistrictBand.tsx) waits on this
// before mounting its plates, so the first view of `/` asks only for the
// paintings it shows.
//
// "Near" is on the screen, or, once the page has been scrolled (by hand,
// a jump down the page, or a deep link), within half a screen of it. On a
// phone the next band starts just under the fold; looking ahead before
// any scroll would fetch it alongside the home plate, the page's largest
// paint. A band that is on the screen at once (a tall window) loads at
// once.
//
// One IntersectionObserver for the whole page, shared by every caller;
// each element is let go once it has been seen. Where there's no
// IntersectionObserver, everything counts as near.

const AHEAD = 0.5; // of the screen's height
const ROOT_MARGIN = "50% 0px";

const waiting = new Map<Element, () => void>();
let observer: IntersectionObserver | null = null;
let scrolled = false;

function release(el: Element) {
  waiting.delete(el);
  observer?.unobserve(el);
}

function within(el: Element, ahead: number) {
  const r = el.getBoundingClientRect();
  const m = window.innerHeight * ahead;
  return r.bottom > -m && r.top < window.innerHeight + m;
}

function arrive(el: Element) {
  waiting.get(el)?.();
  release(el);
}

// After the first scroll, look half a screen ahead (the observer won't
// report again for bands already inside its margin)
function onFirstScroll() {
  scrolled = true;
  for (const el of [...waiting.keys()]) if (within(el, AHEAD)) arrive(el);
}

function watch(el: Element, onNear: () => void) {
  if (typeof IntersectionObserver === "undefined") {
    queueMicrotask(onNear);
    return;
  }
  if (!observer) {
    scrolled = window.scrollY > 0;
    if (!scrolled) window.addEventListener("scroll", onFirstScroll, { once: true, passive: true });
    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && (scrolled || within(entry.target, 0))) arrive(entry.target);
        }
      },
      { rootMargin: ROOT_MARGIN },
    );
  }
  waiting.set(el, onNear);
  observer.observe(el);
}

export function useNear(ref: RefObject<Element | null>, always = false): boolean {
  const [near, setNear] = useState(always);
  useEffect(() => {
    const el = ref.current;
    if (near || !el) return;
    watch(el, () => setNear(true));
    return () => release(el);
  }, [near, ref]);
  return near;
}
