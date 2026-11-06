import type { Metadata } from "next";
import Link from "next/link";
import Notebook from "../components/locations/Notebook";
import Location from "../components/world/Location";
import { about, githubNote, profile } from "../data/portfolio";
import { placeById } from "../data/world";

export const metadata: Metadata = {
  title: "About",
  description: "About Richard Lan, a Computer Science student at the University of Waterloo.",
};

// The pavilion: a notebook left open on the desk, the window lit behind it.
// Each entry in `about` is a page: a heading in rust ink and a few short
// points. The last page says where to find me.
export default function AboutPage() {
  const pages = [
    ...about.map((entry) => ({
      id: entry.heading,
      content: (
        <>
          <h2 className="notebook-note">{entry.heading}</h2>
          <ul role="list" className="notebook-points">
            {entry.points.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </>
      ),
    })),
    {
      id: "find-me",
      content: (
        <>
          <h2 className="notebook-note">Where to find me</h2>
          <ul role="list" className="notebook-points">
            <li>
              <a href={profile.githubUrl} target="_blank" rel="noopener noreferrer" className="text-link">
                GitHub
              </a>
              , {githubNote}
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
                <span className="only-world">The phone booth</span>
                <span className="only-flat">Contact</span>
              </Link>
              , for email
            </li>
            <li>
              <Link href="/projects" className="text-link">
                <span className="only-world">The workshop</span>
                <span className="only-flat">Projects</span>
              </Link>
              , for what I&apos;ve made
            </li>
          </ul>
        </>
      ),
    },
  ];

  return (
    <Location place={placeById("pavilion")} side="right" intro="A notebook someone left open on the desk, by the lit window.">
      <Notebook pages={pages} />
    </Location>
  );
}
