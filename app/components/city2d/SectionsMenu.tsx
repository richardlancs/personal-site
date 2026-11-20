"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { listed } from "../../sections/registry";

// The Sections menu under its button in the top bar (TopBar.tsx): every
// listed section from the registry, by its title, with a section's parts
// (Skills, under Projects) after it. Every section is on the one page, so
// an entry is a jump to its anchor: choosing one closes the menu and moves
// focus to that section (each can take focus, tabIndex -1), so the
// keyboard carries on from there. Where you are isn't marked yet.
//
// It also measures the bar it sits in: the bar's real height (--bar-h,
// the page's scroll padding) and where the Sections button ends
// (--menu-top), written on <html>, so a jump to part of the page clears
// the bar and the menu opens under its button however the bar wraps or
// however large the text (city.css has fallbacks for before this runs).
// When the bar is taller than a quarter of the screen (very large text on
// a phone) it stops being sticky (data-bar-tall), so it doesn't cover the
// page; it scrolls away with the top of the page instead.
export default function SectionsMenu() {
  const nav = useRef<HTMLElement>(null);
  // Close, then hand focus to the section (the link's own navigation
  // scrolls to the anchor; home is the top of the page, so its focus
  // scrolls there too)
  const go = (href: string) => () => {
    nav.current?.hidePopover();
    const hash = href.split("#")[1];
    document.getElementById(hash || "home")?.focus({ preventScroll: Boolean(hash) });
  };

  useEffect(() => {
    const bar = nav.current?.closest<HTMLElement>(".top-bar");
    const button = bar?.querySelector<HTMLElement>('[popovertarget="places-menu"]');
    if (!bar || !button) return;
    const html = document.documentElement;
    const measure = () => {
      html.style.setProperty("--bar-h", `${bar.offsetHeight}px`);
      html.toggleAttribute("data-bar-tall", bar.offsetHeight > window.innerHeight / 4);
      // The bar is sticky at the top: the button's place in it is its
      // place on the screen
      html.style.setProperty("--menu-top", `${button.offsetTop + button.offsetHeight + 6}px`);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(bar);
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
            <Link href={s.href} onClick={go(s.href)} className="glass">
              {s.title}
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
