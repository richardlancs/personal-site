import Link from "next/link";
import { profile } from "../../data/portfolio";
import { places, type Place } from "../../data/world";
import PlaceGlyph from "./PlaceGlyph";
import Plate from "./Plate";

// A place's page. On wide screens it sits over the world: the camera has
// already turned toward the place (World3D.tsx), and this puts the page's
// content on the open side of the screen (`side`). On the flat layout it's
// the page itself: the painting moved in on the place, then the section's
// heading, its content, and the way on to the other sections. There the
// park's names stay out of the way: pages are labelled by section only.
export default function Location({
  place,
  side,
  intro,
  hint,
  children,
}: {
  place: Place;
  side: "left" | "right" | "below";
  intro?: string; // a line about the place, on its sign
  hint?: string; // how to use what's here, where there's something to choose
  children: React.ReactNode;
}) {
  return (
    <main className="over-world location" data-side={side} data-place={place.id}>
      <Plate view={place.id} />
      <div className="location-column arrive">
        <header className="location-header take-clicks">
          <p className="location-place only-world">{place.name}</p>
          <h1 className="location-title">{place.section}</h1>
          {intro && (
            <p className="location-intro">
              {intro}
              {hint && <span className="only-world"> {hint}</span>}
            </p>
          )}
        </header>
        {children}

        {/* Flat layout: the other sections, at the foot of the page */}
        <nav aria-label="Other sections" className="onward only-flat">
          <h2 className="onward-title">Other sections</h2>
          <ul role="list">
            {places
              .filter((other) => other.id !== place.id)
              .map((other) => (
                <li key={other.id}>
                  <Link href={other.href}>
                    <PlaceGlyph id={other.id} className="onward-glyph" />
                    {other.section}
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
