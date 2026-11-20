import { profile } from "../../../data/portfolio";
import ResumeLink from "../../resume/ResumeLink";

const newTab = <span className="sr-only"> (opens in a new tab)</span>;

// The home section's opening (city.css, "The hero"): the name, the page's
// one h1, on its own dark backing (on wide screens it rises over the foot
// of the first band, the one place words sit on a painting); the
// headline; the two ways in; and the links. No paragraph, no caption and
// no list of sections (the Sections menu and the progress line have them).
export default function Hero() {
  return (
    <div className="hero">
      <div className="hero-backing">
        <h1 id="home-title" className="hero-name">{profile.name}</h1>
      </div>
      <p className="hero-headline">{profile.headline}</p>
      <div className="hero-actions">
        <a href="#projects" className="glass glass-primary">
          View projects
        </a>
        <a href="#contact" className="glass">
          Contact
        </a>
      </div>
      <ul aria-label="Links" className="hero-links">
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
    </div>
  );
}
