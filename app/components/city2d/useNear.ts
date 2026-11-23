"use client";

import { useEffect, useState, type RefObject } from "react";

// Whether an element has come near the screen: false until then, true for
// good after. Every band below the first (DistrictBand.tsx) waits on this
// before mounting its plates, so the first view of `/` asks only for the
// paintings it shows.
//
// "Near" is on the screen, or, once the page has been scrolled (by hand,
// a jump down the page, or a deep link), within half a screen of it
// (down the stacked page, or along the journey: CityTrack.tsx). On a
// phone the next band starts just under the fold; looking ahead before
// any scroll would fetch it alongside the home plate, the page's largest
// paint. A band that is on the screen at once (a tall window) loads at
// once. On a deep link, nothing loads before the jump to it.
//
// One IntersectionObserver for the whole page, shared by every caller;
// each element is let go once it has been seen. Where there's no
// IntersectionObserver, everything counts as near.

const AHEAD = 0.5; // of the screen's height (or width, on the journey)
const ROOT_MARGIN = "50%";
const JUMP_WAIT = 1500; // ms: the longest a deep link's smooth jump is waited for

const waiting = new Map<Element, () => void>();
let observer: IntersectionObserver | null = null;
let scrolled = false;

function release(el: Element) {
  waiting.delete(el);
  observer?.unobserve(el);
}

// Both ways: the stacked page goes down, the journey (CityTrack.tsx) sideways
function within(el: Element, ahead: number) {
  const r = el.getBoundingClientRect();
  const m = window.innerHeight * ahead;
  const n = window.innerWidth * ahead;
  // (nothing hidden is near: a station's band on the journey, the journey's panorama off it)
  return r.width > 0 && r.bottom > -m && r.top < window.innerHeight + m && r.right > -n && r.left < window.innerWidth + n;
}

function arrive(el: Element) {
  waiting.get(el)?.();
  release(el);
}

// After the first scroll, look half a screen ahead, and again at every
// scroll while anything waits: the observer won't report again for bands
// already inside its margin, nor ever for the journey's tiles off the
// stage's edge (its clip hides them from it), which move with the scroll
function onFirstScroll() {
  scrolled = true;
  for (const el of [...waiting.keys()]) if (within(el, AHEAD)) arrive(el);
}

// Opened on a deep link (/#projects, …): the browser's jump to it can come
// after the observer's first report, while the page is still at the top,
// so until that first scroll nothing counts as near (the jump is a scroll)
function deepLink() {
  const id = decodeURIComponent(location.hash.slice(1));
  return id !== "" && id !== "home" && document.getElementById(id) !== null;
}

function watch(el: Element, onNear: () => void) {
  if (typeof IntersectionObserver === "undefined") {
    queueMicrotask(onNear);
    return;
  }
  if (!observer) {
    if (deepLink()) {
      // A deep link's jump is a smooth scroll (city.css), which may already
      // be under way: look once it ends, not at a step of it that still
      // has the top of the page in view (or after a moment, if it has
      // already ended or there's no scrollend)
      scrolled = false;
      const done = () => {
        window.removeEventListener("scrollend", done);
        clearTimeout(timer);
        if (!scrolled) onFirstScroll();
        window.addEventListener("scroll", onFirstScroll, { passive: true });
      };
      const timer = setTimeout(done, JUMP_WAIT);
      window.addEventListener("scrollend", done, { passive: true });
    } else {
      scrolled = window.scrollY > 0;
      window.addEventListener("scroll", onFirstScroll, { passive: true });
    }
    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && (scrolled || (!deepLink() && within(entry.target, 0)))) arrive(entry.target);
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
