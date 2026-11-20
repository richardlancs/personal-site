"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { cityPath, twoDHref } from "../../lib/cityRoutes";
import { focusAnchor } from "./jump";
import { useSection } from "./useSection";
import { mayDrawWebGL } from "./webgl";

// The switch between the two views (city.css, "The view switch"). On the
// 2D page, "3D city": to the city's page for the section you're reading
// (useSection), never prefetched, and only shown where WebGL2 exists (its
// effect sets html[data-webgl2]; until then it keeps its space, hidden).
// On a /city page, "2D view": back to the same section's anchor, always
// shown. A plain link either way, frequently used, so it answers at once
// with no flourish (docs/ui/ux-motion-principles.md, 18).
//
// Two copies, one shown at a time (city.css): place="bar", the first key
// in the top bar on wide screens; place="menu", the first entry of the
// Sections menu below that width, so the bar never gains a row.
export default function ViewSwitch({ place }: { place: "bar" | "menu" }) {
  const pathname = usePathname();
  const here = useSection();
  const inCity = pathname === "/city" || pathname.startsWith("/city/");

  useEffect(() => {
    if (mayDrawWebGL()) document.documentElement.setAttribute("data-webgl2", "");
  }, []);

  // Back from the city to the 2D page ("2D view", Back, the menu): focus
  // goes to the section it lands on, as a jump's does (jump.ts), so the
  // keyboard carries on from there. (The city's own pages focus their
  // heading themselves: city3d/CityFocus.tsx.) Once, from the bar's copy.
  const previous = useRef(pathname);
  useEffect(() => {
    const from = previous.current;
    previous.current = pathname;
    if (place !== "bar" || from === pathname || pathname !== "/" || !(from === "/city" || from.startsWith("/city/"))) return;
    focusAnchor(location.hash);
  }, [pathname, place]);

  return inCity ? (
    <Link href={twoDHref(pathname)} className="glass view-switch" data-place={place} data-to="2d">
      {icon}
      2D view
    </Link>
  ) : (
    <Link href={cityPath(here)} prefetch={false} className="glass view-switch" data-place={place} data-to="3d">
      {icon}
      3D city
    </Link>
  );
}

// A cube: the city, or the way out of it
const icon = (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round">
    <path d="M12 3 4 7.5v9L12 21l8-4.5v-9L12 3zM4 7.5 12 12l8-4.5M12 12v9" />
  </svg>
);
