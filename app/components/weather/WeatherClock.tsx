"use client";

import { richmondHill, weatherProvider } from "../../data/weather";
import { describeNow, splitMeridiem, type ClockText } from "./clockText";
import { useRichmondHill } from "./useRichmondHill";
import WeatherIcon from "./WeatherIcon";

const PLACE = `${richmondHill.name}, ${richmondHill.region}`;
const newTab = <span className="sr-only"> (opens in a new tab)</span>;

// Richmond Hill's time and weather, in the corner beside the Sections
// menu (WorldControls.tsx). One small button: the place, the time, and the
// weather as an icon, a temperature and a word. It opens a slip of paper
// with the details: sunrise and sunset, when the reading was taken and
// fetched, and where it comes from.
//
// Nothing moves or shifts as values arrive: every field keeps its room
// (globals.css, "The Richmond Hill display"), and until the clock and the
// weather are known the room is drawn as a faint blank, never as a guess.
// The minute tick changes the button's name but is not announced: there
// is no live region here.
export default function WeatherClock() {
  const text = describeNow(useRichmondHill(), PLACE, richmondHill.timeZone);

  return (
    <div className="rh" data-status={text.status}>
      {/* A popover button, like Sections: the browser says whether the
          details are open and gives focus back to it when Escape closes
          them. The details come straight after it in the reading order. */}
      <button type="button" popoverTarget="rh-details" className="control-tag rh-chip" aria-label={text.label}>
        <span className="rh-place">
          {richmondHill.name}
          <span className="rh-region">, {richmondHill.region}</span>
        </span>
        <Time time={text.time} className="rh-time" />
        <span className="rh-weather">
          {text.icon ? <WeatherIcon id={text.icon} className="rh-icon" /> : <span className="rh-blank rh-blank-icon" />}
          <Weather text={text} />
        </span>
      </button>

      <section id="rh-details" popover="auto" aria-labelledby="rh-details-place" className="rh-details">
        <p id="rh-details-place" className="rh-details-place">
          {PLACE}
        </p>
        {text.details.date && <p className="rh-details-date">{text.details.date}</p>}

        <p className="rh-details-now">
          <Time time={text.time} className="rh-details-time" />
          <span className="rh-details-weather">
            {text.icon && <WeatherIcon id={text.icon} size={22} />}
            {text.temperature && <Temperature value={text.temperature} className="rh-details-temp" />}
            {text.condition && <span>{text.condition}</span>}
          </span>
        </p>

        {text.details.note && (
          <p className="rh-details-note" data-status={text.status}>
            {text.details.note}
          </p>
        )}

        {(text.details.sunrise || text.details.observed) && (
          <dl className="rh-details-facts">
            {text.details.sunrise && <Fact term="Sunrise" value={text.details.sunrise} />}
            {text.details.sunset && <Fact term="Sunset" value={text.details.sunset} />}
            {text.details.observed && <Fact term="Observed" value={text.details.observed} />}
            {text.details.updated && <Fact term="Updated" value={text.details.updated} />}
          </dl>
        )}

        <p className="rh-details-credit">
          Weather data by{" "}
          <a href={weatherProvider.url} target="_blank" rel="noopener noreferrer" className="text-link">
            {weatherProvider.name}
            {newTab}
          </a>
          , under{" "}
          <a href={weatherProvider.licenceUrl} target="_blank" rel="noopener noreferrer" className="text-link">
            {weatherProvider.licence}
            {newTab}
          </a>
        </p>
      </section>
    </div>
  );
}

// The time with its AM/PM set a little smaller; a blank of the same width
// until the clock is known
function Time({ time, className }: { time: string | null; className: string }) {
  if (!time) return <span className={`${className} rh-blank rh-blank-time`} />;
  const { digits, meridiem } = splitMeridiem(time);
  return (
    <span className={className}>
      {digits}
      {meridiem && <span className="rh-meridiem">{" " + meridiem}</span>}
    </span>
  );
}

// "4 °C" with the degree sign drawn close: the text face sets "°" with
// wide margins of its own
function Temperature({ value, className }: { value: string; className: string }) {
  const match = /^(.*?)\s*°C$/.exec(value);
  if (!match) return <span className={className}>{value}</span>;
  return (
    <span className={className}>
      {match[1]}
      <span className="rh-unit">
        <span className="rh-degree">°</span>C
      </span>
    </span>
  );
}

function Weather({ text }: { text: ClockText }) {
  if (text.status === "loading")
    return (
      <>
        <span className="rh-blank rh-blank-temp" />
        <span className="rh-blank rh-blank-condition" />
      </>
    );
  if (text.status === "unavailable") return <span className="rh-condition">Weather unavailable</span>;
  return (
    <>
      {text.temperature && <Temperature value={text.temperature} className="rh-temp" />}
      {text.condition && <span className="rh-condition">{text.condition}</span>}
      {text.asOf && <span className="rh-asof">as of {text.asOf}</span>}
    </>
  );
}

function Fact({ term, value }: { term: string; value: string }) {
  return (
    <div>
      <dt>{term}</dt>
      <dd>{value}</dd>
    </div>
  );
}
