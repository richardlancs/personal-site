import type { StaticImageData } from "next/image";
import { tiles } from "./panorama";
import day01 from "../../assets/city/panorama/day-01.webp";
import night01 from "../../assets/city/panorama/night-01.webp";
import day02 from "../../assets/city/panorama/day-02.webp";
import night02 from "../../assets/city/panorama/night-02.webp";
import day03 from "../../assets/city/panorama/day-03.webp";
import night03 from "../../assets/city/panorama/night-03.webp";
import day04 from "../../assets/city/panorama/day-04.webp";
import night04 from "../../assets/city/panorama/night-04.webp";
import day05 from "../../assets/city/panorama/day-05.webp";
import night05 from "../../assets/city/panorama/night-05.webp";
import day06 from "../../assets/city/panorama/day-06.webp";
import night06 from "../../assets/city/panorama/night-06.webp";

// The panorama's tiles' pictures, day and night (written by
// scripts/city-panorama.mjs). Server components only: they hand the bands
// (DistrictBand.tsx) their tiles as props, each picture only its address
// and size, so no client code carries the imports.
export const pictures: { day: StaticImageData; night: StaticImageData }[] = [
  { day: day01, night: night01 },
  { day: day02, night: night02 },
  { day: day03, night: night03 },
  { day: day04, night: night04 },
  { day: day05, night: night05 },
  { day: day06, night: night06 },
];

type Picture = { src: string; width: number; height: number };
export type BandTile = { w: number; day: Picture; night: Picture };

const picture = ({ src, width, height }: StaticImageData): Picture => ({ src, width, height });

/** The tiles as a band takes them */
export const bandTiles: BandTile[] = tiles.map((t, i) => ({ w: t.w, day: picture(pictures[i].day), night: picture(pictures[i].night) }));
