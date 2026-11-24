"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { pageSections, type SectionId } from "../../sections/registry";
import { focusPanel, panelOf } from "./jump";
import { glideEase, glideMs, glideOn, landing, nearestPlace, placeAt, scrollYForStop, stopAt, stopOffsets, trackFits } from "./trackMath";

// The horizontal journey (city-track.css): the six stations side by side,
// one long sheet you travel along. The page still scrolls down, as any page does
// (wheel, trackpad, keys, the scrollbar, touch); a tall runway holds a
// full-screen stage that stays put (sticky) while the track of stations in
// it moves left by exactly as much as the page has scrolled. Nothing here
// takes over a scroll: every wheel and pointer listener is passive, and
// none prevents anything.
//
// <html data-track="on"> turns it on, set before the first paint by the
// head script (lib/track.ts) when scripts run and the screen is at least
// TRACK_MIN; without it the page reads top to bottom as stacked sections
// (and the head script falls back to that if this never runs). This sets
// the runway's height from the track's width (--travel: how far the
// track moves) and measures again whenever a stop or the stage changes
// size, keeping you at the same place. Where the browser has
// scroll-driven animations the move is CSS (the runway's view timeline);
// elsewhere its scroll listener writes the track's transform each frame.
//
// The places: one per panel (each stop's, each project's, Skills'), where
// that panel stands in the middle of the screen (trackMath.ts). They are
// the page's snap targets (a zero-size .snap-mark in the runway at each:
// city-track.css snaps near one on a wide screen, onto one on the narrow
// layout), the keys' steps (ArrowLeft/Right, PageUp/PageDown, Space), and
// the bar's label (the "trackplace" event, as the nearest place changes).
//
// It also carries what a sideways page needs: an anchor (on load, a link,
// Back/Forward) to its panel, focus moved into a stop off the screen
// brings it on, and a sideways swipe or wheel (which no page scroll would
// answer) travels too, coming to rest on a place. Every jump, however far,
// glides along the city to its place (an eased glide, longer for a longer
// way but never past 1.6 s: trackMath.ts, glideMs), and gives way at once
// to your own scroll; with reduced motion (still view) every one cuts. A
// jump (a link, a key) takes focus to the panel it lands on.

let marks: number[] | null = null;
// Each stop's scroll position (the page's, not the runway's), while the
// journey is on: the metro map reads these as its sections' places
export const trackMarks = () => marks;

/** The bar's label (TopBar, ProgressLine): the "trackplace" event's detail, the place you're at */
export type TrackPlace = { section: SectionId; title: string; n?: number; of?: number };
let place: TrackPlace | null = null;
// The last one announced, for a listener that comes after it
export const trackPlace = () => place;

const SETTLE_MS = 150; // still this long, the journey has stopped
// Where the arrows are someone else's: a field, a dialog, a menu
const SKIP = "input, textarea, select, [contenteditable], dialog, [popover]";
// ...and Space, which presses these
const PRESS = "button, summary, [role=button]";

type Place = { x: number; panel: HTMLElement; stop: number; at: TrackPlace };

export default function CityTrack({ children }: { children: ReactNode }) {
  const runway = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const run = runway.current;
    const stage = run?.firstElementChild as HTMLElement | null;
    const track = stage?.querySelector<HTMLElement>(".track");
    const snaps = run?.querySelector<HTMLElement>(".track-snaps");
    if (!run || !stage || !track || !snaps) return;
    const html = document.documentElement;
    const stops = [...track.querySelectorAll<HTMLElement>(":scope > .station")];
    const panels = [...track.querySelectorAll<HTMLElement>(".panel")];
    const cssDriven = CSS.supports("animation-timeline: view()");
    const narrow = matchMedia("(max-aspect-ratio: 1 / 1)");
    const calm = matchMedia("(prefers-reduced-motion: reduce)");
    let offsets = [0];
    let places: Place[] = [];
    let top = 0;
    let vw = 0;
    let travel = 0;
    let raf = 0;
    let aim = -1; // the place a key's step is heading for
    let aimTimer = 0;
    // A jump under way (where to, along the track; its frame; the scroll it
    // last wrote)
    let pending = -1;
    let glideRaf = 0;
    let wrote = -1;

    const on = () => html.dataset.track === "on";
    const still = () => html.dataset.still === "on";
    const along = () => Math.min(Math.max(scrollY - top, 0), travel);
    const xs = () => places.map((p) => p.x);
    const stopGlide = () => {
      cancelAnimationFrame(glideRaf);
      glideRaf = 0;
      pending = -1;
      wrote = -1;
    };
    // A move along the track to x: a cut (still view, reduced motion), or
    // a glide, however far: one eased move a frame at a time (glideMs,
    // glideEase), the snapping let go meanwhile (data-free; it comes back
    // at settle, the glide resting exactly on its place). Your own scroll (a wheel, a finger, the scrollbar, a key) moves
    // the page from where the glide left it: the glide gives way at once.
    // A second call for the same place while
    // one is under way (a link's focus, its hash) is the same jump.
    const glide = (x: number, instant = still()) => {
      const to = Math.min(Math.max(x, 0), travel);
      const from = along();
      if (glideRaf && Math.abs(pending - to) < 1) return;
      if (Math.abs(to - from) < 1) return;
      // (sent on while under way: it carries straight on, never stopping to start again)
      const ease = glideRaf ? glideOn : glideEase;
      stopGlide();
      if (instant || calm.matches || document.hidden) return scrollTo({ top: top + to, behavior: "instant" });
      pending = to;
      html.setAttribute("data-free", "");
      const t0 = performance.now();
      const ms = glideMs(to - from, vw);
      const step = (t: number) => {
        glideRaf = 0;
        if (wrote >= 0 && Math.abs(scrollY - wrote) > 2) return stopGlide();
        const k = ease((t - t0) / ms);
        scrollTo({ top: top + from + (to - from) * k, behavior: "instant" });
        wrote = scrollY;
        if (k < 1) glideRaf = requestAnimationFrame(step);
        else stopGlide();
      };
      glideRaf = requestAnimationFrame(step);
    };
    // Where to stop to show `el` (its panel: panelOf): with that panel in
    // the middle of the screen, as it stands at its stop's start (a stop's
    // one panel) or in its own screen of a row (Projects), never before
    // the stop's start (a phone's sheets are the screen's width) (where it
    // is laid out, --at, not where it is drawn: one still on its way in is
    // shifted by its arrival)
    const xFor = (el: Element, i: number) => {
      const p = panelOf(el);
      const x = parseFloat(p.style.getPropertyValue("--at"));
      return Number.isNaN(x) ? offsets[i] : Math.max(offsets[i], x - (vw - Math.min(p.offsetWidth, vw)) / 2);
    };
    const stopOf = (el: Element) => stops.findIndex((s) => s.contains(el));

    // The stop an address names (#projects), or the panel in it (#skills,
    // a project), there; from a link, focus goes with it
    const toHash = (hash: string, instant?: boolean, focus = false) => {
      const el = document.getElementById(decodeURIComponent(hash.slice(1)) || "home");
      const i = el ? stopOf(el) : -1;
      if (!el || i < 0) return;
      glide(xFor(el, i), instant);
      if (focus) focusPanel(el);
    };

    // What each panel says while it overflows: a region in the Tab order
    // (named by its heading), so the keys can scroll it; at rest, it only
    // takes focus from a jump (tabIndex -1). What it had is put back.
    const had = new Map(panels.map((p) => [p, ["tabindex", "role", "aria-labelledby"].map((a) => p.getAttribute(a))] as const));
    const mark = (p: HTMLElement, scrolls: boolean) => {
      const [tab, role, label] = had.get(p)!;
      p.setAttribute("tabindex", scrolls ? "0" : (tab ?? "-1"));
      const region = scrolls && p.localName === "div";
      const head = p.querySelector("h1[id], h2[id], h3[id]");
      for (const [a, own, v] of [["role", role, "region"], ["aria-labelledby", label, head?.id]] as const) {
        if (region && !own && v) p.setAttribute(a, v);
        else if (own) p.setAttribute(a, own);
        else p.removeAttribute(a);
      }
    };

    // A panel scrolls inside only if it has more than it shows, and only
    // once the journey has stopped at its place (data-open). While the
    // city moves, no panel sliding under the pointer or the finger can
    // catch the scroll; over one between places, or one that fits, it
    // always moves the city. At its end an open panel hands the scroll on
    // (city-track.css: it chains), so the journey goes on. One well off
    // the screen starts again from its top.
    let settleTimer = 0;
    const settle = () => {
      const x = along();
      for (const { x: px, panel: p } of places) {
        const scrolls = p.scrollHeight > p.clientHeight + 1;
        mark(p, scrolls);
        p.toggleAttribute("data-open", scrolls && Math.abs(x - px) <= 2);
        const r = p.getBoundingClientRect();
        if (r.right < -vw || r.left > 2 * vw) p.scrollTop = 0;
      }
    };
    // The place you're at, for the bar's label: announced as it changes
    let now = -1;
    const announce = () => {
      if (!places.length) return;
      const k = nearestPlace(along(), xs());
      if (k === now) return;
      now = k;
      place = places[k].at;
      dispatchEvent(new CustomEvent("trackplace", { detail: place }));
    };
    const frame = () => {
      raf = 0;
      announce();
      if (cssDriven) return;
      track.style.transform = `translateX(${-along()}px)`;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(frame);
      if (!settleTimer) for (const p of panels) p.removeAttribute("data-open");
      clearTimeout(settleTimer);
      settleTimer = window.setTimeout(() => {
        settleTimer = 0;
        // (a glide that paused a moment is still under way)
        if (glideRaf) return;
        pending = -1;
        if (free < 0) html.removeAttribute("data-free");
        settle();
      }, SETTLE_MS);
    };

    let first = true;
    const measure = () => {
      // The journey needs room; a fallback (the head script gave up) stays
      const fits = trackFits(innerWidth, innerHeight, parseFloat(getComputedStyle(html).fontSize));
      if (html.dataset.track !== "fallback") {
        if (fits) html.dataset.track = "on";
        else delete html.dataset.track;
      }
      if (!on()) {
        marks = null;
        places = [];
        snaps.replaceChildren();
        run.style.removeProperty("--travel");
        return dispatchEvent(new Event("trackmeasure"));
      }
      // Where you were, in the old measure: at a place (kept), or which
      // stop and how far in
      const x = along();
      const was = places.findIndex((p) => Math.abs(p.x - x) <= 2);
      const i = stopAt(x, offsets);
      const f = offsets.length > 2 ? (x - offsets[i]) / (offsets[i + 1] - offsets[i] || 1) : 0;
      const before = offsets;
      vw = stage.clientWidth;
      offsets = stopOffsets(stops.map((s) => s.getBoundingClientRect().width));
      travel = Math.max(0, offsets[offsets.length - 1] - vw);
      run.style.setProperty("--travel", `${travel}px`);
      top = run.getBoundingClientRect().top + scrollY;
      marks = stops.map((_, k) => top + scrollYForStop(k, offsets, vw));
      // Each panel's place along the track (--at), where its arrival is
      // drawn on the runway's timeline (city-track.css, "Arrivals")
      for (const p of panels) {
        let x = 0;
        for (let e: HTMLElement | null = p; e && e !== track; e = e.offsetParent as HTMLElement | null) x += e.offsetLeft;
        p.style.setProperty("--at", `${x}px`);
      }
      // The places, from the panels' --at, and a snap target at each
      const rows = new Map<number, HTMLElement[]>();
      places = panels.map((p) => {
        const stop = stopOf(p);
        const s = pageSections[stop];
        const sub = s.subsections?.find((u) => u.href === `/#${p.id}`);
        const at: TrackPlace = { section: s.id, title: sub?.title ?? s.title };
        if (p.matches("article")) {
          const row = rows.get(stop) ?? [...stops[stop].querySelectorAll<HTMLElement>("article.panel")];
          rows.set(stop, row);
          // (its name as read: the heading less its number, hidden from assistive technology)
          const name = [...(p.querySelector("h3")?.childNodes ?? [])].filter((c) => !(c instanceof Element && c.getAttribute("aria-hidden") === "true"));
          Object.assign(at, { title: name.map((c) => c.textContent).join("").trim() || s.title, n: row.indexOf(p) + 1, of: row.length });
        }
        return { x: Math.min(Math.max(xFor(p, stop), 0), travel), panel: p, stop, at };
      });
      while (snaps.children.length < places.length) snaps.append(Object.assign(document.createElement("div"), { className: "snap-mark" }));
      while (snaps.children.length > places.length) snaps.lastElementChild!.remove();
      places.forEach((p, k) => {
        const m = snaps.children[k] as HTMLElement;
        m.dataset.for = p.panel.id || stops[p.stop].id;
        m.style.top = `${p.x}px`;
      });
      html.setAttribute("data-track-ready", "");
      dispatchEvent(new Event("trackmeasure"));
      if (first) {
        first = false;
        // Opened on an anchor: straight there
        if (location.hash.length > 1) toHash(location.hash, true);
      } else if (was >= 0 && places[was]) {
        // At a place: the same place, at once
        glide(places[was].x, true);
      } else if (before.length > 2 && before.some((o, k) => Math.abs(o - offsets[k]) > 0.5)) {
        // The stops changed size (a resize, a turn): the same place in the same stop
        glide(offsets[i] + f * (offsets[i + 1] - offsets[i]), true);
      }
      now = -1;
      frame();
      settle();
    };

    // The keys, one place a step: ArrowLeft/ArrowRight, and PageUp/
    // PageDown and Space (Shift+Space back), which first scroll a long
    // panel that holds the focus, to its end; focus goes with the step
    const onKey = (e: KeyboardEvent) => {
      if (!on() || e.altKey || e.ctrlKey || e.metaKey || !places.length) return;
      const arrow = e.key === "ArrowLeft" || e.key === "ArrowRight";
      const page = e.key === "PageDown" || e.key === "PageUp" || e.key === " ";
      if (!(arrow || page) || (e.shiftKey && e.key !== " ")) return;
      const t = e.target as Element;
      if (t.closest?.(SKIP) || (e.key === " " && t.closest?.(PRESS))) return;
      const dir = e.key === "ArrowRight" || e.key === "PageDown" || (e.key === " " && !e.shiftKey) ? 1 : -1;
      if (page) {
        const box = t.closest?.(".panel") as HTMLElement | null;
        if (box && box.scrollHeight > box.clientHeight + 1 && (dir > 0 ? box.scrollTop + box.clientHeight < box.scrollHeight - 1 : box.scrollTop > 0)) {
          // An open one scrolls (the browser's own); one still on its way there waits
          if (box.hasAttribute("data-open")) return;
          if (aim >= 0 && places[aim]?.panel === box) return e.preventDefault();
        }
        e.preventDefault();
      }
      const x = along();
      const at = aim >= 0 ? aim : placeAt(x, xs());
      const back = aim >= 0 || x <= places[at].x + 1 ? at - 1 : at;
      const next = Math.min(Math.max(dir > 0 ? at + 1 : back, 0), places.length - 1);
      aim = next;
      clearTimeout(aimTimer);
      aimTimer = window.setTimeout(() => (aim = -1), 900);
      glide(places[next].x, still());
      focusPanel(places[next].panel);
    };

    // A link to a place on this page (the menu, the hero, the line, a
    // panel's "Next"): its panel, and focus with it. The link itself still
    // navigates (the address, the history); this only moves the city,
    // after it.
    const onClick = (e: MouseEvent) => {
      if (!on() || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element).closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || (a.target && a.target !== "_self")) return;
      const url = new URL(a.href);
      if (url.origin === location.origin && url.pathname === location.pathname && url.hash.length > 1) requestAnimationFrame(() => toHash(url.hash, undefined, true));
    };
    // (a frame later: after the browser's own move to the anchor, which
    // the glide's first frame then overrides)
    const onHash = () => on() && requestAnimationFrame(() => toHash(location.hash || "#home"));

    // Focus moved into a stop that isn't on the screen (Tab, a jump)
    const onFocus = (e: FocusEvent) => {
      const el = e.target as Element;
      if (!on() || !(el instanceof HTMLElement) || !track.contains(el)) return;
      const r = el.getBoundingClientRect();
      const i = stopOf(el);
      if (i >= 0 && (r.left < 0 || r.right > vw)) glide(xFor(el, i), still());
    };

    // Sideways input, which the page's own scroll (down) would never
    // answer: a finger moving sideways on the stage (up and down are the
    // browser's, touch-action: pan-y, and so is pinch zoom), and a
    // trackpad's sideways swipe or a tilt wheel (only where it is mostly
    // sideways, and not over something that scrolls sideways itself; with
    // overscroll-behavior-x: none on the page, so a swipe never goes Back).
    // It travels the city as far as it went, the snapping let go meanwhile
    // (data-free), and when it is let go it comes to rest on a place
    // (landing): on the narrow layout the next one the way it went; on a
    // wide screen the nearest, if near. No fling: it never goes on past.
    let free = -1; // where the sideways move started, while it goes on
    let wheelTimer = 0;
    const loose = () => {
      if (free >= 0) return;
      free = along();
      html.setAttribute("data-free", "");
    };
    const land = () => {
      if (free < 0) return;
      const from = free;
      free = -1;
      // (the snapping comes back once it has landed, at settle: back at
      // once, it would pull the glide to the nearest place)
      const k = landing(from, along(), xs(), narrow.matches, vw * 0.3);
      if (k !== null) glide(places[k].x, still());
      if (k === null || Math.abs(places[k].x - along()) < 1) html.removeAttribute("data-free");
    };
    const sideways = (t: EventTarget | null) => {
      for (let el = t instanceof Element ? t : null; el && el !== track; el = el.parentElement)
        if (el.scrollWidth > el.clientWidth + 1 && /auto|scroll/.test(getComputedStyle(el).overflowX)) return true;
      return false;
    };
    const onWheel = (e: WheelEvent) => {
      if (!on() || e.ctrlKey || Math.abs(e.deltaX) <= Math.abs(e.deltaY) || sideways(e.target)) return;
      loose();
      scrollBy({ top: e.deltaX * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? vw : 1), behavior: "instant" });
      clearTimeout(wheelTimer);
      wheelTimer = window.setTimeout(land, SETTLE_MS);
    };
    let drag: { id: number; x: number } | null = null;
    const down = (e: PointerEvent) => {
      if (on() && e.pointerType === "touch" && e.isPrimary) drag = { id: e.pointerId, x: e.clientX };
    };
    const move = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.x;
      drag.x = e.clientX;
      if (!dx) return;
      loose();
      scrollBy({ top: -dx, behavior: "instant" });
    };
    const up = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id) return;
      drag = null;
      land();
    };

    // The page opens on Home, never where the browser last left it (the
    // head script's, lib/track.ts, for a page arrived at in the app too);
    // put back on leaving, for the page after it
    history.scrollRestoration = "manual";
    measure();
    const sizes = new ResizeObserver(() => measure());
    sizes.observe(stage);
    // A stop that grows (its content), and a panel's words growing (fonts,
    // pictures, a fold opened): whether it scrolls inside is asked again
    for (const el of [...stops, ...track.querySelectorAll(".panel > *")]) sizes.observe(el);
    // Every listener, let go at once on unmount
    const off = new AbortController();
    const signal = off.signal;
    const passive = { passive: true, signal };
    addEventListener("scroll", onScroll, passive);
    addEventListener("wheel", onWheel, passive);
    // Your own hand on the page (a wheel, a finger, the scrollbar) ends a
    // glide at once, even before its first frame has moved anything
    const takeOver = () => glideRaf && stopGlide();
    addEventListener("wheel", takeOver, passive);
    addEventListener("pointerdown", takeOver, passive);
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
      cancelAnimationFrame(raf);
      cancelAnimationFrame(glideRaf);
      for (const t of [aimTimer, settleTimer, wheelTimer]) clearTimeout(t);
      for (const p of panels) {
        const [tab, role, label] = had.get(p)!;
        for (const [a, v] of [["tabindex", tab], ["role", role], ["aria-labelledby", label]] as const) {
          if (v === null) p.removeAttribute(a);
          else p.setAttribute(a, v);
        }
      }
      snaps.replaceChildren();
      history.scrollRestoration = "auto";
      marks = null;
      place = null;
      // Gone from the page (another route): the page there reads as any
      // page does (a fallback, the head script's for the visit, stays)
      if (on()) delete html.dataset.track;
      for (const a of ["data-track-ready", "data-free"]) html.removeAttribute(a);
    };
  }, []);

  return (
    <div ref={runway} className="track-runway">
      <div className="track-stage">
        <div className="track">{children}</div>
      </div>
      {/* The snap targets, one at each place (measure fills it) */}
      <div className="track-snaps" aria-hidden="true" />
    </div>
  );
}
