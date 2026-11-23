import type { Plate } from "../../lib/cityLook";
import { HEIGHT } from "./panorama";

// A tile's drawn width in the journey's panorama (DistrictBand.tsx), for
// next/image's srcset: as tall as the stage, or on phones and tall screens
// the strip at its top (city-track.css: --band-h, about 30% of the height
// and 64px). The head script (lib/platePreload.ts) picks the home tile's
// file by the same widths.
export const tileSizes = (w: number) => {
  const r = w / HEIGHT;
  return `(max-aspect-ratio: 1/1) calc(${+(r * 30).toFixed(2)}vh + ${Math.round(r * 64)}px), ${+(r * 100).toFixed(2)}vh`;
};

// The home tile is the page's largest paint, so it is asked for a little
// lighter: the head script's srcset (layout.tsx) and its own <img> both use
// it (next.config.ts allows both). The night photograph, all lit windows,
// costs more bytes at a quality than the day, so it is asked for lighter
// still: at 40 it is no heavier than the painted home plate it replaced was
// at 60 (task-3-report.md, "Fix round 1")
export const HOME_QUALITY: Record<Plate, number> = { day: 60, night: 40 };

// The home tile's plate as the head script (lib/platePreload.ts) fetched
// and painted it before hydration: which plate, and the exact file. The
// tile's <img> for that plate asks for this same file, so it comes from the
// cache and fades in over an identical picture. Null when the script did
// nothing (a deep link, no journey, no script support) or on the server.
export function paintedHomePlate(): { plate: Plate; src: string } | null {
  if (typeof document === "undefined") return null;
  const html = document.documentElement;
  const plate = html.getAttribute("data-home-plate");
  if (plate !== "day" && plate !== "night") return null;
  const src = /^url\("([^"]+)"\)$/.exec(html.style.getPropertyValue("--home-plate").trim())?.[1];
  return src ? { plate, src } : null;
}
