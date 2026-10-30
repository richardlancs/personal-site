import Link from "next/link";
import ShowPlaces from "./components/world/ShowPlaces";
import { profile } from "./data/portfolio";
import { places } from "./data/world";

// The site opens in the park (components/world3d, in the layout).
// This page is what sits over it: the introduction in the open sky, and
// on phones a plain list of the places below the painting.
export default function Home() {
  return (
    <main className="over-world">
      <section aria-labelledby="park-name" className="park-intro arrive">
        <h1 id="park-name" className="park-name font-display font-semibold tracking-tight">
          {profile.name}
        </h1>
        <p className="mt-2 text-[17px] font-medium">{profile.headline}</p>
        <p className="mt-3 text-[15px] leading-relaxed text-muted">{profile.intro}</p>
        <p className="mt-3 text-[15px] leading-relaxed text-muted">
          This is a park, long after everyone left. Walk to a place to find my work, or{" "}
          <Link href="/projects" className="text-link">
            go straight to my projects
          </Link>
          .
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-medium">
          <Link href="/map" className="hover-grow rounded-full bg-foreground px-4 py-2 text-background">
            Open the map
          </Link>
          <ShowPlaces />
          <a href={profile.githubUrl} target="_blank" rel="noopener noreferrer" className="text-link">
            GitHub
          </a>
          <a href={profile.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-link">
            LinkedIn
          </a>
          <a href={profile.resumeUrl} target="_blank" rel="noopener noreferrer" className="text-link">
            Résumé
          </a>
        </div>
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
