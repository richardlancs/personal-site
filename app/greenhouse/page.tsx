import Points from "../components/ui/Points";
import Location from "../components/world/Location";
import { section, sectionMetadata } from "../sections/registry";

// The starter section (docs/adding-a-section.md). It's registered in
// app/sections/registry.ts as unlisted, so it has an address but no link
// to it. To make a real section, copy this file to app/<id>/page.tsx,
// add the section to the registry, and replace what's on the paper.
export const metadata = sectionMetadata("greenhouse");

export default function GreenhousePage() {
  return (
    <Location section={section("greenhouse")}>
      <section aria-labelledby="greenhouse-title" className="project-notes take-clicks">
        <h2 id="greenhouse-title" className="font-display text-3xl font-semibold tracking-tight">
          A new section starts here
        </h2>
        <p className="project-summary">This page is the template: one entry in the registry, one file, and it has a place in the park.</p>
        <h3 className="project-notes-label">What it already has</h3>
        <Points
          items={[
            "Its heading, a line about the place, and this paper, from the shared Location component.",
            "The painting moved in on its spot on phones, and the park behind it on wide screens.",
            "Its own address, page title and description, from the registry.",
            "The way on to every other section, at the foot of the page.",
          ]}
        />
        <h3 className="project-notes-label">What to add</h3>
        <Points items={["The words, in app/data/portfolio.ts if they're content.", "Set listed: true in the registry once it's ready, and it joins the menu, the lists and the map.", "Optionally, a scene of its own in app/components/world3d/scenes/."]} />
      </section>
    </Location>
  );
}
