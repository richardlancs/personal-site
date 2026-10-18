import { projects } from "../data/portfolio";
import ProjectCard from "./ProjectCard";
import Section from "./Section";

export default function Projects() {
  return (
    <Section id="projects" title="Projects">
      {/* One grouped surface holding every project, split by thin lines */}
      <div className="divide-y divide-border rounded-2xl border border-border bg-card">
        {projects.map((project, index) => (
          <ProjectCard key={index} {...project} />
        ))}
      </div>
    </Section>
  );
}
