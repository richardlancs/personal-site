import type { Metadata } from "next";
import ProjectEntry from "../components/locations/ProjectEntry";
import LocationPage from "../components/world/LocationPage";
import { projects, skillGroups } from "../data/portfolio";
import { placeById } from "../data/world";

export const metadata: Metadata = {
  title: "Projects",
  description: "Software projects by Richard Lan, with screenshots, code and live demos.",
};

export default function ProjectsPage() {
  return (
    <LocationPage place={placeById("workshop")} wide>
      <div className="space-y-16">
        {projects.map((project) => (
          <ProjectEntry key={project.title} {...project} />
        ))}
      </div>

      <section id="skills" aria-labelledby="skills-title" className="mt-16 scroll-mt-[calc(var(--nav-h)+1.5rem)] border-t border-border pt-10">
        <h2 id="skills-title" className="font-display text-3xl font-semibold tracking-tight">
          Skills
        </h2>
        <div className="mt-6 grid gap-8 sm:grid-cols-3">
          {skillGroups.map((group) => (
            <div key={group.category}>
              <h3 className="font-display text-lg font-semibold">{group.category}</h3>
              <ul className="mt-2 space-y-1.5 text-[15px] text-muted">
                {group.skills.map((skill) => (
                  <li key={skill}>{skill}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </LocationPage>
  );
}
