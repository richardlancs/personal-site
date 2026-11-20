import Colophon from "./components/ui/Colophon";
import ResumeLink from "./components/resume/ResumeLink";
import { profile } from "./data/portfolio";
import { sectionMetadata } from "./sections/registry";

export const metadata = sectionMetadata("home");

const newTab = <span className="sr-only"> (opens in a new tab)</span>;

// The home page, for now: the name and its links, on the dark ground.
// Later tasks paint the city above it and fill in the rest.
export default function Home() {
  return (
    <main className="mx-auto max-w-5xl px-5 py-16 sm:px-8 sm:py-24">
      <h1 className="font-display text-5xl font-bold text-text sm:text-7xl">{profile.name}</h1>
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
      <footer className="mt-24 text-sm text-muted">
        <Colophon />
      </footer>
    </main>
  );
}
