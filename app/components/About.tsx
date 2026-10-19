import { about } from "../data/portfolio";
import Section from "./Section";

export default function About() {
  // The first paragraph is shown slightly larger as a lead-in.
  const [lead, ...rest] = about;

  return (
    <Section id="about" title="About" icon="about" tone="soft">
      <p className="text-2xl leading-snug tracking-tight">{lead}</p>
      <div className="mt-8 space-y-5 text-lg leading-relaxed text-muted">
        {rest.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
    </Section>
  );
}
