import { getImageProps, type StaticImageData } from "next/image";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { cityPath, twoDHref } from "../../lib/cityRoutes";
import { section, type DistrictId, type SectionId } from "../../sections/registry";
import { richmondHill } from "../../data/weather";
import { cityPlateScript } from "../../lib/platePreload";
import { BELOW_SIZES, plates } from "../city2d/plates";
import DistrictBand from "../city2d/DistrictBand";
import About from "../city2d/sections/About";
import Contact from "../city2d/sections/Contact";
import Experience from "../city2d/sections/Experience";
import Hero from "../city2d/sections/Hero";
import Interests from "../city2d/sections/Interests";
import Projects from "../city2d/sections/Projects";
import Arrivals from "../ui/Arrivals";
import Colophon from "../ui/Colophon";
import { experience, interests, projects } from "../../data/portfolio";
import { sortNewestFirst } from "../../lib/experience";
import type { Picks } from "./panels/CityPanel";
import PickerGhost from "./panels/PickerGhost";
import PlaceDock from "./panels/PlaceDock";

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
//
// After the heading, on Projects, Experience and Interests, the slot for
// the row of keys that chooses what the scene shows, with what it lists;
// the row itself, and focus on the heading after a journey, are
// panels/CityPanel.tsx's, loaded once the page is up (CityLoader.tsx), so
// none of it adds to the page's first load.
const content: Record<SectionId, ReactNode> = {
  home: <Hero where="3d" />,
  about: <About where="3d" />,
  projects: <Projects where="3d" />,
  experience: <Experience where="3d" />,
  interests: <Interests where="3d" />,
  contact: <Contact where="3d" />,
};

// What each section's picker lists, read here on the server and handed to
// it: the pickers import nothing from app/data, so the portfolio's data
// never joins a chunk the 2D page loads (a client module shared with the
// 2D page's music key pulled all of it into /'s first load: +4 KB)
const picks: Picks = {
  projects: projects.map((p) => p.title),
  // in the order the board lists them (districts/metro.def.ts: "line-<n>")
  experience: sortNewestFirst(experience).map((e) => ({ role: e.role, organization: e.organization })),
  interests: interests.map((i) => ({ name: i.name, scene: i.scene })),
};

// The band's own srcset (DistrictBand.tsx: BELOW_SIZES, the default
// quality), day and night, from which the inline script picks the file the
// band's <img> will ask for
const srcSet = (plate: StaticImageData) => getImageProps({ src: plate, alt: "", fill: true, sizes: BELOW_SIZES }).props.srcSet ?? "";
const plateScript = (id: SectionId, district: DistrictId) =>
  cityPlateScript(richmondHill, srcSet(plates[district].day), srcSet(plates[district].night), id);

// The panels' glass is as clear as the words allow over what each scene
// puts behind them (city.css: --glass-panel, 0.66; city3d-contrast.mjs);
// Projects' screens show white screenshots behind its panel, and Interests'
// street is bright by day, so their glass is a little denser (a value, not
// a rule: the city's stylesheet is at its budget)
const DENSER: Partial<Record<SectionId, CSSProperties>> = {
  projects: { "--glass-panel": "rgb(24 27 35 / 0.8)" } as CSSProperties,
  interests: { "--glass-panel": "rgb(24 27 35 / 0.74)" } as CSSProperties,
};

export default function CityPage({ id }: { id: SectionId }) {
  const s = section(id);
  return (
    <main className="city-page" data-section={id} style={DENSER[id]}>
      <div className="city-band">
        <DistrictBand district={s.district} />
        {/* The band's painting before the scripts (lib/platePreload.ts:
            cityPlateScript): the page's largest paint. The script is the
            div's HTML, not a React element, so the parser runs it on a
            full load and React never renders a <script> on a client
            navigation (where it would warn, and never run anyway) */}
        <div hidden dangerouslySetInnerHTML={{ __html: `<script>${plateScript(id, s.district)}</script>` }} />
      </div>
      {/* The six places, the one you're at marked, with the previous and
          the next: along the foot of the scene on wide screens, at the top
          of the sheet on phones (panels/PlaceDock.tsx). The same on every
          page and whether the scene draws or not, so nothing moves when
          the canvas decides; on Home it is also the list of places where
          the boards' links can't stand over them (City3D.tsx: Tags). */}
      <PlaceDock current={id} />
      <div className="city-panel">
        {id !== "home" && (
          <h1 id={`${id}-title`} className="city-title" tabIndex={-1}>
            {s.title}
          </h1>
        )}
        {id in picks && (
          // The section's picker goes here (panels/CityPanel.tsx, loaded
          // after the page), with what it lists; until it comes, its
          // unseen copy holds its room (panels/PickerGhost.tsx), and
          // wherever the scene isn't drawing (no WebGL2, a lost context,
          // Save-Data's key waiting) a line in that room says why the keys
          // aren't there, so the panel doesn't move (city-pages.css)
          <div className="city-picker-slot" data-picks={JSON.stringify(picks[id as keyof Picks])}>
            <PickerGhost id={id as keyof Picks} picks={picks} />
            <p className="city-picker-off">The 3D view isn&apos;t showing. Everything is listed below.</p>
          </div>
        )}
        {content[id]}
        {/* Home's panel is the title card and nothing else: the 2D view is
            the bar's key, and the credit is a line under the dock (below) */}
        {id !== "home" && (
          <>
            <p className="city-panel-foot">
              {/* The way back, in words, on every section's page (Escape
                  does the same, panels/CityPanel.tsx), drawing or not */}
              <Link href={cityPath("home")} className="text-link text-link-solo">
                Back to Home
              </Link>
              <Link href={twoDHref(s.city)} className="text-link text-link-solo">
                This section on the 2D page
              </Link>
            </p>
            <footer className="city-colophon">
              <Colophon />
            </footer>
          </>
        )}
      </div>
      {id === "home" && (
        <footer className="city-panel city-colophon city-credit">
          <Colophon />
        </footer>
      )}
      <Arrivals />
    </main>
  );
}
