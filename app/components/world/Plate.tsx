import Image from "next/image";
import painting from "../../assets/park/park-v04.png";
import { WORLD_QUERY } from "./flat";

// Where in the painting to look (percent across and down), and how far to
// move in. Each section says where it is (sections/registry.ts).
export type PlateView = { x: number; y: number; zoom: number };

// The flat layout's picture: the painting of the park, moved in on one
// place. Every plate is the same image file, so going from page to page
// downloads nothing new. Wide screens have the 3D world instead and never
// fetch it (the plate is hidden there, and lazy images that are hidden
// aren't loaded). The picture drifts very slowly, like a held breath, and
// holds still for anyone who asked for less motion.
export default function Plate({ view, children }: { view: PlateView; children?: React.ReactNode }) {
  const { x, y, zoom } = view;
  return (
    <div className="plate" data-view={zoom === 1 ? "park" : "place"}>
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
