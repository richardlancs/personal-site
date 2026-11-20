import type { Plate } from "../../lib/cityLook";

// The home band's plate as the head script (lib/platePreload.ts) fetched
// and painted it before hydration: which plate, and the exact file. The
// band's <img> for that plate asks for this same file, so it comes from the
// cache and fades in over an identical picture. Null when the script did
// nothing (a deep link, no script support) or on the server.
export function paintedHomePlate(): { plate: Plate; src: string } | null {
  if (typeof document === "undefined") return null;
  const html = document.documentElement;
  const plate = html.getAttribute("data-home-plate");
  if (plate !== "day" && plate !== "night") return null;
  const src = /^url\("([^"]+)"\)$/.exec(html.style.getPropertyValue("--home-plate").trim())?.[1];
  return src ? { plate, src } : null;
}
