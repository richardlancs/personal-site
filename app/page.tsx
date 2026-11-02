import Link from "next/link";
import { profile } from "./data/portfolio";
import { places } from "./data/world";

// The site opens in the park (components/world3d, in the layout).
// This page is what sits over it: my name and links, quiet in the open sky, and
// on phones a plain list of the places below the painting.
export default function Home() {
  return (
    <main className="over-world">
      <section aria-labelledby="park-name" className="park-intro arrive">
        <h1 id="park-name" className="park-name font-display">
          {profile.name}
        </h1>
        <p className="park-headline">{profile.headline}</p>
        <ul aria-label="Links" className="park-links">
          <li>
            <a href={profile.githubUrl} target="_blank" rel="noopener noreferrer">
              GitHub
            </a>
          </li>
          <li>
            <a href={profile.linkedinUrl} target="_blank" rel="noopener noreferrer">
              LinkedIn
            </a>
          </li>
          <li>
            <a href={profile.resumeUrl} target="_blank" rel="noopener noreferrer">
              Résumé
            </a>
          </li>
        </ul>
      </section>

      {/* Phones: every place as a plain list under the painting */}
      <nav aria-label="Places in the park" className="park-places mx-auto max-w-[40rem] px-5 pb-12 pt-4">
        <ul className="divide-y divide-border border-y border-border">
          {places.map((place) => (
            <li key={place.id}>
              <Link href={place.href} className="group grid gap-0.5 py-3.5">
                <span className="font-display text-lg font-semibold group-hover:text-accent">{place.section}</span>
                <span className="text-[15px] text-muted">
                  {place.name}: {place.summary}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </main>
  );
}
