import CityTrack from "./components/city2d/CityTrack";
import Station from "./components/city2d/Station";
import About from "./components/city2d/sections/About";
import Contact from "./components/city2d/sections/Contact";
import Experience, { ExperienceHead } from "./components/city2d/sections/Experience";
import Hero from "./components/city2d/sections/Hero";
import Interests from "./components/city2d/sections/Interests";
import Projects from "./components/city2d/sections/Projects";
import Arrivals from "./components/ui/Arrivals";
import Colophon from "./components/ui/Colophon";
import { sectionMetadata } from "./sections/metadata";
import { section } from "./sections/registry";

export const metadata = sectionMetadata("home");

// The whole site, one page: six sections, in the registry's order, the six
// stops of one journey (CityTrack.tsx: side by side, the
// page's scroll moving you along them; stacked top to bottom without
// scripts). Each has its anchor (/#about, …); the old addresses redirect
// here (next.config.ts). The home section is the hero; Skills is part of
// Projects (its own section, inside Projects.tsx). The foot of the page,
// the colophon, ends the last stop.
export default function Home() {
  return (
    <main>
      <CityTrack>
        <Station section={section("home")} heading={<Hero />} />
        <Station section={section("about")}>
          <About />
        </Station>
        <Station section={section("projects")} row>
          <Projects />
        </Station>
        <Station section={section("experience")} heading={<ExperienceHead />}>
          <Experience />
        </Station>
        <Station section={section("interests")}>
          <Interests />
        </Station>
        <Station section={section("contact")}>
          <Contact />
          <footer className="page-foot">
            <Colophon />
          </footer>
        </Station>
      </CityTrack>
      <Arrivals />
    </main>
  );
}
