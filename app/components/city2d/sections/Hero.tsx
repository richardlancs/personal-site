import { about, experience, profile } from "../../../data/portfolio";
import ResumeLink from "../../resume/ResumeLink";
import ProfileLinks from "../ProfileLinks";
import { order } from "../Station";

// The school and programme: the education entry in the data (its role is
// the programme, its organisation the school), so nothing is retyped
const school = experience.find((entry) => entry.kind === "education");

// What I'm looking for, in my own words: the line in `about` that says so
// ("Looking for a software engineering internship or co-op."), so the
// first screen says the role sought without new copy
const seeking = about.flatMap((entry) => entry.points).find((point) => point.startsWith("Looking for"));

// The home section's opening, the first stop's panel (city.css, "The
// hero"): the name, the page's one h1 (on its own dark backing where it
// meets the painting, read top to bottom; none inside the journey's glass
// panel); the role sought; the school and programme; then the two ways in,
// "View projects" (the page's one primary action here) and the résumé
// beside it, a plain glass key; and the other ways, as text links with
// icons: GitHub, LinkedIn and the email. No paragraph, no caption and no
// list of sections (the Sections menu and the metro map have them). On
// first load the four settle in one after another (reveal.css, "The
// hero"), visible from the first paint.
export default function Hero() {
  return (
    <div className="hero">
      <div className="hero-backing hero-arrive" style={order(0)}>
        <h1 id="home-title" className="hero-name">{profile.name}</h1>
      </div>
      {seeking && <p className="hero-headline hero-arrive" style={order(1)}>{seeking}</p>}
      {school && (
        <p className="mt-2 text-lg text-text hero-arrive" style={order(1)}>
          {school.role}, {school.organization}
        </p>
      )}
      <div className="hero-actions hero-arrive" style={order(2)}>
        <a href="#projects" className="glass glass-primary">
          View projects
        </a>
        {/* Opens the résumé over the page (components/resume) */}
        <ResumeLink className="glass">Résumé</ResumeLink>
      </div>
      <ul aria-label="Links" className="hero-links hero-arrive" style={order(3)}>
        <ProfileLinks variant="text" resume={false} email={profile.emails[0]?.address} />
      </ul>
    </div>
  );
}
