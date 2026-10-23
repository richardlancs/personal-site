import { profile } from "../data/portfolio";
import HeroGraphic from "./HeroGraphic";

export default function Hero() {
  return (
    // A very faint top-to-bottom gradient gives the hero a little depth,
    // fading out to let the page's background washes through
    <section id="top" className="bg-linear-to-b from-hero-top to-transparent">
      <div className="mx-auto grid max-w-6xl items-center gap-16 px-6 pb-24 pt-28 sm:px-10 sm:pb-32 sm:pt-44 lg:grid-cols-[1fr_minmax(0,26rem)]">
        <div className="text-center sm:text-left">
          <h1 className="enter text-5xl font-semibold tracking-tight sm:text-7xl">
            {profile.name}
          </h1>
          <p style={{ "--delay": "60ms" } as React.CSSProperties} className="enter mt-3 text-2xl font-semibold tracking-tight text-muted sm:text-3xl">
            {profile.headline}
          </p>
          <p style={{ "--delay": "120ms" } as React.CSSProperties} className="enter mx-auto mt-8 max-w-xl text-lg sm:mx-0 leading-relaxed text-muted">
            {profile.intro}
          </p>

          <div style={{ "--delay": "180ms" } as React.CSSProperties} className="enter mt-10 flex flex-wrap justify-center gap-3 sm:justify-start">
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

        {/* Decorative only; hidden on smaller screens to keep the hero simple */}
        <div style={{ "--delay": "240ms" } as React.CSSProperties} className="enter hidden justify-end lg:flex">
          <HeroGraphic />
        </div>
      </div>
    </section>
  );
}
