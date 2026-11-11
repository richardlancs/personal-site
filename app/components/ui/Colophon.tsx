import { profile } from "../../data/portfolio";
import { weatherProvider } from "../../data/weather";

const newTab = <span className="sr-only"> (opens in a new tab)</span>;

// The line at the foot of each page: the copyright, and the credit the
// weather data's licence asks for (the display in the corner shows its
// readings: components/weather/WeatherClock.tsx). The year is written out
// because the pages are pre-built as static HTML.
export default function Colophon() {
  return (
    <p className="location-footer">
      © 2026 {profile.name} · Weather by{" "}
      <a href={weatherProvider.url} target="_blank" rel="noopener noreferrer" className="text-link">
        {weatherProvider.name}
        {newTab}
      </a>{" "}
      (
      <a href={weatherProvider.licenceUrl} target="_blank" rel="noopener noreferrer" className="text-link">
        {weatherProvider.licence}
        {newTab}
      </a>
      )
    </p>
  );
}
