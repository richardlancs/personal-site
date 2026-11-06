import Link from "next/link";
import PlaceGlyph from "./components/world/PlaceGlyph";
import Plate from "./components/world/Plate";
import { profile } from "./data/portfolio";
import { places } from "./data/world";

// Where each place stands in the painting (percent across and down): the
// flat layout pins a tag there
const tags = [
  { href: "/about", label: "About", x: 14, y: 39 },
  { href: "/projects", label: "Projects", x: 33.5, y: 27 },
  { href: "/experience", label: "Experience", x: 56.5, y: 16.5 },
  { href: "/interests", label: "Interests", x: 82, y: 27.5 },
  // Under the board, clear of the booth's tag beside it
  { href: "/map", label: "Map", x: 66.5, y: 52.5, below: true },
  // The booth is at the painting's right edge: its tag hangs to the left
  { href: "/contact", label: "Contact", x: 93, y: 41.5, edge: true },
];

// The site opens in the park. On wide screens that's the 3D world
// (components/world3d, in the layout) with my name and links quiet in the
// open sky. On the flat layout it's the painting of the park with a tag on
// every place, then who I am, then every place as a plain list.
export default function Home() {
  return (
    <main className="over-world">
      <Plate view="park">
        <nav aria-label="Places in the painting" className="plate-tags">
          {tags.map((tag) => (
            <Link key={tag.href} href={tag.href} className="plate-tag" data-edge={tag.edge || undefined} data-below={tag.below || undefined} style={{ left: `${tag.x}%`, top: `${tag.y}%` }}>
              {tag.label}
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
          {places.map((place) => (
            <li key={place.id}>
              <Link href={place.href} className="place-row">
                <PlaceGlyph id={place.id} className="place-row-glyph" />
                <span className="place-row-text">
                  <span className="place-row-section">{place.section}</span>
                  <span className="place-row-summary">{place.summary}</span>
                </span>
              </Link>
            </li>
          ))}
          <li>
            <Link href="/map" className="place-row">
              <PlaceGlyph id="board" className="place-row-glyph" />
              <span className="place-row-text">
                <span className="place-row-section">Map</span>
                <span className="place-row-summary">Every section on one sheet, drawn in ink.</span>
              </span>
            </Link>
          </li>
        </ul>
        <p className="location-footer">© 2026 {profile.name}</p>
      </nav>
    </main>
  );
}
