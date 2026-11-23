import { experience, profile } from "../../../data/portfolio";
import ProfileLinks from "../ProfileLinks";
import { order } from "../Station";

// The school and programme: the education entry in the data (its role is
// the programme, its organisation the school), so nothing is retyped
const school = experience.find((entry) => entry.kind === "education");

// The home section's opening, the first stop's panel (city.css, "The
// hero"): the name, the page's one h1, on its own dark backing; the
// headline; the school and programme; the one way in, "View projects"
// (the page's one primary action here); and the other ways, as text links:
// Contact, then GitHub, LinkedIn, the résumé and the email. No paragraph,
// no caption and no list of sections (the Sections menu and the metro
// map have them). On first load the four settle in one after another
// (reveal.css, "The hero"), visible from the first paint.
export default function Hero() {
  const email = profile.emails[0];
  return (
    <div className="hero">
      <div className="hero-backing hero-arrive" style={order(0)}>
        <h1 id="home-title" className="hero-name">{profile.name}</h1>
      </div>
      <p className="hero-headline hero-arrive" style={order(1)}>{profile.headline}</p>
      {school && (
        <p className="mt-2 text-lg text-text hero-arrive" style={order(1)}>
          {school.role}, {school.organization}
        </p>
      )}
      <div className="hero-actions hero-arrive" style={order(2)}>
        <a href="#projects" className="glass glass-primary">
          View projects
        </a>
      </div>
      <ul aria-label="Links" className="hero-links hero-arrive" style={order(3)}>
        <li>
          <a href="#contact" className="text-link text-link-solo">
            Contact
          </a>
        </li>
        <ProfileLinks variant="text" />
        {email && (
          <li>
            <a href={`mailto:${email.address}`} className="text-link text-link-solo">
              Email
            </a>
          </li>
        )}
      </ul>
    </div>
  );
}
