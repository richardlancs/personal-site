import Station from "./components/city2d/Station";
import ResumeLink from "./components/resume/ResumeLink";
import Colophon from "./components/ui/Colophon";
import { profile } from "./data/portfolio";
import { section, sectionMetadata } from "./sections/registry";

export const metadata = sectionMetadata("home");

const newTab = <span className="sr-only"> (opens in a new tab)</span>;

// The whole site, one page: six stations down the line, in the registry's
// order. Each has its anchor (/#about, …); the old addresses redirect
// here (next.config.ts). Later tasks paint the bands and fill the
// sections; for now the home station holds the name and its links.
export default function Home() {
  return (
    <main>
      <Station
        section={section("home")}
        heading={
          <h1 id="home-title" className="station-name">{profile.name}</h1>
        }
      >
        <ul aria-label="Links" className="mt-8 flex flex-wrap gap-x-6 gap-y-2">
          <li>
            <a href={profile.githubUrl} target="_blank" rel="noopener noreferrer" className="text-link text-link-solo">
              GitHub
              {newTab}
            </a>
          </li>
          <li>
            <a href={profile.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-link text-link-solo">
              LinkedIn
              {newTab}
            </a>
          </li>
          <li>
            {/* Opens the résumé over the page (components/resume) */}
            <ResumeLink className="text-link text-link-solo">Résumé</ResumeLink>
          </li>
        </ul>
      </Station>
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
