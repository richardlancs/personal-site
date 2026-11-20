import Link from "next/link";
import { profile } from "../../data/portfolio";
import WeatherClock from "../weather/WeatherClock";
import StillViewToggle from "../world/StillViewToggle";
import SectionsMenu from "./SectionsMenu";

// The bar along the top of every page (city.css, "The top bar"): the
// name, the way home; Richmond Hill's time and weather, only to read;
// the Sections menu, built from the registry; and Still view. It stays
// at the top while the page scrolls under it, clear of a notch.
export default function TopBar() {
  return (
    <header className="top-bar">
      <Link href="/" className="top-bar-name">
        {profile.name}
      </Link>
      <WeatherClock />
      <div className="top-bar-end">
        {/* A popover button: the browser exposes it as expanded or
            collapsed and returns focus to it when Escape closes the menu.
            No aria-haspopup: the menu is a list of links, not a menu widget */}
        <button type="button" popoverTarget="places-menu" className="glass">
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
          <span>Sections</span>
        </button>
        <StillViewToggle />
      </div>
      <SectionsMenu />
    </header>
  );
}
