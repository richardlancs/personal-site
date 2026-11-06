import Link from "next/link";
import PlaceGlyph from "./components/world/PlaceGlyph";
import Plate from "./components/world/Plate";
import { profile } from "./data/portfolio";
import { places, section, sectionMetadata } from "./sections/registry";

export const metadata = sectionMetadata("home");

// The site opens in the park. On wide screens that's the 3D world
// (components/world3d, in the layout) with my name and links quiet in the
// open sky. On the flat layout it's the painting of the park with a tag on
// every section, then who I am, then every section as a plain list. The
// tags and the list come from the section registry.
export default function Home() {
  const home = section("home");
  const tagged = places.filter((s) => s.tag);
  return (
    <main className="over-world">
      <Plate view={home.plate}>
        <nav aria-label="Sections, on the painting" className="plate-tags">
          {tagged.map((s) => (
            <Link key={s.id} href={s.href} className="plate-tag" data-edge={s.tag!.edge || undefined} data-below={s.tag!.below || undefined} style={{ left: `${s.tag!.x}%`, top: `${s.tag!.y}%` }}>
              {s.title}
            </Link>
          ))}
        </nav>
      </Plate>

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
    </main>
  );
}
