"use client";

import { richmondHill } from "../../data/weather";
import { describeNow, splitMeridiem, type ClockText } from "./clockText";
import { useRichmondHill } from "./useRichmondHill";
import WeatherIcon from "./WeatherIcon";

// Richmond Hill's time and weather, in the corner beside the Sections
// menu (WorldControls.tsx): a small bubble of clear glass with the place,
// the time, and the weather as an icon, a temperature and a word. Only
// something to read: no button, no focus, no details to open, no press.
// The data's credit (Open-Meteo, CC BY 4.0) is in each page's footer
// (components/ui/Colophon.tsx).
//
// Nothing moves or shifts as values arrive: every field keeps its room
// (globals.css, "The Richmond Hill display"), and until the clock and the
// weather are known the room is drawn as a faint blank, never as a guess.
// The minute tick isn't announced: there is no live region here.
export default function WeatherClock() {
  const text = describeNow(useRichmondHill(), richmondHill.timeZone);

  return (
    <p className="rh" data-status={text.status}>
      <span className="rh-place">
        {richmondHill.name}
        <span className="rh-region">, {richmondHill.region}</span>
      </span>{" "}
      {/* The spaces between the fields are for reading aloud and copying;
          the layout (flex) doesn't draw them */}
      <Time time={text.time} datetime={text.datetime} />{" "}
      <span className="rh-weather">
        {text.icon ? <WeatherIcon id={text.icon} className="rh-icon" /> : <span className="rh-blank rh-blank-icon" />}
        <Weather text={text} />
      </span>
    </p>
  );
}

// The time with its AM/PM set a little smaller; a blank of the same width
// until the clock is known
function Time({ time, datetime }: { time: string | null; datetime: string | null }) {
  if (!time) return <span className="rh-time rh-blank rh-blank-time" />;
  const { digits, meridiem } = splitMeridiem(time);
  return (
    <time className="rh-time" dateTime={datetime ?? undefined}>
      {digits}
      {meridiem && <span className="rh-meridiem">{" " + meridiem}</span>}
    </time>
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
      {text.temperature && <Temperature value={text.temperature} className="rh-temp" />}{" "}
      {text.condition && <span className="rh-condition">{text.condition}</span>}{" "}
      {text.asOf && <span className="rh-asof">as of {text.asOf}</span>}
    </>
  );
}
