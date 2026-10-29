import type { Metadata } from "next";
import LocationPage from "../components/world/LocationPage";
import { interests } from "../data/portfolio";
import { placeById } from "../data/world";

export const metadata: Metadata = {
  title: "Interests",
  description: "What Richard Lan does away from the keyboard.",
};

export default function InterestsPage() {
  return (
    <LocationPage place={placeById("greenhouse")}>
      <ul className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
        {interests.map((interest) => (
          <li key={interest.name}>
            <h2 className="font-display text-xl font-semibold tracking-tight">{interest.name}</h2>
            <p className="mt-2 text-[15px] leading-6 text-muted">{interest.description}</p>
          </li>
        ))}
      </ul>
    </LocationPage>
  );
}
