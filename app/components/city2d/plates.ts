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
