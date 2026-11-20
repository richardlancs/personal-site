"use client";

import { useEffect, useRef, type CSSProperties, type MouseEvent } from "react";
import { progressAt, reached, shown, type Marks } from "../../lib/progress";
import { pageSections, sectionNumber } from "../../sections/registry";
import { REDUCED_MOTION } from "../world3d/still";
import { focusAnchor, isPlainClick } from "./jump";
import { setSection, useSection } from "./useSection";

// The progress line (city.css, "The progress line"): one line with a point
// for each section, named by its title (Home, About, …). A fill runs along
// it and follows the scroll continuously, so it is partway between two
// points when the page is partway between two sections (lib/progress.ts).
// When the fill reaches a point it locks on: the fill eases onto the point
// (it holds there through a small dead zone rather than creeping), the
// point's ring pulses once and its label turns bold, and it stays lit.
// The page's own scrolling is never touched: nothing here snaps, slows or
// redirects it.
//
// From 97rem it stands in the right margin, labelled, each point a 44px
// link down the page; narrower, it is a 3px line along the foot of the
// top bar with six small ticks, not links (too small to tap: the Sections
// menu serves), and the bar names the section in words ("03 / 06 ·
// Projects", from 53rem). In still view and with reduced motion the fill
// steps from point to point and nothing pulses.
//
// One passive scroll listener, throttled to animation frames, reads only
// scrollY; the sections' places are measured once and again only when the
// page or the bar changes size. It writes one variable, --progress (0 to
// 5), on its own element; CSS turns that into the fill's transform. The
// section reached is the page's one source of where you are (useSection).

const last = pageSections.length - 1;
const anchorId = (hash: string) => hash || "home";

export default function ProgressLine() {
  const ref = useRef<HTMLElement>(null);
  const here = useSection();
  const hereIndex = Math.max(0, pageSections.findIndex((s) => s.id === here));
  const at = pageSections[hereIndex];

  const go = (href: string) => (e: MouseEvent) => {
    if (!isPlainClick(e)) return;
    focusAnchor(href);
  };

  useEffect(() => {
    const line = ref.current;
    if (!line) return;
    const html = document.documentElement;
    const motion = matchMedia(REDUCED_MOTION);
    const sections = pageSections.map((s) => document.getElementById(anchorId(s.hash)));
    const points = [...line.querySelectorAll<HTMLElement>(".progress-point")];
    let marks: Marks = pageSections.map(() => 0);
    let viewport = 1;
    let pageHeight = 1;
    let now = -1; // the section reached; none until the first frame
    let raf = 0;
    let settled = false; // no pulse for where the page opened (a deep link)
    let snapTimer = 0;
    let pulseTimer = 0;
    let pulsing: HTMLElement | undefined;

    // Where each section starts, as the scroll that brings it under the
    // bar (a jump to its anchor lands exactly there), and the page's size
    const measure = () => {
      const offset = parseFloat(getComputedStyle(html).scrollPaddingTop) || 0;
      marks = sections.map((el, i) => (i === 0 || !el ? 0 : Math.max(0, el.getBoundingClientRect().top + window.scrollY - offset)));
      viewport = window.innerHeight;
      pageHeight = html.scrollHeight;
    };

    const frame = () => {
      raf = 0;
      const p = progressAt(window.scrollY, marks, viewport, pageHeight);
      const before = now;
      now = reached(p, before < 0 ? Math.round(p) : before);
      const step = html.dataset.still === "on" || motion.matches;
      const value = step ? now : shown(p, now);
      if (now !== before) {
        if (before >= 0 && settled && !step) {
          // The fill eases onto (or off) the point, and the point pulses
          line.dataset.snap = "";
          window.clearTimeout(snapTimer);
          snapTimer = window.setTimeout(() => delete line.dataset.snap, 140);
          pulsing?.removeAttribute("data-pulse");
          pulsing = points[now];
          pulsing?.setAttribute("data-pulse", "");
          window.clearTimeout(pulseTimer);
          pulseTimer = window.setTimeout(() => pulsing?.removeAttribute("data-pulse"), 200);
        }
        setSection(pageSections[now].id);
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
    const settle = window.setTimeout(() => (settled = true), 500);
    // Jumps within the page glide only from now on (city.css): the
    // browser's own jump to a deep link, on loading, is instant, so the
    // line arrives on its section at once rather than running up from home
    const land = () => requestAnimationFrame(() => html.setAttribute("data-landed", ""));
    if (document.readyState === "complete") land();
    else window.addEventListener("load", land, { once: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", remeasure);
    // The page grows as pictures load; the bar as it wraps
    const resize = new ResizeObserver(remeasure);
    const main = document.querySelector("main");
    if (main) resize.observe(main);
    const bar = line.closest(".top-bar");
    if (bar) resize.observe(bar);
    // Still view turned on or off: redraw at once (steps or the scroll)
    const still = new MutationObserver(onScroll);
    still.observe(html, { attributes: true, attributeFilter: ["data-still"] });
    motion.addEventListener("change", onScroll);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", remeasure);
      window.removeEventListener("load", land);
      resize.disconnect();
      still.disconnect();
      motion.removeEventListener("change", onScroll);
      cancelAnimationFrame(raf);
      window.clearTimeout(settle);
      window.clearTimeout(snapTimer);
      window.clearTimeout(pulseTimer);
    };
  }, []);

  return (
    <>
      {/* The section you're at, in words, on mid-width screens. Not a
          control; hidden from assistive technology: the line's points and
          the Sections menu mark it with aria-current="location", and words
          that change as the page scrolls would only be noise read out */}
      <p className="top-bar-here" aria-hidden="true">
        <span className="top-bar-here-number">
          {sectionNumber(at)} / {sectionNumber(pageSections[last])}
        </span>
        <span className="top-bar-here-name"> · {at.title}</span>
      </p>
      <nav ref={ref} aria-label="Sections on this page" className="progress-line">
        <div className="progress-rail">
          <span className="progress-track" aria-hidden="true">
            <span className="progress-fill" />
          </span>
          <ol className="progress-points">
            {pageSections.map((s, i) => (
              <li key={s.id} style={{ "--i": i } as CSSProperties}>
                <a
                  href={s.href}
                  onClick={go(s.href)}
                  className="progress-point"
                  data-lit={i <= hereIndex ? "" : undefined}
                  aria-current={s.id === here ? "location" : undefined}
                >
                  <span className="progress-dot" aria-hidden="true" />
                  <span className="progress-label">{s.title}</span>
                </a>
              </li>
            ))}
          </ol>
        </div>
      </nav>
    </>
  );
}
