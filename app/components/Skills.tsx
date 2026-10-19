import { skillGroups } from "../data/portfolio";
import Section from "./Section";

export default function Skills() {
  return (
    <Section id="skills" title="Skills" icon="skills">
      {/* Phones: one centered list per group, split by thin lines.
          Larger screens: three left-aligned columns. */}
      <div className="divide-y divide-border text-center sm:grid sm:grid-cols-3 sm:gap-10 sm:divide-y-0 sm:text-left">
        {skillGroups.map((group) => (
          <div key={group.category} className="py-8 first:pt-0 last:pb-0 sm:py-0">
            <h3 className="text-xs font-medium uppercase tracking-widest text-muted sm:text-sm sm:font-normal sm:normal-case sm:tracking-normal">
              {group.category}
            </h3>
            <ul className="mt-3 space-y-2 text-lg">
              {group.skills.map((skill) => (
                <li key={skill}>{skill}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Section>
  );
}
