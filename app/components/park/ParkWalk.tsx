"use client";

import { useEffect, useRef } from "react";
import { WALK_CLASS, WALK_QUERY } from "./walk";

// Turns the sections into one sideways walk through the park.
//
// On big enough screens (WALK_QUERY) the sections sit side by side in a
// track pinned to the screen, and scrolling down slides the track left. The
// outer wrapper is made tall enough that the page's scroll reaches the far
// end of the track. Elsewhere the sections simply stack.
//
// In both layouts it also keeps in sync with the scroll position:
// - `--p` on <html>: how far through the park the visitor is, from 0 to 1,
//   which moves the sun and changes the sky (globals.css)
// - aria-current on the navbar link for the section on screen
//
// While walking sideways the view gets a horizontal motion blur that grows
// with speed. And it answers "park:goto" (sent by the clearing's paths) by
// jumping straight to a section, which then comes into focus.
export default function ParkWalk({ children }: { children: React.ReactNode }) {
  const outerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const outer = outerRef.current;
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!outer || !viewport || !track) return;
    const blur = document.getElementById("walk-blur-amount");

    const root = document.documentElement;
    const query = matchMedia(WALK_QUERY);
    const zones = Array.from(track.children) as HTMLElement[];
    const navLinks = Array.from(
      document.querySelectorAll<HTMLAnchorElement>("nav a[href^='#']"),
    );

    let sideways = false;
    let distance = 0; // how far the track slides, in px
    let frame = 0;
    let current: HTMLElement | undefined;
    let lastX = 0;
    let blurTimer = 0;

    const top = () => outer.getBoundingClientRect().top + window.scrollY;
    // The page scroll that puts a point of the track (px from its left edge)
    // at the left of the screen
    const scrollFor = (left: number) =>
      top() + Math.min(Math.max(left, 0), distance);

    function update() {
      frame = 0;
      const scrollable = root.scrollHeight - window.innerHeight;
      const progress = scrollable > 0 ? Math.min(window.scrollY / scrollable, 1) : 0;
      root.style.setProperty("--p", progress.toFixed(4));

      if (sideways) {
        const x = Math.min(Math.max(window.scrollY - top(), 0), distance);
        track!.style.transform = `translate3d(${-x}px, 0, 0)`;
        motionBlur(Math.abs(x - lastX));
        lastX = x;
      }

      // The section under the middle of the screen
      const midX = window.innerWidth / 2;
      const midY = window.innerHeight / 2;
      const here = zones.find((zone) => {
        const box = zone.getBoundingClientRect();
        return box.left <= midX && box.right > midX && box.top <= midY && box.bottom > midY;
      });
      if (here && here !== current) {
        current = here;
        for (const link of navLinks) {
          if (link.hash === `#${here.id}`) link.setAttribute("aria-current", "location");
          else link.removeAttribute("aria-current");
        }
      }
    }

    // `moved`: px the track slid since the last frame. Blur stays off at
    // walking pace so text is crisp, and clears as soon as movement stops.
    function motionBlur(moved: number) {
      const amount = Math.min(Math.max(moved - 10, 0) * 0.07, 3.5);
      if (!blur || amount < 0.4) return;
      blur.setAttribute("stdDeviation", `${amount.toFixed(1)} 0`);
      viewport!.style.filter = "url(#walk-blur)";
      window.clearTimeout(blurTimer);
      blurTimer = window.setTimeout(() => (viewport!.style.filter = ""), 90);
    }

    function measure() {
      sideways = query.matches;
      root.classList.toggle(WALK_CLASS, sideways);
      if (sideways) {
        distance = Math.max(track!.offsetWidth - window.innerWidth, 0);
        outer!.style.height = `${distance + window.innerHeight}px`;
      } else {
        distance = 0;
        outer!.style.height = "";
        track!.style.transform = "";
      }
      update();
    }

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    // Section links (navbar, buttons): native jumps can't reach a section
    // that is off to the side, so scroll to where the walk shows it.
    function onClick(event: MouseEvent) {
      if (!sideways || event.defaultPrevented) return;
      // (The clearing's own path links travel by themselves; see HubStage)
      const link = (event.target as Element).closest<HTMLAnchorElement>("a[href^='#']:not([data-hub])");
      const target = link && document.getElementById(link.hash.slice(1));
      const zone = target && zones.find((z) => z.contains(target));
      if (!link || !zone) return;
      event.preventDefault();
      window.scrollTo({ top: zone === zones[0] ? 0 : scrollFor(zone.offsetLeft), behavior: "smooth" });
      history.pushState(null, "", link.hash);
    }

    // Keyboard users: when Tab lands on something off to the side, walk to it.
    function onFocus(event: FocusEvent) {
      const element = event.target as HTMLElement;
      if (!sideways || !track!.contains(element)) return;
      const box = element.getBoundingClientRect();
      if (box.left >= 0 && box.right <= window.innerWidth) return;
      const zone = zones.find((z) => z.contains(element));
      if (!zone) return;
      const left = box.left - track!.getBoundingClientRect().left;
      // Show the section from its start when the element fits on that first
      // screen; otherwise bring the element in from the left.
      const fitsFirstScreen = left + box.width <= zone.offsetLeft + window.innerWidth - 32;
      window.scrollTo({ top: scrollFor(fitsFirstScreen ? zone.offsetLeft : left - 64) });
    }

    // Arriving down one of the clearing's paths
    function onGoto(event: Event) {
      const zone = zones.find((z) => z.id === (event as CustomEvent<string>).detail);
      if (!zone) return;
      const y = sideways
        ? scrollFor(zone.offsetLeft)
        : zone.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: y, behavior: "instant" });
      lastX = Math.max(y - top(), 0); // a jump, not a blur-worthy sprint
      history.pushState(null, "", `#${zone.id}`);
      update();
      zone.classList.remove("arriving");
      void zone.offsetWidth; // restart the animation if it's already there
      zone.classList.add("arriving");
      const done = (e: AnimationEvent) => {
        if (e.target !== zone) return;
        zone.classList.remove("arriving");
        zone.removeEventListener("animationend", done);
      };
      zone.addEventListener("animationend", done);
    }

    measure();

    // Arriving on a link like /#projects
    const arrival = location.hash && document.getElementById(location.hash.slice(1));
    const arrivalZone = arrival && zones.find((z) => z.contains(arrival));
    if (sideways && arrivalZone) {
      window.scrollTo({ top: scrollFor(arrivalZone.offsetLeft), behavior: "instant" });
    }

    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(track);
    query.addEventListener("change", measure);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("click", onClick);
    document.addEventListener("focusin", onFocus);
    window.addEventListener("park:goto", onGoto);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(blurTimer);
      window.removeEventListener("park:goto", onGoto);
      resizeObserver.disconnect();
      query.removeEventListener("change", measure);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("click", onClick);
      document.removeEventListener("focusin", onFocus);
    };
  }, []);

  return (
    <div ref={outerRef} className="walk">
      <div ref={viewportRef} className="walk-viewport">
        <div ref={trackRef} className="walk-track">
          {children}
        </div>
      </div>
    </div>
  );
}
