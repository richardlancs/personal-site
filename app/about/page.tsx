import Link from "next/link";
import Notebook from "../components/locations/Notebook";
import ResumeLink from "../components/resume/ResumeLink";
import Points from "../components/ui/Points";
import Location from "../components/world/Location";
import { about, githubNote, profile } from "../data/portfolio";
import { section, sectionMetadata } from "../sections/registry";

export const metadata = sectionMetadata("about");

// The pavilion: a notebook left open on the desk, the window lit behind it.
// Each entry in `about` is a page: a heading in indigo ink and a few short
// points. The last page says where to find me. The same pages are on the
// notebook in the world (world3d/scenes/Library.tsx).
export default function AboutPage() {
  const pages = [
    ...about.map((entry) => ({
      id: entry.heading,
      content: (
        <>
          <h2 className="notebook-note">{entry.heading}</h2>
          <Points variant="notebook" items={entry.points} />
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
              <ResumeLink className="text-link">Résumé (PDF)</ResumeLink>
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
    <Location section={section("about")}>
      <Notebook pages={pages} />
    </Location>
  );
}
