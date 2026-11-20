import { about, githubNote, profile } from "../../../data/portfolio";
import ProfileLinks from "../ProfileLinks";
import Figures from "../Figures";

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
              <li key={point}><Figures>{point}</Figures></li>
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
          <ProfileLinks variant="text" githubNote={githubNote} />
        </ul>
      </section>
    </div>
  );
}
