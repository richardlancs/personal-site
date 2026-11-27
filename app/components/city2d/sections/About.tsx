import { about, profile } from "../../../data/portfolio";
import { section } from "../../../sections/registry";
import ProfileLinks from "../ProfileLinks";
import Figures from "../Figures";
import Heading from "../Heading";
import { order } from "../Station";

// The about station, in the lane of old houses: each entry in `about` is a
// heading and a few short points set straight on the ground under a
// hairline (no panels: this is the quiet section), two to a row on wide
// screens. The last group says where to find me, built from `profile` as
// the notebook's last page was, with the emails written out. The groups
// arrive in order as they scroll in (reveal.css). Two to a row once its
// own column is 45.5rem wide (a 768px window).
export default function About() {
  return (
    <div className="@container mt-6">
    <div className="about grid gap-x-12 gap-y-10 @min-[45.5rem]:grid-cols-2">
      {about.map((entry, i) => (
        <section key={entry.heading} className="about-entry reveal border-t border-line pt-6" style={order(i)}>
          <Heading level={3} className="font-display text-2xl font-semibold text-text">{entry.heading}</Heading>
          <ul role="list" className="points mt-4 space-y-2 break-words text-text">
            {entry.points.map((point, j) => (
              <li key={point}>
                <Figures>{point}</Figures>
                {entry.seeAlso && j === entry.points.length - 1 && (
                  <>
                    {" "}
                    <a href={section(entry.seeAlso).href} className="text-link">
                      In photos: {section(entry.seeAlso).title} <span aria-hidden="true">→</span>
                    </a>
                  </>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
      <section className="about-entry reveal border-t border-line pt-6" style={order(about.length)}>
        <Heading level={3} className="font-display text-2xl font-semibold text-text">Where to find me</Heading>
        <ul role="list" className="points mt-4 space-y-1 text-text [overflow-wrap:anywhere]">
          {profile.emails.map((email) => (
            <li key={email.address}>
              <span className="text-muted">{email.label}: </span>
              <a href={`mailto:${email.address}`} className="text-link text-link-solo">
                {email.address}
              </a>
            </li>
          ))}
        </ul>
        <ul role="list" aria-label="Links" className="mt-5 flex flex-col gap-3 @min-[27.5rem]:flex-row @min-[27.5rem]:flex-wrap">
          <ProfileLinks variant="keys" />
        </ul>
      </section>
    </div>
    </div>
  );
}
