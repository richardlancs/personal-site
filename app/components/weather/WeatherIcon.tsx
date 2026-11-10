import type { ReactNode } from "react";
import type { WeatherIconId } from "../../lib/sky";

// The weather in the corner, drawn the way the site's other small icons are
// (WorldControls.tsx, StillViewToggle.tsx): a 24-unit grid, 1.75 strokes,
// round ends and joins, in the text's colour. Always beside words that say
// the same thing, so it is hidden from screen readers.

// The cloud on its own, and higher up with something falling from it
const CLOUD = "M7.5 18.5a4 4 0 0 1-.6-7.96 5.5 5.5 0 0 1 10.6-1.1 4.55 4.55 0 0 1-.5 9.06Z";
const HIGH_CLOUD = "M7.5 14.5a3.5 3.5 0 0 1-.5-6.96 5 5 0 0 1 9.7-1 4 4 0 0 1-.7 7.96Z";
// A smaller cloud, lower right, in front of the sun or the moon
const FRONT_CLOUD = "M10 20.5a3.25 3.25 0 0 1-.4-6.47 4.5 4.5 0 0 1 8.7-.9 3.7 3.7 0 0 1-.3 7.37Z";
const MOON = "M19.5 14.2A7.5 7.5 0 0 1 9.8 4.5a7.75 7.75 0 1 0 9.7 9.7Z";

const ICONS: Record<WeatherIconId, ReactNode> = {
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.75v1.75M12 19.5v1.75M2.75 12H4.5M19.5 12h1.75M5.46 5.46l1.24 1.24M17.3 17.3l1.24 1.24M5.46 18.54l1.24-1.24M17.3 6.7l1.24-1.24" />
    </>
  ),
  moon: <path d={MOON} />,
  "partly-sun": (
    <>
      <path d="M8.5 2.75v1.5M3.25 8H4.75M4.8 4.3l1.05 1.05M12.2 4.3l-1.05 1.05" />
      <path d="M11.9 10.6A3.5 3.5 0 0 0 5.6 10.1" />
      <path d={FRONT_CLOUD} />
    </>
  ),
  "partly-moon": (
    <>
      {/* The moon, smaller and up to the left; its line drawn as thick
          as everywhere else */}
      <path d={MOON} transform="translate(0.4 0.6) scale(0.52)" strokeWidth={1.75 / 0.52} />
      <path d={FRONT_CLOUD} />
    </>
  ),
  cloud: <path d={CLOUD} />,
  fog: <path d="M3.5 8.5h12M6.5 12.5h14M3.5 16.5h10.5M17.5 16.5h1.5" />,
  drizzle: (
    <>
      <path d={HIGH_CLOUD} />
      <path d="M8.5 17.5v1M12 19v1M15.5 17.5v1" />
    </>
  ),
  rain: (
    <>
      <path d={HIGH_CLOUD} />
      <path d="M8.75 17 7.5 20.5M12.75 17l-1.25 3.5M16.75 17l-1.25 3.5" />
    </>
  ),
  "freezing-rain": (
    <>
      <path d={HIGH_CLOUD} />
      <path d="M8.5 17 7.25 20.5M16.5 17l-1.25 3.5" />
      <circle cx="11.9" cy="19.25" r="0.55" />
    </>
  ),
  snow: (
    <>
      <path d={HIGH_CLOUD} />
      <path d="M12 16.75v5M9.85 18l4.3 2.5M9.85 20.5l4.3-2.5" />
    </>
  ),
  thunder: (
    <>
      <path d={HIGH_CLOUD} />
      <path d="m12.75 15.5-2.5 3.5h3.25l-2.25 3.25" />
    </>
  ),
  // No reading, or a code the provider didn't define: an outline of a
  // cloud, broken, so it reads as "not known" rather than as weather
  unknown: <path d={CLOUD} strokeDasharray="2.6 2.4" />,
};

export default function WeatherIcon({ id, size = 18, className }: { id: WeatherIconId; size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      data-icon={id}
    >
      {ICONS[id] ?? ICONS.unknown}
    </svg>
  );
}

export const WEATHER_ICON_IDS = Object.keys(ICONS) as WeatherIconId[];
