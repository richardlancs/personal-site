import { profile } from "../../../data/portfolio";

// The starter for a new section of the one-page city
// (docs/adding-a-section.md). It lives in docs/, not app/, so it is never
// built or served. To make a real section, copy this file to
// app/components/city2d/sections/<Name>.tsx (the imports are written for
// that place), add an entry to app/sections/registry.ts, and mount it in
// app/page.tsx inside its <Station>:
//
//   <Station section={section("greenhouse")}>
//     <Greenhouse />
//   </Station>
//
// The <Station> gives it its band of painting and the section's h2 (the
// registry's title, with its number beside it). So the component starts at h3, is a server component unless it
// truly needs the browser, and takes its words from app/data/portfolio.ts:
// the lines below are placeholders to replace, not content.
export default function Greenhouse() {
  return (
    <div className="mt-10 grid gap-x-12 gap-y-10 md:grid-cols-2">
      <section className="border-t border-line pt-6">
        <h3 className="font-display text-2xl font-semibold text-text">A heading from the data</h3>
        {/* Short points with a muted dash, at most 65 characters a line */}
        <ul role="list" className="points mt-4 space-y-2 break-words text-text">
          <li>Placeholder: a point from app/data/portfolio.ts.</li>
          <li>Placeholder: another point.</li>
        </ul>
      </section>
      {/* A panel, for content that needs one (as Projects and Contact) */}
      <section className="rounded-[var(--radius-lg)] border border-line bg-panel p-4 min-[400px]:p-5 sm:p-8">
        <h3 className="font-display text-2xl font-semibold text-text">On a panel</h3>
        <p className="mt-3 max-w-[65ch] text-muted">Placeholder: muted text for secondary lines.</p>
        <p className="mt-6 flex flex-wrap gap-3">
          {/* Glass keys: the primary action, then the others */}
          <a href={profile.githubUrl} target="_blank" rel="noopener noreferrer" className="glass glass-primary">
            GitHub<span className="sr-only"> (opens in a new tab)</span>
          </a>
        </p>
      </section>
    </div>
  );
}
