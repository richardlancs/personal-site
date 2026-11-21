import Link from "next/link";
import { listed, type SectionId } from "../../../sections/registry";

// The place dock, on every /city page (CityPage.tsx; city-pages.css, "The
// place dock"): the six places in the registry's order, each a link to its
// page in the city, the one you're at marked (aria-current="page", the
// chosen glass and the menu's dot, so not by colour alone), with the
// previous and the next place at its ends (they wrap: before Home is
// Contact). Wide screens: a glass bar along the foot of the scene, clear of
// the panel; the narrow layout: a row at the top of the sheet that scrolls
// sideways.
//
// Drawn on the server, so it adds nothing to the page's first load. What
// it does beyond its links is panels/CityPanel.tsx's, loaded after the
// page: ← and → click its previous and next keys (data-dock), and on the
// narrow layout the current place is brought into view in its row.
const places = listed;

const arrow = (d: string) => (
  <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

export default function PlaceDock({ current }: { current: SectionId }) {
  const at = Math.max(0, places.findIndex((s) => s.id === current));
  const previous = places[(at - 1 + places.length) % places.length];
  const next = places[(at + 1) % places.length];
  return (
    <nav aria-label="Places" className="place-dock flex items-center gap-2">
      <Link href={previous.city} className="glass glass-icon" data-dock="previous" aria-keyshortcuts="ArrowLeft" aria-label={`Previous place: ${previous.title}`}>
        {arrow("m15 5-7 7 7 7")}
      </Link>
      {/* Where the row scrolls (narrow screens, and 1024 to 1440 wide) a
          key snaps whole into it, and a focused key comes clear of the
          fades (CityPanel.tsx fades the side with more and brings focus
          into view); on the row itself, not in the city's stylesheet,
          which is at its budget (budget.mjs: cityCss) */}
      <ul className="place-dock-row flex flex-1 gap-2 min-w-0" style={{ scrollSnapType: "x mandatory", scrollPaddingInline: 24 }}>
        {places.map((s) => (
          <li key={s.id} style={{ scrollSnapAlign: "center" }}>
            <Link href={s.city} className="glass place-dock-key font-display font-semibold" aria-current={s.id === current ? "page" : undefined}>
              {s.title}
              {s.id === current && <span className="sections-menu-here" aria-hidden="true" />}
            </Link>
          </li>
        ))}
      </ul>
      <Link href={next.city} className="glass glass-icon" data-dock="next" aria-keyshortcuts="ArrowRight" aria-label={`Next place: ${next.title}`}>
        {arrow("m9 5 7 7-7 7")}
      </Link>
    </nav>
  );
}
