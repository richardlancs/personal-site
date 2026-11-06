import Image from "next/image";
import painting from "../../assets/park/park-v04.png";
import { WORLD_QUERY } from "./flat";

// Where each place is in the painting (percent across and down), and how
// far the plate moves in on it
const views = {
  park: { x: 50, y: 50, zoom: 1 },
  pavilion: { x: 9, y: 49, zoom: 1.9 },
  workshop: { x: 30, y: 27, zoom: 1.9 },
  station: { x: 58, y: 15, zoom: 1.9 },
  arcade: { x: 88, y: 31, zoom: 1.9 },
  booth: { x: 94, y: 53, zoom: 1.9 },
  board: { x: 70, y: 45, zoom: 1.9 },
} as const;

export type PlateView = keyof typeof views;

// The flat layout's picture: the painting of the park, moved in on one
// place. Every plate is the same image file, so going from page to page
// downloads nothing new. Wide screens have the 3D world instead and never
// fetch it (the plate is hidden there, and lazy images that are hidden
// aren't loaded).
export default function Plate({ view, children }: { view: PlateView; children?: React.ReactNode }) {
  const { x, y, zoom } = views[view];
  return (
    <div className="plate" data-view={view}>
      <div className="plate-picture" aria-hidden="true">
        <Image
          src={painting}
          alt=""
          fill
          // About 1400 device pixels wide on a 3x phone: enough for a
          // painting seen through a 1.9x crop; 1px where it's hidden
          sizes={`${WORLD_QUERY} 1px, 125vw`}
          quality={65}
          placeholder="blur"
          loading="lazy"
          fetchPriority="high"
          style={{ objectPosition: `${x}% ${y}%`, transformOrigin: `${x}% ${y}%`, transform: zoom === 1 ? undefined : `scale(${zoom})` }}
        />
      </div>
      {children}
    </div>
  );
}
