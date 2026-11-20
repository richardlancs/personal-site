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
// about 1.75 times the screen's width. Shared by the band and the home
// plate's preload (layout.tsx), so both pick the same file.
export const BAND_SIZES = "(max-width: 767px) 175vw, 100vw";
