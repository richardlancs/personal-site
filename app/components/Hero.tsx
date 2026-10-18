import { profile } from "../data/portfolio";

export default function Hero() {
  return (
    // A very faint top-to-bottom gradient gives the hero a little depth
    <section
      id="top"
      className="bg-background bg-linear-to-b from-hero-top to-transparent"
    >
      <div className="mx-auto max-w-6xl px-6 pb-24 pt-28 sm:px-10 sm:pb-32 sm:pt-44">
        <h1 className="text-5xl font-semibold tracking-tight sm:text-7xl">
          {profile.name}
        </h1>
        <p className="mt-3 text-2xl font-semibold tracking-tight text-muted sm:text-3xl">
          {profile.headline}
        </p>
        <p className="mt-8 max-w-xl text-lg leading-relaxed text-muted">
          {profile.intro}
        </p>

        <div className="mt-10 flex flex-wrap gap-3">
          <a
            href="#projects"
            className="rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background transition-opacity duration-200 hover:opacity-85"
          >
            View Projects
          </a>
          <a
            href={profile.githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-border bg-card px-6 py-3 text-sm font-medium transition-colors duration-200 hover:bg-card-hover"
          >
            GitHub
          </a>
        </div>
      </div>
    </section>
  );
}
