import type { Metadata } from "next";
import Workbench from "../components/locations/Workbench";
import Location from "../components/world/Location";
import { projects, skillGroups } from "../data/portfolio";
import { placeById } from "../data/world";

export const metadata: Metadata = {
  title: "Projects",
  description: "Software projects by Richard Lan, with screenshots, code and live demos.",
};

// The workshop: old screens on a bench, one per project, and the tool
// wall with the skills
export default function ProjectsPage() {
  return (
    <Location place={placeById("workshop")} side="below" intro="Old screens on the bench, still wired up. Choose one to switch it on.">
      <Workbench projects={projects} />

      <section id="skills" aria-labelledby="skills-title" className="tool-wall take-clicks">
        <h2 id="skills-title" className="font-display text-3xl font-semibold tracking-tight">
          Skills
        </h2>
        <p className="mt-1 text-sm text-muted">On the tool wall.</p>
        <div className="tool-boards">
          {skillGroups.map((group) => (
            <div key={group.category} className="tool-board">
              <h3 className="font-display text-lg font-semibold">{group.category}</h3>
              <ul className="tool-tags">
                {group.skills.map((skill) => (
                  <li key={skill}>{skill}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </Location>
  );
}
