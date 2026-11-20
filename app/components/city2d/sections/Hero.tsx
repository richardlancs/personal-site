import { profile } from "../../../data/portfolio";
import ProfileLinks from "../ProfileLinks";
import { order } from "../Station";

// The home section's opening (city.css, "The hero"): the name, the page's
// one h1, on its own dark backing (on wide screens it rises over the foot
// of the first band, the one place words sit on a painting); the
// headline; the two ways in; and the links. No paragraph, no caption and
// no list of sections (the Sections menu and the progress line have them).
// On first load the four settle in one after another (reveal.css, "The
// hero"), visible from the first paint.
export default function Hero() {
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
