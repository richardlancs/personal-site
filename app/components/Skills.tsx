import { skillGroups } from "../data/portfolio";
import { GardenScene } from "./park/scenes";
import Zone from "./Zone";

export default function Skills() {
  return (
    <Zone id="skills" place="The garden" title="Skills" scene={<GardenScene />}>
      {/* One bed per group: stacked on phones, side by side from `sm` up */}
      <div className="paper grid gap-8 p-7 sm:grid-cols-3 sm:p-8 walk:w-[min(42rem,46vw)]">
        {skillGroups.map((group) => (
          <div key={group.category}>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-warm">
              {group.category}
            </h3>
            <ul className="mt-3 space-y-2">
              {group.skills.map((skill) => (
                <li key={skill} className="leaf-bullet">
                  {skill}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Zone>
  );
}
