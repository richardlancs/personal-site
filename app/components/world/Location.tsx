import { profile } from "../../data/portfolio";
import type { Place } from "../../data/world";

// A place's page, over the world. The camera has already turned toward the
// place (World.tsx); this puts the page's content on the open side of the
// screen: `side` is where it goes on wide screens. On phones it follows
// the painting down the page. What the content looks like is up to each
// place.
export default function Location({
  place,
  side,
  intro,
  children,
}: {
  place: Place;
  side: "left" | "right" | "below";
  intro?: string; // a line about the place, on its sign
  children: React.ReactNode;
}) {
  return (
    <main className="over-world location" data-side={side} data-place={place.id}>
      <div className="location-column arrive">
        <header className="location-header take-clicks">
          <p className="location-place">{place.name}</p>
          <h1 className="location-title">{place.section}</h1>
          {intro && <p className="location-intro">{intro}</p>}
        </header>
        {children}
        {/* Year is written out because the pages are pre-built as static HTML */}
        <p className="location-footer">© 2026 {profile.name}</p>
      </div>
    </main>
  );
}
