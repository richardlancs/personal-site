import { projects } from "../data/portfolio";
import { GroveScene } from "./park/scenes";
import ProjectCard from "./ProjectCard";
import Zone from "./Zone";

export default function Projects() {
  return (
    <Zone id="projects" place="The notice board" title="Projects" scene={<GroveScene />} sceneWidth="30vw">
      {/* A cork board with each project pinned to it as a note */}
      <ul className="board grid gap-6 lg:grid-cols-2 walk:flex walk:gap-7">
        {projects.map((project, index) => (
          <li key={project.title} className="walk:w-[min(31rem,36vw)]">
            <ProjectCard {...project} tilt={index % 2 ? 0.8 : -0.6} />
          </li>
        ))}
      </ul>
    </Zone>
  );
}
