import { profile } from "../../../data/portfolio";
import { cityPath } from "../../../lib/cityRoutes";
import type { Where } from "../Heading";
import ProfileLinks from "../ProfileLinks";
import { order } from "../Station";

// The home section's opening (city.css, "The hero"): the name, the page's
// one h1, on its own dark backing (on wide screens it rises over the foot
// of the first band, the one place words sit on a painting); the
// headline; the two ways in; and the links. No paragraph, no caption and
// no list of sections (the Sections menu and the progress line have them).
// On first load the four settle in one after another (reveal.css, "The
// hero"), visible from the first paint. In the 3D city (where="3d") the two
// ways in go to those sections' pages there, not to anchors on this page.
export default function Hero({ where = "2d" }: { where?: Where }) {
  return (
    <div className="hero">
      <div className="hero-backing hero-arrive" style={order(0)}>
        <h1 id="home-title" className="hero-name">{profile.name}</h1>
      </div>
      <p className="hero-headline hero-arrive" style={order(1)}>{profile.headline}</p>
      <div className="hero-actions hero-arrive" style={order(2)}>
        <a href={where === "3d" ? cityPath("projects") : "#projects"} className="glass glass-primary">
          View projects
        </a>
        <a href={where === "3d" ? cityPath("contact") : "#contact"} className="glass">
          Contact
        </a>
      </div>
      <ul aria-label="Links" className="hero-links hero-arrive" style={order(3)}>
        <ProfileLinks variant="text" />
      </ul>
    </div>
  );
}
