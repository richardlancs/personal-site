"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, type MouseEvent } from "react";
import { sectionForCityPath } from "../../lib/cityRoutes";
import { listed } from "../../sections/registry";
import { focusAnchor, isPlainClick, jumpHref } from "./jump";
import { useSection } from "./useSection";
import ViewSwitch from "./ViewSwitch";

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
//
// In the 3D city (/city/*) it is the city's places, named so: the menu is
// "Places in 3D", with that heading over the entries (city-pages.css; read
// out as the menu's name, so the heading itself is hidden from screen
// readers); every entry is that section's page there (registry: city), a
// plain navigation (the city moves focus itself), and the place whose page
// it is is the one marked. On both, its first entry, set apart from the
// sections, is the switch between the views (ViewSwitch.tsx), shown here
// only on screens too narrow for it in the bar. On `/` it renders exactly
// as before the city had a heading (tests/city3d-glass.test.mjs).
export default function SectionsMenu() {
  const nav = useRef<HTMLElement>(null);
  const pathname = usePathname();
  const city = pathname === "/city" || pathname.startsWith("/city/");
  const scrolled = useSection();
  const here = city ? sectionForCityPath(pathname) : scrolled;
  // In the city: close; the page's own navigation does the rest
  const close = () => nav.current?.hidePopover();
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
    <nav ref={nav} id="places-menu" popover="auto" aria-label={city ? "Places in 3D" : "Sections"} className="sections-menu">
      <ul>
        <li className="sections-menu-view">
          <ViewSwitch place="menu" />
        </li>
        {city && (
          <li className="sections-menu-heading" aria-hidden="true">
            Places in 3D
          </li>
        )}
        {listed.map((s) => (
          <li key={s.id}>
            <Link href={city ? s.city : jumpHref(s.href)} onClick={city ? close : go(jumpHref(s.href))} className="glass" aria-current={s.id === here ? (city ? "page" : "location") : undefined}>
              {s.title}
              {s.id === here && <span className="sections-menu-here" aria-hidden="true" />}
            </Link>
            {!city && s.subsections?.map((sub) => (
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
