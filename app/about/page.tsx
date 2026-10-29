import type { Metadata } from "next";
import LocationPage from "../components/world/LocationPage";
import { about } from "../data/portfolio";
import { placeById } from "../data/world";

export const metadata: Metadata = {
  title: "About",
  description: "About Richard Lan, a Computer Science student at the University of Waterloo.",
};

export default function AboutPage() {
  // The first paragraph is shown slightly larger as a lead-in
  const [lead, ...rest] = about;

  return (
    <LocationPage place={placeById("pavilion")}>
      <p className="font-display text-xl leading-snug sm:text-2xl">{lead}</p>
      <div className="mt-6 space-y-4 leading-relaxed text-muted sm:text-lg">
        {rest.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
    </LocationPage>
  );
}
