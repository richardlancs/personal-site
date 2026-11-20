import type { StaticImageData } from "next/image";
import type { DistrictId } from "../../sections/registry";
import bundDay from "../../assets/city/bund-day.webp";
import bundNight from "../../assets/city/bund-night.webp";
import longtangDay from "../../assets/city/longtang-day.webp";
import longtangNight from "../../assets/city/longtang-night.webp";
import lujiazuiDay from "../../assets/city/lujiazui-day.webp";
import lujiazuiNight from "../../assets/city/lujiazui-night.webp";
import metroDay from "../../assets/city/metro-day.webp";
import metroNight from "../../assets/city/metro-night.webp";
import nanjingRoadDay from "../../assets/city/nanjing-road-day.webp";
import nanjingRoadNight from "../../assets/city/nanjing-road-night.webp";
import towersDay from "../../assets/city/towers-day.webp";
import towersNight from "../../assets/city/towers-night.webp";

// Each district's two paintings, one composition by day and by night
// (docs/city/style.md; how they were made: docs/city/prompts.md). Static
// imports, so next/image knows their size and a blurred placeholder.
export const plates: Record<DistrictId, { day: StaticImageData; night: StaticImageData }> = {
  lujiazui: { day: lujiazuiDay, night: lujiazuiNight },
  longtang: { day: longtangDay, night: longtangNight },
  towers: { day: towersDay, night: towersNight },
  metro: { day: metroDay, night: metroNight },
  "nanjing-road": { day: nanjingRoadDay, night: nanjingRoadNight },
  bund: { day: bundDay, night: bundNight },
};

// Where each painting's subject sits, as an object-position: on phones the
// band is a 4:3 crop of the 21:9 plate (about 57% of its width), and this
// keeps the subject in it. Both plates of a district share it (they line
// up). Wide screens see the whole width, so only the crop uses it.
export const focal: Record<DistrictId, string> = {
  lujiazui: "65% 50%", // the Pearl Tower and Shanghai Tower
  longtang: "45% 50%", // the lit window and the lane
  towers: "50% 50%", // the three towers
  metro: "25% 50%", // the train and the board
  "nanjing-road": "60% 50%", // the vanishing point and the tram
  bund: "45% 50%", // the clock tower and the kiosk
};

// How wide a band's plate is drawn, for next/image's srcset choice. Under
// 768px the band is a 4:3 crop of a 21:9 plate, so the plate is drawn
// about 1.75 times the screen's width. Shared by the band's sizes and the
// home plate's head script (layout.tsx, lib/platePreload.ts), which picks
// its file from the same srcset by the same widths.
export const BAND_WIDTH = { phoneMax: 767, phoneScale: 1.75 } as const;
export const BAND_SIZES = `(max-width: ${BAND_WIDTH.phoneMax}px) ${BAND_WIDTH.phoneScale * 100}vw, 100vw`;

// The bands below the first ask for a file the screen's width, not the
// crop's, on phones too: a phone's high pixel ratio then picks a file
// about 1,200px wide (not 1,920), a little softer in the crop and about
// half the bytes. They are decoration under the page's words; only the
// home band, the page's largest paint, is drawn at full sharpness.
export const BELOW_SIZES = "100vw";

// The home band's plate is the page's largest paint, so it is asked for a
// little lighter: the head script's srcset (layout.tsx) and the band's own
// <img> both use it (next.config.ts allows it)
export const HOME_QUALITY = 60;
