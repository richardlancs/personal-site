import { stations, stopNumber } from "../../sections/registry";

// The list of stations, in the hero under its links (sections/Hero.tsx):
// every stop after home, by number and title, each a glass key that
// jumps down the page to it. The plain way down the line, for every
// screen: on phones the metro line (MetroLine.tsx) isn't shown, and this
// and the Sections menu are how you get around.
export default function StationIndex() {
  return (
    <nav aria-label="Stations" className="station-index">
      <ol>
        {stations
          .filter((s) => s.id !== "home")
          .map((s) => (
            <li key={s.id}>
              <a href={s.href} className="glass">
                <span className="station-index-number">{stopNumber(s)}</span>
                {s.title}
              </a>
            </li>
          ))}
      </ol>
    </nav>
  );
}
