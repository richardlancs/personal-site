import Link from "next/link";
import type { ReactNode } from "react";
import type { SectionId } from "../../sections/registry";
import { cityPath } from "../../lib/cityRoutes";

// A link from the 2D page into one section of the 3D city (city.css: shown
// only where WebGL2 exists, html[data-webgl2], set by ViewSwitch). Never
// prefetched: nothing of the city loads until it is followed. A server
// component: a plain link needs no script of its own.
export default function CityLink({ id, children }: { id: SectionId; children: ReactNode }) {
  return (
    <Link href={cityPath(id)} prefetch={false} className="text-link text-link-solo city-link">
      {children}
    </Link>
  );
}
