"use client";

import { useEffect, useRef, useState, type CSSProperties, type MouseEvent } from "react";
import { FAST, lockedAt, progressAt, reached, shown, type Marks } from "../../lib/progress";
import { listed, sectionNumber } from "../../sections/registry";
import { REDUCED_MOTION } from "../../lib/still";
import { trackMarks, trackPlace, type TrackPlace } from "./CityTrack";
import { focusAnchor, isPlainClick, jumpHref } from "./jump";
import { setSection, useSection } from "./useSection";

// The metro map (city.css, "The metro map"): the journey's six stops as
// stations on one line along the foot of the screen, each a link named by
// its title (Home, About, …), the current one lit (aria-current="location":
// a larger, filled dot, as well as its colour). A fill runs along the line
// and follows the scroll continuously, so it is partway between two
// stations when the journey is partway between two stops, and runs back
// when you go back (lib/progress.ts). When the fill comes within a few
// percent of a station (either way) it locks on: it eases the last bit onto
// it over 0.12s, the station's dot pulses once, and it stays lit. Anywhere
// else it is exactly the scroll; in a fast scroll nothing is eased (a
// station it lands on may still pulse), so it never trails.
// The page's own scrolling is never touched: nothing here snaps, slows or
// redirects it; a station is a plain link to its anchor (CityTrack.tsx
// brings the stop on).
//
// On wide screens every station is named above its dot; on phones only
// the current one, beside its dot; on short screens (a phone on its side)
// the dots alone, the current name beside the row. It is drawn only on the
// journey (data-track="on"): read top to bottom, the Sections menu serves.
// The bar names the section in words too ("03 / 06 · Projects", from
// 56rem), and the panel you're at within it ("Projects · 2 of 5 Empyrean",
// "Projects · Skills") from CityTrack's "trackplace" event, which also
// says which section you're at while the journey runs: the panel whose
// middle has passed the screen's (the same list the snap points, the
// arrows and Page Down use), so the bar, the map and the menu agree. In still view and with reduced motion the fill steps from
// station to station and nothing pulses or eases.
//
// One passive scroll listener, throttled to animation frames, reads only
// scrollY; the stops' places are measured once and again only when the
// page or the bar changes size. It writes one variable, --progress (0 to
// 5), on its own element; CSS turns that into the fill's transform. The
// section reached is the page's one source of where you are (useSection).

// Only the sections that are listed (registry.ts): an unlisted one is on
// the page, but not pointed at
const points = listed;
const last = points.length - 1;
const anchorId = (hash: string) => hash || "home";

export default function ProgressLine() {
  const ref = useRef<HTMLElement>(null);
  const here = useSection();
  const hereIndex = Math.max(0, points.findIndex((s) => s.id === here));
  const at = points[hereIndex];
  const [place, setPlace] = useState<TrackPlace | null>(null);
  // The panel within the section, when it isn't the section itself
  const part =
    place && place.section === at.id && place.title !== at.title ? (place.n && place.of ? `${place.n} of ${place.of} ${place.title}` : place.title) : null;

  const go = (href: string) => (e: MouseEvent) => {
    if (!isPlainClick(e)) return;
    focusAnchor(href);
  };

  useEffect(() => {
    const line = ref.current;
    // A page without the sections (not found, an error): no line at all
    // (city.css hides it there too)
    if (!line || !document.getElementById("home")) return;
    const html = document.documentElement;
    const motion = matchMedia(REDUCED_MOTION);
    const sections = points.map((s) => document.getElementById(anchorId(s.hash)));
    const dots = [...line.querySelectorAll<HTMLElement>(".progress-point")];
    let marks: Marks = points.map(() => 0);
    let viewport = 1;
    let pageHeight = 1;
    let now = -1; // the section reached; none until the first frame
    let lastP = -1; // the scroll's place on the line last frame
    let lock: number | null = null; // the point the fill is locked onto
    let raf = 0;
    let settled = false; // no pulse for where the page opened (a deep link)
    let snapTimer = 0;
    let pulseTimer = 0;
    let pulsing: HTMLElement | undefined;
    let placed = false; // CityTrack says where you are (the journey)
    const toPlace = (detail: TrackPlace | null) => {
      if (!detail || !points.some((s) => s.id === detail.section)) return;
      placed = true;
      setPlace(detail);
      setSection(detail.section);
    };
    const onPlace = (event: Event) => toPlace((event as CustomEvent<TrackPlace>).detail);

    // The point's ring pulses once (not the one already pulsing)
    const pulse = (i: number) => {
      if (pulsing === dots[i]) return;
      pulsing?.removeAttribute("data-pulse");
      pulsing = dots[i];
      pulsing?.setAttribute("data-pulse", "");
      window.clearTimeout(pulseTimer);
      pulseTimer = window.setTimeout(() => {
        pulsing?.removeAttribute("data-pulse");
        pulsing = undefined;
      }, 200);
    };

    // Where each section starts, as the scroll that brings it under the
    // bar (a jump to its anchor lands exactly there), and the page's size.
    // On the journey (CityTrack.tsx), the scroll that brings each stop to
    // the left edge (trackMath.ts: scrollYForStop)
    const measure = () => {
      const offset = parseFloat(getComputedStyle(html).scrollPaddingTop) || 0;
      marks = trackMarks() ?? sections.map((el, i) => (i === 0 || !el ? 0 : Math.max(0, el.getBoundingClientRect().top + window.scrollY - offset)));
      viewport = window.innerHeight;
      pageHeight = html.scrollHeight;
    };

    const frame = () => {
      raf = 0;
      const p = progressAt(window.scrollY, marks, viewport, pageHeight);
      const before = now;
      now = reached(p, before < 0 ? Math.round(p) : before);
      const step = html.dataset.still === "on" || motion.matches;
      const value = step ? now : shown(p);
      const wasLocked = lock;
      lock = lockedAt(p);
      // Locked onto a point is reached: the point lights and its label
      // turns bold as the fill lands on it (reached's dead zone then holds
      // it while the page eases back off it)
      if (lock !== null && !step) now = lock;
      const moving = settled && !step && before >= 0;
      // A move this large since the last frame is a fast scroll
      const fast = lastP >= 0 && Math.abs(p - lastP) > FAST;
      lastP = p;
      if (moving && lock !== null && lock !== wasLocked) {
        // Arrived on a point: ease the last bit onto it (not in a fast
        // scroll, where the fill jumps with the page), and pulse it
        if (!fast) {
          line.dataset.snap = "";
          window.clearTimeout(snapTimer);
          snapTimer = window.setTimeout(() => delete line.dataset.snap, 130);
        }
        pulse(lock);
      } else if (lock === null || fast) {
        // Running between points: exactly the scroll, never eased
        window.clearTimeout(snapTimer);
        delete line.dataset.snap;
      }
      if (now !== before) {
        // Passed a point without landing on it (a fast scroll): it may
        // still pulse
        if (moving && lock === null) pulse(now);
        // (on the journey, CityTrack's event says where you are)
        if (!placed || html.dataset.track !== "on") setSection(points[now].id);
      }
      line.style.setProperty("--progress", String(Math.round(value * 10000) / 10000));
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(frame);
    };

    const remeasure = () => {
      measure();
      onScroll();
    };

    remeasure();
    // Jumps within the page glide only once it has loaded (city.css): the
    // browser's own jump to a deep link, on loading, is instant, so the
    // line arrives on its section at once rather than running up from
    // home; and nothing pulses before then (where the page opened, or the
    // browser putting a reloaded page back where it was)
    const land = () =>
      requestAnimationFrame(() => {
        html.setAttribute("data-landed", "");
        settled = true;
      });
    if (document.readyState === "complete") land();
    else window.addEventListener("load", land, { once: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", remeasure);
    window.addEventListener("trackmeasure", remeasure);
    window.addEventListener("trackplace", onPlace);
    // (one announced before this listened)
    toPlace(trackPlace());
    // The page grows as pictures load; the bar as it wraps
    const resize = new ResizeObserver(remeasure);
    const main = document.querySelector("main");
    if (main) resize.observe(main);
    const bar = line.closest(".top-bar");
    if (bar) resize.observe(bar);
    // Still view turned on or off: redraw at once (steps or the scroll);
    // the bar grown too tall to stay (data-bar-tall) changes where a jump
    // lands (--scroll-offset): measure again
    const still = new MutationObserver(remeasure);
    still.observe(html, { attributes: true, attributeFilter: ["data-still", "data-bar-tall"] });
    motion.addEventListener("change", onScroll);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", remeasure);
      window.removeEventListener("trackmeasure", remeasure);
      window.removeEventListener("trackplace", onPlace);
      window.removeEventListener("load", land);
      resize.disconnect();
      still.disconnect();
      motion.removeEventListener("change", onScroll);
      cancelAnimationFrame(raf);
      window.clearTimeout(snapTimer);
      window.clearTimeout(pulseTimer);
    };
  }, []);

  return (
    <>
      {/* The section you're at, in words, on mid-width screens. Not a
          control; hidden from assistive technology: the map's stations and
          the Sections menu mark it with aria-current="location", and words
          that change as the page scrolls would only be noise read out */}
      <p className="top-bar-here" aria-hidden="true">
        <span className="top-bar-here-number">
          {sectionNumber(at)} / {sectionNumber(points[last])}
        </span>
        <span className="top-bar-here-name">
          {" · "}
          {at.title}
          {part && ` · ${part}`}
        </span>
      </p>
      <nav ref={ref} aria-label="Page progress" className="progress-line" style={{ "--last": last } as CSSProperties}>
        <div className="progress-rail">
          <span className="progress-track" aria-hidden="true">
            <span className="progress-fill" />
          </span>
          <ol className="progress-points">
            {points.map((s, i) => (
              <li key={s.id}>
                <a
                  href={jumpHref(s.href)}
                  onClick={go(jumpHref(s.href))}
                  className="progress-point"
                  data-lit={i <= hereIndex ? "" : undefined}
                  aria-current={s.id === here ? "location" : undefined}
                >
                  <span className="progress-label">{s.title}</span>
                  <span className="progress-dot" aria-hidden="true" />
                </a>
              </li>
            ))}
          </ol>
        </div>
      </nav>
    </>
  );
}
