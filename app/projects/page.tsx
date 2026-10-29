import type { Metadata } from "next";
import Workbench from "../components/locations/Workbench";
import FocusButton from "../components/world/FocusButton";
import Location from "../components/world/Location";
import { projects, skillGroups } from "../data/portfolio";
import { placeById } from "../data/world";

export const metadata: Metadata = {
  title: "Projects",
  description: "Software projects by Richard Lan, with screenshots, code and live demos.",
};

// The workshop: a monitor on the benches for each project, and the tool
// wall with the skills
export default function ProjectsPage() {
  return (
    <Location place={placeById("workshop")} side="left" intro="Old screens on the benches, still wired up. Choose one to switch it on.">
      <Workbench projects={projects} />

      <section id="skills" aria-labelledby="skills-title" className="tool-wall take-clicks">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4">
          <h2 id="skills-title" className="font-display text-3xl font-semibold tracking-tight">
            Skills
          </h2>
          <FocusButton focus="toolwall">Look at the tool wall</FocusButton>
        </div>
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
