import { about, githubNote, profile } from "../../../data/portfolio";
import ResumeLink from "../../resume/ResumeLink";

const newTab = <span className="sr-only"> (opens in a new tab)</span>;

// The about station, in the lane of old houses: each entry in `about` is a
// heading and a few short points set straight on the ground under a
// hairline (no panels: this is the quiet section), two to a row on wide
// screens. The last group says where to find me, built from `profile` as
// the notebook's last page was, with the emails written out.
export default function About() {
  return (
    <div className="about mt-10 grid gap-x-12 gap-y-10 md:grid-cols-2">
      {about.map((entry) => (
        <section key={entry.heading} className="about-entry border-t border-line pt-6">
          <h3 className="font-display text-2xl font-semibold text-text">{entry.heading}</h3>
          <ul role="list" className="points mt-4 space-y-2 break-words text-text">
            {entry.points.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </section>
      ))}
      <section className="about-entry border-t border-line pt-6">
        <h3 className="font-display text-2xl font-semibold text-text">Where to find me</h3>
        <ul role="list" className="points mt-4 space-y-1 text-text [overflow-wrap:anywhere]">
          {profile.emails.map((email) => (
            <li key={email.address}>
              <span className="text-muted">{email.label}: </span>
              <a href={`mailto:${email.address}`} className="text-link text-link-solo">
                {email.address}
              </a>
            </li>
          ))}
          <li>
            <a href={profile.githubUrl} target="_blank" rel="noopener noreferrer" className="text-link text-link-solo">
              GitHub
              {newTab}
            </a>
            <span className="text-muted">, {githubNote}</span>
          </li>
          <li>
            <a href={profile.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-link text-link-solo">
              LinkedIn
              {newTab}
            </a>
          </li>
          <li>
            {/* Opens the résumé over the page (components/resume) */}
            <ResumeLink className="text-link text-link-solo">Résumé (PDF)</ResumeLink>
          </li>
        </ul>
      </section>
    </div>
  );
}
