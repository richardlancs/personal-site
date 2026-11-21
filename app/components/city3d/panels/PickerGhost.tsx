import { ACTIONS } from "../arcade/arcadeLogic";
import type { Picks } from "./CityPanel";

// The section's picker as the server draws it, unseen (city-pages.css:
// .city-picker[data-ghost]): the same keys, in the same classes, as
// ScreenPicker, BoardLines and ArcadeControls draw once the 3D city is
// up, with the first one chosen, so the slot holds exactly the room the
// real row will take, at every width and text size. The page under it
// doesn't move when the row arrives, when a lost context takes it away
// or when the city comes back; where the scene isn't drawing, a line
// (CityPage.tsx: .city-picker-off) fills its room. Nothing in it can be
// reached (inert, aria-hidden); without JavaScript it takes no room at all.
export default function PickerGhost({ id, picks }: { id: keyof Picks; picks: Picks }) {
  if (id === "projects")
    return (
      <div className="city-picker" data-picker="screens" data-ghost="" aria-hidden="true" inert>
        {picks.projects.map((title, index) => (
          <button key={title} type="button" aria-pressed={index === 0} className="glass city-picker-key" tabIndex={-1}>
            {title}
          </button>
        ))}
      </div>
    );
  if (id === "experience")
    return (
      <div className="city-picker" data-picker="lines" data-ghost="" aria-hidden="true" inert>
        {picks.experience.map((entry, index) => (
          <button key={`${entry.role}-${entry.organization}`} type="button" aria-pressed={index === 0} className="glass city-picker-key" tabIndex={-1}>
            <span className="city-picker-label">{entry.role}</span> <span className="city-picker-sub">{entry.organization}</span>
          </button>
        ))}
      </div>
    );
  const first = picks.interests[0];
  return (
    <div className="city-picker" data-picker="arcade" data-ghost="" aria-hidden="true" inert>
      <div className="city-picker-row">
        {picks.interests.map((interest, index) => (
          <button key={interest.scene} type="button" aria-pressed={index === 0} className="glass city-picker-key" tabIndex={-1}>
            {interest.name}
          </button>
        ))}
      </div>
      <div className="city-picker-play">
        <button type="button" className="glass glass-primary city-picker-key" tabIndex={-1}>
          Play <span className="city-picker-sub">· {first ? ACTIONS[first.scene].label : ""}</span>
        </button>
        <p className="city-picker-status" />
      </div>
    </div>
  );
}
