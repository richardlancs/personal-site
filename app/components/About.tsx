import { about } from "../data/portfolio";
import { OakScene } from "./park/scenes";
import Zone from "./Zone";

export default function About() {
  // The first paragraph is shown slightly larger as a lead-in.
  const [lead, ...rest] = about;

  return (
    <Zone id="about" place="The old oak" title="About" scene={<OakScene />}>
      <div className="paper max-w-2xl p-7 sm:p-9 walk:w-[min(34rem,40vw)]">
        <p className="font-display text-xl leading-snug sm:text-2xl">{lead}</p>
        <div className="mt-6 space-y-4 leading-relaxed text-muted sm:text-lg">
          {rest.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </div>
    </Zone>
  );
}
