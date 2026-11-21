import { experience, profile } from "../../../data/portfolio";
import type { Where } from "../Heading";
import ProfileLinks from "../ProfileLinks";
import { order } from "../Station";

// The home section's opening (city.css, "The hero"): the name, the page's
// one h1, on its own dark backing (on wide screens it rises over the foot
// of the first band, the one place words sit on a painting); the
// headline; the two ways in; and the links. No paragraph, no caption and
// no list of sections (the Sections menu and the progress line have them).
// On first load the four settle in one after another (reveal.css, "The
// hero"), visible from the first paint.
//
// In the 3D city (where="3d") it is the title card on Home's glass instead
// (TitleCard, below).
export default function Hero({ where = "2d" }: { where?: Where }) {
  if (where === "3d") return <TitleCard />;
  return (
    <div className="hero">
      <div className="hero-backing hero-arrive" style={order(0)}>
        <h1 id="home-title" className="hero-name">{profile.name}</h1>
      </div>
      <p className="hero-headline hero-arrive" style={order(1)}>{profile.headline}</p>
      <div className="hero-actions hero-arrive" style={order(2)}>
        <a href="#projects" className="glass glass-primary">
          View projects
        </a>
        <a href="#contact" className="glass">
          Contact
        </a>
      </div>
      <ul aria-label="Links" className="hero-links hero-arrive" style={order(3)}>
        <ProfileLinks variant="text" />
      </ul>
    </div>
  );
}

// The school and the programme, from the education entry in the data
const school = experience.find((e) => e.kind === "education");
// "Email me" writes to the first address, as the 2D page's Contact does
const email = profile.emails[0];

// The title card on the 3D city's Home (city-pages.css, "The title card"):
// the name, the school and the programme, "Email me" (the one primary
// action), and GitHub, LinkedIn and the résumé (opened over the page).
// Nothing else: the places are the dock's and the Sections menu's. The
// name, the page's h1, can take focus (tabIndex -1: a journey back to Home
// focuses it, city3d/panels/CityPanel.tsx).
function TitleCard() {
  return (
    <div className="hero hero-card">
      <h1 id="home-title" className="hero-name hero-arrive" style={order(0)} tabIndex={-1}>
        {profile.name}
      </h1>
      {school && (
        <p className="hero-school hero-arrive" style={order(1)}>
          <span className="hero-school-name">{school.organization}</span>
          <span className="hero-school-programme">{school.role}</span>
        </p>
      )}
      <div className="hero-actions hero-arrive" style={order(2)}>
        <a href={`mailto:${email.address}`} className="glass glass-primary">
          Email me
        </a>
      </div>
      <ul aria-label="Links" className="hero-links hero-arrive" style={order(3)}>
        <ProfileLinks variant="text" />
      </ul>
    </div>
  );
}

