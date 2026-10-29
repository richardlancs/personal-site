import { interests } from "../data/portfolio";
import InterestScene from "./park/InterestScene";
import { Bush } from "./park/scenery";
import Zone from "./Zone";

// A few bushes to close off the row of courts and tables
function Hedge() {
  return (
    <svg viewBox="0 0 200 360" preserveAspectRatio="xMidYMax meet" focusable="false">
      <Bush x={60} y={358} scale={1.2} />
      <Bush x={140} y={358} />
    </svg>
  );
}

export default function Interests() {
  return (
    <Zone
      id="interests"
      place="The courts & tables"
      title="Interests"
      scene={<Hedge />}
      sceneWidth="10vw"
      grounded
    >
      <ul className="grid gap-x-6 gap-y-10 sm:grid-cols-2 walk:flex walk:gap-8">
        {interests.map((interest) => (
          <li key={interest.name} className="interest flex flex-col walk:w-[min(19rem,22vw)]">
            <div className="paper flex-1 p-5">
              <h3 className="font-display text-xl font-semibold tracking-tight">{interest.name}</h3>
              <p className="mt-2 text-[15px] leading-6 text-muted">{interest.description}</p>
            </div>
            <div className="mt-3">
              <InterestScene scene={interest.scene} />
            </div>
          </li>
        ))}
      </ul>
    </Zone>
  );
}
