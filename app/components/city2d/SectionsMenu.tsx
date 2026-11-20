"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { listed } from "../../sections/registry";

// The Sections menu under its button in the top bar (TopBar.tsx): every
// listed section from the registry, by its title, with a section's parts
// (Skills, under Projects) after it. Where you are is the chosen state
// (aria-current); choosing one closes the menu, since the page changes
// underneath it.
//
// It also measures the bar it sits in: the bar's real height (--bar-h,
// the page's scroll padding) and where the Sections button ends
// (--menu-top), written on <html>, so a jump to part of the page clears
// the bar and the menu opens under its button however the bar wraps or
// however large the text (city.css has fallbacks for before this runs).
export default function SectionsMenu() {
  const pathname = usePathname();
  const nav = useRef<HTMLElement>(null);
  const close = () => nav.current?.hidePopover();

  useEffect(() => {
    const bar = nav.current?.closest<HTMLElement>(".top-bar");
    const button = bar?.querySelector<HTMLElement>('[popovertarget="places-menu"]');
    if (!bar || !button) return;
    const html = document.documentElement;
    const measure = () => {
      html.style.setProperty("--bar-h", `${bar.offsetHeight}px`);
      // The bar is sticky at the top: the button's place in it is its
      // place on the screen
      html.style.setProperty("--menu-top", `${button.offsetTop + button.offsetHeight + 6}px`);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(bar);
    return () => observer.disconnect();
  }, []);

  return (
    <nav ref={nav} id="places-menu" popover="auto" aria-label="Sections" className="sections-menu">
      <ul>
        {listed.map((s) => (
          <li key={s.id}>
            <Link href={s.href} onClick={close} aria-current={pathname === s.href ? "page" : undefined} className="glass">
              {s.title}
            </Link>
            {s.subsections?.map((sub) => (
              <Link key={sub.href} href={sub.href} onClick={close} className="glass sections-menu-sub">
                {sub.title}
              </Link>
            ))}
          </li>
        ))}
      </ul>
    </nav>
  );
}
