"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { HEIGHT, SEGMENT, WIDTH, stops as starts } from "./panorama";
import { SKY_DEPTH, TRACK_MIN, panoAt, panoKeys, parallax, scrollYForStop, stopAt, stopOffsets } from "./trackMath";
import WeatherOverlay from "./WeatherOverlay";

// The horizontal journey (city-track.css): the six stations side by side,
// one city you travel along. The page still scrolls down, as any page does
// (wheel, trackpad, keys, the scrollbar, touch); a tall runway holds a
// full-screen stage that stays put (sticky) while the track of stations in
// it moves left by exactly as much as the page has scrolled. Nothing here
// takes over a scroll: no wheel or touch listener, nothing prevented.
//
// <html data-track="on"> turns it on, set before the first paint by the
// head script (lib/track.ts) when scripts run and the screen is at least
// TRACK_MIN; without it the page reads top to bottom as stacked sections
// (and the head script falls back to that if this never runs). This sets
// the runway's height from the track's width (--travel: how far the
// track moves) and measures again whenever a stop or the stage changes
// size, keeping you at the same place in the same stop. Where the browser
// has scroll-driven animations the move is CSS (the runway's view
// timeline); elsewhere its scroll listener writes the transforms each
// frame (the track, the sky at 30% of its pace, the weather held still).
//
// It also carries what a sideways page needs: ArrowLeft/ArrowRight to the
// previous or next stop, an anchor (on load, a link, Back/Forward) to its
// stop, focus moved into a stop off the screen brings it on, and a
// sideways swipe (which no page scroll would answer) travels too. Jumps
// glide, except in still view, where they cut. Rain and snow are drawn
// once, over the whole stage (inside the track, held still against it).
//
// The city behind the stops is one panorama (`city`: DistrictBand.tsx,
// panorama.ts, given by the page),
// drawn as tall as its band and moved along with the journey, but by its
// own measure: each stop's start shows that stop's stretch of the city,
// and in between it moves straight from one to the next (panoKeys), so a
// row of panels several screens long passes slowly over its stretch and
// the whole track is city, end to end. In still view it moves with the
// street instead, cutting between stops (the keys are chosen again when
// still view is turned on or off). Where the move is CSS, these keys
// replace its keyframes (the runway's timeline, as the track's own).

let marks: number[] | null = null;
// Each stop's scroll position (the page's, not the runway's), while the
// journey is on: the progress line reads these as its sections' places
export const trackMarks = () => marks;

const SETTLE_MS = 150; // still this long, the journey has stopped
const FLING_MS = 280; // how far a released swipe glides, as time at its speed
// Where the arrows are someone else's: a field, a dialog, a menu
const SKIP = "input, textarea, select, [contenteditable], dialog, [popover]";

export default function CityTrack({ city, children }: { city: ReactNode; children: ReactNode }) {
  const runway = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const run = runway.current;
    const stage = run?.firstElementChild as HTMLElement | null;
    const track = stage?.querySelector<HTMLElement>(".track");
    if (!run || !stage || !track) return;
    const html = document.documentElement;
    const stops = [...track.querySelectorAll<HTMLElement>(":scope > .station")];
    const panels = track.querySelectorAll<HTMLElement>(".panel");
    const cssDriven = CSS.supports("animation-timeline: view()");
    const pano = stage.querySelector<HTMLElement>(".pano");
    let keys = { x: [0], p: [0] };
    let offsets = [0];
    let top = 0;
    let vw = 0;
    let travel = 0;
    let raf = 0;
    let aim = -1; // the stop a key's glide is heading for
    let aimTimer = 0;

    const on = () => html.dataset.track === "on";
    const still = () => html.dataset.still === "on";
    const along = () => Math.min(Math.max(scrollY - top, 0), travel);
    const glide = (x: number, instant = still()) => {
      scrollTo({ top: top + Math.min(Math.max(x, 0), travel), behavior: instant ? "instant" : "smooth" });
    };
    // Where to stop to show `el` (its panel, if it is in one): its stop's
    // start, unless that leaves it past the right edge (a stop of a row of
    // panels), then with that panel where the row's first one stands (the
    // row's own inset: clear of a notch; none for a phone's sheets)
    // (where it is laid out, --at, not where it is drawn: one still on its
    // way in is shifted by its arrival)
    const xFor = (el: Element, i: number) => {
      const p = (el.closest(".panel") ?? el) as HTMLElement;
      const x = parseFloat(p.style.getPropertyValue("--at")) || offsets[i];
      return x + Math.min(p.offsetWidth, vw) > offsets[i] + vw ? x - parseFloat(getComputedStyle(p.closest(".station-row") ?? p).paddingLeft) : offsets[i];
    };
    const stopOf = (el: Element) => stops.findIndex((s) => s.contains(el));

    // The stop an address names (#projects), or the panel in it (#skills,
    // a project), there
    const toHash = (hash: string, instant?: boolean) => {
      const el = document.getElementById(decodeURIComponent(hash.slice(1)) || "home");
      const i = el ? stopOf(el) : -1;
      if (el && i >= 0) glide(xFor(el, i), instant);
    };

    // A panel scrolls inside only if it has more than it shows, and only
    // once the journey has stopped with all of it on the screen (data-open).
    // While the city moves, no panel sliding under the pointer or the
    // finger can catch the scroll; over a panel half on, or one that fits,
    // it always moves the city. At its end an open panel hands the scroll
    // on (city-track.css: it chains), so the journey goes on.
    let settleTimer = 0;
    const settle = () => {
      for (const p of panels) {
        const r = p.getBoundingClientRect();
        p.toggleAttribute("data-open", r.left >= -1 && r.right <= vw + 1 && p.scrollHeight > p.clientHeight + 1);
      }
    };
    const sky = stage.firstElementChild as HTMLElement;
    const weather = track.lastElementChild as HTMLElement;
    const frame = () => {
      raf = 0;
      if (cssDriven) return;
      const x = along();
      track.style.transform = `translateX(${-x}px)`;
      weather.style.transform = `translateX(${x}px)`;
      // The sky lags (depth 0.7), but moves with the street in still view
      sky.style.transform = `translateX(${-parallax(x, still() ? 0 : SKY_DEPTH)}px)`;
      if (pano) pano.style.transform = `translateX(${-panoAt(x, keys)}px)`;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(frame);
      if (!settleTimer) for (const p of panels) p.removeAttribute("data-open");
      clearTimeout(settleTimer);
      settleTimer = window.setTimeout(() => {
        settleTimer = 0;
        settle();
      }, SETTLE_MS);
    };

    let first = true;
    const measure = () => {
      // The journey needs room; a fallback (the head script gave up) stays
      const fits = innerWidth >= TRACK_MIN.width && innerHeight >= TRACK_MIN.height;
      if (html.dataset.track !== "fallback") {
        if (fits) html.dataset.track = "on";
        else delete html.dataset.track;
      }
      if (!on()) {
        marks = null;
        run.style.removeProperty("--travel");
        return dispatchEvent(new Event("trackmeasure"));
      }
      // Where you were, in the old measure: which stop, and how far in
      const x = along();
      const i = stopAt(x, offsets);
      const f = offsets.length > 2 ? (x - offsets[i]) / (offsets[i + 1] - offsets[i] || 1) : 0;
      const before = offsets;
      vw = stage.clientWidth;
      offsets = stopOffsets(stops.map((s) => s.getBoundingClientRect().width));
      travel = Math.max(0, offsets[offsets.length - 1] - vw);
      run.style.setProperty("--travel", `${travel}px`);
      top = run.getBoundingClientRect().top + scrollY;
      marks = stops.map((_, k) => top + scrollYForStop(k, offsets, vw));
      if (pano) {
        keys = panoKeys(offsets, vw, pano.offsetHeight / HEIGHT, starts, WIDTH, SEGMENT, still());
        const move = pano.getAnimations().find((a) => a instanceof CSSAnimation)?.effect as KeyframeEffect | undefined;
        move?.setKeyframes(keys.x.map((x, k) => ({ transform: `translateX(${-keys.p[k]}px)`, offset: travel ? x / travel : 0 })));
      }
      // Each panel's place along the track (--at), where its arrival is
      // drawn on the runway's timeline (city-track.css, "Arrivals")
      for (const p of panels) {
        let x = 0;
        for (let e: HTMLElement | null = p; e && e !== track; e = e.offsetParent as HTMLElement | null) x += e.offsetLeft;
        p.style.setProperty("--at", `${x}px`);
      }
      html.setAttribute("data-track-ready", "");
      dispatchEvent(new Event("trackmeasure"));
      if (first) {
        first = false;
        // Opened on an anchor: straight there
        if (location.hash.length > 1) toHash(location.hash, true);
      } else if (before.length > 2 && before.some((o, k) => Math.abs(o - offsets[k]) > 0.5)) {
        // The stops changed size (a resize, a turn): the same place in the same stop
        glide(offsets[i] + f * (offsets[i + 1] - offsets[i]), true);
      }
      frame();
      settle();
    };

    const onKey = (e: KeyboardEvent) => {
      if (!on() || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      if ((e.target as Element).closest?.(SKIP)) return;
      const x = along();
      const at = aim >= 0 ? aim : stopAt(x, offsets);
      const back = aim >= 0 || x <= offsets[at] + 1 ? at - 1 : at;
      const next = Math.min(Math.max(e.key === "ArrowRight" ? at + 1 : back, 0), stops.length - 1);
      aim = next;
      clearTimeout(aimTimer);
      aimTimer = window.setTimeout(() => (aim = -1), 900);
      glide(scrollYForStop(next, offsets, vw));
    };

    // A link to a place on this page (the menu, the hero, the line): its
    // stop. The link itself still navigates (the address, the history);
    // this only moves the city, after it.
    const onClick = (e: MouseEvent) => {
      if (!on() || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element).closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || (a.target && a.target !== "_self")) return;
      const url = new URL(a.href);
      if (url.origin === location.origin && url.pathname === location.pathname && url.hash.length > 1) requestAnimationFrame(() => toHash(url.hash));
    };
    const onHash = () => on() && toHash(location.hash || "#home");

    // Focus moved into a stop that isn't on the screen (Tab, a jump)
    const onFocus = (e: FocusEvent) => {
      const el = e.target as Element;
      if (!on() || !(el instanceof HTMLElement) || !track.contains(el)) return;
      const r = el.getBoundingClientRect();
      const i = stopOf(el);
      if (i >= 0 && (r.left < 0 || r.right > vw)) glide(xFor(el, i));
    };

    // A sideways swipe: the page can only scroll down, so a finger moving
    // sideways would do nothing. It travels the city instead, as far as
    // the finger went, and a quick one glides on a little (not in still
    // view). Up and down are the browser's own (touch-action: pan-y), and
    // so is pinch zoom.
    let drag: { id: number; x: number; t: number; v: number } | null = null;
    const down = (e: PointerEvent) => {
      if (on() && e.pointerType === "touch" && e.isPrimary) drag = { id: e.pointerId, x: e.clientX, t: e.timeStamp, v: 0 };
    };
    const move = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.x;
      const dt = Math.max(1, e.timeStamp - drag.t);
      drag = { id: drag.id, x: e.clientX, t: e.timeStamp, v: -dx / dt };
      scrollBy({ top: -dx, behavior: "instant" });
    };
    const up = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id) return;
      const v = e.timeStamp - drag.t < 80 ? drag.v : 0;
      drag = null;
      if (e.type === "pointerup" && Math.abs(v) > 0.3 && !still()) scrollBy({ top: v * FLING_MS, behavior: "smooth" });
    };

    measure();
    const sizes = new ResizeObserver(() => measure());
    // Still view turned on or off: the panorama's other keys
    const stillness = new MutationObserver(() => measure());
    stillness.observe(html, { attributeFilter: ["data-still"] });
    sizes.observe(stage);
    // A stop that grows (its content), and a panel's words growing (fonts,
    // pictures, a fold opened): whether it scrolls inside is asked again
    for (const el of [...stops, ...track.querySelectorAll(".panel > *")]) sizes.observe(el);
    // Every listener, let go at once on unmount
    const off = new AbortController();
    const signal = off.signal;
    const passive = { passive: true, signal };
    addEventListener("scroll", onScroll, passive);
    addEventListener("keydown", onKey, { signal });
    addEventListener("hashchange", onHash, { signal });
    addEventListener("popstate", onHash, { signal });
    document.addEventListener("click", onClick, { signal });
    document.addEventListener("focusin", onFocus, { signal });
    stage.addEventListener("pointerdown", down, passive);
    stage.addEventListener("pointermove", move, passive);
    stage.addEventListener("pointerup", up, passive);
    stage.addEventListener("pointercancel", up, passive);

    return () => {
      off.abort();
      sizes.disconnect();
      stillness.disconnect();
      cancelAnimationFrame(raf);
      clearTimeout(aimTimer);
      clearTimeout(settleTimer);
      marks = null;
    };
  }, []);

  return (
    <div ref={runway} className="track-runway">
      <div className="track-stage">
        {/* The sky behind the city, slower than the street */}
        <div className="track-sky" aria-hidden="true" />
        {/* The city: the panorama behind every stop (DistrictBand) */}
        {city}
        <div className="track">
          {children}
          {/* Rain and snow, once, over the whole stage */}
          <div className="track-weather">
            <WeatherOverlay />
          </div>
        </div>
      </div>
    </div>
  );
}
