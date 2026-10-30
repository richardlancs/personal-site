import type { Metadata } from "next";
import Link from "next/link";
import Notebook from "../components/locations/Notebook";
import Location from "../components/world/Location";
import { about, profile } from "../data/portfolio";
import { placeById } from "../data/world";

export const metadata: Metadata = {
  title: "About",
  description: "About Richard Lan, a Computer Science student at the University of Waterloo.",
};

// The pavilion: a notebook left open on the bench, the window lit behind it
export default function AboutPage() {
  const [lead, ...rest] = about;

  const pages = [
    {
      id: "lead",
      content: <p>{lead}</p>,
    },
    ...rest.map((paragraph, i) => ({
      id: `page-${i}`,
      content: <p>{paragraph}</p>,
    })),
    {
      id: "next",
      content: (
        <>
          <p className="notebook-note">Where to find me</p>
          <ul className="notebook-list">
            <li>
              <a href={profile.githubUrl} target="_blank" rel="noopener noreferrer" className="text-link">
                GitHub
              </a>
            </li>
            <li>
              <a href={profile.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-link">
                LinkedIn
              </a>
            </li>
            <li>
              <a href={profile.resumeUrl} target="_blank" rel="noopener noreferrer" className="text-link">
                Résumé (PDF)
              </a>
            </li>
            <li>
              <Link href="/contact" className="text-link">
                The phone booth
              </Link>{" "}
              for email
            </li>
          </ul>
          <p className="notebook-note mt-6">What I&apos;ve made</p>
          <p>
            <Link href="/projects" className="text-link">
              Over at the workshop
            </Link>
            .
          </p>
        </>
      ),
    },
  ];

  return (
    <Location place={placeById("pavilion")} side="right" intro="A notebook someone left open on the bench, by the lit window.">
      <Notebook pages={pages} />
    </Location>
  );
}
