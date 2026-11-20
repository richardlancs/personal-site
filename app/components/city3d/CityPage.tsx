import Link from "next/link";
import type { ReactNode } from "react";
import { cityPath, twoDHref } from "../../lib/cityRoutes";
import { listed, section, type SectionId } from "../../sections/registry";
import DistrictBand from "../city2d/DistrictBand";
import About from "../city2d/sections/About";
import Contact from "../city2d/sections/Contact";
import Experience from "../city2d/sections/Experience";
import Hero from "../city2d/sections/Hero";
import Interests from "../city2d/sections/Interests";
import Projects from "../city2d/sections/Projects";
import Arrivals from "../ui/Arrivals";
import Colophon from "../ui/Colophon";
import CityFocus from "./CityFocus";

// One page of the 3D city (app/city/), server-rendered, so all of it reads
// without JavaScript or WebGL: the section's plate as a band where the
// scene will be (the canvas replaces it in a later task; without WebGL2 it
// stays), and over it one panel with the section's heading, its 2D content
// (the same components as the 2D page, told where="3d" where it matters),
// the way back to the same place on the 2D page, and the credit. On wide
// screens the plate fills the window behind the panel; on phones and
// portrait screens it is a band at the top and the panel a sheet under it
// (app/city/city-pages.css). Where the 3D city can be drawn, the canvas
// (CityShell.tsx) covers the band once it has drawn.
//
// Home's h1 is the hero's (the name); every other page's is its section's
// title, and the section, told where="3d", starts its own headings at h2
// (city2d/Heading.tsx), so each page's outline runs h1, h2, h3 with
// nothing skipped.
const content: Record<SectionId, ReactNode> = {
  home: <Hero where="3d" />,
  about: <About where="3d" />,
  projects: <Projects where="3d" />,
  experience: <Experience where="3d" />,
  interests: <Interests where="3d" />,
  contact: <Contact where="3d" />,
};

export default function CityPage({ id }: { id: SectionId }) {
  const s = section(id);
  return (
    <main className="city-page" data-section={id}>
      <div className="city-band">
        <DistrictBand district={s.district} />
      </div>
      <div className="city-panel">
        {id === "home" && (
          // The five places as a row of keys: where the canvas can't lay
          // a link over each of the riverside's boards (City3D.tsx:
          // TagProjector sets html[data-city-tags="row"]), and wherever
          // the 3D city isn't drawing (no WebGL2, Save-Data, a lost
          // context, no JavaScript), so Home always lists its places
          // (city-pages.css)
          <nav aria-label="Places" className="city-keys">
            {listed
              .filter((s) => s.id !== "home")
              .map((s) => (
                <Link key={s.id} href={cityPath(s.id)} className="glass city-key">
                  {s.title}
                </Link>
              ))}
          </nav>
        )}
        {id !== "home" && (
          <h1 id={`${id}-title`} className="city-title" tabIndex={-1}>
            {s.title}
          </h1>
        )}
        {content[id]}
        <p className="city-panel-foot">
          <Link href={twoDHref(s.city)} className="text-link text-link-solo">
            This section on the 2D page
          </Link>
        </p>
        <footer className="city-colophon">
          <Colophon />
        </footer>
      </div>
      <CityFocus id={id} />
      <Arrivals />
    </main>
  );
}
