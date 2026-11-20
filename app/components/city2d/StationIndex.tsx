import { stations, stopNumber } from "../../sections/registry";

// The list of stations, in the hero under its links (sections/Hero.tsx):
// every stop after home, by number and title, each a glass key that
// jumps down the page to it. The plain way down the line where the metro
// line (MetroLine.tsx) isn't shown. Not on phones (under 480px; city.css):
// there the Sections menu at the top lists the same stops, and the list
// would be ten keys before any content.
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
