import Station from "./components/city2d/Station";
import Hero from "./components/city2d/sections/Hero";
import Colophon from "./components/ui/Colophon";
import { section, sectionMetadata } from "./sections/registry";

export const metadata = sectionMetadata("home");

// The whole site, one page: six stations down the line, in the registry's
// order. Each has its anchor (/#about, …); the old addresses redirect
// here (next.config.ts). The home station is the hero; later tasks fill
// the other sections.
export default function Home() {
  return (
    <main>
      <Station section={section("home")} heading={<Hero />} />
      <Station section={section("about")} />
      <Station section={section("projects")}>
        {/* Skills is part of Projects, not a station; a later task fills it */}
        <div id="skills" tabIndex={-1} className="station-part" />
      </Station>
      <Station section={section("experience")} />
      <Station section={section("interests")} />
      <Station section={section("contact")} />
      <footer className="page-foot">
        <Colophon />
      </footer>
    </main>
  );
}
