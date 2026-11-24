import Link from "next/link";
import { backgroundMusic, profile } from "../../data/portfolio";
import MusicToggle from "../MusicToggle";
import WeatherClock from "../weather/WeatherClock";
import ProgressLine from "./ProgressLine";
import SectionsMenu from "./SectionsMenu";

// The bar along the top of every page (city.css, "The top bar"): the
// name, the way home; the section you're at; Waterloo's time and
// weather, only to read; the Sections menu, built from the registry;
// and the music (its note, if the song can't load, hangs
// under its key); then the metro map, fixed along the foot of the screen
// (ProgressLine.tsx). It stays at the top while the page scrolls under
// it, clear of a notch.
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
        <button type="button" popoverTarget="places-menu" className="glass top-bar-sections">
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
          <span className="top-bar-sections-label">Sections</span>
        </button>
        <span className="top-bar-music">
          <MusicToggle backgroundMusic={backgroundMusic} />
        </span>
      </div>
      {/* The section you're at, in words on mid-width screens (drawn
          beside the name: city.css), and the metro map, fixed along the
          foot of the screen on the journey: after the bar's keys, so Tab
          reaches the bar's own keys first, then the map */}
      <ProgressLine />
      <SectionsMenu />
    </header>
  );
}
