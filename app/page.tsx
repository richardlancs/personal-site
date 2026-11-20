import Station from "./components/city2d/Station";
import About from "./components/city2d/sections/About";
import Contact from "./components/city2d/sections/Contact";
import Experience from "./components/city2d/sections/Experience";
import Hero from "./components/city2d/sections/Hero";
import Interests from "./components/city2d/sections/Interests";
import Projects from "./components/city2d/sections/Projects";
import Colophon from "./components/ui/Colophon";
import { section, sectionMetadata } from "./sections/registry";

export const metadata = sectionMetadata("home");

// The whole site, one page: six sections, in the registry's order. Each
// has its anchor (/#about, …); the old addresses redirect here
// (next.config.ts). The home section is the hero; Skills is part of
// Projects (its own section, inside Projects.tsx).
export default function Home() {
  return (
    <main>
      <Station section={section("home")} heading={<Hero />} />
      <Station section={section("about")}>
        <About />
      </Station>
      <Station section={section("projects")}>
        <Projects />
      </Station>
      <Station section={section("experience")}>
        <Experience />
      </Station>
      <Station section={section("interests")}>
        <Interests />
      </Station>
      <Station section={section("contact")}>
        <Contact />
      </Station>
      <footer className="page-foot">
        <Colophon />
      </footer>
    </main>
  );
}
