import Link from "next/link";
import type { ReactNode } from "react";
import { twoDHref } from "../../lib/cityRoutes";
import { section, type SectionId } from "../../sections/registry";
import DistrictBand from "../city2d/DistrictBand";
import About from "../city2d/sections/About";
import Contact from "../city2d/sections/Contact";
import Experience from "../city2d/sections/Experience";
import Hero from "../city2d/sections/Hero";
import Interests from "../city2d/sections/Interests";
import Projects from "../city2d/sections/Projects";
import Colophon from "../ui/Colophon";

// One page of the 3D city (app/city/), server-rendered, so all of it reads
// without JavaScript or WebGL: the section's plate as a band where the
// scene will be (the canvas replaces it in a later task; without WebGL2 it
// stays), and over it one panel with the section's heading, its 2D content
// (the same components as the 2D page, told where="3d" where it matters),
// the way back to the same place on the 2D page, and the credit. On wide
// screens the plate fills the window behind the panel; on phones and
// portrait screens it is a band at the top and the panel a sheet under it
// (city.css, "The 3D city's pages").
//
// Home's h1 is the hero's (the name); every other page's is its section's
// title. The sections' own headings start at h3 (Task 3 moves them to h2).
const content: Record<SectionId, ReactNode> = {
  home: <Hero where="3d" />,
  about: <About />,
  projects: <Projects />,
  experience: <Experience />,
  interests: <Interests where="3d" />,
  contact: <Contact />,
};

export default function CityPage({ id }: { id: SectionId }) {
  const s = section(id);
  return (
    <main className="city-page" data-section={id}>
      <div className="city-band">
        <DistrictBand district={s.district} />
      </div>
      <div className="city-panel">
        {id !== "home" && (
          <h1 id={`${id}-title`} className="city-title">
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
    </main>
  );
}
