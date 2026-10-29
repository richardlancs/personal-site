import { profile } from "../../../data/portfolio";
import { rand } from "../scenery";
import HubIcon from "./HubIcon";
import { CANVAS, destinations } from "./paths";
import { HubFarCity, HubForeground, HubGround, HubMidCity, HubSky, HubTreeline } from "./HubScene";
import HubStage from "./HubStage";

const delay = (ms: number) => ({ "--delay": `${ms}ms` }) as React.CSSProperties;

// Where a point on the scene's canvas sits, as a share of the canvas
const at = ([x, y]: [number, number]) => ({
  x: `${(x / CANVAS.width) * 100}%`,
  y: `${(y / CANVAS.height) * 100}%`,
});

// Each layer of the scene and how strongly it drifts with the pointer
const layers = [
  { depth: 0, Scene: HubSky },
  { depth: 0.12, Scene: HubFarCity },
  { depth: 0.25, Scene: HubMidCity },
  { depth: 0.4, Scene: HubTreeline },
  { depth: 0.6, Scene: HubGround },
];
const PATH_DEPTH = 0.6; // the buttons ride with the ground they stand on

// The opening view: the park's central clearing, with a path to every
// section. It replaces the old hero, so it also carries the name and intro.
export default function Hub() {
  return (
    <section id="top" aria-labelledby="hub-title" className="zone hub">
      <HubStage>
        <div className="hub-canvas">
          {layers.map(({ depth, Scene }, i) => (
            <div key={i} className="hub-layer" style={{ "--depth": depth } as React.CSSProperties}>
              <Scene />
            </div>
          ))}
          <div className="hub-layer" style={{ "--depth": 1.1 } as React.CSSProperties}>
            <HubForeground />
          </div>

          {/* The path ends: one button per section */}
          <nav aria-label="Park paths" className="hub-layer" style={{ "--depth": PATH_DEPTH } as React.CSSProperties}>
            <ul>
              {destinations.map((destination, i) => {
                const wide = at(destination.wide);
                const mid = at(destination.mid);
                const narrow = at(destination.narrow);
                return (
                  <li
                    key={destination.id}
                    className="hub-spot"
                    style={
                      {
                        "--x": wide.x,
                        "--y": wide.y,
                        "--mid-x": mid.x,
                        "--mid-y": mid.y,
                        "--nx": narrow.x,
                        "--ny": narrow.y,
                      } as React.CSSProperties
                    }
                  >
                    <a
                      href={`#${destination.id}`}
                      data-hub
                      className="hub-button enter"
                      style={delay(500 + i * 70)}
                    >
                      <span className="hub-disc">
                        <HubIcon name={destination.id} />
                      </span>
                      <span className="hub-label">{destination.label}</span>
                    </a>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>

        {/* Pollen drifting through the light */}
        <div className="hub-motes" aria-hidden="true">
          {Array.from({ length: 18 }, (_, i) => (
            <span
              key={i}
              style={
                {
                  left: `${rand(i * 3) * 100}%`,
                  top: `${30 + rand(i * 7) * 60}%`,
                  "--size": `${2 + rand(i) * 3}px`,
                  "--drift": `${10 + rand(i * 5) * 10}s`,
                  "--delay": `${-rand(i * 9) * 20}s`,
                } as React.CSSProperties
              }
            />
          ))}
        </div>
      </HubStage>

      <div className="hub-intro">
        <h1 id="hub-title" style={delay(60)} className="hub-name enter font-display font-semibold tracking-tight">
          {profile.name}
        </h1>
        <p style={delay(140)} className="hub-headline enter mt-2 font-medium tracking-tight">
          {profile.headline}
        </p>
        <p style={delay(220)} className="hub-intro-text enter mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-muted sm:text-base">
          {profile.intro}
        </p>
        <p style={delay(300)} className="enter mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-sm font-medium">
          <a href={profile.githubUrl} target="_blank" rel="noopener noreferrer" className="hub-text-link">
            GitHub
          </a>
          <a href={profile.linkedinUrl} target="_blank" rel="noopener noreferrer" className="hub-text-link">
            LinkedIn
          </a>
          <span className="text-muted">Choose a path, or scroll to wander</span>
        </p>
      </div>
    </section>
  );
}
