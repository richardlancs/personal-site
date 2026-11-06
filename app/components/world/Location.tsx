import Link from "next/link";
import { profile } from "../../data/portfolio";
import { places, type Section } from "../../sections/registry";
import PlaceGlyph from "./PlaceGlyph";
import Plate from "./Plate";

// A section's page. On wide screens it sits over the world: the camera has
// already turned toward the place (World3D.tsx), and this puts the page's
// content on the open side of the screen (`section.side`). On the flat
// layout it's the page itself: the painting moved in on the place, then
// the section's heading, its content, and the way on to the other
// sections. There the park's names stay out of the way: pages are
// labelled by section only. What the content looks like is up to each
// section.
export default function Location({ section, children }: { section: Section; children: React.ReactNode }) {
  return (
    <main className="over-world location" data-side={section.side} data-place={section.id}>
      <Plate view={section.plate} />
      <div className="location-column arrive">
        <header className="location-header take-clicks">
          <p className="location-place only-world">{section.place}</p>
          <h1 className="location-title">{section.title}</h1>
          {section.intro && (
            <p className="location-intro">
              {section.intro}
              {section.hint && <span className="only-world"> {section.hint}</span>}
            </p>
          )}
        </header>
        {children}

        {/* Flat layout: the other sections, at the foot of the page */}
        <nav aria-label="Other sections" className="onward only-flat">
          <h2 className="onward-title">Other sections</h2>
          <ul role="list">
            {places
              .filter((other) => other.id !== section.id)
              .map((other) => (
                <li key={other.id}>
                  <Link href={other.href}>
                    <PlaceGlyph id={other.glyph} className="onward-glyph" />
                    {other.title}
                  </Link>
                </li>
              ))}
          </ul>
          <Link href="/" className="text-link onward-back">
            Home
          </Link>
        </nav>

        {/* Year is written out because the pages are pre-built as static HTML */}
        <p className="location-footer">© 2026 {profile.name}</p>
      </div>
    </main>
  );
}
