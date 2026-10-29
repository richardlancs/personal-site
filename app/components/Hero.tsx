import { profile } from "../data/portfolio";
import { EntranceScene } from "./park/scenes";
import Zone from "./Zone";

const delay = (ms: number) => ({ "--delay": `${ms}ms` }) as React.CSSProperties;

export default function Hero() {
  return (
    <Zone id="top" place="Park entrance" scene={<EntranceScene />} sceneWidth="44vw" reveal={false}>
      <div className="max-w-xl">
        <h1 style={delay(60)} className="enter mt-6 font-display text-5xl font-semibold tracking-tight sm:text-7xl">
          {profile.name}
        </h1>
        <p style={delay(120)} className="enter mt-3 text-xl font-medium tracking-tight text-muted sm:text-2xl">
          {profile.headline}
        </p>
        <p style={delay(180)} className="enter mt-6 text-lg leading-relaxed text-muted">
          {profile.intro}
        </p>

        <div style={delay(240)} className="enter mt-9 flex flex-wrap gap-3">
          <a
            href="#projects"
            className="hover-grow rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background hover:opacity-90"
          >
            View Projects
          </a>
          <a
            href={profile.githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hover-grow rounded-full border border-paper-edge bg-paper px-6 py-3 text-sm font-medium hover:text-accent"
          >
            GitHub
          </a>
        </div>

        {/* Points the way in: right while walking sideways, down otherwise */}
        <p style={delay(320)} className="enter mt-12 flex items-center gap-2 text-sm text-muted">
          <span className="walk-hint-arrow" aria-hidden="true">↓</span>
          Scroll to walk through the park
        </p>
      </div>
    </Zone>
  );
}
