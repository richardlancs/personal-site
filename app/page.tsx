import Link from "next/link";
import PlaceGlyph from "./components/world/PlaceGlyph";
import { profile } from "./data/portfolio";
import { places, sectionMetadata } from "./sections/registry";

export const metadata = sectionMetadata("home");

// The site opens in the park: the 3D world (components/world3d, in the
// layout) with my name and links quiet in the open sky. On narrow screens
// the park fills the top of the screen, its name tags showing, and a sheet
// comes up under it with who I am and every section as a plain list (from
// the section registry).
export default function Home() {
  return (
    <main className="over-world">
      <div className="park-sheet">
      <section aria-labelledby="park-name" className="park-intro arrive">
        <h1 id="park-name" className="park-name font-display">
          {profile.name}
        </h1>
        <p className="park-headline">{profile.headline}</p>
        <p className="park-about only-flat">{profile.intro}</p>
        <ul aria-label="Links" className="park-links">
          <li>
            <a href={profile.githubUrl} target="_blank" rel="noopener noreferrer">
              GitHub
            </a>
          </li>
          <li>
            <a href={profile.linkedinUrl} target="_blank" rel="noopener noreferrer">
              LinkedIn
            </a>
          </li>
          <li>
            <a href={profile.resumeUrl} target="_blank" rel="noopener noreferrer">
              Résumé
            </a>
          </li>
          <li className="only-flat">
            <Link href="/contact">Contact</Link>
          </li>
        </ul>
      </section>

      {/* Flat layout: every section as a plain list under the painting */}
      <nav aria-labelledby="park-places-title" className="park-places only-flat">
        <h2 id="park-places-title" className="park-places-title">
          Sections
        </h2>
        <ul role="list">
          {places.map((s) => (
            <li key={s.id}>
              <Link href={s.href} className="place-row">
                <PlaceGlyph id={s.glyph} className="place-row-glyph" />
                <span className="place-row-text">
                  <span className="place-row-section">{s.title}</span>
                  <span className="place-row-summary">{s.summary}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <p className="location-footer">© 2026 {profile.name}</p>
      </nav>
      </div>
    </main>
  );
}
