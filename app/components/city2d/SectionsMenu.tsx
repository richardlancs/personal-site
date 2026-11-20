"use client";

import Link from "next/link";
import { useEffect, useRef, type MouseEvent } from "react";
import { listed } from "../../sections/registry";
import { focusAnchor, isPlainClick, jumpHref } from "./jump";
import { useSection } from "./useSection";

// The Sections menu under its button in the top bar (TopBar.tsx): every
// listed section from the registry, by its title, with a section's parts
// (Skills, under Projects) after it. Every section is on the one page, so
// an entry is a jump to its anchor: choosing one closes the menu and moves
// focus to that section (each can take focus, tabIndex -1), so the
// keyboard carries on from there (jump.ts). A click with a modifier key
// or the middle button is left to the browser. The section you're at
// (useSection.ts, from the progress line) is marked: aria-current="location", and a filled dot as
// well as the chosen glass, so not by colour alone.
//
// It also measures the bar it sits in: the bar's real height (--bar-h,
// the page's scroll padding) and where the Sections button ends
// (--menu-top), written on <html>, so a jump to part of the page clears
// the bar and the menu opens under its button however the bar wraps or
// however large the text (city.css has fallbacks for before this runs).
// When the bar is taller than a quarter of the screen (very large text on
// a phone) it stops being sticky (data-bar-tall), so it doesn't cover the
// page; it scrolls away with the top of the page instead. It only goes
// back to sticky once the bar is clearly shorter (under 22%), so a phone's
// toolbar coming and going (the screen's height changing by a little) can't
// flip it back and forth mid-scroll.
export default function SectionsMenu() {
  const nav = useRef<HTMLElement>(null);
  const here = useSection();
  // Close, then hand focus to the section
  const go = (href: string) => (e: MouseEvent) => {
    if (!isPlainClick(e)) return;
    nav.current?.hidePopover();
    focusAnchor(href);
  };

  useEffect(() => {
    const bar = nav.current?.closest<HTMLElement>(".top-bar");
    const button = bar?.querySelector<HTMLElement>('[popovertarget="places-menu"]');
    if (!bar || !button) return;
    const html = document.documentElement;
    const measure = () => {
      html.style.setProperty("--bar-h", `${bar.offsetHeight}px`);
      const h = bar.offsetHeight;
      const tall = html.hasAttribute("data-bar-tall");
      if (!tall && h > window.innerHeight * 0.25) html.setAttribute("data-bar-tall", "");
      else if (tall && h < window.innerHeight * 0.22) html.removeAttribute("data-bar-tall");
      // The bar is sticky at the top: the button's place in it is its
      // place on the screen
      html.style.setProperty("--menu-top", `${button.offsetTop + button.offsetHeight + 6}px`);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(bar, { box: "border-box" });
    // The screen's height matters too (a phone turned, the toolbar)
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  return (
    <nav ref={nav} id="places-menu" popover="auto" aria-label="Sections" className="sections-menu">
      <ul>
        {listed.map((s) => (
          <li key={s.id}>
            <Link href={jumpHref(s.href)} onClick={go(jumpHref(s.href))} className="glass" aria-current={s.id === here ? "location" : undefined}>
              {s.title}
              {s.id === here && <span className="sections-menu-here" aria-hidden="true" />}
            </Link>
            {s.subsections?.map((sub) => (
              <Link key={sub.href} href={sub.href} onClick={go(sub.href)} className="glass sections-menu-sub">
                {sub.title}
              </Link>
            ))}
          </li>
        ))}
      </ul>
    </nav>
  );
}
